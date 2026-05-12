import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import api from "../lib/api";
import { toast, Toaster } from "sonner";
import { formatApiError } from "../lib/format";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = params.get("token") || "";
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Şifre en az 6 karakter olmalı"); return; }
    if (password !== confirm) { toast.error("Şifreler eşleşmiyor"); return; }
    if (!token) { toast.error("Token gerekli"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Şifre güncellendi, giriş yapabilirsiniz");
      setTimeout(() => navigate("/login"), 1000);
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
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mt-1">Şifre Sıfırlama</p>
        </div>
        <h2 className="text-2xl font-display font-semibold text-slate-900 mb-1">Yeni Şifre Belirle</h2>
        <p className="text-sm text-slate-500 mb-6">Aşağıya yeni şifrenizi girin.</p>

        <form onSubmit={submit} className="space-y-4">
          {!tokenFromUrl && (
            <div className="space-y-1.5">
              <Label htmlFor="token">Sıfırlama Tokeni</Label>
              <Input id="token" required value={token} onChange={(e) => setToken(e.target.value)} className="rounded-sm" data-testid="reset-token-input" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="password">Yeni Şifre (min 6)</Label>
            <Input id="password" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-sm" data-testid="reset-password-input" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Şifre (Tekrar)</Label>
            <Input id="confirm" type="password" minLength={6} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="rounded-sm" data-testid="reset-confirm-input" />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-[#0047AB] hover:bg-[#003380] rounded-sm" data-testid="reset-submit-button">
            {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </Button>
          <div className="text-center text-sm">
            <Link to="/login" className="text-slate-500 hover:text-[#0047AB]">Giriş sayfasına dön</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
