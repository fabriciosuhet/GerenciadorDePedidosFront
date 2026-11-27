import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../../core/services/auth.service';
import { ProductListComponent } from './product-list.component';

registerLocaleData(localePt);

describe('ProductListComponent (Functional)', () => {
  let httpMock: HttpTestingController;
  const isAdmin = signal(true);

  beforeEach(async () => {
    localStorage.clear();
    isAdmin.set(true);
    await TestBed.configureTestingModule({
      imports: [ProductListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        {
          provide: AuthService,
          useValue: {
            isAdmin,
            customerId: signal(null),
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('prevents native page reload on search submit and sends pageNumber/pageSize', () => {
    const fixture = TestBed.createComponent(ProductListComponent);
    fixture.detectChanges();

    const initReq = httpMock.expectOne(
      (r) =>
        r.url.endsWith('/api/produto') &&
        r.params.get('pageNumber') === '1' &&
        r.params.get('pageSize') === '10',
    );
    initReq.flush({
      items: [{ id: 1, nome: 'Mouse Gamer', preco: 199.9, estoque: 12 }],
      totalCount: 15,
      pageNumber: 1,
      pageSize: 10,
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const searchInput = el.querySelector('#product-search') as HTMLInputElement;
    searchInput.value = 'Mouse';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = el.querySelector('form')!;
    const submitEvent = new Event('submit', { cancelable: true });
    form.dispatchEvent(submitEvent);
    expect(submitEvent.defaultPrevented).toBe(true);

    const searchReq = httpMock.expectOne(
      (r) =>
        r.url.endsWith('/api/produto') &&
        r.params.get('query') === 'Mouse' &&
        r.params.get('pageNumber') === '1' &&
        r.params.get('pageSize') === '10',
    );
    searchReq.flush({
      items: [{ id: 1, nome: 'Mouse Gamer', preco: 199.9, estoque: 12 }],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 10,
    });
    fixture.detectChanges();

    const pageSizeSelect = el.querySelector('select[aria-label="Itens por página"]') as HTMLSelectElement;
    pageSizeSelect.value = '25';
    pageSizeSelect.dispatchEvent(new Event('change'));

    const resizedReq = httpMock.expectOne(
      (r) =>
        r.url.endsWith('/api/produto') &&
        r.params.get('pageNumber') === '1' &&
        r.params.get('pageSize') === '25',
    );
    resizedReq.flush({
      items: [{ id: 1, nome: 'Mouse Gamer', preco: 199.9, estoque: 12 }],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 25,
    });
  });

  it('lists products and allows Admin to create a new product', () => {
    const fixture = TestBed.createComponent(ProductListComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url.endsWith('/api/produto')).flush({
      items: [{ id: 1, nome: 'Mouse Gamer', preco: 199.9, estoque: 12 }],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 10,
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Mouse Gamer');

    const newBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('+ Novo Produto'),
    )!;
    newBtn.click();
    fixture.detectChanges();

    const comp = fixture.componentInstance as unknown as {
      productForm: { setValue: (v: unknown) => void };
    };
    comp.productForm.setValue({ nome: 'Headset Pro', preco: 350, estoque: 8, estoqueMinimo: 10 });
    fixture.detectChanges();

    const modalForm = el.querySelectorAll('form')[1];
    modalForm.dispatchEvent(new Event('submit'));

    const postReq = httpMock.expectOne((r) => r.url.endsWith('/api/produto') && r.method === 'POST');
    expect(postReq.request.body).toEqual({
      nome: 'Headset Pro',
      preco: 350,
      estoque: 8,
      estoqueMinimo: 10,
    });
    postReq.flush({ id: 2 });

    const refreshReqs = httpMock.match((r) => r.url.endsWith('/api/produto') && r.method === 'GET');
    expect(refreshReqs.length).toBe(2);
    for (const r of refreshReqs) {
      r.flush({
        items: [
          { id: 1, nome: 'Mouse Gamer', preco: 199.9, estoque: 12 },
          { id: 2, nome: 'Headset Pro', preco: 350, estoque: 8 },
        ],
        totalCount: 2,
        pageNumber: 1,
        pageSize: 10,
      });
    }
    fixture.detectChanges();

    expect(el.textContent).toContain('Headset Pro');
  });

  it('hides Admin action buttons for regular Usuario', () => {
    isAdmin.set(false);
    const fixture = TestBed.createComponent(ProductListComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url.endsWith('/api/produto')).flush({
      items: [{ id: 1, nome: 'Mouse Gamer', preco: 199.9, estoque: 12 }],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 10,
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('+ Novo Produto');
    expect(el.textContent).not.toContain('Editar');
  });
});
