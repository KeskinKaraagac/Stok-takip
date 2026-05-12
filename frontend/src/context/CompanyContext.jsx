import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const CompanyContext = createContext(null);

const FALLBACK = {
  name: "StokTakip",
  contact_phone: "",
  contact_email: "",
  address: "",
  tax_no: "",
  website: "",
  has_logo: false,
  logo_updated_at: null,
};

export function CompanyProvider({ children }) {
  const [company, setCompany] = useState(FALLBACK);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/company");
      setCompany(data);
    } catch {
      setCompany(FALLBACK);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const logoUrl = (() => {
    const base = `${process.env.REACT_APP_BACKEND_URL}/api/company/logo`;
    if (company.has_logo) {
      const v = company.logo_updated_at ? encodeURIComponent(company.logo_updated_at) : "";
      return `${base}${v ? `?v=${v}` : ""}`;
    }
    return "/logo.jpg";
  })();

  return (
    <CompanyContext.Provider value={{ company, logoUrl, reload: load }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);
