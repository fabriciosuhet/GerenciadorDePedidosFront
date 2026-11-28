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
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  ChangePasswordRequest,
  STRONG_PASSWORD_REGEX,
} from '../../../features/auth/models/auth.model';

function changePasswordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('novaSenha')?.value as string | undefined;
  const confirmPassword = group.get('confirmarNovaSenha')?.value as string | undefined;
  if (!confirmPassword) {
    return null;
  }
  return newPassword === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './change-password-modal.component.html',
})
export class ChangePasswordModalComponent {
  private readonly fb = inject(FormBuilder);

  readonly open = input<boolean>(false);
  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly closed = output<void>();
  readonly submitted = output<ChangePasswordRequest>();

  protected readonly submitAttempted = signal(false);
  protected readonly localErrorMessage = signal<string | null>(null);
  protected readonly passwordDraft = signal('');

  protected readonly displayedError = computed(
    () => this.errorMessage() ?? this.localErrorMessage(),
  );

  protected readonly passwordChecks = computed(() => {
    const val = this.passwordDraft();
    return {
      minLength: val.length >= 8,
      upper: /[A-Z]/.test(val),
      lower: /[a-z]/.test(val),
      digit: /\d/.test(val),
      special: /[@$!%*?&]/.test(val),
      hasUnsupportedChars: val.length > 0 && /[^A-Za-z\d@$!%*?&]/.test(val),
    };
  });

  protected readonly form = this.fb.nonNullable.group(
    {
      senhaAtual: ['', [Validators.required, Validators.maxLength(128)]],
      novaSenha: ['', [Validators.required, Validators.pattern(STRONG_PASSWORD_REGEX)]],
      confirmarNovaSenha: ['', [Validators.required]],
    },
    { validators: changePasswordsMatchValidator },
  );

  constructor() {
    effect(() => {
      if (this.open()) {
        this.form.reset({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
        this.passwordDraft.set('');
        this.submitAttempted.set(false);
        this.localErrorMessage.set(null);
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

  protected onPasswordInput(): void {
    this.passwordDraft.set(this.form.controls.novaSenha.value);
    if (this.localErrorMessage()) {
      this.localErrorMessage.set(null);
    }
  }

  protected onFieldInteraction(): void {
    if (this.localErrorMessage()) {
      this.localErrorMessage.set(null);
    }
  }

  protected showFieldError(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected handleClose(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }

  protected onSubmit(): void {
    if (this.saving()) {
      return;
    }

    this.submitAttempted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.localErrorMessage.set(this.buildValidationErrorMessage());
      return;
    }

    this.localErrorMessage.set(null);
    this.submitted.emit(this.form.getRawValue());
  }

  private buildValidationErrorMessage(): string {
    const { senhaAtual, novaSenha, confirmarNovaSenha } = this.form.controls;

    if (senhaAtual.invalid) {
      return 'Informe sua senha atual.';
    }
    if (novaSenha.hasError('required')) {
      return 'Informe a nova senha.';
    }
    if (this.passwordChecks().hasUnsupportedChars) {
      return 'A senha contém caracteres não permitidos. Use apenas letras sem acento, números e @$!%*?&.';
    }
    if (novaSenha.invalid) {
      return 'A nova senha não atende a todos os critérios de segurança obrigatórios.';
    }
    if (confirmarNovaSenha.hasError('required')) {
      return 'Confirme a nova senha.';
    }
    if (this.form.hasError('passwordMismatch')) {
      return 'A confirmação não confere com a nova senha.';
    }

    return 'Verifique os campos destacados antes de continuar.';
  }
}
