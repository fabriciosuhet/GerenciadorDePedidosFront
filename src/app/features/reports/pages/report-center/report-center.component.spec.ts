import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ReportCenterComponent } from './report-center.component';

describe('ReportCenterComponent (Functional)', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportCenterComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('downloads both Sales PDF and Stock Movement CSV reports with shared period and reference date', () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report-mock');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    try {
      const fixture = TestBed.createComponent(ReportCenterComponent);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const weeklyBtn = Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Semanal'),
      )!;
      weeklyBtn.click();

      const dateInput = el.querySelector<HTMLInputElement>('#report-center-date')!;
      dateInput.value = '2026-11-27';
      dateInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const articles = el.querySelectorAll('article');
      const salesPdfBtn = Array.from(articles[0].querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Baixar PDF'),
      )!;
      salesPdfBtn.click();

      const salesReq = httpMock.expectOne((r) => r.url.endsWith('/api/pedido/relatorio'));
      expect(salesReq.request.params.get('periodo')).toBe('Semana');
      expect(salesReq.request.params.get('formato')).toBe('Pdf');
      expect(salesReq.request.params.get('dataReferencia')).toBe('2026-11-27');
      salesReq.flush(new Blob(['%PDF'], { type: 'application/pdf' }));
      fixture.detectChanges();

      const stockCsvBtn = Array.from(articles[1].querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Baixar CSV'),
      )!;
      stockCsvBtn.click();

      const stockReq = httpMock.expectOne((r) =>
        r.url.endsWith('/api/produto/movimentacao-estoque/relatorio'),
      );
      expect(stockReq.request.params.get('periodo')).toBe('Semana');
      expect(stockReq.request.params.get('formato')).toBe('Csv');
      expect(stockReq.request.params.get('dataReferencia')).toBe('2026-11-27');
      stockReq.flush(new Blob(['a;b'], { type: 'text/csv' }));
      fixture.detectChanges();

      expect(createUrlSpy).toHaveBeenCalledTimes(2);
      expect(clickSpy).toHaveBeenCalledTimes(2);
      expect(revokeUrlSpy).toHaveBeenCalledTimes(2);
    } finally {
      createUrlSpy.mockRestore();
      revokeUrlSpy.mockRestore();
      clickSpy.mockRestore();
    }
  });

  it('displays error banner when a report download fails', () => {
    const fixture = TestBed.createComponent(ReportCenterComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const salesPdfBtn = Array.from(el.querySelectorAll('article')[0].querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Baixar PDF'),
    )!;
    salesPdfBtn.click();

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/pedido/relatorio'));
    req.flush(new Blob(), { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('permissão de Administrador');
  });
});
