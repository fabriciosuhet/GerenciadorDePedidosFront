export type ReportPeriod = 'Semana' | 'Mes' | 'Ano';

export type ReportFormat = 'Pdf' | 'Csv';

export interface ReportFilter {
  periodo: ReportPeriod;
  formato: ReportFormat;
  dataReferencia?: string | null;
}

export interface DownloadedFile {
  blob: Blob;
  filename: string;
}
