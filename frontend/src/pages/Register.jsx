import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";
import { toast, Toaster } from "sonner";
import { formatApiError } from "../lib/format";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Kayıt başarılı");
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
          <img src="/logo.jpg" alt="StokTakip" className="w-24 h-24 object-contain mb-3" />
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">StokTakip</h1>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mt-1">Üretim & Satış Yönetimi</p>
        </div>
        <h2 className="text-2xl font-display font-semibold text-slate-900 mb-1">Kayıt Ol</h2>
        <p className="text-sm text-slate-500 mb-6">Yeni bir hesap oluşturun.</p>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Ad Soyad</Label>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="register-name-input" className="rounded-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-posta</Label>
            <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="register-email-input" className="rounded-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Şifre (min 6 karakter)</Label>
            <Input id="password" type="password" minLength={6} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="register-password-input" className="rounded-sm" />
          </div>
          <Button type="submit" disabled={loading} data-testid="register-submit-button" className="w-full bg-[#0047AB] hover:bg-[#003380] rounded-sm">
            {loading ? "Kaydediliyor..." : "Kayıt Ol"}
          </Button>
        </form>
        <div className="text-center text-sm text-slate-500 mt-6">
          Zaten hesabınız var mı?{" "}
          <Link to="/login" className="text-[#0047AB] hover:underline" data-testid="login-link">
            Giriş Yap
          </Link>
        </div>
      </div>
    </div>
  );
}
