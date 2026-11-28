import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReturnOrderPayload } from '../../models/order.model';

@Component({
  selector: 'app-order-return-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-return-modal.component.html',
})
export class OrderReturnModalComponent {
  private readonly fb = inject(FormBuilder);

  readonly orderId = input<number | null>(null);
  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly closed = output<void>();
  readonly submitted = output<ReturnOrderPayload>();

  protected readonly submitAttempted = signal(false);
  protected readonly localError = signal<string | null>(null);

  protected readonly displayedError = computed(() => this.errorMessage() ?? this.localError());

  protected readonly form = this.fb.nonNullable.group({
    motivo: ['', [Validators.required, Validators.maxLength(500)]],
    retornarAoEstoque: [true],
  });

  constructor() {
    effect(() => {
      if (this.orderId() !== null) {
        this.form.reset({ motivo: '', retornarAoEstoque: true });
        this.submitAttempted.set(false);
        this.localError.set(null);
      }
    });

    effect(() => {
      if (this.saving()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  protected handleClose(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }

  protected onMotivoInput(): void {
    if (this.localError()) {
      this.localError.set(null);
    }
  }

  protected onSubmit(): void {
    if (this.saving()) {
      return;
    }

    this.submitAttempted.set(true);
    const motivo = this.form.controls.motivo.value.trim();

    if (!motivo || this.form.invalid) {
      this.form.controls.motivo.markAsTouched();
      this.localError.set(
        !motivo
          ? 'Informe o motivo da devolução.'
          : 'O motivo da devolução deve ter no máximo 500 caracteres.',
      );
      return;
    }

    this.localError.set(null);
    this.submitted.emit({
      motivo,
      retornarAoEstoque: this.form.controls.retornarAoEstoque.value,
    });
  }
}
