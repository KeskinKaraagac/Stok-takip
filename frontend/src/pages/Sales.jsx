import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ShoppingCart, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import api from "../lib/api";
import { formatCurrency, formatNumber, formatDate, formatApiError, todayISO } from "../lib/format";
import PageHeader from "../components/PageHeader";
import { toast } from "sonner";

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [form, setForm] = useState({
    date: todayISO(),
    customer_id: "",
    items: [],
    discount: 0,
    payment_status: "odendi",
    description: "",
  });
  const [addRow, setAddRow] = useState({ product_id: "", quantity: 1, unit_price: 0 });

  const load = async () => {
    try {
      const params = {};
      if (start) params.start = start;
      if (end) params.end = end;
      const [s, c, p] = await Promise.all([
        api.get("/sales", { params }),
        api.get("/customers"),
        api.get("/products", { params: { active_only: true } }),
      ]);
      setSales(s.data); setCustomers(c.data); setProducts(p.data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [start, end]);

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  const onProductPick = (pid) => {
    const p = products.find((x) => x.id === pid);
    setAddRow({ product_id: pid, quantity: 1, unit_price: p?.sale_price || 0 });
  };

  const addItem = () => {
    if (!addRow.product_id) { toast.error("Ürün seçin"); return; }
    const p = productMap[addRow.product_id];
    if (!p) return;
    const qty = Number(addRow.quantity);
    if (qty <= 0) { toast.error("Miktar 0'dan büyük olmalı"); return; }
    if (qty > Number(p.current_stock)) { toast.error(`Yetersiz stok (mevcut ${p.current_stock})`); return; }
    setForm({
      ...form,
      items: [...form.items, {
        product_id: p.id,
        product_name: p.name,
        quantity: qty,
        unit_price: Number(addRow.unit_price),
      }],
    });
    setAddRow({ product_id: "", quantity: 1, unit_price: 0 });
  };

  const removeItem = (i) => {
    const next = [...form.items];
    next.splice(i, 1);
    setForm({ ...form, items: next });
  };

  const gross = form.items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const net = Math.max(0, gross - Number(form.discount || 0));

  const submit = async () => {
    if (!form.customer_id) { toast.error("Müşteri seçin"); return; }
    if (form.items.length === 0) { toast.error("En az bir ürün ekleyin"); return; }
    try {
      const payload = {
        ...form,
        discount: Number(form.discount || 0),
        items: form.items.map((it) => ({ product_id: it.product_id, quantity: Number(it.quantity), unit_price: Number(it.unit_price) })),
      };
      const { data } = await api.post("/sales", payload);
      toast.success("Satış kaydedildi");
      setOpen(false);
      setReceipt(data);
      setForm({ date: todayISO(), customer_id: "", items: [], discount: 0, payment_status: "odendi", description: "" });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const statusBadge = (s) => {
    if (s === "odendi") return <Badge className="rounded-sm bg-emerald-50 text-emerald-700 border-emerald-200" variant="outline">Ödendi</Badge>;
    if (s === "kismi") return <Badge className="rounded-sm bg-amber-50 text-amber-700 border-amber-200" variant="outline">Kısmi</Badge>;
    return <Badge className="rounded-sm bg-red-50 text-red-700 border-red-200" variant="outline">Bekliyor</Badge>;
  };

  return (
    <div data-testid="sales-page">
      <PageHeader
        title="Günlük Satış"
        subtitle="POS tarzı satış kaydı — stoktan otomatik düşülür"
        actions={
          <Button onClick={() => setOpen(true)} data-testid="new-sale-btn" className="bg-[#0047AB] hover:bg-[#003380] rounded-sm">
            <Plus className="w-4 h-4 mr-2" /> Yeni Satış
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-end">
        <div>
          <Label className="text-xs uppercase tracking-wider text-slate-500">Başlangıç</Label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-sm mt-1" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-slate-500">Bitiş</Label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-sm mt-1" />
        </div>
        <Button variant="outline" onClick={() => { setStart(""); setEnd(""); }} className="rounded-sm">Temizle</Button>
      </div>

      <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white" data-testid="sales-table">
        <table className="dense w-full">
          <thead>
            <tr><th>Tarih</th><th>Müşteri</th><th>Ürün(ler)</th><th>Brüt</th><th>İskonto</th><th>Net</th><th>Ödeme</th></tr>
          </thead>
          <tbody>
            {sales.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-8">Kayıt yok</td></tr>}
            {sales.map((s) => (
              <tr key={s.id} data-testid={`sale-row-${s.id}`} className="cursor-pointer" onClick={() => setReceipt(s)}>
                <td>{formatDate(s.date)}</td>
                <td className="font-medium">{s.customer_name}</td>
                <td className="text-slate-600 max-w-[280px] truncate">{s.items.map((i) => `${i.product_name} ×${i.quantity}`).join(", ")}</td>
                <td className="tabular">{formatCurrency(s.gross_total)}</td>
                <td className="tabular text-slate-500">{formatCurrency(s.discount)}</td>
                <td className="tabular font-semibold">{formatCurrency(s.net_total)}</td>
                <td>{statusBadge(s.payment_status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="sale-dialog">
          <DialogHeader><DialogTitle>Yeni Satış</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Tarih</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-sm mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-slate-500">Müşteri</Label>
              <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                <SelectTrigger className="rounded-sm mt-1" data-testid="sale-customer-select"><SelectValue placeholder="Müşteri seçin" /></SelectTrigger>
                <SelectContent>
                  {customers.filter((c) => c.active).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border border-slate-200 p-3 rounded-sm mb-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Ürün Ekle</div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
              <div className="sm:col-span-6">
                <Select value={addRow.product_id} onValueChange={onProductPick}>
                  <SelectTrigger className="rounded-sm" data-testid="sale-product-select"><SelectValue placeholder="Ürün" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} (Stok: {formatNumber(p.current_stock, 2)})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Input type="number" step="0.01" placeholder="Miktar" value={addRow.quantity} onChange={(e) => setAddRow({ ...addRow, quantity: e.target.value })} className="rounded-sm" data-testid="sale-qty-input" />
              </div>
              <div className="sm:col-span-3">
                <Input type="number" step="0.01" placeholder="Birim fiyat" value={addRow.unit_price} onChange={(e) => setAddRow({ ...addRow, unit_price: e.target.value })} className="rounded-sm" data-testid="sale-price-input" />
              </div>
              <div className="sm:col-span-1">
                <Button onClick={addItem} className="w-full bg-[#0047AB] hover:bg-[#003380] rounded-sm" data-testid="add-sale-item">+</Button>
              </div>
            </div>
          </div>

          {form.items.length > 0 && (
            <div className="border border-slate-200 rounded-sm mb-4 overflow-x-auto">
              <table className="dense w-full">
                <thead><tr><th>Ürün</th><th>Miktar</th><th>Birim Fiyat</th><th>Toplam</th><th></th></tr></thead>
                <tbody>
                  {form.items.map((it, i) => (
                    <tr key={i}>
                      <td>{it.product_name}</td>
                      <td className="tabular">{formatNumber(it.quantity, 2)}</td>
                      <td className="tabular">{formatCurrency(it.unit_price)}</td>
                      <td className="tabular font-medium">{formatCurrency(it.quantity * it.unit_price)}</td>
                      <td><button onClick={() => removeItem(i)} className="text-slate-500 hover:text-red-600"><X className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">İskonto (£)</Label>
              <Input type="number" step="0.01" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="rounded-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Ödeme Durumu</Label>
              <Select value={form.payment_status} onValueChange={(v) => setForm({ ...form, payment_status: v })}>
                <SelectTrigger className="rounded-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="odendi">Ödendi</SelectItem>
                  <SelectItem value="bekliyor">Bekliyor</SelectItem>
                  <SelectItem value="kismi">Kısmi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-1 flex items-end justify-end">
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-slate-500">Net Tutar</div>
                <div className="kpi-value text-3xl text-[#0047AB] tabular">{formatCurrency(net)}</div>
                <div className="text-xs text-slate-500">Brüt: {formatCurrency(gross)}</div>
              </div>
            </div>
          </div>

          <Textarea placeholder="Açıklama" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-sm" />

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm">İptal</Button>
            <Button onClick={submit} className="bg-[#0047AB] hover:bg-[#003380] rounded-sm" data-testid="save-sale-btn">
              <ShoppingCart className="w-4 h-4 mr-2" /> Satışı Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="rounded-sm max-w-lg">
          <DialogHeader><DialogTitle>Satış Fişi</DialogTitle></DialogHeader>
          {receipt && (
            <div className="text-sm">
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-200 mb-3">
                <div className="text-slate-500">Tarih:</div><div>{formatDate(receipt.date)}</div>
                <div className="text-slate-500">Müşteri:</div><div>{receipt.customer_name}</div>
                <div className="text-slate-500">Ödeme:</div><div>{receipt.payment_status}</div>
              </div>
              <table className="dense w-full mb-3 border border-slate-200">
                <thead><tr><th>Ürün</th><th>Adet</th><th>Fiyat</th><th>Toplam</th></tr></thead>
                <tbody>
                  {receipt.items.map((it, i) => (
                    <tr key={i}>
                      <td>{it.product_name}</td>
                      <td className="tabular">{formatNumber(it.quantity, 2)}</td>
                      <td className="tabular">{formatCurrency(it.unit_price)}</td>
                      <td className="tabular">{formatCurrency(it.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Brüt</span><span className="tabular">{formatCurrency(receipt.gross_total)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">İskonto</span><span className="tabular">{formatCurrency(receipt.discount)}</span></div>
              <div className="flex justify-between text-lg font-semibold mt-2 pt-2 border-t border-slate-200"><span>Net Tutar</span><span className="tabular text-[#0047AB]">{formatCurrency(receipt.net_total)}</span></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
