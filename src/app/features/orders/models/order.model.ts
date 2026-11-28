export enum OrderStatus {
  Pending = 0,
  Processed = 1,
  Completed = 2,
  Cancelled = 3,
  Returned = 4,
}

export interface OrderSummary {
  id: number;
  dataPedido: string;
  total: number;
  status?: OrderStatus;
}

export interface OrderItemPayload {
  produtoId: number;
  quantidade: number;
}

export interface OrderItemDetail {
  id: number;
  produtoId: number;
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
}

export interface OrderDetail {
  id: number;
  dataPedido: string;
  total: number;
  clienteId: string;
  clienteNome: string;
  status: OrderStatus;
  concluidoEm?: string | null;
  devolvidoEm?: string | null;
  motivoDevolucao?: string | null;
  itensPedidos: OrderItemDetail[];
}

export interface CreateOrderPayload {
  itensPedidos: OrderItemPayload[];
  clienteId: string;
  status: OrderStatus;
}

export interface CancelOrderResponse {
  pedidoId: number;
  status: OrderStatus;
  estoqueEstornado: boolean;
  unidadesEstornadas: number;
}

export interface CompleteOrderResponse {
  pedidoId: number;
  status: OrderStatus;
  concluidoEm: string;
}

export interface ReturnOrderPayload {
  motivo: string;
  retornarAoEstoque: boolean;
}

export interface ReturnOrderResponse {
  pedidoId: number;
  status: OrderStatus;
  motivo: string;
  devolvidoEm: string;
  estoqueEstornado: boolean;
  unidadesEstornadas: number;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: 'Pendente',
  [OrderStatus.Processed]: 'Em Preparo',
  [OrderStatus.Completed]: 'Entregue',
  [OrderStatus.Cancelled]: 'Cancelado',
  [OrderStatus.Returned]: 'Devolvido',
};
