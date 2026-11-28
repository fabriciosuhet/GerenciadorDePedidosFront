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

  protected readonly passwordDraft = signal('');

  protected readonly passwordChecks = computed(() => {
    const val = this.passwordDraft();
    return {
      minLength: val.length >= 8,
      upper: /[A-Z]/.test(val),
      lower: /[a-z]/.test(val),
      digit: /\d/.test(val),
      special: /[@$!%*?&]/.test(val),
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

  protected onSubmit(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.emit(this.form.getRawValue());
  }
}
