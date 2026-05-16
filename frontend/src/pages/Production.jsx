import { useCallback, useEffect, useState, useMemo } from "react";
import { Plus, Trash2, FileSpreadsheet } from "lucide-react";
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
import { hasPermission, downloadXlsx } from "../lib/permissions";
import PageHeader from "../components/PageHeader";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export default function Production() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const canCreate = hasPermission(user, "productions.create");
  const canDelete = hasPermission(user, "productions.delete");
  const [products, setProducts] = useState([]);
  const [productions, setProductions] = useState([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: todayISO(), product_id: "", quantity: "", unit: "adet", lot_number: "", description: "" });
  const [confirmDel, setConfirmDel] = useState(null);

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  const load = useCallback(async () => {
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
  }, [start, end]);

  useEffect(() => { load(); }, [load]);

  const onProductChange = (id) => {
    const p = products.find((x) => x.id === id);
    setForm({ ...form, product_id: id, unit: p?.unit || "adet" });
  };

  const submit = async () => {
    if (!form.product_id) { toast.error(t("toast_select_product")); return; }
    if (!form.quantity || Number(form.quantity) <= 0) { toast.error(t("toast_valid_quantity")); return; }
    try {
      await api.post("/productions", { ...form, quantity: Number(form.quantity), cost: 0 });
      toast.success(t("toast_production_added"));
      setOpen(false);
      setForm({ date: todayISO(), product_id: "", quantity: "", unit: "adet", lot_number: "", description: "" });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const remove = async () => {
    try {
      await api.delete(`/productions/${confirmDel.id}`);
      toast.success(t("toast_production_deleted"));
      setConfirmDel(null);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div data-testid="production-page" className="animate-fadeIn">
      <PageHeader
        title={t("production")}
        subtitle={t("production_subtitle")}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => downloadXlsx("/export/productions.xlsx", "uretim.xlsx", { ...(start ? { start } : {}), ...(end ? { end } : {}) }).catch((e) => toast.error(formatApiError(e)))}
              data-testid="export-productions-xlsx"
              className="rounded-sm"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" /> {t("excel")}
            </Button>
            {canCreate && (
              <Button onClick={() => setOpen(true)} data-testid="add-production-btn" className="bg-[#0047AB] hover:bg-[#003380] rounded-sm">
                <Plus className="w-4 h-4 mr-2" /> {t("new_production")}
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-end">
        <div>
          <Label className="text-xs uppercase tracking-wider text-slate-500">{t("start_date")}</Label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-sm mt-1" data-testid="prod-start-date" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-slate-500">{t("end_date")}</Label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-sm mt-1" data-testid="prod-end-date" />
        </div>
        <Button variant="outline" onClick={() => { setStart(""); setEnd(""); }} className="rounded-sm">{t("clear")}</Button>
      </div>

      <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white" data-testid="production-table">
        <table className="dense w-full">
          <thead>
            <tr>
              <th>{t("date")}</th>
              <th>{t("product")}</th>
              <th>{t("production_table_amount")}</th>
              <th>{t("unit")}</th>
              <th>{t("lot_short")}</th>
              <th>{t("description")}</th>
              <th className="text-right">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {productions.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-8">{t("no_records")}</td></tr>}
            {productions.map((p) => (
              <tr key={p.id} data-testid={`production-row-${p.id}`}>
                <td>{formatDate(p.date)}</td>
                <td className="font-medium text-slate-800">{productMap[p.product_id]?.name || "—"}</td>
                <td className="tabular">{formatNumber(p.quantity, 0)}</td>
                <td>{p.unit}</td>
                <td>{p.lot_number || "-"}</td>
                <td className="text-slate-600">{p.description || "-"}</td>
                <td className="text-right">
                  {canDelete && (
                    <button onClick={() => setConfirmDel(p)} className="text-slate-500 hover:text-red-600 transition-colors" data-testid={`delete-production-${p.id}`}>
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
          <DialogHeader><DialogTitle>{t("new_production_record")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("date")}</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-sm mt-1" data-testid="prod-date" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("product")}</Label>
              <Select value={form.product_id} onValueChange={onProductChange}>
                <SelectTrigger className="rounded-sm mt-1" data-testid="prod-product-select"><SelectValue placeholder={t("toast_select_product")} /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("quantity")}</Label>
              <Input type="number" step="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="rounded-sm mt-1" data-testid="prod-quantity" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("unit")}</Label>
              <Input value={form.unit} disabled className="rounded-sm mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("lot_no")}</Label>
              <Input value={form.lot_number} onChange={(e) => setForm({ ...form, lot_number: e.target.value })} className="rounded-sm mt-1" data-testid="prod-lot" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("description")}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-sm mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm">{t("cancel")}</Button>
            <Button onClick={submit} className="bg-[#0047AB] hover:bg-[#003380] rounded-sm" data-testid="save-production-btn">{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent className="rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_production_q")}</AlertDialogTitle>
            <AlertDialogDescription>{t("delete_production_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-red-600 hover:bg-red-700 rounded-sm">{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
