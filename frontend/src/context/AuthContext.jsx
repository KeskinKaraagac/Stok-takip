import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../lib/api";
import { formatApiError } from "../lib/format";
import { useLanguage } from "./LanguageContext";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // null = checking, false = unauthenticated, object = user
  const [user, setUser] = useState(null);
  const { setLang } = useLanguage();

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setLang(data.language || "en");
      setUser(data);
    } catch {
      setUser(false);
    }
  }, [setLang]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.access_token) localStorage.setItem("access_token", data.access_token);
    setLang(data.user?.language || "en");
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    if (data.access_token) localStorage.setItem("access_token", data.access_token);
    setLang(data.user?.language || "en");
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    localStorage.removeItem("access_token");
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refresh: fetchMe, formatApiError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
