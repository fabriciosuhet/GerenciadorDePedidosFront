export enum OrderStatus {
  Pending = 0,
  Processed = 1,
  Completed = 2,
  Cancelled = 3,
}

export interface OrderSummary {
  id: number;
  dataPedido: string;
  total: number;
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
  itensPedidos: OrderItemDetail[];
}

export interface CreateOrderPayload {
  itensPedidos: OrderItemPayload[];
  clienteId: string;
  status: OrderStatus;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: 'Pendente',
  [OrderStatus.Processed]: 'Em Preparo',
  [OrderStatus.Completed]: 'Entregue',
  [OrderStatus.Cancelled]: 'Cancelado',
};
