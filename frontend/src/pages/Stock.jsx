import { useEffect, useMemo, useState } from "react";
import { Wrench, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import api from "../lib/api";
import { formatCurrency, formatNumber, formatDateTime, formatApiError } from "../lib/format";
import { hasPermission, downloadXlsx } from "../lib/permissions";
import PageHeader from "../components/PageHeader";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

const TYPE_LABEL = {
  uretim: "Üretim",
  satis: "Satış",
  manuel: "Manuel Düzeltme",
  fire: "Fire",
  iade: "İade",
  baslangic: "Başlangıç",
};

export default function Stock() {
  const { user } = useAuth();
  const canAdjust = ["admin", "personel"].includes(user?.role);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [filterProduct, setFilterProduct] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ product_id: "", movement_type: "manuel", quantity: 0, description: "" });

  const load = async () => {
    try {
      const [p, m] = await Promise.all([
        api.get("/products"),
        api.get("/stock/movements", { params: filterProduct !== "all" ? { product_id: filterProduct } : {} }),
      ]);
      setProducts(p.data); setMovements(m.data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterProduct]);

  const pmap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  // Aggregate in/out per product
  const totals = useMemo(() => {
    const acc = {};
    movements.forEach((m) => {
      acc[m.product_id] = acc[m.product_id] || { inq: 0, outq: 0 };
      acc[m.product_id].inq += Number(m.in_qty || 0);
      acc[m.product_id].outq += Number(m.out_qty || 0);
    });
    return acc;
  }, [movements]);

  const submitAdjust = async () => {
    if (!form.product_id) { toast.error("Ürün seçin"); return; }
    if (Number(form.quantity) === 0) { toast.error("Miktar 0 olamaz"); return; }
    try {
      await api.post("/stock/adjust", { ...form, quantity: Number(form.quantity) });
      toast.success("Stok düzeltme kaydedildi");
      setOpen(false);
      setForm({ product_id: "", movement_type: "manuel", quantity: 0, description: "" });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div data-testid="stock-page">
      <PageHeader
        title="Stok Durumu"
        subtitle="Güncel stoklar ve hareket geçmişi"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => downloadXlsx("/export/stock.xlsx", "stok-raporu.xlsx").catch((e) => toast.error(formatApiError(e)))}
              data-testid="export-stock-xlsx"
              className="rounded-sm"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
            </Button>
            {canAdjust && (
              <Button onClick={() => setOpen(true)} data-testid="adjust-stock-btn" className="bg-[#0047AB] hover:bg-[#003380] rounded-sm">
                <Wrench className="w-4 h-4 mr-2" /> Manuel Düzeltme
              </Button>
            )}
          </>
        }
      />

      <Tabs defaultValue="status">
        <TabsList className="rounded-sm">
          <TabsTrigger value="status" data-testid="tab-stock-status">Stok Durumu</TabsTrigger>
          <TabsTrigger value="movements" data-testid="tab-stock-movements">Hareket Geçmişi</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-4">
          <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white">
            <table className="dense w-full">
              <thead>
                <tr><th>Ürün</th><th>Kod</th><th>Kategori</th><th>Birim</th><th>Toplam Giriş</th><th>Toplam Çıkış</th><th>Güncel Stok</th><th>Stok Ağırlığı (kg)</th><th>Satış Değeri</th><th>Durum</th></tr>
              </thead>
              <tbody>
                {products.length === 0 && <tr><td colSpan={10} className="text-center text-slate-400 py-8">Ürün yok</td></tr>}
                {products.map((p) => {
                  const tt = totals[p.id] || { inq: 0, outq: 0 };
                  const stock = Number(p.current_stock || 0);
                  const low = Number(p.min_stock) > 0 && stock <= Number(p.min_stock);
                  const unit = (p.unit || "").toLowerCase();
                  const stockKg = unit === "kg" ? stock : stock * Number(p.unit_weight || 0);
                  return (
                    <tr key={p.id}>
                      <td className="font-medium">{p.name}</td>
                      <td className="text-slate-600">{p.code}</td>
                      <td className="text-slate-600">{p.category || "-"}</td>
                      <td>{p.unit}</td>
                      <td className="tabular text-emerald-700">{formatNumber(tt.inq, 0)}</td>
                      <td className="tabular text-red-600">{formatNumber(tt.outq, 0)}</td>
                      <td className={`tabular font-semibold ${low ? "text-amber-600" : ""}`}>{formatNumber(stock, 0)}</td>
                      <td className="tabular">{formatNumber(stockKg, 2)} kg</td>
                      <td className="tabular">{formatCurrency(stock * Number(p.sale_price))}</td>
                      <td>
                        {low ? <span className="inline-flex items-center gap-1 text-amber-700 text-xs"><AlertTriangle className="w-3 h-3" /> Düşük Stok</span> : <span className="text-emerald-700 text-xs">Normal</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <div className="mb-4">
            <Label className="text-xs uppercase tracking-wider text-slate-500">Ürün Filtre</Label>
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger className="w-72 rounded-sm mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Ürünler</SelectItem>
                {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white">
            <table className="dense w-full">
              <thead>
                <tr><th>Tarih</th><th>Ürün</th><th>Tip</th><th>Giriş</th><th>Çıkış</th><th>Önceki Stok</th><th>Yeni Stok</th><th>Açıklama</th></tr>
              </thead>
              <tbody>
                {movements.length === 0 && <tr><td colSpan={8} className="text-center text-slate-400 py-8">Hareket yok</td></tr>}
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>{formatDateTime(m.date)}</td>
                    <td className="font-medium">{pmap[m.product_id]?.name || "—"}</td>
                    <td>{TYPE_LABEL[m.movement_type] || m.movement_type}</td>
                    <td className="tabular text-emerald-700">{m.in_qty ? formatNumber(m.in_qty, 2) : "-"}</td>
                    <td className="tabular text-red-600">{m.out_qty ? formatNumber(m.out_qty, 2) : "-"}</td>
                    <td className="tabular">{formatNumber(m.previous_stock, 2)}</td>
                    <td className="tabular font-semibold">{formatNumber(m.new_stock, 2)}</td>
                    <td className="text-slate-600">{m.description || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm max-w-md">
          <DialogHeader><DialogTitle>Manuel Stok Düzeltme</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Ürün</Label>
              <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                <SelectTrigger className="rounded-sm mt-1"><SelectValue placeholder="Ürün seçin" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} (Stok: {formatNumber(p.current_stock, 2)})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Tip</Label>
              <Select value={form.movement_type} onValueChange={(v) => setForm({ ...form, movement_type: v })}>
                <SelectTrigger className="rounded-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manuel">Manuel Düzeltme</SelectItem>
                  <SelectItem value="fire">Fire</SelectItem>
                  <SelectItem value="iade">İade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Miktar (+ giriş / - çıkış)</Label>
              <Input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="rounded-sm mt-1" data-testid="adjust-qty-input" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Açıklama</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-sm mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm">İptal</Button>
            <Button onClick={submitAdjust} className="bg-[#0047AB] hover:bg-[#003380] rounded-sm" data-testid="save-adjust-btn">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
