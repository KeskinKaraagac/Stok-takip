import { useEffect, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import api from "../lib/api";
import { formatCurrency, formatNumber, formatDate, formatApiError, exportCSV } from "../lib/format";
import { downloadXlsx } from "../lib/permissions";
import { useLanguage } from "../context/LanguageContext";
import PageHeader from "../components/PageHeader";
import { toast } from "sonner";

const COLORS = ["#0047AB", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

export default function Reports() {
  const { t } = useLanguage();
  const [stock, setStock] = useState(null);
  const [cats, setCats] = useState([]);
  const [prod, setProd] = useState(null);
  const [sales, setSales] = useState(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const loadStatic = async () => {
    try {
      const [s, c] = await Promise.all([api.get("/reports/stock"), api.get("/reports/category-distribution")]);
      setStock(s.data); setCats(c.data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const loadDynamic = async () => {
    try {
      const params = {};
      if (start) params.start = start;
      if (end) params.end = end;
      const [p, s] = await Promise.all([
        api.get("/reports/production", { params }),
        api.get("/reports/sales", { params }),
      ]);
      setProd(p.data); setSales(s.data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { loadStatic(); }, []);
  useEffect(() => { loadDynamic(); /* eslint-disable-next-line */ }, [start, end]);

  // Augment stock rows with stock_weight (current_stock * unit_weight for non-kg; stock for kg)
  const stockRows = (stock?.rows || []).map((r) => {
    // unit / unit_weight aren't in /reports/stock — fetch from name? Skip; use display 'sale_price' replaced by weight cant compute here w/o unit info
    return r;
  });

  const exportStock = () => {
    if (!stock) return;
    exportCSV("stok-raporu.csv", stock.rows, [
      { key: "name", label: "Ürün" },
      { key: "code", label: "Kod" },
      { key: "category", label: "Kategori" },
      { key: "current_stock", label: "Stok", format: (v) => formatNumber(v, 0) },
      { key: "stock_weight", label: "Stok Ağırlığı (kg)", format: (v) => formatNumber(v, 2) },
    ]);
  };

  return (
    <div data-testid="reports-page">
      <PageHeader title={t("reports")} subtitle={t("reports_subtitle")} />

      <Tabs defaultValue="stock">
        <TabsList className="rounded-sm">
          <TabsTrigger value="stock" data-testid="tab-stock-report">{t("current_stock_report")}</TabsTrigger>
          <TabsTrigger value="financial" data-testid="tab-financial">{t("financial_report")}</TabsTrigger>
          <TabsTrigger value="distribution" data-testid="tab-distribution">{t("distribution_report")}</TabsTrigger>
          <TabsTrigger value="production" data-testid="tab-production">{t("production_report")}</TabsTrigger>
          <TabsTrigger value="sales" data-testid="tab-sales">{t("sales_report")}</TabsTrigger>
        </TabsList>

        {/* CURRENT STOCK — with category, no cost, replace sale price with weight in kg */}
        <TabsContent value="stock" className="mt-4">
          {stock && (
            <>
              <div className="flex justify-end gap-2 mb-3">
                <Button variant="outline" onClick={exportStock} className="rounded-sm">
                  <Download className="w-4 h-4 mr-2" /> CSV
                </Button>
                <Button variant="outline" onClick={() => downloadXlsx("/export/stock.xlsx", "stok-raporu.xlsx").catch((e) => toast.error(formatApiError(e)))} className="rounded-sm">
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                </Button>
              </div>
              <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white">
                <table className="dense w-full">
                  <thead><tr><th>Ürün</th><th>Kod</th><th>Kategori</th><th>Birim</th><th>Stok</th><th>Stok Ağırlığı (kg)</th></tr></thead>
                  <tbody>
                    {stockRows.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-6">{t("no_records")}</td></tr>}
                    {stockRows.map((r) => (
                      <tr key={r.id}>
                        <td className="font-medium">{r.name}</td>
                        <td className="text-slate-600">{r.code}</td>
                        <td className="text-slate-600">{r.category || "-"}</td>
                        <td className="text-slate-600">{r.unit}</td>
                        <td className="tabular">{formatNumber(r.current_stock, 0)}</td>
                        <td className="tabular font-medium">{formatNumber(r.stock_weight, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>

        {/* FINANCIAL — by category */}
        <TabsContent value="financial" className="mt-4">
          {stock && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <SummaryCard label="Toplam Stok Mali Değeri" value={formatCurrency(stock.total_cost_value)} accent />
                <SummaryCard label="Potansiyel Satış Değeri" value={formatCurrency(stock.total_sale_value)} />
                <SummaryCard label="Toplam Stok Adedi" value={formatNumber(stockRows.reduce((a, b) => a + Number(b.current_stock || 0), 0), 0)} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-sm p-5">
                  <h3 className="text-lg font-display font-medium mb-3">Kategori Bazlı Mali Değer</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={cats} dataKey="value" nameKey="category" cx="50%" cy="50%" outerRadius={100} label={(d) => d.category}>
                        {cats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 0 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white">
                  <table className="dense w-full">
                    <thead><tr><th>Kategori</th><th>Ürün Sayısı</th><th>Stok (adet)</th><th>Mali Değer</th></tr></thead>
                    <tbody>
                      {cats.length === 0 && <tr><td colSpan={4} className="text-center text-slate-400 py-6">{t("no_records")}</td></tr>}
                      {cats.map((c) => (
                        <tr key={c.category}>
                          <td className="font-medium">{c.category}</td>
                          <td className="tabular">{formatNumber(c.count, 0)}</td>
                          <td className="tabular">{formatNumber(c.units, 0)}</td>
                          <td className="tabular font-semibold">{formatCurrency(c.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* DISTRIBUTION */}
        <TabsContent value="distribution" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-sm p-5">
              <h3 className="text-lg font-display font-medium mb-3">Kategori Bazlı Stok Dağılımı (Adet)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={cats} dataKey="units" nameKey="category" cx="50%" cy="50%" outerRadius={100} label={(d) => d.category}>
                    {cats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatNumber(v, 0)} contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 0 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="border border-slate-200 rounded-sm p-5">
              <h3 className="text-lg font-display font-medium mb-3">Ürün Stok Grafiği</h3>
              {stock && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stockRows.slice(0, 12)}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-30} textAnchor="end" height={70} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 0 }} formatter={(v) => formatNumber(v, 0)} />
                    <Bar dataKey="current_stock" fill="#0047AB" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </TabsContent>

        {/* PRODUCTION — kg-based */}
        <TabsContent value="production" className="mt-4">
          <DateRangeFilter start={start} end={end} setStart={setStart} setEnd={setEnd} t={t} />
          {prod && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <SummaryCard label={t("total_production")} value={`${formatNumber(prod.total_weight, 2)} kg`} accent />
                <SummaryCard label={t("daily_avg")} value={`${formatNumber(prod.daily_avg_weight, 2)} kg`} />
                <SummaryCard label={t("weekly_avg")} value={`${formatNumber(prod.weekly_avg_weight, 2)} kg`} />
              </div>
              <div className="border border-slate-200 rounded-sm p-5 mb-4">
                <h3 className="text-lg font-display font-medium mb-3">Günlük Üretim (kg)</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={prod.by_day}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(v) => v.slice(8, 10) + "." + v.slice(5, 7)} stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 0 }} formatter={(v) => `${formatNumber(v, 2)} kg`} labelFormatter={(l) => formatDate(l)} />
                    <Bar dataKey="weight" fill="#0047AB" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="text-base font-display font-medium">{t("avg_production_per_product")}</h3>
                </div>
                <table className="dense w-full">
                  <thead><tr><th>Ürün</th><th>Toplam (adet)</th><th>Toplam (kg)</th><th>Kayıt</th><th>Ortalama Adet</th><th>Ortalama kg</th></tr></thead>
                  <tbody>
                    {prod.by_product.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-6">{t("no_records")}</td></tr>}
                    {prod.by_product.map((p) => (
                      <tr key={p.product_id}>
                        <td className="font-medium">{p.product_name}</td>
                        <td className="tabular">{formatNumber(p.quantity, 0)}</td>
                        <td className="tabular">{formatNumber(p.weight, 2)}</td>
                        <td className="tabular">{formatNumber(p.count, 0)}</td>
                        <td className="tabular">{formatNumber(p.avg_quantity, 0)}</td>
                        <td className="tabular font-medium text-[#0047AB]">{formatNumber(p.avg_weight, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>

        {/* SALES (Depo Çıkış) — weight focused */}
        <TabsContent value="sales" className="mt-4">
          <DateRangeFilter start={start} end={end} setStart={setStart} setEnd={setEnd} t={t} />
          {sales && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                <SummaryCard label="Toplam Çıkış (kg)" value={`${formatNumber(sales.total_weight, 2)} kg`} accent />
                <SummaryCard label="Toplam Çıkış (adet)" value={formatNumber(sales.total_quantity, 0)} />
                <SummaryCard label="Çıkış Adedi" value={formatNumber(sales.count, 0)} />
                <SummaryCard label="Günlük Ort. (kg)" value={`${formatNumber(sales.daily_avg_weight, 2)} kg`} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="border border-slate-200 rounded-sm p-5">
                  <h3 className="text-lg font-display font-medium mb-3">Günlük Çıkış (kg)</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={sales.by_day}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(v) => v.slice(8, 10) + "." + v.slice(5, 7)} stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 0 }} formatter={(v) => `${formatNumber(v, 2)} kg`} labelFormatter={(l) => formatDate(l)} />
                      <Line type="monotone" dataKey="weight" stroke="#0047AB" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="border border-slate-200 rounded-sm p-5">
                  <h3 className="text-lg font-display font-medium mb-3">{t("top_products_by_weight")}</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={sales.by_product.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" fontSize={11} />
                      <YAxis dataKey="product_name" type="category" width={120} stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 0 }} formatter={(v) => `${formatNumber(v, 2)} kg`} />
                      <Bar dataKey="weight" fill="#0047AB" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white">
                  <div className="p-3 border-b border-slate-200 text-sm font-medium">{t("top_customers")}</div>
                  <table className="dense w-full">
                    <thead><tr><th>Müşteri</th><th>Çıkış (adet)</th><th>Çıkış (kg)</th></tr></thead>
                    <tbody>
                      {sales.by_customer.length === 0 && <tr><td colSpan={3} className="text-center text-slate-400 py-6">{t("no_records")}</td></tr>}
                      {sales.by_customer.map((c) => (
                        <tr key={c.customer_id}>
                          <td>{c.customer_name}</td>
                          <td className="tabular">{formatNumber(c.quantity, 0)}</td>
                          <td className="tabular font-medium">{formatNumber(c.weight, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white">
                  <div className="p-3 border-b border-slate-200 text-sm font-medium">Ürün Bazlı Çıkış</div>
                  <table className="dense w-full">
                    <thead><tr><th>Ürün</th><th>Adet</th><th>kg</th></tr></thead>
                    <tbody>
                      {sales.by_product.length === 0 && <tr><td colSpan={3} className="text-center text-slate-400 py-6">{t("no_records")}</td></tr>}
                      {sales.by_product.map((p) => (
                        <tr key={p.product_id}>
                          <td>{p.product_name}</td>
                          <td className="tabular">{formatNumber(p.quantity, 0)}</td>
                          <td className="tabular font-medium">{formatNumber(p.weight, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="border border-slate-200 bg-white p-5 rounded-sm">
      <div className="text-xs uppercase tracking-[0.1em] font-bold text-slate-500 mb-2">{label}</div>
      <div className={`kpi-value text-3xl tabular ${accent ? "text-[#0047AB]" : "text-slate-900"}`}>{value}</div>
    </div>
  );
}

function DateRangeFilter({ start, end, setStart, setEnd, t }) {
  return (
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
  );
}
