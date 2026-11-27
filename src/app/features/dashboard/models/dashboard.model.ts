import { ReportPeriod } from '../../../core/models/report.model';

export interface TopProductDashboard {
  produtoId: number;
  produtoNome: string;
  quantidadeVendida: number;
  faturamentoTotal: number;
}

export interface DashboardQueryParams {
  periodo?: ReportPeriod | null;
  dataReferencia?: string | null;
  topProdutos?: number;
}

export interface DashboardSummary {
  totalClientes: number;
  totalProdutos: number;
  produtosComEstoqueBaixo: number;
  totalPedidos: number;
  pedidosPendentes: number;
  pedidosConcluidos: number;
  pedidosCancelados: number;
  faturamentoTotalConcluido: number;
  ticketMedio?: number;
  taxaCancelamentoPercentual?: number;
  periodo?: ReportPeriod | number | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  topProdutos?: TopProductDashboard[] | null;
}
