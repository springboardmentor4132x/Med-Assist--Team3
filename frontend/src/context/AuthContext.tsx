import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearStoredTokens,
  formatAuthErrorMessage,
  getCurrentUserRequest,
  getStoredTokens,
  isRememberedSession,
  loginRequest,
  logoutRequest,
  refreshTokenRequest,
  registerRequest,
  registerSessionExpiredHandler,
  saveTokens,
} from "../services/api";
import type { LoginPayload, RegisterPayload, User } from "../types/auth";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionNotice: string | null;
  setSessionNotice: (notice: string | null) => void;
  login: (payload: LoginPayload, rememberMe: boolean) => Promise<User>;
  register: (payload: RegisterPayload, rememberMe: boolean) => Promise<User>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  useEffect(() => {
    const unregister = registerSessionExpiredHandler((reason) => {
      setUser(null);
      setSessionNotice(reason);
    });
    return unregister;
  }, []);

  useEffect(() => {
    let active = true;

    async function hydrateSession() {
      const { accessToken } = getStoredTokens();
      if (!accessToken) {
        if (active) setIsLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUserRequest();
        if (active) setUser(currentUser);
      } catch (err) {
        clearStoredTokens();
        if (active) {
          setUser(null);
          setSessionNotice(formatAuthErrorMessage(err));
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void hydrateSession();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload, rememberMe: boolean) => {
    const response = await loginRequest(payload);
    saveTokens(response.access_token, response.refresh_token, rememberMe);
    setSessionNotice(null);
    setUser(response.user);
    return response.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload, rememberMe: boolean) => {
    const response = await registerRequest(payload);
    saveTokens(response.access_token, response.refresh_token, rememberMe);
    setSessionNotice(null);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearStoredTokens();
      setUser(null);
      setSessionNotice("You have been signed out securely.");
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const { refreshToken } = getStoredTokens();
    if (!refreshToken) {
      throw new Error("No refresh token available.");
    }
    const response = await refreshTokenRequest(refreshToken);
    saveTokens(response.access_token, response.refresh_token, isRememberedSession());
    setUser(response.user);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      sessionNotice,
      setSessionNotice,
      login,
      register,
      logout,
      refreshSession,
    }),
    [user, isLoading, sessionNotice, login, register, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return ctx;
}

