import { useCallback, useEffect, useState, useMemo } from "react";
import { Plus, Search, Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "../components/ui/alert-dialog";
import { Badge } from "../components/ui/badge";
import api from "../lib/api";
import { formatCurrency, formatDate, formatApiError } from "../lib/format";
import { hasPermission } from "../lib/permissions";
import PageHeader from "../components/PageHeader";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const EMPTY = { name: "", phone: "", email: "", address: "", tax_no: "", customer_type: "Retail", active: true, notes: "" };

export default function Customers() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const canCreate = hasPermission(user, "customers.create");
  const canEdit = hasPermission(user, "customers.edit");
  const canDelete = hasPermission(user, "customers.delete");
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmDel, setConfirmDel] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/customers");
      setItems(data);
    } catch (e) { toast.error(formatApiError(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return items.filter((c) => {
      const s = search.toLowerCase();
      const ms = !s || c.name.toLowerCase().includes(s) || (c.phone || "").includes(s) || (c.email || "").toLowerCase().includes(s);
      const mt = type === "all" || c.customer_type === type;
      return ms && mt;
    });
  }, [items, search, type]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...EMPTY, ...c }); setOpen(true); };

  const submit = async () => {
    if (!form.name) { toast.error(t("toast_customer_name_required")); return; }
    try {
      if (editing) await api.put(`/customers/${editing.id}`, form);
      else await api.post("/customers", form);
      toast.success(editing ? t("toast_customer_updated") : t("toast_customer_added"));
      setOpen(false);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const remove = async () => {
    try {
      await api.delete(`/customers/${confirmDel.id}`);
      toast.success(t("toast_customer_deactivated"));
      setConfirmDel(null);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const openDetail = async (c) => {
    try {
      const { data } = await api.get(`/customers/${c.id}`);
      setDetail(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div data-testid="customers-page" className="animate-fadeIn">
      <PageHeader
        title={t("customers")}
        subtitle={t("customers_subtitle")}
        actions={canCreate ? (
          <Button onClick={openCreate} data-testid="add-customer-btn" className="bg-[#0047AB] hover:bg-[#003380] rounded-sm">
            <Plus className="w-4 h-4 mr-2" /> {t("new_customer")}
          </Button>
        ) : null}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("customer_search_placeholder")} className="pl-9 rounded-sm" data-testid="customer-search" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full sm:w-56 rounded-sm"><SelectValue placeholder={t("customer_type")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_types")}</SelectItem>
            <SelectItem value="Cash & Carry">Cash &amp; Carry</SelectItem>
            <SelectItem value="Retail">Retail</SelectItem>
            <SelectItem value="Shop">Shop</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white" data-testid="customers-table">
        <table className="dense w-full">
          <thead>
            <tr>
              <th>{t("name_or_company")}</th>
              <th>{t("customer_type")}</th>
              <th>{t("phone")}</th>
              <th>{t("email")}</th>
              <th>{t("tax_no")}</th>
              <th>{t("status")}</th>
              <th className="text-right">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-8">{t("customers_no_record")}</td></tr>}
            {filtered.map((c) => (
              <tr key={c.id} data-testid={`customer-row-${c.id}`}>
                <td className="font-medium text-slate-900">{c.name}</td>
                <td>{c.customer_type}</td>
                <td className="text-slate-600">{c.phone || "-"}</td>
                <td className="text-slate-600">{c.email || "-"}</td>
                <td className="text-slate-600">{c.tax_no || "-"}</td>
                <td>{c.active
                  ? <Badge className="rounded-sm bg-emerald-50 text-emerald-700 border-emerald-200" variant="outline">{t("active")}</Badge>
                  : <Badge variant="outline" className="rounded-sm">{t("inactive")}</Badge>}</td>
                <td className="text-right whitespace-nowrap">
                  <button onClick={() => openDetail(c)} className="text-slate-500 hover:text-[#0047AB] mr-2 transition-colors" data-testid={`view-customer-${c.id}`}><Eye className="w-4 h-4" /></button>
                  {canEdit && <button onClick={() => openEdit(c)} className="text-slate-500 hover:text-[#0047AB] mr-2 transition-colors"><Pencil className="w-4 h-4" /></button>}
                  {canDelete && c.active && <button onClick={() => setConfirmDel(c)} className="text-slate-500 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm max-w-xl">
          <DialogHeader><DialogTitle>{editing ? t("edit_customer") : t("new_customer")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={`${t("customer_name")} *`}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="customer-name-input" className="rounded-sm" /></Field>
            <Field label={t("customer_type")}>
              <Select value={form.customer_type} onValueChange={(v) => setForm({ ...form, customer_type: v })}>
                <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash & Carry">Cash &amp; Carry</SelectItem>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Shop">Shop</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("phone")}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-sm" /></Field>
            <Field label={t("email")}><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-sm" /></Field>
            <Field label={t("tax_no")}><Input value={form.tax_no} onChange={(e) => setForm({ ...form, tax_no: e.target.value })} className="rounded-sm" /></Field>
            <Field label={t("address")}><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-sm" /></Field>
            {editing && user?.role === "admin" && (
              <div className="sm:col-span-2 flex items-center gap-3 p-3 bg-slate-50 rounded-sm">
                <input
                  id="customer-active-toggle"
                  type="checkbox"
                  checked={!!form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4"
                  data-testid="customer-active-toggle"
                />
                <Label htmlFor="customer-active-toggle" className="text-sm text-slate-700 cursor-pointer">
                  {t("active")} {form.active ? "✓" : `(${t("inactive")})`}
                </Label>
              </div>
            )}
            <div className="sm:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("notes")}</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-sm mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm">{t("cancel")}</Button>
            <Button onClick={submit} className="bg-[#0047AB] hover:bg-[#003380] rounded-sm" data-testid="save-customer-btn">{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="rounded-sm max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.customer?.name}</DialogTitle></DialogHeader>
          {detail && (
            <div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4 pb-4 border-b border-slate-200">
                <div><span className="text-slate-500">{t("phone")}: </span>{detail.customer.phone || "-"}</div>
                <div><span className="text-slate-500">{t("email")}: </span>{detail.customer.email || "-"}</div>
                <div><span className="text-slate-500">{t("address")}: </span>{detail.customer.address || "-"}</div>
                <div><span className="text-slate-500">{t("customer_type")}: </span>{detail.customer.customer_type}</div>
                <div className="col-span-2 text-base font-semibold text-[#0047AB]">
                  {t("total_sales_amount")}: {formatCurrency(detail.total_sales)}
                </div>
              </div>
              <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">{t("past_sales")}</h4>
              {detail.sales.length === 0 ? (
                <p className="text-slate-400 text-sm">{t("no_sales")}</p>
              ) : (
                <table className="dense w-full border border-slate-200">
                  <thead>
                    <tr><th>{t("date")}</th><th>{t("products_label")}</th><th>{t("amount")}</th><th>{t("payment")}</th></tr>
                  </thead>
                  <tbody>
                    {detail.sales.map((s) => (
                      <tr key={s.id}>
                        <td>{formatDate(s.date)}</td>
                        <td>{s.items.map((i) => i.product_name).join(", ")}</td>
                        <td className="tabular">{formatCurrency(s.net_total)}</td>
                        <td>{s.payment_status || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent className="rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deactivate_customer_q")}</AlertDialogTitle>
            <AlertDialogDescription>"{confirmDel?.name}" {t("deactivate_customer_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-red-600 hover:bg-red-700 rounded-sm">{t("confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-slate-500">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
