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
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../../core/utils/http-error.util';
import { STRONG_PASSWORD_REGEX } from '../../models/auth.model';

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('novaSenha')?.value as string | undefined;
  const confirmPassword = group.get('confirmarNovaSenha')?.value as string | undefined;
  if (!confirmPassword) {
    return null;
  }
  return newPassword === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly tokenFromUrl = signal(false);
  protected readonly manualTokenMode = signal(false);
  protected readonly passwordDraft = signal('');

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
      token: ['', [Validators.required, Validators.maxLength(512)]],
      novaSenha: ['', [Validators.required, Validators.pattern(STRONG_PASSWORD_REGEX)]],
      confirmarNovaSenha: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const token = params.get('token')?.trim() ?? '';
      if (token) {
        this.form.controls.token.setValue(token);
        this.tokenFromUrl.set(true);
        this.manualTokenMode.set(false);
      } else {
        this.tokenFromUrl.set(false);
      }
    });
  }

  protected enableManualTokenEdit(): void {
    this.manualTokenMode.set(true);
  }

  protected onPasswordInput(): void {
    this.passwordDraft.set(this.form.controls.novaSenha.value);
    if (this.errorMessage()) {
      this.errorMessage.set(null);
    }
  }

  protected onFieldInteraction(): void {
    if (this.errorMessage()) {
      this.errorMessage.set(null);
    }
  }

  protected showFieldError(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected onSubmit(): void {
    this.submitAttempted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set(this.buildValidationErrorMessage());
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { token, novaSenha, confirmarNovaSenha } = this.form.getRawValue();

    this.authService
      .resetPassword({
        token: token.trim(),
        novaSenha,
        confirmarNovaSenha,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: () => {
          this.authService.clearSession(false);
          this.toastService.success('Senha redefinida com sucesso! Faça login com sua nova senha.');
          void this.router.navigate(['/login']);
        },
        error: (err: unknown) => {
          this.errorMessage.set(
            extractApiErrorMessage(err, 'Token inválido ou expirado. Solicite uma nova redefinição.'),
          );
        },
      });
  }

  private buildValidationErrorMessage(): string {
    const { token, novaSenha, confirmarNovaSenha } = this.form.controls;

    if (token.invalid) {
      return 'Informe o token de redefinição enviado por e-mail.';
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
