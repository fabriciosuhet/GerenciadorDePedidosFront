import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { StockAlertService } from './stock-alert.service';

describe('StockAlertService', () => {
  let service: StockAlertService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StockAlertService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('detects cataloged products at or below 20% of stock', () => {
    service.evaluateProducts([
      { id: 1, nome: 'Teclado', preco: 300, estoque: 20 },
      { id: 2, nome: 'Monitor', preco: 1200, estoque: 50 },
      { id: 3, nome: 'Mouse', preco: 100, estoque: 5 },
    ]);

    expect(service.isVisible()).toBe(true);
    expect(service.alerts().map((a) => a.id)).toEqual([1, 3]);
    expect(service.alerts()[0].percentage).toBe(20);
    expect(service.alerts()[1].percentage).toBe(5);
  });

  it('tracks peak stock above 100 and alerts when stock drops to <= 20% of peak', () => {
    service.evaluateProducts([{ id: 10, nome: 'Cabo USB', preco: 25, estoque: 500 }]);
    expect(service.isVisible()).toBe(false);

    service.evaluateProducts([{ id: 10, nome: 'Cabo USB', preco: 25, estoque: 90 }]);
    expect(service.isVisible()).toBe(true);
    expect(service.alerts()[0].percentage).toBe(18);
  });

  it('hides popup on dismiss until stock changes again', () => {
    service.evaluateProducts([{ id: 1, nome: 'Teclado', preco: 300, estoque: 15 }]);
    expect(service.isVisible()).toBe(true);

    service.dismiss();
    expect(service.isVisible()).toBe(false);

    service.evaluateProducts([{ id: 1, nome: 'Teclado', preco: 300, estoque: 15 }]);
    expect(service.isVisible()).toBe(false);

    service.evaluateProducts([{ id: 1, nome: 'Teclado', preco: 300, estoque: 10 }]);
    expect(service.isVisible()).toBe(true);
  });

  it('checkCatalogStock queries GET /api/produto and updates alerts', () => {
    service.checkCatalogStock();

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/produto'));
    req.flush({
      items: [{ id: 7, nome: 'Webcam', preco: 250, estoque: 12 }],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 10,
    });

    expect(service.isVisible()).toBe(true);
    expect(service.alerts()[0].name).toBe('Webcam');
  });
});
