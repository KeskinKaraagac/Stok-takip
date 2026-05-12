import { useEffect, useState, useMemo } from "react";
import { Plus, Search, Download, FileSpreadsheet, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "../components/ui/alert-dialog";
import { Badge } from "../components/ui/badge";
import api from "../lib/api";
import { formatCurrency, formatNumber, formatDate, formatApiError, exportCSV } from "../lib/format";
import { hasPermission, downloadXlsx } from "../lib/permissions";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import { toast } from "sonner";

const EMPTY = {
  name: "", code: "", category: "", unit: "adet",
  unit_weight: 0, sale_price: 0,
  current_stock: 0, min_stock: 0,
  active: true, notes: "",
};

export default function Products() {
  const { user } = useAuth();
  const canCreate = hasPermission(user, "products.create");
  const canEdit = hasPermission(user, "products.edit");
  const canDelete = hasPermission(user, "products.delete");
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get("/products");
      setItems(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, []);

  const categories = useMemo(() => Array.from(new Set(items.map((p) => p.category).filter(Boolean))), [items]);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      const s = search.toLowerCase();
      const matchSearch = !s || p.name.toLowerCase().includes(s) || (p.code || "").toLowerCase().includes(s);
      const matchCat = category === "all" || p.category === category;
      return matchSearch && matchCat;
    });
  }, [items, search, category]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...EMPTY, ...p }); setOpen(true); };

  const submit = async () => {
    if (!form.name || !form.code) { toast.error("Ürün adı ve kodu zorunludur"); return; }
    const payload = {
      ...form,
      unit_weight: Number(form.unit_weight) || 0,
      sale_price: Number(form.sale_price) || 0,
      cost_price: Number(form.cost_price) || 0,
      current_stock: Number(form.current_stock) || 0,
      min_stock: Number(form.min_stock) || 0,
      shelf_life_days: Number(form.shelf_life_days) || 0,
      production_date: form.production_date || null,
      expiry_date: form.expiry_date || null,
    };
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
        toast.success("Ürün güncellendi");
      } else {
        await api.post("/products", payload);
        toast.success("Ürün eklendi");
      }
      setOpen(false);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const remove = async () => {
    try {
      await api.delete(`/products/${confirmDel.id}`);
      toast.success("Ürün pasif yapıldı");
      setConfirmDel(null);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const exportExcel = () => {
    exportCSV("urunler.csv", filtered, [
      { key: "name", label: "Ad" },
      { key: "code", label: "Kod" },
      { key: "category", label: "Kategori" },
      { key: "unit", label: "Birim" },
      { key: "current_stock", label: "Stok", format: (v) => formatNumber(v, 0) },
      { key: "min_stock", label: "Min Stok", format: (v) => formatNumber(v, 0) },
      { key: "sale_price", label: "Satış Fiyatı", format: (v) => formatNumber(v, 2) },
      { key: "active", label: "Aktif", format: (v) => v ? "Evet" : "Hayır" },
    ]);
  };

  return (
    <div data-testid="products-page">
      <PageHeader
        title="Ürün Kontrolü"
        subtitle="Ürün tanımları, stok ve fiyat yönetimi"
        actions={
          <>
            <Button variant="outline" onClick={exportExcel} data-testid="export-products" className="rounded-sm">
              <Download className="w-4 h-4 mr-2" /> CSV
            </Button>
            <Button variant="outline" onClick={() => downloadXlsx("/export/products.xlsx", "urunler.xlsx").catch((e) => toast.error(formatApiError(e)))} data-testid="export-products-xlsx" className="rounded-sm">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
            </Button>
            {canCreate && (
              <Button onClick={openCreate} data-testid="add-product-btn" className="bg-[#0047AB] hover:bg-[#003380] rounded-sm">
                <Plus className="w-4 h-4 mr-2" /> Yeni Ürün
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ad veya kod ara..." className="pl-9 rounded-sm" data-testid="product-search" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-56 rounded-sm" data-testid="category-filter">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kategoriler</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white" data-testid="products-table">
        <table className="dense w-full">
          <thead>
            <tr>
              <th>Ürün</th>
              <th>Kod</th>
              <th>Kategori</th>
              <th>Birim</th>
              <th>Stok</th>
              <th>Satış Fiyatı</th>
              <th>Durum</th>
              <th className="text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center text-slate-400 py-8">Kayıt bulunamadı</td></tr>
            )}
            {filtered.map((p) => {
              const lowStock = Number(p.min_stock) > 0 && Number(p.current_stock) <= Number(p.min_stock);
              return (
                <tr key={p.id} data-testid={`product-row-${p.id}`}>
                  <td className="font-medium text-slate-900">{p.name}</td>
                  <td className="text-slate-600">{p.code}</td>
                  <td className="text-slate-600">{p.category || "-"}</td>
                  <td className="text-slate-600">{p.unit}</td>
                  <td className={`tabular ${lowStock ? "text-amber-600 font-semibold" : ""}`}>
                    {formatNumber(p.current_stock, 0)}
                    {lowStock && <AlertTriangle className="inline w-3 h-3 ml-1" />}
                  </td>
                  <td className="tabular">{formatCurrency(p.sale_price)}</td>
                  <td>
                    {p.active ? (
                      <Badge variant="outline" className="rounded-sm border-emerald-200 bg-emerald-50 text-emerald-700">Aktif</Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-sm border-slate-200 text-slate-500">Pasif</Badge>
                    )}
                  </td>
                  <td className="text-right">
                    {canEdit && (
                      <button onClick={() => openEdit(p)} className="text-slate-500 hover:text-[#0047AB] mr-2" data-testid={`edit-product-${p.id}`}>
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && p.active && (
                      <button onClick={() => setConfirmDel(p)} className="text-slate-500 hover:text-red-600" data-testid={`delete-product-${p.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="product-dialog">
          <DialogHeader>
            <DialogTitle>{editing ? "Ürün Düzenle" : "Yeni Ürün"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <Field label="Ürün Adı *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="product-name-input" className="rounded-sm" /></Field>
            <Field label="Ürün Kodu *"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} data-testid="product-code-input" className="rounded-sm" /></Field>
            <Field label="Kategori"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-sm" /></Field>
            <Field label="Birim">
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="adet">Adet</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                  <SelectItem value="koli">Koli</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Birim Ağırlık (kg)"><Input type="number" step="0.01" value={form.unit_weight} onChange={(e) => setForm({ ...form, unit_weight: e.target.value })} className="rounded-sm" /></Field>
            <Field label="Satış Fiyatı (£)"><Input type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} className="rounded-sm" /></Field>
            <Field label="Güncel Stok"><Input type="number" step="1" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} className="rounded-sm" /></Field>
            <Field label="Min Stok Seviyesi"><Input type="number" step="1" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} className="rounded-sm" /></Field>
            {editing && user?.role === "admin" && (
              <div className="sm:col-span-2 flex items-center gap-3 p-3 bg-slate-50 rounded-sm">
                <input
                  id="product-active-toggle"
                  type="checkbox"
                  checked={!!form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4"
                  data-testid="product-active-toggle"
                />
                <Label htmlFor="product-active-toggle" className="text-sm text-slate-700 cursor-pointer">
                  Aktif {form.active ? "✓" : "(Pasif)"}
                </Label>
              </div>
            )}
            <div className="sm:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-slate-500">Notlar</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-sm mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm">İptal</Button>
            <Button onClick={submit} className="bg-[#0047AB] hover:bg-[#003380] rounded-sm" data-testid="save-product-btn">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent className="rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Ürünü pasif yapmak istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDel?.name}" pasif duruma getirilecek. Stok kayıtları korunur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">İptal</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-red-600 hover:bg-red-700 rounded-sm" data-testid="confirm-delete-product">Onayla</AlertDialogAction>
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
