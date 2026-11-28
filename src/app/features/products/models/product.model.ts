export enum StockMovementType {
  Addition = 0,
  Removal = 1,
}

export enum StockMovementReason {
  ManualAdjustment = 0,
  OrderSale = 1,
  CancellationRefund = 2,
  Return = 3,
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
  estoqueMinimo?: number;
}

export interface UpdateProductPayload {
  id: number;
  nome: string;
  preco: number;
  estoque: number;
  estoqueMinimo?: number | null;
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
  precoUnitario?: number;
  valorTotal?: number;
  tipoMovimentacao: StockMovementType;
  motivo?: StockMovementReason;
  pedidoId?: number | null;
  data: string;
}

export interface StockMovementListItem extends StockMovementSummary {
  tipoMovimentacao: StockMovementType | null;
  quantidade?: number;
  precoUnitario?: number;
  valorTotal?: number;
  motivo?: StockMovementReason;
  pedidoId?: number | null;
  clienteNome?: string;
  data?: string;
}

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  [StockMovementType.Addition]: 'Entrada',
  [StockMovementType.Removal]: 'Saída',
};

export const STOCK_MOVEMENT_REASON_LABELS: Record<StockMovementReason, string> = {
  [StockMovementReason.ManualAdjustment]: 'Ajuste manual',
  [StockMovementReason.OrderSale]: 'Venda de pedido',
  [StockMovementReason.CancellationRefund]: 'Estorno de cancelamento',
  [StockMovementReason.Return]: 'Devolução de pedido',
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

export interface StockAlertRecord {
  id: number;
  produtoId: number;
  produtoNome: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  pedidoId: number | null;
  resolvido: boolean;
  criadoEm: string;
  resolvidoEm: string | null;
}
