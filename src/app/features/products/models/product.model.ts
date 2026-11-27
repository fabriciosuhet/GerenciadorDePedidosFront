export enum StockMovementType {
  Addition = 0,
  Removal = 1,
}

export interface Product {
  id: number;
  nome: string;
  preco: number;
  estoque: number;
}

export interface ProductDetail {
  nome: string;
  preco: number;
  estoque: number;
}

export interface CreateProductPayload {
  nome: string;
  preco: number;
  estoque: number;
}

export interface UpdateProductPayload {
  id: number;
  nome: string;
  preco: number;
  estoque: number;
}

export interface StockAdjustmentPayload {
  produtoId: number;
  quantidade: number;
  clienteId: string;
}

export interface StockMovementSummary {
  id: number;
  produtoId: number;
  produtoNome: string;
}

export interface StockMovementDetail {
  id: number;
  produtoId: number;
  produtoNome: string;
  clienteNome: string;
  quantidade: number;
  tipoMovimentacao: StockMovementType;
  data: string;
}

export interface StockMovementListItem extends StockMovementSummary {
  tipoMovimentacao: StockMovementType | null;
  quantidade?: number;
  clienteNome?: string;
  data?: string;
}

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  [StockMovementType.Addition]: 'Entrada',
  [StockMovementType.Removal]: 'Saída',
};

export type StockReportPeriod = 'Semana' | 'Mes' | 'Ano';

export type StockReportFormat = 'Pdf' | 'Csv';

export interface StockMovementReportFilter {
  periodo: StockReportPeriod;
  formato: StockReportFormat;
  dataReferencia?: string | null;
}

export interface DownloadedFile {
  blob: Blob;
  filename: string;
}
