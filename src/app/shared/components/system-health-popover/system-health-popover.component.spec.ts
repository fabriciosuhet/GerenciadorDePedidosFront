import { TestBed } from '@angular/core/testing';
import { SystemHealthPopoverComponent } from './system-health-popover.component';

describe('SystemHealthPopoverComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemHealthPopoverComponent],
    }).compileComponents();
  });

  it('opens popover on button click, displays friendly dependency labels and emits refresh', () => {
    const fixture = TestBed.createComponent(SystemHealthPopoverComponent);
    fixture.componentRef.setInput('report', {
      status: 'Healthy',
      totalDurationMs: 12.4,
      timestampUtc: '2026-11-27T16:30:00Z',
      checks: [
        {
          name: 'database',
          status: 'Healthy',
          durationMs: 6.1,
          description: 'Conexão ativa',
          error: null,
        },
        {
          name: 'redis',
          status: 'Degraded',
          durationMs: 4.3,
          description: 'Fallback em memória',
          error: null,
        },
      ],
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="dialog"]')).toBeNull();

    const triggerBtn = el.querySelector<HTMLButtonElement>(
      'button[aria-label="Ver saúde dos serviços da API"]',
    )!;
    triggerBtn.click();
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')).not.toBeNull();
    expect(el.textContent).toContain('Banco de Dados');
    expect(el.textContent).toContain('Cache Redis');
    expect(el.textContent).toContain('12.4 ms');

    let refreshCount = 0;
    fixture.componentInstance.refreshRequested.subscribe(() => {
      refreshCount += 1;
    });

    const refreshBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Verificar agora',
    )!;
    refreshBtn.click();

    expect(refreshCount).toBe(1);
  });

  it('emits refreshRequested automatically when opened with no report loaded yet', () => {
    const fixture = TestBed.createComponent(SystemHealthPopoverComponent);
    fixture.detectChanges();

    let refreshCount = 0;
    fixture.componentInstance.refreshRequested.subscribe(() => {
      refreshCount += 1;
    });

    const triggerBtn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-label="Ver saúde dos serviços da API"]',
    )!;
    triggerBtn.click();

    expect(refreshCount).toBe(1);
  });
});
