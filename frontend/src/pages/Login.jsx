import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import { useLanguage } from "../context/LanguageContext";
import { toast, Toaster } from "sonner";
import { formatApiError } from "../lib/format";
import { ArrowRight, BarChart3, Boxes, LockKeyhole, Mail, PackageCheck, ShieldCheck, Truck } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const { company, logoUrl } = useCompany();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success(t("login_success"));
      navigate("/");
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

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-8">
        <div className="grid w-full max-w-6xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative hidden min-h-[680px] overflow-hidden border border-white/[0.18] bg-white/[0.11] p-10 shadow-[0_30px_120px_rgba(0,0,0,0.32)] backdrop-blur-2xl lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-x-8 top-24 h-px bg-white/[0.15]" />
            <div className="absolute right-10 top-10 h-24 w-24 border border-white/[0.15] bg-white/[0.04]" />
            <div className="absolute bottom-12 left-14 h-32 w-40 -rotate-6 border border-amber-200/25 bg-amber-100/[0.06]" />

            <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center border border-white/25 bg-white/90 shadow-[0_18px_60px_rgba(255,255,255,0.12)]">
                <img src={logoUrl} alt={company.name} className="h-12 w-12 object-contain" data-testid="login-logo" />
              </div>
              <div>
                <div className="font-display text-2xl font-semibold tracking-tight">{company.name}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/[0.65]">{t("auth_tagline")}</div>
              </div>
            </div>

            <div className="relative z-10 max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 border border-emerald-200/[0.35] bg-emerald-100/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-50 backdrop-blur-xl">
                <ShieldCheck className="h-4 w-4" /> {t("secured_workspace")}
              </div>
              <h1 className="font-display text-5xl font-semibold leading-tight tracking-normal text-white drop-shadow-[0_8px_28px_rgba(0,0,0,0.22)]">
                {t("login_visual_title")}
              </h1>
            </div>

            <div className="relative z-10 grid grid-cols-3 gap-3">
              <MetricTile icon={Boxes} label={t("login_metric_stock")} value="18.4k" accent="cyan" />
              <MetricTile icon={PackageCheck} label={t("login_metric_production")} value="96%" accent="emerald" />
              <MetricTile icon={Truck} label={t("login_metric_exit")} value="124" accent="amber" />
            </div>

            <div className="relative z-10 border border-white/[0.18] bg-white/[0.09] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-medium text-white/[0.85]">{t("login_activity")}</div>
                <BarChart3 className="h-5 w-5 text-amber-200" />
              </div>
              <div className="grid h-28 grid-cols-12 items-end gap-2">
                {[36, 58, 42, 76, 64, 92, 55, 70, 84, 61, 95, 72].map((height, index) => (
                  <div key={index} className="bg-white/[0.65] shadow-[0_0_18px_rgba(255,255,255,0.18)]" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </section>

          <main className="flex items-center justify-center">
            <div className="w-full max-w-[440px]">
              <div className="mb-6 flex items-center justify-between lg:hidden">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center border border-white/25 bg-white/[0.85]">
                    <img src={logoUrl} alt={company.name} className="h-9 w-9 object-contain" data-testid="login-logo-mobile" />
                  </span>
                  <div>
                    <div className="font-display text-xl font-semibold">{company.name}</div>
                    <div className="text-xs uppercase tracking-[0.16em] text-white/[0.65]">{t("auth_tagline")}</div>
                  </div>
                </div>
                <LanguageSwitch lang={lang} setLang={setLang} />
              </div>

              <div className="border border-white/[0.24] bg-white/[0.13] p-7 shadow-[0_30px_120px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8">
                <div className="mb-7 hidden justify-end lg:flex">
                  <LanguageSwitch lang={lang} setLang={setLang} />
                </div>

                <div className="mb-7">
                  <div className="mb-3 inline-flex items-center gap-2 border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/75 backdrop-blur-xl">
                    <LockKeyhole className="h-4 w-4" /> {t("login_secure_access")}
                  </div>
                  <h2 className="font-display text-3xl font-semibold tracking-normal text-white">{t("login_title")}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/[0.68]">{t("login_subtitle")}</p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs uppercase tracking-[0.12em] text-white/[0.65]">{t("email")}</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                      <Input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        data-testid="login-email-input"
                        className="h-11 rounded-sm border-white/20 bg-white/[0.12] pl-10 text-white placeholder:text-white/[0.38] focus-visible:ring-white/[0.35]"
                        placeholder={t("email_placeholder")}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs uppercase tracking-[0.12em] text-white/[0.65]">{t("password")}</Label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                      <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        data-testid="login-password-input"
                        className="h-11 rounded-sm border-white/20 bg-white/[0.12] pl-10 text-white placeholder:text-white/[0.38] focus-visible:ring-white/[0.35]"
                        placeholder={t("password")}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    data-testid="login-submit-button"
                    className="h-11 w-full rounded-sm border border-white/[0.18] bg-white text-slate-950 shadow-[0_18px_46px_rgba(255,255,255,0.18)] hover:bg-white/90"
                  >
                    {loading ? t("signing_in") : t("sign_in")}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                  <div className="text-right text-sm">
                    <Link to="/forgot-password" className="font-medium text-white/[0.65] hover:text-white" data-testid="forgot-password-link">
                      {t("forgot_password")}
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </main>
        </div>
      </div>
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

function MetricTile({ icon: Icon, label, value, accent }) {
  const colors = {
    cyan: "border-cyan-200/[0.35] bg-cyan-100/10 text-cyan-50",
    emerald: "border-emerald-200/[0.35] bg-emerald-100/10 text-emerald-50",
    amber: "border-amber-200/[0.35] bg-amber-100/10 text-amber-50",
  };
  return (
    <div className={`border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl ${colors[accent]}`}>
      <Icon className="mb-4 h-5 w-5" />
      <div className="font-display text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.14em]">{label}</div>
    </div>
  );
}
