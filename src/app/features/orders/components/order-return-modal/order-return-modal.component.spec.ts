import { TestBed } from '@angular/core/testing';
import { ReturnOrderPayload } from '../../models/order.model';
import { OrderReturnModalComponent } from './order-return-modal.component';

describe('OrderReturnModalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderReturnModalComponent],
    }).compileComponents();
  });

  it('requires reason and emits trimmed payload with retornarAoEstoque flag', () => {
    const fixture = TestBed.createComponent(OrderReturnModalComponent);
    fixture.componentRef.setInput('orderId', 55);
    fixture.detectChanges();

    let emitted: ReturnOrderPayload | undefined;
    fixture.componentInstance.submitted.subscribe((value) => {
      emitted = value;
    });

    const el = fixture.nativeElement as HTMLElement;
    const form = el.querySelector('form')!;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(emitted).toBeUndefined();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Informe o motivo');

    const textarea = el.querySelector<HTMLTextAreaElement>('#return-order-reason')!;
    textarea.value = '  Produto com defeito  ';
    textarea.dispatchEvent(new Event('input'));

    const checkbox = el.querySelector<HTMLInputElement>('#return-order-restock')!;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    form.dispatchEvent(new Event('submit'));
    expect(emitted).toEqual({
      motivo: 'Produto com defeito',
      retornarAoEstoque: false,
    });
  });

  it('prevents closing while saving is true', () => {
    const fixture = TestBed.createComponent(OrderReturnModalComponent);
    fixture.componentRef.setInput('orderId', 55);
    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();

    let closed = false;
    fixture.componentInstance.closed.subscribe(() => {
      closed = true;
    });

    const el = fixture.nativeElement as HTMLElement;
    const backBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Voltar',
    )!;
    expect(backBtn.disabled).toBe(true);
    backBtn.click();
    expect(closed).toBe(false);
  });
});
