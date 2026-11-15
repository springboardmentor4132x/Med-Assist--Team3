export type UserRole = "patient" | "doctor" | "clinic" | "admin";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  role: Exclude<UserRole, "admin">;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface AuthErrorPayload {
  detail?: string;
  error_code?: string;
  status_code?: number;
  retry_after_seconds?: number;
  errors?: FieldError[];
}

export interface DemoAccount {
  role: UserRole;
  email: string;
  password: string;
  full_name: string;
}

export interface AuditLogItem {
  id: number;
  user_id: number | null;
  email: string | null;
  event_type: string;
  success: boolean;
  detail: string;
  ip_address: string | null;
  created_at: string;
}

export interface ProtectedResourceResponse {
  message: string;
  module: string;
  role: UserRole;
  user: User;
  allowed_actions: string[];
  data: Record<string, unknown>;
}

