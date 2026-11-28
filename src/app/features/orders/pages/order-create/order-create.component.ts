import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { createEmptyPagedResult } from '../../../../core/models/paged-result.model';
import { AuthService } from '../../../../core/services/auth.service';
import { OrderRealtimeService } from '../../../../core/services/order-realtime.service';
import { StockAlertService } from '../../../../core/services/stock-alert.service';
import { ToastService } from '../../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../../core/utils/http-error.util';
import { Customer } from '../../../customers/models/customer.model';
import { CustomerService } from '../../../customers/services/customer.service';
import { Product } from '../../../products/models/product.model';
import { ProductService } from '../../../products/services/product.service';
import { ORDER_STATUS_LABELS, OrderStatus } from '../../models/order.model';
import { OrderService } from '../../services/order.service';

type OrderItemFormGroup = FormGroup<{
  produtoId: FormControl<number>;
  quantidade: FormControl<number>;
}>;

@Component({
  selector: 'app-order-create',
  standalone: true,
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-create.component.html',
})
export class OrderCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly customerService = inject(CustomerService);
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly orderRealtimeService = inject(OrderRealtimeService);
  private readonly stockAlertService = inject(StockAlertService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loadingData = signal(true);
  protected readonly submitting = signal(false);
  protected readonly customers = signal<Customer[]>([]);
  protected readonly products = signal<Product[]>([]);

  protected readonly statusOptions = [
    { value: OrderStatus.Pending, label: ORDER_STATUS_LABELS[OrderStatus.Pending] },
    { value: OrderStatus.Processed, label: ORDER_STATUS_LABELS[OrderStatus.Processed] },
    { value: OrderStatus.Completed, label: ORDER_STATUS_LABELS[OrderStatus.Completed] },
    { value: OrderStatus.Cancelled, label: ORDER_STATUS_LABELS[OrderStatus.Cancelled] },
  ];

  protected readonly form = this.fb.nonNullable.group({
    clienteId: ['', [Validators.required]],
    status: [OrderStatus.Pending],
    itensPedidos: this.fb.array<OrderItemFormGroup>([]),
  });

  get itemsArray(): FormArray<OrderItemFormGroup> {
    return this.form.controls.itensPedidos;
  }

  ngOnInit(): void {
    this.addItem();

    const customers$ = this.authService.isAdmin()
      ? this.customerService
          .getAll(undefined, 1, 100)
          .pipe(catchError(() => of(createEmptyPagedResult<Customer>())))
      : this.customerService.getMe().pipe(
          map((me) => {
            const myId = this.authService.customerId() ?? me.pedidos[0]?.clienteId ?? '';
            return {
              ...createEmptyPagedResult<Customer>(),
              items: myId
                ? [{ id: myId, nomeCompleto: me.nomeCompleto, telefone: me.telefone }]
                : [],
              totalCount: myId ? 1 : 0,
            };
          }),
          catchError(() => of(createEmptyPagedResult<Customer>())),
        );

    forkJoin({
      customers: customers$,
      products: this.productService
        .getAll(undefined, 1, 100)
        .pipe(catchError(() => of(createEmptyPagedResult<Product>()))),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingData.set(false)),
      )
      .subscribe(({ customers, products }) => {
        this.customers.set(customers.items);
        this.products.set(products.items);
        this.stockAlertService.evaluateProducts(products.items);

        const preferredId = this.authService.customerId();
        if (preferredId && customers.items.some((c) => c.id === preferredId)) {
          this.form.controls.clienteId.setValue(preferredId);
        } else if (customers.items.length === 1) {
          this.form.controls.clienteId.setValue(customers.items[0].id);
        }
      });
  }

  protected addItem(): void {
    this.itemsArray.push(
      this.fb.nonNullable.group({
        produtoId: [0, [Validators.required, Validators.min(1)]],
        quantidade: [1, [Validators.required, Validators.min(1)]],
      }),
    );
  }

  protected removeItem(index: number): void {
    this.itemsArray.removeAt(index);
  }

  protected getLineSubtotal(index: number): number {
    const group = this.itemsArray.at(index);
    const productId = Number(group.controls.produtoId.value);
    const quantity = Number(group.controls.quantidade.value);
    const product = this.products().find((p) => p.id === productId);
    return product ? product.preco * Math.max(0, quantity) : 0;
  }

  protected getOrderTotal(): number {
    return this.itemsArray.controls.reduce((sum, _, idx) => sum + this.getLineSubtotal(idx), 0);
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.itemsArray.length === 0) {
      this.form.markAllAsTouched();
      this.toastService.error('Selecione o cliente e pelo menos um produto válido.');
      return;
    }

    const raw = this.form.getRawValue();
    this.orderRealtimeService.connect();
    this.submitting.set(true);

    this.orderService
      .create({
        clienteId: raw.clienteId,
        status: raw.status,
        itensPedidos: raw.itensPedidos.map((item) => ({
          produtoId: Number(item.produtoId),
          quantidade: Number(item.quantidade),
        })),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.toastService.success(`Pedido #${res.id} criado com sucesso!`);
          this.stockAlertService.checkCatalogStock();
          void this.router.navigate(['/orders']);
        },
        error: (err: unknown) => {
          this.toastService.error(
            extractApiErrorMessage(err, 'Não foi possível criar o pedido.'),
          );
        },
      });
  }
}
