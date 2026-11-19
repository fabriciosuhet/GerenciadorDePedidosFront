import { UserRoleEnum } from '../../auth/models/auth.model';
import { OrderDetail } from '../../orders/models/order.model';

export interface Customer {
  id: string;
  nomeCompleto: string;
  telefone: string;
}

export interface CustomerDetail {
  nomeCompleto: string;
  telefone: string;
  pedidos: OrderDetail[];
}

export interface CreateCustomerPayload {
  nomeCompleto: string;
  role: UserRoleEnum;
  senha: string;
  email: string;
  telefone: string;
}

export interface UpdateCustomerPayload {
  id: string;
  email: string;
  telefone: string;
}
