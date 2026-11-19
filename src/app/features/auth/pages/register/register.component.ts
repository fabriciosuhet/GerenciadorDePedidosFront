import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../../core/utils/http-error.util';
import { STRONG_PASSWORD_REGEX } from '../../models/auth.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
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

  protected readonly form = this.fb.nonNullable.group({
    nomeCompleto: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    telefone: ['', [Validators.required, Validators.maxLength(20)]],
    senha: ['', [Validators.required, Validators.pattern(STRONG_PASSWORD_REGEX)]],
  });

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService
      .register(this.form.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: () => {
          this.toastService.success('Cadastro realizado! Você já está conectado.');
          void this.router.navigate(['/dashboard']);
        },
        error: (err: unknown) => {
          this.errorMessage.set(extractApiErrorMessage(err, 'Erro ao realizar cadastro.'));
        },
      });
  }
}
