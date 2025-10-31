"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";

export type UserRole = "admin" | "team-lead" | "employee";

interface DecodedToken {
  id: string;
  name: string;
  email: string;
  role: string; // Your app role stays here
  organization_id?: string;
  team_id: string;
}

interface AuthContextType {
  user: DecodedToken | null;
  setUser: React.Dispatch<React.SetStateAction<DecodedToken | null>>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    orgName: string,
    email: string,
    password: string,
    role: UserRole,
  ) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  supabaseToken: string | null; // For Supabase Auth
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DecodedToken | null>(null);
  const [supabaseToken, setSupabaseToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const sbToken = localStorage.getItem("supabaseToken");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("supabaseToken");
        localStorage.removeItem("user");
      }
    }

    if (sbToken) {
      setSupabaseToken(sbToken);
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) throw new Error("Login failed");

      const data = await res.json();

      const decodedUser: DecodedToken = jwtDecode(data.token);

      localStorage.setItem("token", data.token);
      localStorage.setItem("supabaseToken", data.supabaseToken); // new
      localStorage.setItem("user", JSON.stringify(decodedUser));

      setUser(decodedUser);
      setSupabaseToken(data.supabaseToken);

      router.push("/dashboard");
    } catch (error) {
      throw error;
    }
  };

  const register = async (
    name: string,
    orgName: string,
    email: string,
    password: string,
    role: UserRole,
  ) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, orgName, email, password, role }),
      });

      if (!res.ok) throw new Error("Registration failed");

      const data = await res.json();

      const decodedUser: DecodedToken = jwtDecode(data.token);

      localStorage.setItem("token", data.token);
      localStorage.setItem("supabaseToken", data.supabaseToken); // new
      localStorage.setItem("user", JSON.stringify(decodedUser));

      setUser(decodedUser);
      setSupabaseToken(data.supabaseToken);

      router.push("/dashboard");
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("supabaseToken");
    localStorage.removeItem("user");
    setUser(null);
    setSupabaseToken(null);
    router.push("/auth/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        register,
        logout,
        isLoading,
        supabaseToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
