import { HttpErrorResponse } from '@angular/common/http';

export function extractApiErrorMessage(
  err: unknown,
  fallback = 'Não foi possível concluir a operação.',
): string {
  if (!(err instanceof HttpErrorResponse)) {
    return fallback;
  }

  if (err.status === 0) {
    return 'Não foi possível conectar à API em http://localhost:8080. Verifique se o container Docker está ativo.';
  }

  const body: unknown = err.error;

  if (typeof body === 'string' && body.trim().length > 0) {
    try {
      const parsed: unknown = JSON.parse(body);
      return extractFromPayload(parsed, fallback);
    } catch {
      return body;
    }
  }

  if (body) {
    const extracted = extractFromPayload(body, '');
    if (extracted) {
      return extracted;
    }
  }

  switch (err.status) {
    case 401:
      return 'Sessão expirada ou credenciais ausentes. Faça login novamente.';
    case 403:
      return 'Você não tem permissão de Administrador para executar esta ação.';
    case 404:
      return 'Registro não encontrado.';
    default:
      return fallback;
  }
}

function extractFromPayload(payload: unknown, fallback: string): string {
  if (Array.isArray(payload)) {
    const messages = payload.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
    return messages.length > 0 ? messages.join(' ') : fallback;
  }

  if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>;
    if (typeof record['error'] === 'string' && record['error'].trim().length > 0) {
      return record['error'];
    }
    if (Array.isArray(record['errors'])) {
      const messages = record['errors'].filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0,
      );
      if (messages.length > 0) {
        return messages.join(' ');
      }
    }
    if (typeof record['title'] === 'string' && record['title'].trim().length > 0) {
      return record['title'];
    }
  }

  return fallback;
}
