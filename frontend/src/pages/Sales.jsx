import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, X, FileDown, FileSpreadsheet, ArrowDownToLine } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import api from "../lib/api";
import { formatCurrency, formatNumber, formatDate, formatApiError, todayISO } from "../lib/format";
import { hasPermission, downloadXlsx } from "../lib/permissions";
import { useLanguage } from "../context/LanguageContext";
import PageHeader from "../components/PageHeader";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

export default function Sales() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const canCreate = hasPermission(user, "sales.create");
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
    description: "",
  });
  const [addRow, setAddRow] = useState({ product_id: "", quantity: 1, unit_price: 0 });

  const load = useCallback(async () => {
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
  }, [start, end]);
  useEffect(() => { load(); }, [load]);

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  const onProductPick = (pid) => {
    const p = products.find((x) => x.id === pid);
    setAddRow({ product_id: pid, quantity: 1, unit_price: p?.sale_price || 0 });
  };

  const itemWeight = (productId, qty) => {
    const p = productMap[productId];
    if (!p) return 0;
    const unit = (p.unit || "").toLowerCase();
    if (unit === "kg") return Number(qty);
    return Number(qty) * Number(p.unit_weight || 0);
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
        product_unit: p.unit,
        quantity: qty,
        weight: itemWeight(p.id, qty),
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

  const totalQty = form.items.reduce((s, it) => s + Number(it.quantity || 0), 0);
  const totalWeight = form.items.reduce((s, it) => s + Number(it.weight || 0), 0);
  const gross = form.items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_price), 0);
  const net = Math.max(0, gross - Number(form.discount || 0));

  const submit = async () => {
    if (!form.customer_id) { toast.error("Müşteri seçin"); return; }
    if (form.items.length === 0) { toast.error("En az bir ürün ekleyin"); return; }
    try {
      const payload = {
        date: form.date,
        customer_id: form.customer_id,
        discount: Number(form.discount || 0),
        description: form.description || "",
        items: form.items.map((it) => ({ product_id: it.product_id, quantity: Number(it.quantity), unit_price: Number(it.unit_price) })),
      };
      const { data } = await api.post("/sales", payload);
      toast.success("Çıkış kaydedildi");
      setOpen(false);
      setReceipt(data);
      setForm({ date: todayISO(), customer_id: "", items: [], discount: 0, description: "" });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const downloadPdf = async (sid) => {
    if (!sid) return;
    try {
      const res = await api.get(`/sales/${sid}/receipt`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `fis-${sid.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div data-testid="sales-page">
      <PageHeader
        title={t("sales")}
        subtitle={t("sales_subtitle")}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => downloadXlsx("/export/sales.xlsx", "depo-cikis.xlsx", { ...(start ? { start } : {}), ...(end ? { end } : {}) }).catch((e) => toast.error(formatApiError(e)))}
              data-testid="export-sales-xlsx"
              className="rounded-sm"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" /> {t("excel")}
            </Button>
            {canCreate && (
              <Button onClick={() => setOpen(true)} data-testid="new-sale-btn" className="bg-[#0047AB] hover:bg-[#003380] rounded-sm">
                <Plus className="w-4 h-4 mr-2" /> {t("new_exit")}
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-end">
        <div>
          <Label className="text-xs uppercase tracking-wider text-slate-500">{t("start_date")}</Label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-sm mt-1" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-slate-500">{t("end_date")}</Label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-sm mt-1" />
        </div>
        <Button variant="outline" onClick={() => { setStart(""); setEnd(""); }} className="rounded-sm">{t("clear")}</Button>
      </div>

      <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white" data-testid="sales-table">
        <table className="dense w-full">
          <thead>
            <tr>
              <th>{t("date")}</th>
              <th>Müşteri</th>
              <th>Ürün(ler)</th>
              <th>Toplam Adet</th>
              <th>Toplam kg</th>
              <th>Mali Değer</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-8">{t("no_records")}</td></tr>}
            {sales.map((s) => (
              <tr key={s.id} data-testid={`sale-row-${s.id}`} className="cursor-pointer" onClick={() => setReceipt(s)}>
                <td>{formatDate(s.date)}</td>
                <td className="font-medium">{s.customer_name}</td>
                <td className="text-slate-600 max-w-[320px] truncate">{s.items.map((i) => `${i.product_name} ×${formatNumber(i.quantity, 0)}`).join(", ")}</td>
                <td className="tabular">{formatNumber(s.total_quantity || s.items.reduce((a, b) => a + Number(b.quantity || 0), 0), 0)}</td>
                <td className="tabular font-semibold">{formatNumber(s.total_weight || 0, 2)} kg</td>
                <td className="tabular text-slate-500">{formatCurrency(s.net_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="sale-dialog">
          <DialogHeader><DialogTitle>{t("new_exit")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("date")}</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-sm mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-slate-500">Müşteri</Label>
              <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                <SelectTrigger className="rounded-sm mt-1" data-testid="sale-customer-select"><SelectValue placeholder={t("select_customer")} /></SelectTrigger>
                <SelectContent>
                  {customers.filter((c) => c.active).map((c) => <SelectItem key={c.id} value={c.id}>{c.name} <span className="text-xs text-slate-400 ml-1">({c.customer_type})</span></SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border border-slate-200 p-3 rounded-sm mb-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">{t("add_item")}</div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
              <div className="sm:col-span-6">
                <Select value={addRow.product_id} onValueChange={onProductPick}>
                  <SelectTrigger className="rounded-sm" data-testid="sale-product-select"><SelectValue placeholder="Ürün" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} <span className="text-xs text-slate-400">(Stok: {formatNumber(p.current_stock, 0)} {p.unit})</span></SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Input type="number" step="1" placeholder="Adet" value={addRow.quantity} onChange={(e) => setAddRow({ ...addRow, quantity: e.target.value })} className="rounded-sm" data-testid="sale-qty-input" />
              </div>
              <div className="sm:col-span-3">
                <Input type="number" step="0.01" placeholder="Birim fiyat (£)" value={addRow.unit_price} onChange={(e) => setAddRow({ ...addRow, unit_price: e.target.value })} className="rounded-sm" data-testid="sale-price-input" />
              </div>
              <div className="sm:col-span-1">
                <Button onClick={addItem} className="w-full bg-[#0047AB] hover:bg-[#003380] rounded-sm" data-testid="add-sale-item">+</Button>
              </div>
            </div>
            {addRow.product_id && (
              <div className="text-xs text-slate-500 mt-2">
                ≈ {formatNumber(itemWeight(addRow.product_id, addRow.quantity), 2)} kg
              </div>
            )}
          </div>

          {form.items.length > 0 && (
            <div className="border border-slate-200 rounded-sm mb-4 overflow-x-auto">
              <table className="dense w-full">
                <thead><tr><th>Ürün</th><th>Adet</th><th>kg</th><th>Birim Fiyat</th><th>Toplam (£)</th><th></th></tr></thead>
                <tbody>
                  {form.items.map((it, i) => (
                    <tr key={i}>
                      <td>{it.product_name}</td>
                      <td className="tabular">{formatNumber(it.quantity, 0)} {it.product_unit}</td>
                      <td className="tabular">{formatNumber(it.weight, 2)}</td>
                      <td className="tabular">{formatCurrency(it.unit_price)}</td>
                      <td className="tabular font-medium">{formatCurrency(it.quantity * it.unit_price)}</td>
                      <td><button onClick={() => removeItem(i)} className="text-slate-500 hover:text-red-600"><X className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
            <div className="border border-slate-200 p-3 rounded-sm">
              <div className="text-xs uppercase tracking-wider text-slate-500">{t("total_quantity")}</div>
              <div className="kpi-value text-2xl text-slate-900 tabular mt-1">{formatNumber(totalQty, 0)}</div>
            </div>
            <div className="border border-slate-200 p-3 rounded-sm">
              <div className="text-xs uppercase tracking-wider text-slate-500">{t("total_weight")}</div>
              <div className="kpi-value text-2xl text-[#0047AB] tabular mt-1">{formatNumber(totalWeight, 2)} kg</div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">İskonto (£)</Label>
              <Input type="number" step="0.01" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="rounded-sm mt-1" />
            </div>
            <div className="border border-slate-200 p-3 rounded-sm bg-slate-50">
              <div className="text-xs uppercase tracking-wider text-slate-500">{t("estimated_value")}</div>
              <div className="kpi-value text-2xl text-slate-700 tabular mt-1">{formatCurrency(net)}</div>
              <div className="text-[10px] text-slate-400">Bilgilendirme amaçlı</div>
            </div>
          </div>

          <Textarea placeholder={t("description")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-sm" />

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm">{t("cancel")}</Button>
            <Button onClick={submit} className="bg-[#0047AB] hover:bg-[#003380] rounded-sm" data-testid="save-sale-btn">
              <ArrowDownToLine className="w-4 h-4 mr-2" /> {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="rounded-sm max-w-lg">
          <DialogHeader><DialogTitle>{t("exit_receipt")}</DialogTitle></DialogHeader>
          {receipt && (
            <div className="text-sm">
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-200 mb-3">
                <div className="text-slate-500">{t("date")}:</div><div>{formatDate(receipt.date)}</div>
                <div className="text-slate-500">Müşteri:</div><div>{receipt.customer_name}</div>
              </div>
              <table className="dense w-full mb-3 border border-slate-200">
                <thead><tr><th>Ürün</th><th>Adet</th><th>kg</th><th>Toplam</th></tr></thead>
                <tbody>
                  {receipt.items.map((it, i) => (
                    <tr key={i}>
                      <td>{it.product_name}</td>
                      <td className="tabular">{formatNumber(it.quantity, 0)}</td>
                      <td className="tabular">{formatNumber(it.weight || 0, 2)}</td>
                      <td className="tabular">{formatCurrency(it.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Toplam Adet</span><span className="tabular">{formatNumber(receipt.total_quantity || 0, 0)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Toplam Ağırlık</span><span className="tabular">{formatNumber(receipt.total_weight || 0, 2)} kg</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">{t("estimated_value")}</span><span className="tabular text-[#0047AB] font-medium">{formatCurrency(receipt.net_total)}</span></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceipt(null)} className="rounded-sm">Kapat</Button>
            <Button onClick={() => downloadPdf(receipt?.id)} className="bg-[#0047AB] hover:bg-[#003380] rounded-sm" data-testid="download-receipt-pdf">
              <FileDown className="w-4 h-4 mr-2" /> PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
