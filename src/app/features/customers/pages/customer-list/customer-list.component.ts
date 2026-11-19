import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../../core/utils/http-error.util';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { STRONG_PASSWORD_REGEX, UserRoleEnum } from '../../../auth/models/auth.model';
import { CustomerDetailModalComponent } from '../../components/customer-detail-modal/customer-detail-modal.component';
import { Customer, CustomerDetail } from '../../models/customer.model';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ConfirmDialogComponent,
    PaginationComponent,
    CustomerDetailModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-list.component.html',
})
export class CustomerListComponent implements OnInit {
  protected readonly UserRoleEnum = UserRoleEnum;
  protected readonly authService = inject(AuthService);
  private readonly customerService = inject(CustomerService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pageSize = signal(10);
  protected readonly currentPage = signal(1);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly customers = signal<Customer[]>([]);

  protected readonly searchForm = this.fb.nonNullable.group({
    query: [''],
  });

  protected readonly createModalOpen = signal(false);
  protected readonly editingCustomer = signal<Customer | null>(null);
  protected readonly customerDetail = signal<CustomerDetail | null>(null);
  protected readonly deletingCustomer = signal<Customer | null>(null);

  protected readonly createForm = this.fb.nonNullable.group({
    nomeCompleto: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    telefone: ['', [Validators.required, Validators.maxLength(20)]],
    role: [UserRoleEnum.User],
    senha: ['', [Validators.required, Validators.pattern(STRONG_PASSWORD_REGEX)]],
  });

  protected readonly editForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    telefone: ['', [Validators.required, Validators.maxLength(20)]],
  });

  ngOnInit(): void {
    this.loadCustomers();
  }

  protected loadCustomers(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.customerService
      .getAll(this.searchForm.controls.query.value, this.currentPage(), this.pageSize())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.customers.set(res.items);
          this.totalCount.set(res.totalCount);
        },
        error: (err: unknown) => {
          this.customers.set([]);
          this.totalCount.set(0);
          this.errorMessage.set(extractApiErrorMessage(err, 'Erro ao carregar clientes.'));
        },
      });
  }

  protected searchCustomers(): void {
    this.currentPage.set(1);
    this.loadCustomers();
  }

  protected clearSearch(): void {
    this.searchForm.controls.query.setValue('');
    this.currentPage.set(1);
    this.loadCustomers();
  }

  protected onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadCustomers();
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadCustomers();
  }

  protected openCreateModal(): void {
    this.createForm.reset({
      nomeCompleto: '',
      email: '',
      telefone: '',
      role: UserRoleEnum.User,
      senha: '',
    });
    this.createModalOpen.set(true);
  }

  protected submitCreateCustomer(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.customerService
      .create(this.createForm.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toastService.success('Cliente criado com sucesso!');
          this.createModalOpen.set(false);
          this.loadCustomers();
        },
        error: (err: unknown) => {
          this.toastService.error(extractApiErrorMessage(err, 'Erro ao criar cliente.'));
        },
      });
  }

  protected openEditModal(customer: Customer): void {
    this.editingCustomer.set(customer);
    this.editForm.reset({ email: '', telefone: customer.telefone });
  }

  protected submitEditCustomer(): void {
    const target = this.editingCustomer();
    if (!target || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const { email, telefone } = this.editForm.getRawValue();
    this.saving.set(true);

    this.customerService
      .update({ id: target.id, email, telefone })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toastService.success('Cliente atualizado com sucesso!');
          this.editingCustomer.set(null);
          this.loadCustomers();
        },
        error: (err: unknown) => {
          this.toastService.error(extractApiErrorMessage(err, 'Erro ao atualizar cliente.'));
        },
      });
  }

  protected openCustomerDetails(id: string): void {
    this.customerService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => this.customerDetail.set(detail),
        error: (err: unknown) => {
          this.toastService.error(
            extractApiErrorMessage(err, 'Erro ao carregar detalhes do cliente.'),
          );
        },
      });
  }

  protected confirmDeleteCustomer(): void {
    const target = this.deletingCustomer();
    if (!target) return;

    this.saving.set(true);
    this.customerService
      .delete(target.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (msg) => {
          this.toastService.success(msg || 'Cliente removido!');
          this.deletingCustomer.set(null);
          this.loadCustomers();
        },
        error: (err: unknown) => {
          this.toastService.error(extractApiErrorMessage(err, 'Erro ao excluir cliente.'));
        },
      });
  }
}
