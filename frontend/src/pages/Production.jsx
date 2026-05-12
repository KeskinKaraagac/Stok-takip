import { useEffect, useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "../components/ui/alert-dialog";
import api from "../lib/api";
import { formatNumber, formatDate, formatApiError, todayISO } from "../lib/format";
import PageHeader from "../components/PageHeader";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

export default function Production() {
  const { user } = useAuth();
  const canDelete = user?.role === "admin";
  const [products, setProducts] = useState([]);
  const [productions, setProductions] = useState([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: todayISO(), product_id: "", quantity: "", unit: "adet", lot_number: "", cost: 0, description: "" });
  const [confirmDel, setConfirmDel] = useState(null);

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  const load = async () => {
    try {
      const params = {};
      if (start) params.start = start;
      if (end) params.end = end;
      const [pr, prods] = await Promise.all([
        api.get("/productions", { params }),
        api.get("/products", { params: { active_only: true } }),
      ]);
      setProductions(pr.data);
      setProducts(prods.data);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [start, end]);

  const onProductChange = (id) => {
    const p = products.find((x) => x.id === id);
    setForm({ ...form, product_id: id, unit: p?.unit || "adet", cost: p?.cost_price || 0 });
  };

  const submit = async () => {
    if (!form.product_id) { toast.error("Ürün seçin"); return; }
    if (!form.quantity || Number(form.quantity) <= 0) { toast.error("Geçerli bir miktar girin"); return; }
    try {
      await api.post("/productions", {
        ...form,
        quantity: Number(form.quantity),
        cost: Number(form.cost) || 0,
      });
      toast.success("Üretim kaydedildi, stoğa eklendi");
      setOpen(false);
      setForm({ date: todayISO(), product_id: "", quantity: "", unit: "adet", lot_number: "", cost: 0, description: "" });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const remove = async () => {
    try {
      await api.delete(`/productions/${confirmDel.id}`);
      toast.success("Üretim kaydı silindi, stoktan düşüldü");
      setConfirmDel(null);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div data-testid="production-page">
      <PageHeader
        title="Üretim Girişi"
        subtitle="Üretim kayıtları stoğa otomatik eklenir"
        actions={
          <Button onClick={() => setOpen(true)} data-testid="add-production-btn" className="bg-[#0047AB] hover:bg-[#003380] rounded-sm">
            <Plus className="w-4 h-4 mr-2" /> Üretim Kaydı
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-end">
        <div>
          <Label className="text-xs uppercase tracking-wider text-slate-500">Başlangıç</Label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-sm mt-1" data-testid="prod-start-date" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-slate-500">Bitiş</Label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-sm mt-1" data-testid="prod-end-date" />
        </div>
        <Button variant="outline" onClick={() => { setStart(""); setEnd(""); }} className="rounded-sm">Temizle</Button>
      </div>

      <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white" data-testid="production-table">
        <table className="dense w-full">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Ürün</th>
              <th>Miktar</th>
              <th>Birim</th>
              <th>Lot / Parti</th>
              <th>Maliyet</th>
              <th>Açıklama</th>
              <th className="text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {productions.length === 0 && <tr><td colSpan={8} className="text-center text-slate-400 py-8">Kayıt bulunamadı</td></tr>}
            {productions.map((p) => (
              <tr key={p.id} data-testid={`production-row-${p.id}`}>
                <td>{formatDate(p.date)}</td>
                <td className="font-medium text-slate-800">{productMap[p.product_id]?.name || "—"}</td>
                <td className="tabular">{formatNumber(p.quantity, 2)}</td>
                <td>{p.unit}</td>
                <td>{p.lot_number || "-"}</td>
                <td className="tabular">£{formatNumber(p.cost, 2)}</td>
                <td className="text-slate-600">{p.description || "-"}</td>
                <td className="text-right">
                  {canDelete && (
                    <button onClick={() => setConfirmDel(p)} className="text-slate-500 hover:text-red-600" data-testid={`delete-production-${p.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm max-w-xl">
          <DialogHeader><DialogTitle>Yeni Üretim Kaydı</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Tarih</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-sm mt-1" data-testid="prod-date" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Ürün</Label>
              <Select value={form.product_id} onValueChange={onProductChange}>
                <SelectTrigger className="rounded-sm mt-1" data-testid="prod-product-select"><SelectValue placeholder="Ürün seçin" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Miktar</Label>
              <Input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="rounded-sm mt-1" data-testid="prod-quantity" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Birim</Label>
              <Input value={form.unit} disabled className="rounded-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Lot / Parti No</Label>
              <Input value={form.lot_number} onChange={(e) => setForm({ ...form, lot_number: e.target.value })} className="rounded-sm mt-1" data-testid="prod-lot" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Üretim Maliyeti (£)</Label>
              <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="rounded-sm mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-slate-500">Açıklama</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-sm mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm">İptal</Button>
            <Button onClick={submit} className="bg-[#0047AB] hover:bg-[#003380] rounded-sm" data-testid="save-production-btn">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent className="rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Üretim kaydı silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              Kayıt silindiğinde ürün stoğundan ilgili miktar düşülecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">İptal</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-red-600 hover:bg-red-700 rounded-sm">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
