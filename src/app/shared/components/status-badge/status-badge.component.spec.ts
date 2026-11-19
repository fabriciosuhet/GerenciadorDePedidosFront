import { TestBed } from '@angular/core/testing';
import { OrderStatus } from '../../../features/orders/models/order.model';
import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBadgeComponent],
    }).compileComponents();
  });

  it('renders Pending status label in Portuguese', () => {
    const fixture = TestBed.createComponent(StatusBadgeComponent);
    fixture.componentRef.setInput('status', OrderStatus.Pending);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Pendente');
  });

  it('renders explicit statusKey shipped label', () => {
    const fixture = TestBed.createComponent(StatusBadgeComponent);
    fixture.componentRef.setInput('statusKey', 'shipped');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Enviado');
  });
});
