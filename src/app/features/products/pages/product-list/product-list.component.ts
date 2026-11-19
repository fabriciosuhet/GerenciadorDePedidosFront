import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { StockAlertService } from '../../../../core/services/stock-alert.service';
import { ToastService } from '../../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../../core/utils/http-error.util';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { Customer } from '../../../customers/models/customer.model';
import { CustomerService } from '../../../customers/services/customer.service';
import { Product } from '../../models/product.model';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CurrencyPipe, ReactiveFormsModule, ConfirmDialogComponent, PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-list.component.html',
})
export class ProductListComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly productService = inject(ProductService);
  private readonly customerService = inject(CustomerService);
  private readonly stockAlertService = inject(StockAlertService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pageSize = 8;
  protected readonly currentPage = signal(1);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly products = signal<Product[]>([]);
  protected readonly customers = signal<Customer[]>([]);
  protected readonly searchControl = new FormControl('', { nonNullable: true });

  protected readonly productModalOpen = signal(false);
  protected readonly editingProduct = signal<Product | null>(null);
  protected readonly stockModalProduct = signal<Product | null>(null);
  protected readonly deletingProduct = signal<Product | null>(null);

  protected readonly paginatedProducts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.products().slice(start, start + this.pageSize);
  });

  protected readonly productForm = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(255)]],
    preco: [0, [Validators.required, Validators.min(0.01)]],
    estoque: [0, [Validators.required, Validators.min(0)]],
  });

  protected readonly stockForm = this.fb.nonNullable.group({
    operation: ['add' as 'add' | 'remove'],
    quantidade: [1, [Validators.required, Validators.min(1)]],
    clienteId: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadProducts();
  }

  protected loadProducts(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.productService
      .getAll(this.searchControl.value)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.products.set(res.items);
          this.currentPage.set(1);
          if (!this.searchControl.value.trim()) {
            this.stockAlertService.evaluateProducts(res.items);
          }
        },
        error: (err: unknown) => {
          this.products.set([]);
          this.errorMessage.set(extractApiErrorMessage(err, 'Erro ao carregar produtos.'));
        },
      });
  }

  protected clearSearch(): void {
    this.searchControl.setValue('');
    this.loadProducts();
  }

  protected openCreateModal(): void {
    this.editingProduct.set(null);
    this.productForm.reset({ nome: '', preco: 0, estoque: 0 });
    this.productModalOpen.set(true);
  }

  protected openEditModal(product: Product): void {
    this.editingProduct.set(product);
    this.productForm.reset({
      nome: product.nome,
      preco: product.preco,
      estoque: product.estoque,
    });
    this.productModalOpen.set(true);
  }

  protected saveProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const val = this.productForm.getRawValue();
    const editing = this.editingProduct();

    const request$: Observable<unknown> = editing
      ? this.productService.update({ id: editing.id, ...val })
      : this.productService.create(val);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toastService.success(
            editing ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!',
          );
          this.productModalOpen.set(false);
          this.loadProducts();
        },
        error: (err: unknown) => {
          this.toastService.error(extractApiErrorMessage(err, 'Erro ao salvar produto.'));
        },
      });
  }

  protected openStockModal(product: Product): void {
    this.stockModalProduct.set(product);
    this.stockForm.reset({
      operation: 'add',
      quantidade: 1,
      clienteId: this.authService.customerId() ?? '',
    });

    if (this.customers().length === 0) {
      this.customerService
        .getAll()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.customers.set(res.items);
            if (!this.stockForm.controls.clienteId.value && res.items.length > 0) {
              this.stockForm.controls.clienteId.setValue(res.items[0].id);
            }
          },
        });
    } else if (!this.stockForm.controls.clienteId.value && this.customers().length > 0) {
      this.stockForm.controls.clienteId.setValue(this.customers()[0].id);
    }
  }

  protected submitStockAdjustment(): void {
    const product = this.stockModalProduct();
    if (!product || this.stockForm.invalid) {
      this.stockForm.markAllAsTouched();
      return;
    }

    const { operation, quantidade, clienteId } = this.stockForm.getRawValue();
    this.saving.set(true);

    const req$ =
      operation === 'add'
        ? this.productService.addStock({ produtoId: product.id, quantidade, clienteId })
        : this.productService.removeStock({ produtoId: product.id, quantidade, clienteId });

    req$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (msg) => {
          this.toastService.success(msg || 'Estoque atualizado!');
          this.stockModalProduct.set(null);
          this.loadProducts();
        },
        error: (err: unknown) => {
          this.toastService.error(extractApiErrorMessage(err, 'Erro ao ajustar estoque.'));
        },
      });
  }

  protected confirmDeleteProduct(): void {
    const target = this.deletingProduct();
    if (!target) return;

    this.saving.set(true);
    this.productService
      .delete(target.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (msg) => {
          this.toastService.success(msg || 'Produto removido!');
          this.deletingProduct.set(null);
          this.loadProducts();
        },
        error: (err: unknown) => {
          this.toastService.error(extractApiErrorMessage(err, 'Erro ao excluir produto.'));
        },
      });
  }
}
