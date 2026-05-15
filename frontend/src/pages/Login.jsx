import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import { toast, Toaster } from "sonner";
import { formatApiError } from "../lib/format";

export default function Login() {
  const { login } = useAuth();
  const { company, logoUrl } = useCompany();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Giriş başarılı");
      navigate("/");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Toaster position="bottom-right" richColors />
      <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <img src={logoUrl} alt={company.name} className="w-24 h-24 object-contain mb-3" data-testid="login-logo" />
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">{company.name}</h1>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mt-1">Üretim & Satış Yönetimi</p>
        </div>
        <h2 className="text-2xl font-display font-semibold text-slate-900 mb-1">Giriş Yap</h2>
        <p className="text-sm text-slate-500 mb-6">Hesabınıza giriş yaparak devam edin.</p>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="login-email-input"
              className="rounded-sm"
              placeholder="ornek@firma.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password-input"
              className="rounded-sm"
              placeholder="••••••••"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            data-testid="login-submit-button"
            className="w-full bg-[#0047AB] hover:bg-[#003380] rounded-sm"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </Button>
          <div className="text-right text-sm">
            <Link to="/forgot-password" className="text-slate-500 hover:text-[#0047AB]" data-testid="forgot-password-link">
              Şifremi unuttum
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
