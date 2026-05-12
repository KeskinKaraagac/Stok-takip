import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Package } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";
import { toast, Toaster } from "sonner";
import { formatApiError } from "../lib/format";

export default function Login() {
  const { login } = useAuth();
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
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#0047AB] flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 tracking-tight">StokTakip</h1>
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Üretim & Satış Yönetimi</p>
          </div>
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
        <div className="text-center text-sm text-slate-500 mt-6">
          Hesabınız yok mu?{" "}
          <Link to="/register" className="text-[#0047AB] hover:underline" data-testid="register-link">
            Kayıt Ol
          </Link>
        </div>
      </div>
    </div>
  );
}
