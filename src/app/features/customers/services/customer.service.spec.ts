import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UserRoleEnum } from '../../auth/models/auth.model';
import { CustomerService } from './customer.service';

describe('CustomerService', () => {
  let service: CustomerService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CustomerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('calls GET /api/cliente/me to fetch current user profile', () => {
    service.getMe().subscribe((res) => {
      expect(res.nomeCompleto).toBe('Maria Silva');
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/cliente/me'));
    expect(req.request.method).toBe('GET');
    req.flush({ nomeCompleto: 'Maria Silva', telefone: '11999999999', pedidos: [] });
  });

  it('calls GET /api/cliente with optional search query', () => {
    service.getAll('Maria').subscribe((res) => {
      expect(res.totalCount).toBe(1);
    });

    const req = httpMock.expectOne(
      (r) => r.url.endsWith('/api/cliente') && r.params.get('query') === 'Maria',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], totalCount: 1, pageNumber: 1, pageSize: 10 });
  });

  it('calls POST /api/cliente to create customer', () => {
    service
      .create({
        nomeCompleto: 'Admin Novo',
        role: UserRoleEnum.Admin,
        email: 'admin2@teste.com',
        telefone: '11988887777',
        senha: 'Password@1',
      })
      .subscribe((res) => {
        expect(res.id).toBe('abc');
      });

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/cliente'));
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'abc' });
  });

  it('calls PUT /api/cliente/atualizar-cliente and DELETE /api/cliente/deletar-cliente', () => {
    service.update({ id: 'abc', email: 'novo@teste.com', telefone: '11911112222' }).subscribe();
    const putReq = httpMock.expectOne((r) => r.url.endsWith('/api/cliente/atualizar-cliente'));
    expect(putReq.request.method).toBe('PUT');
    putReq.flush(null, { status: 204, statusText: 'No Content' });

    service.delete('abc').subscribe((msg) => expect(msg).toBe('Cliente deletado com sucesso'));
    const delReq = httpMock.expectOne(
      (r) => r.url.endsWith('/api/cliente/deletar-cliente') && r.params.get('id') === 'abc',
    );
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush('Cliente deletado com sucesso');
  });
});
