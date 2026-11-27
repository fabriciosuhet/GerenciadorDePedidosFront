import { extractFilenameFromContentDisposition } from './file-download.util';

describe('extractFilenameFromContentDisposition', () => {
  it('extracts filename from standard Content-Disposition header', () => {
    const header = 'attachment; filename="relatorio-movimentacoes-estoque-mes-20261101-20261130.pdf"';
    expect(extractFilenameFromContentDisposition(header)).toBe(
      'relatorio-movimentacoes-estoque-mes-20261101-20261130.pdf',
    );
  });

  it('prefers UTF-8 filename* when present', () => {
    const header =
      "attachment; filename=fallback.csv; filename*=UTF-8''relatorio-movimenta%C3%A7%C3%B5es.csv";
    expect(extractFilenameFromContentDisposition(header)).toBe('relatorio-movimentações.csv');
  });

  it('returns null when header is absent or has no filename', () => {
    expect(extractFilenameFromContentDisposition(null)).toBeNull();
    expect(extractFilenameFromContentDisposition('inline')).toBeNull();
  });
});
