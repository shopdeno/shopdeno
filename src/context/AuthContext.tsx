"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getSaleorClient } from "@/lib/saleor";
import { getAuthToken, setAuthToken, clearAuthToken } from "@/lib/auth-token";
import { CUSTOMER_QUERY, LOGIN_MUTATION, LOGOUT_MUTATION, REGISTER_MUTATION } from "@/graphql/auth";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Address {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  streetAddress1: string;
  streetAddress2?: string;
  city: string;
  postalCode: string;
  country: {
    code: string;
    country: string;
  };
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const client = getSaleorClient();

  const fetchUser = useCallback(async (token: string) => {
    try {
      const result = await client.query(CUSTOMER_QUERY, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (result.data?.me) {
        setUser(result.data.me);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      clearAuthToken();
    }
  }, [client]);

  useEffect(() => {
    async function initAuth() {
      if (typeof window === "undefined") {
        setIsLoading(false);
        return;
      }

      const token = getAuthToken();
      if (token) {
        await fetchUser(token);
      }
      setIsLoading(false);
    }
    initAuth();
  }, [fetchUser]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await client.mutation(LOGIN_MUTATION, { email, password });

      if (result.data?.tokenCreate?.token) {
        const token = result.data.tokenCreate.token;
        setAuthToken(token);
        await fetchUser(token);
        return {};
      }

      if (result.data?.tokenCreate?.errors?.length > 0) {
        return { error: result.data.tokenCreate.errors[0].message };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { error: "Login failed" };
    } finally {
      setIsLoading(false);
    }
    return { error: "Login failed" };
  }, [client, fetchUser]);

  const register = useCallback(async (data: { email: string; password: string; firstName: string; lastName: string }) => {
    setIsLoading(true);
    try {
      const result = await client.mutation(REGISTER_MUTATION, data);

      if (result.data?.accountRegister?.user) {
        return login(data.email, data.password);
      }

      if (result.data?.accountRegister?.errors?.length > 0) {
        return { error: result.data.accountRegister.errors[0].message };
      }
    } catch (error) {
      console.error("Register error:", error);
      return { error: "Registration failed" };
    } finally {
      setIsLoading(false);
    }
    return { error: "Registration failed" };
  }, [client, login]);

  const logout = useCallback(async () => {
    try {
      await client.mutation(LOGOUT_MUTATION, {});
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuthToken();
      setUser(null);
    }
  }, [client]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
