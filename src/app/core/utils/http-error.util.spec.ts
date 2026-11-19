import { HttpErrorResponse } from '@angular/common/http';
import { extractApiErrorMessage } from './http-error.util';

describe('extractApiErrorMessage', () => {
  it('extracts string array from ValidationFilter', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: ['Campo obrigatório.', 'Formato inválido.'],
    });
    expect(extractApiErrorMessage(err)).toBe('Campo obrigatório. Formato inválido.');
  });

  it('extracts errors array from FluentValidation handler', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: { errors: ['O email não pode ser vazio.'] },
    });
    expect(extractApiErrorMessage(err)).toBe('O email não pode ser vazio.');
  });

  it('extracts single error message object', () => {
    const err = new HttpErrorResponse({
      status: 404,
      error: { error: 'Pedido não encontrado.' },
    });
    expect(extractApiErrorMessage(err)).toBe('Pedido não encontrado.');
  });

  it('extracts plain text error string', () => {
    const err = new HttpErrorResponse({
      status: 404,
      error: 'Email ou senha invalidos',
    });
    expect(extractApiErrorMessage(err)).toBe('Email ou senha invalidos');
  });

  it('returns connection message on status 0', () => {
    const err = new HttpErrorResponse({ status: 0 });
    expect(extractApiErrorMessage(err)).toContain('conectar à API');
  });
});

