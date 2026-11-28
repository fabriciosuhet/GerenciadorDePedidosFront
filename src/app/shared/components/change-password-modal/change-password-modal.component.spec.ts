import { TestBed } from '@angular/core/testing';
import { ChangePasswordRequest } from '../../../features/auth/models/auth.model';
import { ChangePasswordModalComponent } from './change-password-modal.component';

describe('ChangePasswordModalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangePasswordModalComponent],
    }).compileComponents();
  });

  it('validates fields and emits ChangePasswordRequest on valid submission', () => {
    const fixture = TestBed.createComponent(ChangePasswordModalComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    let submittedPayload: ChangePasswordRequest | undefined;
    fixture.componentInstance.submitted.subscribe((value) => {
      submittedPayload = value;
    });

    const el = fixture.nativeElement as HTMLElement;
    const currentInput = el.querySelector<HTMLInputElement>('#change-current-password')!;
    const newInput = el.querySelector<HTMLInputElement>('#change-new-password')!;
    const confirmInput = el.querySelector<HTMLInputElement>('#change-confirm-password')!;

    currentInput.value = 'Atual@123';
    currentInput.dispatchEvent(new Event('input'));
    newInput.value = 'fraca';
    newInput.dispatchEvent(new Event('input'));
    confirmInput.value = 'fraca';
    confirmInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = el.querySelector('form')!;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(submittedPayload).toBeUndefined();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'não atende a todos os critérios',
    );

    newInput.value = 'NovaForte@123';
    newInput.dispatchEvent(new Event('input'));
    confirmInput.value = 'NovaForte@123';
    confirmInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    form.dispatchEvent(new Event('submit'));
    expect(submittedPayload).toEqual({
      senhaAtual: 'Atual@123',
      novaSenha: 'NovaForte@123',
      confirmarNovaSenha: 'NovaForte@123',
    });
  });

  it('prevents closing while saving and displays error alert', () => {
    const fixture = TestBed.createComponent(ChangePasswordModalComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('saving', true);
    fixture.componentRef.setInput('errorMessage', 'Senha atual inválida.');
    fixture.detectChanges();

    let closed = false;
    fixture.componentInstance.closed.subscribe(() => {
      closed = true;
    });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Senha atual inválida.');

    const cancelBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancelar',
    )!;
    expect(cancelBtn.disabled).toBe(true);
    cancelBtn.click();
    expect(closed).toBe(false);
  });
});
