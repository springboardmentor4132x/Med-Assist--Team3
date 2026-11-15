import type {
  AuditLogItem,
  AuthErrorPayload,
  DemoAccount,
  LoginPayload,
  ProtectedResourceResponse,
  RegisterPayload,
  TokenResponse,
  User,
} from "../types/auth";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const ACCESS_TOKEN_KEY = "medassist_access_token";
const REFRESH_TOKEN_KEY = "medassist_refresh_token";
const REMEMBER_KEY = "medassist_remember_session";

export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: string;
  readonly retryAfterSeconds?: number;
  readonly fieldErrors?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    status: number,
    errorCode = "UNKNOWN_ERROR",
    retryAfterSeconds?: number,
    fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = errorCode;
    this.retryAfterSeconds = retryAfterSeconds;
    this.fieldErrors = fieldErrors;
  }
}

export function getStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
  const accessToken =
    localStorage.getItem(ACCESS_TOKEN_KEY) ?? sessionStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken =
    localStorage.getItem(REFRESH_TOKEN_KEY) ?? sessionStorage.getItem(REFRESH_TOKEN_KEY);
  return { accessToken, refreshToken };
}

export function saveTokens(
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean
): void {
  clearStoredTokens();
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (rememberMe) {
    localStorage.setItem(REMEMBER_KEY, "true");
  }
}

export function isRememberedSession(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === "true";
}

export function clearStoredTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(REMEMBER_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function formatAuthErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Unable to connect to the MedAssist AI authentication service. Please verify the backend is running.";
  }

  switch (error.errorCode) {
    case "INVALID_CREDENTIALS":
      return "Invalid email or password. Please check your credentials and try again.";
    case "ACCOUNT_LOCKED":
      return error.retryAfterSeconds
        ? `Account temporarily locked due to multiple failed attempts. Try again in ${Math.ceil(error.retryAfterSeconds / 60)} minute(s).`
        : error.message;
    case "ACCOUNT_INACTIVE":
      return "Your account is currently deactivated. Please contact a MedAssist AI administrator.";
    case "RATE_LIMIT_EXCEEDED":
      return error.retryAfterSeconds
        ? `Too many login attempts. Please wait ${error.retryAfterSeconds} seconds before retrying.`
        : error.message;
    case "TOKEN_EXPIRED":
      return "Your session expired. Please sign in again.";
    case "TOKEN_REVOKED":
      return "Your session was signed out or revoked. Please sign in again.";
    case "INSUFFICIENT_PERMISSIONS":
      return error.message;
    case "EMAIL_ALREADY_EXISTS":
      return "An account with this email address already exists. Try signing in instead.";
    default:
      return error.message || "Authentication request failed.";
  }
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  let payload: AuthErrorPayload = {};
  try {
    payload = (await response.json()) as AuthErrorPayload;
  } catch {
    // Non-JSON response fallback
  }

  return new ApiError(
    payload.detail || `Request failed with status ${response.status}.`,
    response.status,
    payload.error_code || `HTTP_${response.status}`,
    payload.retry_after_seconds,
    payload.errors
  );
}

let sessionExpiredHandler: ((reason: string) => void) | null = null;

export function registerSessionExpiredHandler(handler: (reason: string) => void): () => void {
  sessionExpiredHandler = handler;
  return () => {
    if (sessionExpiredHandler === handler) {
      sessionExpiredHandler = null;
    }
  };
}

async function rawFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : "Network error while contacting server.",
      0,
      "NETWORK_ERROR"
    );
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }
  return (await response.json()) as T;
}

export async function loginRequest(payload: LoginPayload): Promise<TokenResponse> {
  return rawFetch<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function registerRequest(payload: RegisterPayload): Promise<TokenResponse> {
  return rawFetch<TokenResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function refreshTokenRequest(refreshToken: string): Promise<TokenResponse> {
  return rawFetch<TokenResponse>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export async function fetchDemoAccounts(): Promise<DemoAccount[]> {
  try {
    return await rawFetch<DemoAccount[]>("/api/v1/auth/demo-accounts");
  } catch {
    return [];
  }
}

export async function authorizedFetch<T>(
  path: string,
  init: RequestInit = {},
  allowRetry = true
): Promise<T> {
  const { accessToken, refreshToken } = getStoredTokens();
  if (!accessToken) {
    throw new ApiError("Not authenticated.", 401, "MISSING_CREDENTIALS");
  }

  try {
    return await rawFetch<T>(path, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 401 &&
      err.errorCode === "TOKEN_EXPIRED" &&
      allowRetry &&
      refreshToken
    ) {
      try {
        const refreshed = await refreshTokenRequest(refreshToken);
        saveTokens(refreshed.access_token, refreshed.refresh_token, isRememberedSession());
        return await authorizedFetch<T>(path, init, false);
      } catch (refreshErr) {
        clearStoredTokens();
        sessionExpiredHandler?.(formatAuthErrorMessage(refreshErr));
        throw refreshErr;
      }
    }

    if (
      err instanceof ApiError &&
      err.status === 401 &&
      ["TOKEN_REVOKED", "TOKEN_EXPIRED", "INVALID_TOKEN", "MISSING_CREDENTIALS"].includes(
        err.errorCode
      )
    ) {
      clearStoredTokens();
      sessionExpiredHandler?.(formatAuthErrorMessage(err));
    }

    throw err;
  }
}

export async function getCurrentUserRequest(): Promise<User> {
  return authorizedFetch<User>("/api/v1/auth/me");
}

export async function logoutRequest(): Promise<{ message: string; revoked_tokens: number }> {
  const { accessToken, refreshToken } = getStoredTokens();
  if (!accessToken) {
    clearStoredTokens();
    return { message: "Logged out locally.", revoked_tokens: 0 };
  }

  try {
    return await rawFetch<{ message: string; revoked_tokens: number }>("/api/v1/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } finally {
    clearStoredTokens();
  }
}

export async function getMyAuditLogsRequest(): Promise<AuditLogItem[]> {
  return authorizedFetch<AuditLogItem[]>("/api/v1/auth/audit-logs");
}

export async function callProtectedEndpoint(
  endpoint: string
): Promise<ProtectedResourceResponse | AuditLogItem[]> {
  return authorizedFetch<ProtectedResourceResponse | AuditLogItem[]>(endpoint);
}

