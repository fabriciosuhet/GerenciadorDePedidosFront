import { TestBed } from '@angular/core/testing';
import { StockMovementReportFilter } from '../../models/product.model';
import { StockReportModalComponent } from './stock-report-modal.component';

describe('StockReportModalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockReportModalComponent],
    }).compileComponents();
  });

  it('does not render dialog when open is false', () => {
    const fixture = TestBed.createComponent(StockReportModalComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="dialog"]')).toBeNull();
  });

  it('emits selected period, format and optional reference date on submit', () => {
    const fixture = TestBed.createComponent(StockReportModalComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    let emitted: StockMovementReportFilter | undefined;
    fixture.componentInstance.exportRequested.subscribe((value) => {
      emitted = value;
    });

    const el = fixture.nativeElement as HTMLElement;
    const weeklyBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Semanal'),
    )!;
    weeklyBtn.click();

    const csvBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Arquivo CSV'),
    )!;
    csvBtn.click();

    const dateInput = el.querySelector<HTMLInputElement>('#report-reference-date')!;
    dateInput.value = '2026-11-27';
    dateInput.dispatchEvent(new Event('input'));

    fixture.detectChanges();

    const form = el.querySelector('form')!;
    form.dispatchEvent(new Event('submit'));

    expect(emitted).toEqual({
      periodo: 'Semana',
      formato: 'Csv',
      dataReferencia: '2026-11-27',
    });
  });

  it('prevents closing while downloading is true and displays error alert', () => {
    const fixture = TestBed.createComponent(StockReportModalComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('downloading', true);
    fixture.componentRef.setInput('errorMessage', 'Falha ao gerar arquivo.');
    fixture.detectChanges();

    let closedCount = 0;
    fixture.componentInstance.closed.subscribe(() => {
      closedCount += 1;
    });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Falha ao gerar arquivo.');

    const cancelBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancelar',
    )!;
    expect(cancelBtn.disabled).toBe(true);
    cancelBtn.click();
    expect(closedCount).toBe(0);
  });
});
