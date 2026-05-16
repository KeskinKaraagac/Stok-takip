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
import { ArrowRight, BarChart3, Boxes, PackageCheck, ShieldCheck, Truck } from "lucide-react";

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
    <div className="min-h-screen bg-[#f5f7fb] p-4 text-slate-900 sm:p-8">
      <Toaster position="bottom-right" richColors />
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center sm:min-h-[calc(100vh-4rem)]">
        <div className="grid w-full gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <main className="sphere-card-soft flex items-center p-6 sm:p-8">
            <div className="w-full">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-md border border-slate-200 bg-white">
                    <img src={logoUrl} alt={company.name} className="h-9 w-9 object-contain" data-testid="login-logo" />
                  </span>
                  <div>
                    <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">{company.name}</h1>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">{t("auth_tagline")}</p>
                  </div>
                </div>
                <LanguageSwitch lang={lang} setLang={setLang} />
              </div>

              <div className="mb-7">
                <div className="mb-3 h-1 w-14 rounded-full bg-[#145BFF]" />
                <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-900">{t("login_title")}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{t("login_subtitle")}</p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="login-email-input"
                    className="h-11 rounded-md border-slate-200 bg-slate-50"
                    placeholder={t("email_placeholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t("password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="login-password-input"
                    className="h-11 rounded-md border-slate-200 bg-slate-50"
                    placeholder={t("password")}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  data-testid="login-submit-button"
                  className="h-11 w-full rounded-md bg-[#145BFF] shadow-[0_14px_28px_rgba(20,91,255,0.18)] hover:bg-[#0B4BE0]"
                >
                  {loading ? t("signing_in") : t("sign_in")}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
                <div className="text-right text-sm">
                  <Link to="/forgot-password" className="font-medium text-slate-500 hover:text-[#145BFF]" data-testid="forgot-password-link">
                    {t("forgot_password")}
                  </Link>
                </div>
              </form>
            </div>
          </main>

          <section className="sphere-card-soft hidden min-h-[620px] overflow-hidden p-8 lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#145BFF]">
                <ShieldCheck className="h-4 w-4" /> {t("secured_workspace")}
              </div>
              <h2 className="font-display max-w-xl text-4xl font-semibold leading-tight tracking-tight text-slate-950">
                {t("login_visual_title")}
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MetricCell icon={Boxes} label={t("login_metric_stock")} value="18.4k" />
              <MetricCell icon={PackageCheck} label={t("login_metric_production")} value="96%" />
              <MetricCell icon={Truck} label={t("login_metric_exit")} value="124" />
            </div>

            <div className="rounded-lg border border-slate-200 bg-[#f8fbff] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{t("login_activity")}</div>
                  <div className="font-display mt-1 text-xl font-semibold text-slate-900">+24%</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-[#145BFF] shadow-sm">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>
              <div className="grid h-44 grid-cols-12 items-end gap-2">
                {[36, 58, 42, 76, 64, 92, 55, 70, 84, 61, 95, 72].map((height, index) => (
                  <div key={index} className="rounded-t-sm bg-[#145BFF]" style={{ height: `${height}%`, opacity: 0.42 + index * 0.04 }} />
                ))}
              </div>
            </div>
          </section>
        </div>
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

function MetricCell({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-[#f8fbff] p-4">
      <Icon className="mb-4 h-5 w-5 text-[#145BFF]" />
      <div className="font-display text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">{label}</div>
    </div>
  );
}
