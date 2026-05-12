import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import api from "../lib/api";
import { toast, Toaster } from "sonner";
import { formatApiError } from "../lib/format";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setDone(data);
      toast.success("Şifre sıfırlama bağlantısı oluşturuldu");
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
        <h2 className="text-2xl font-display font-semibold text-slate-900 mb-1">Şifremi Unuttum</h2>
        <p className="text-sm text-slate-500 mb-6">E-postanızı girin, size sıfırlama bağlantısı oluşturalım.</p>

        {done ? (
          <div className="space-y-4" data-testid="forgot-success">
            <div className="border border-emerald-200 bg-emerald-50 text-emerald-800 p-4 text-sm rounded-sm">
              {done.message}
            </div>
            {done.dev_link && (
              <div className="border border-slate-200 p-3 rounded-sm text-xs">
                <div className="text-slate-500 uppercase tracking-wider mb-2">Geliştirme: Sıfırlama Bağlantısı</div>
                <Link to={`/reset-password?token=${done.dev_token}`} className="text-[#0047AB] hover:underline break-all" data-testid="dev-reset-link">
                  Sıfırlama sayfasına git
                </Link>
              </div>
            )}
            <Link to="/login" className="block text-center text-sm text-slate-500 hover:text-[#0047AB]">Giriş sayfasına dön</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="forgot-email-input"
                className="rounded-sm"
                placeholder="ornek@firma.com"
              />
            </div>
            <Button type="submit" disabled={loading} data-testid="forgot-submit-button" className="w-full bg-[#0047AB] hover:bg-[#003380] rounded-sm">
              {loading ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Oluştur"}
            </Button>
            <div className="text-center text-sm">
              <Link to="/login" className="text-slate-500 hover:text-[#0047AB]">Giriş sayfasına dön</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
