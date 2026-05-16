import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import api from "../lib/api";
import { toast, Toaster } from "sonner";
import { formatApiError } from "../lib/format";
import { useCompany } from "../context/CompanyContext";
import { useLanguage } from "../context/LanguageContext";

export default function ForgotPassword() {
  const { company, logoUrl } = useCompany();
  const { t, lang, setLang } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setDone(true);
      toast.success(t("forgot_request_success"));
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] p-4">
      <Toaster position="bottom-right" richColors />
      <div className="sphere-card-soft w-full max-w-md p-8">
        <div className="mb-4 flex justify-end">
          <LanguageSwitch lang={lang} setLang={setLang} />
        </div>
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logoUrl} alt={company.name} className="mb-3 h-24 w-24 object-contain" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">{company.name}</h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">{t("forgot_kicker")}</p>
        </div>
        <h2 className="font-display mb-1 text-2xl font-semibold text-slate-900">{t("forgot_password")}</h2>
        <p className="mb-6 text-sm text-slate-500">{t("forgot_subtitle")}</p>

        {done ? (
          <div className="space-y-4" data-testid="forgot-success">
            <div className="rounded-sm border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              {t("forgot_request_success")}
            </div>
            <Link to="/login" className="block text-center text-sm text-slate-500 hover:text-[#145BFF]">
              {t("back_to_login")}
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="forgot-email-input"
                className="h-11 rounded-md border-slate-200 bg-slate-50"
                placeholder={t("email_placeholder")}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              data-testid="forgot-submit-button"
              className="h-11 w-full rounded-md bg-[#145BFF] shadow-[0_14px_28px_rgba(20,91,255,0.18)] hover:bg-[#0B4BE0]"
            >
              {loading ? t("sending_request") : t("send_password_request")}
            </Button>
            <div className="text-center text-sm">
              <Link to="/login" className="text-slate-500 hover:text-[#145BFF]">
                {t("back_to_login")}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function LanguageSwitch({ lang, setLang }) {
  return (
    <div className="inline-grid grid-cols-2 rounded-md border border-slate-200 bg-slate-50 p-1 text-xs font-semibold" aria-label="Language">
      {["en", "tr"].map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          className={`h-7 rounded-md px-3 ${lang === code ? "bg-white text-[#145BFF] shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
