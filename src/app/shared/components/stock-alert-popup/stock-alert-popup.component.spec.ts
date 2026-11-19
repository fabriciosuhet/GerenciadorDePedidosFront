import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StockAlertPopupComponent } from './stock-alert-popup.component';

describe('StockAlertPopupComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockAlertPopupComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders low stock products with percentages and emits dismissed on close click', () => {
    const fixture = TestBed.createComponent(StockAlertPopupComponent);
    fixture.componentRef.setInput('items', [
      { id: 1, name: 'Teclado Mecânico', currentStock: 10, referenceCapacity: 100, percentage: 10 },
      { id: 2, name: 'Mouse Sem Fio', currentStock: 0, referenceCapacity: 100, percentage: 0 },
    ]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Estoque Crítico (≤ 20%)');
    expect(el.textContent).toContain('Teclado Mecânico');
    expect(el.textContent).toContain('10 un. (10%)');
    expect(el.textContent).toContain('Mouse Sem Fio');

    let dismissedCalled = false;
    fixture.componentInstance.dismissed.subscribe(() => {
      dismissedCalled = true;
    });

    const closeBtn = el.querySelector('button[aria-label="Fechar alerta de estoque"]') as HTMLButtonElement;
    closeBtn.click();
    expect(dismissedCalled).toBe(true);
  });

  it('renders nothing when items list is empty', () => {
    const fixture = TestBed.createComponent(StockAlertPopupComponent);
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('aside')).toBeNull();
  });
});
