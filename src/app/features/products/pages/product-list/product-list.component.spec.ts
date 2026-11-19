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
    comp.productForm.setValue({ nome: 'Headset Pro', preco: 350, estoque: 8 });
    fixture.detectChanges();

    const modalForm = el.querySelectorAll('form')[1];
    modalForm.dispatchEvent(new Event('submit'));

    const postReq = httpMock.expectOne((r) => r.url.endsWith('/api/produto'));
    expect(postReq.request.method).toBe('POST');
    postReq.flush({ id: 2 });

    httpMock.expectOne((r) => r.url.endsWith('/api/produto')).flush({
      items: [
        { id: 1, nome: 'Mouse Gamer', preco: 199.9, estoque: 12 },
        { id: 2, nome: 'Headset Pro', preco: 350, estoque: 8 },
      ],
      totalCount: 2,
      pageNumber: 1,
      pageSize: 10,
    });
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
