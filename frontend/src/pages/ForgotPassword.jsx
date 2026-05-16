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
import { ArrowLeft, BellRing, CheckCircle2, Mail, Send } from "lucide-react";

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
    <div className="relative min-h-screen overflow-hidden bg-[#09111f] text-white">
      <Toaster position="bottom-right" richColors />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#08111f_0%,#0f766e_34%,#43376b_68%,#92400e_100%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="absolute -left-16 top-12 h-72 w-72 rotate-12 border border-white/[0.15] bg-white/[0.04] backdrop-blur-2xl" />
      <div className="absolute bottom-8 right-8 h-80 w-96 -rotate-6 border border-white/10 bg-black/[0.12] backdrop-blur-xl" />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md border border-white/[0.24] bg-white/[0.13] p-7 shadow-[0_30px_120px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8">
          <div className="mb-7 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center border border-white/25 bg-white/[0.85]">
                <img src={logoUrl} alt={company.name} className="h-9 w-9 object-contain" />
              </span>
              <div>
                <div className="font-display text-xl font-semibold">{company.name}</div>
                <div className="text-xs uppercase tracking-[0.16em] text-white/[0.65]">{t("auth_tagline")}</div>
              </div>
            </div>
            <LanguageSwitch lang={lang} setLang={setLang} />
          </div>

          <div className="mb-7">
            <div className="mb-3 inline-flex items-center gap-2 border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/75 backdrop-blur-xl">
              <BellRing className="h-4 w-4" /> {t("forgot_kicker")}
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-normal text-white">{t("forgot_password")}</h1>
            <p className="mt-2 text-sm leading-6 text-white/[0.68]">{t("forgot_subtitle")}</p>
          </div>

          {done ? (
            <div className="space-y-4" data-testid="forgot-success">
              <div className="flex gap-3 border border-emerald-200/[0.35] bg-emerald-100/[0.12] p-4 text-sm text-emerald-50 backdrop-blur-xl">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" />
                <span>{t("forgot_request_success")}</span>
              </div>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-white/[0.65] hover:text-white">
                <ArrowLeft className="h-4 w-4" /> {t("back_to_login")}
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs uppercase tracking-[0.12em] text-white/[0.65]">{t("email")}</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="forgot-email-input"
                    className="h-11 rounded-sm border-white/20 bg-white/[0.12] pl-10 text-white placeholder:text-white/[0.38] focus-visible:ring-white/[0.35]"
                    placeholder={t("email_placeholder")}
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                data-testid="forgot-submit-button"
                className="h-11 w-full rounded-sm border border-white/[0.18] bg-white text-slate-950 shadow-[0_18px_46px_rgba(255,255,255,0.18)] hover:bg-white/90"
              >
                {loading ? t("sending_request") : t("send_password_request")}
                {!loading && <Send className="h-4 w-4" />}
              </Button>
              <div className="text-center text-sm">
                <Link to="/login" className="text-white/[0.65] hover:text-white">
                  {t("back_to_login")}
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

function LanguageSwitch({ lang, setLang }) {
  return (
    <div className="inline-grid grid-cols-2 border border-white/[0.18] bg-white/[0.12] p-1 text-xs font-semibold shadow-sm backdrop-blur-xl" aria-label="Language">
      {["en", "tr"].map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          className={`h-7 px-3 ${lang === code ? "bg-white text-slate-950" : "text-white/[0.62] hover:text-white"}`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
