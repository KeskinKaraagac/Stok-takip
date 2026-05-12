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
import { downloadXlsx } from "../lib/permissions";
import PageHeader from "../components/PageHeader";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export default function Stock() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const canAdjust = ["admin", "personel"].includes(user?.role);
  const TYPE_LABEL = {
    uretim: t("type_uretim"),
    satis: t("type_satis"),
    manuel: t("type_manuel"),
    fire: t("type_fire"),
    iade: t("type_iade"),
    baslangic: t("type_baslangic"),
  };
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
    if (!form.product_id) { toast.error(t("toast_select_product")); return; }
    if (Number(form.quantity) === 0) { toast.error(t("toast_amount_zero")); return; }
    try {
      await api.post("/stock/adjust", { ...form, quantity: Number(form.quantity) });
      toast.success(t("toast_stock_adjusted"));
      setOpen(false);
      setForm({ product_id: "", movement_type: "manuel", quantity: 0, description: "" });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div data-testid="stock-page" className="animate-fadeIn">
      <PageHeader
        title={t("stock")}
        subtitle={t("stock_subtitle")}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => downloadXlsx("/export/stock.xlsx", "stok-raporu.xlsx").catch((e) => toast.error(formatApiError(e)))}
              data-testid="export-stock-xlsx"
              className="rounded-sm"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" /> {t("excel")}
            </Button>
            {canAdjust && (
              <Button onClick={() => setOpen(true)} data-testid="adjust-stock-btn" className="bg-[#0047AB] hover:bg-[#003380] rounded-sm">
                <Wrench className="w-4 h-4 mr-2" /> {t("manual_adjust")}
              </Button>
            )}
          </>
        }
      />

      <Tabs defaultValue="status">
        <TabsList className="rounded-sm">
          <TabsTrigger value="status" data-testid="tab-stock-status">{t("stock_status")}</TabsTrigger>
          <TabsTrigger value="movements" data-testid="tab-stock-movements">{t("movement_history")}</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-4">
          <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white">
            <table className="dense w-full">
              <thead>
                <tr>
                  <th>{t("product")}</th>
                  <th>{t("code")}</th>
                  <th>{t("category")}</th>
                  <th>{t("unit")}</th>
                  <th>{t("total_in")}</th>
                  <th>{t("total_out")}</th>
                  <th>{t("current_stock")}</th>
                  <th>{t("stock_weight_kg")}</th>
                  <th>{t("sale_value")}</th>
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 && <tr><td colSpan={10} className="text-center text-slate-400 py-8">{t("no_products")}</td></tr>}
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
                        {low
                          ? <span className="inline-flex items-center gap-1 text-amber-700 text-xs"><AlertTriangle className="w-3 h-3" /> {t("low_stock_label")}</span>
                          : <span className="text-emerald-700 text-xs">{t("normal_label")}</span>}
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
            <Label className="text-xs uppercase tracking-wider text-slate-500">{t("product_filter")}</Label>
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger className="w-72 rounded-sm mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all_products")}</SelectItem>
                {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white">
            <table className="dense w-full">
              <thead>
                <tr>
                  <th>{t("date")}</th>
                  <th>{t("product")}</th>
                  <th>{t("type_col")}</th>
                  <th>{t("in_qty")}</th>
                  <th>{t("out_qty")}</th>
                  <th>{t("previous_stock")}</th>
                  <th>{t("new_stock")}</th>
                  <th>{t("description")}</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 && <tr><td colSpan={8} className="text-center text-slate-400 py-8">{t("no_movements")}</td></tr>}
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>{formatDateTime(m.date)}</td>
                    <td className="font-medium">{pmap[m.product_id]?.name || "—"}</td>
                    <td>{TYPE_LABEL[m.movement_type] || m.movement_type}</td>
                    <td className="tabular text-emerald-700">{m.in_qty ? formatNumber(m.in_qty, 0) : "-"}</td>
                    <td className="tabular text-red-600">{m.out_qty ? formatNumber(m.out_qty, 0) : "-"}</td>
                    <td className="tabular">{formatNumber(m.previous_stock, 0)}</td>
                    <td className="tabular font-semibold">{formatNumber(m.new_stock, 0)}</td>
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
          <DialogHeader><DialogTitle>{t("manual_stock_adjust")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("product")}</Label>
              <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                <SelectTrigger className="rounded-sm mt-1"><SelectValue placeholder={t("toast_select_product")} /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({t("stock")}: {formatNumber(p.current_stock, 0)})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("movement_type")}</Label>
              <Select value={form.movement_type} onValueChange={(v) => setForm({ ...form, movement_type: v })}>
                <SelectTrigger className="rounded-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manuel">{t("type_manuel")}</SelectItem>
                  <SelectItem value="fire">{t("type_fire")}</SelectItem>
                  <SelectItem value="iade">{t("type_iade")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("quantity_signed")}</Label>
              <Input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="rounded-sm mt-1" data-testid="adjust-qty-input" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("description")}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-sm mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm">{t("cancel")}</Button>
            <Button onClick={submitAdjust} className="bg-[#0047AB] hover:bg-[#003380] rounded-sm" data-testid="save-adjust-btn">{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
