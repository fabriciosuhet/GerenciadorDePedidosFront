export enum UserRoleEnum {
  User = 0,
  Admin = 1,
}

export type UserRoleName = 'Admin' | 'Usuario';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  email: string;
  token: string;
  refreshToken: string;
}

export interface RegisterRequest {
  nomeCompleto: string;
  senha: string;
  email: string;
  telefone: string;
}

export interface RegisterResponse {
  id: string;
  token: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  novaSenha: string;
  confirmarNovaSenha: string;
}

export interface ChangePasswordRequest {
  senhaAtual: string;
  novaSenha: string;
  confirmarNovaSenha: string;
}

export const STRONG_PASSWORD_REGEX =
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
