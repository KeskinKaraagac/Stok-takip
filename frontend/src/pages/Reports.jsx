import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import api from "../lib/api";
import { formatCurrency, formatNumber, formatDate, formatApiError, exportCSV } from "../lib/format";
import PageHeader from "../components/PageHeader";
import { toast } from "sonner";

const COLORS = ["#0047AB", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

export default function Reports() {
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

  const exportStock = () => {
    if (!stock) return;
    exportCSV("stok-raporu.csv", stock.rows, [
      { key: "name", label: "Ürün" },
      { key: "code", label: "Kod" },
      { key: "category", label: "Kategori" },
      { key: "current_stock", label: "Stok", format: (v) => formatNumber(v, 2) },
      { key: "cost_price", label: "Maliyet", format: (v) => formatNumber(v, 2) },
      { key: "sale_price", label: "Satış", format: (v) => formatNumber(v, 2) },
      { key: "stock_value_cost", label: "Stok Maliyet Değeri", format: (v) => formatNumber(v, 2) },
      { key: "stock_value_sale", label: "Stok Satış Değeri", format: (v) => formatNumber(v, 2) },
    ]);
  };

  return (
    <div data-testid="reports-page">
      <PageHeader title="Raporlar" subtitle="Stok, üretim ve satış analizleri" />

      <Tabs defaultValue="stock">
        <TabsList className="rounded-sm">
          <TabsTrigger value="stock" data-testid="tab-stock-report">Güncel Stok</TabsTrigger>
          <TabsTrigger value="financial" data-testid="tab-financial">Mali Değer</TabsTrigger>
          <TabsTrigger value="distribution" data-testid="tab-distribution">Ürün/Kategori</TabsTrigger>
          <TabsTrigger value="production" data-testid="tab-production">Üretim</TabsTrigger>
          <TabsTrigger value="sales" data-testid="tab-sales">Satış</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4">
          {stock && (
            <>
              <div className="flex justify-end mb-3">
                <Button variant="outline" onClick={exportStock} className="rounded-sm" data-testid="export-stock-report">
                  <Download className="w-4 h-4 mr-2" /> CSV İndir
                </Button>
              </div>
              <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white">
                <table className="dense w-full">
                  <thead><tr><th>Ürün</th><th>Kod</th><th>Stok</th><th>Maliyet</th><th>Satış</th><th>Mali Değer</th><th>Satış Değeri</th></tr></thead>
                  <tbody>
                    {stock.rows.map((r) => (
                      <tr key={r.id}>
                        <td className="font-medium">{r.name}</td>
                        <td className="text-slate-600">{r.code}</td>
                        <td className="tabular">{formatNumber(r.current_stock, 2)}</td>
                        <td className="tabular">{formatCurrency(r.cost_price)}</td>
                        <td className="tabular">{formatCurrency(r.sale_price)}</td>
                        <td className="tabular">{formatCurrency(r.stock_value_cost)}</td>
                        <td className="tabular">{formatCurrency(r.stock_value_sale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="financial" className="mt-4">
          {stock && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SummaryCard label="Toplam Stok Maliyeti" value={formatCurrency(stock.total_cost_value)} />
              <SummaryCard label="Potansiyel Satış Değeri" value={formatCurrency(stock.total_sale_value)} accent />
              <SummaryCard label="Tahmini Brüt Kâr" value={formatCurrency(stock.gross_profit_potential)} success />
            </div>
          )}
        </TabsContent>

        <TabsContent value="distribution" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-sm p-5">
              <h3 className="text-lg font-display font-medium mb-3">Kategori Bazlı Stok Dağılımı</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={cats} dataKey="value" nameKey="category" cx="50%" cy="50%" outerRadius={100} label={(d) => d.category}>
                    {cats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 0 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="border border-slate-200 rounded-sm p-5">
              <h3 className="text-lg font-display font-medium mb-3">Ürün Stok Grafiği</h3>
              {stock && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stock.rows.slice(0, 12)}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-30} textAnchor="end" height={70} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 0 }} formatter={(v) => formatNumber(v, 2)} />
                    <Bar dataKey="current_stock" fill="#0047AB" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="production" className="mt-4">
          <DateRangeFilter start={start} end={end} setStart={setStart} setEnd={setEnd} />
          {prod && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                <SummaryCard label="Toplam Üretim" value={formatNumber(prod.total, 2)} />
                <SummaryCard label="Günlük Ortalama" value={formatNumber(prod.daily_avg, 2)} />
                <SummaryCard label="Haftalık Ortalama" value={formatNumber(prod.weekly_avg, 2)} />
                <SummaryCard label="Aylık Ortalama" value={formatNumber(prod.monthly_avg, 2)} />
              </div>
              <div className="border border-slate-200 rounded-sm p-5 mb-4">
                <h3 className="text-lg font-display font-medium mb-3">Günlük Üretim Trendi</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={prod.by_day}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(v) => v.slice(8, 10) + "." + v.slice(5, 7)} stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 0 }} formatter={(v) => formatNumber(v, 2)} labelFormatter={(l) => formatDate(l)} />
                    <Bar dataKey="quantity" fill="#0047AB" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white">
                <table className="dense w-full">
                  <thead><tr><th>Ürün</th><th>Toplam Üretim</th></tr></thead>
                  <tbody>
                    {prod.by_product.length === 0 && <tr><td colSpan={2} className="text-center text-slate-400 py-6">Veri yok</td></tr>}
                    {prod.by_product.map((p) => (
                      <tr key={p.product_id}><td>{p.product_name}</td><td className="tabular">{formatNumber(p.quantity, 2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <DateRangeFilter start={start} end={end} setStart={setStart} setEnd={setEnd} />
          {sales && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                <SummaryCard label="Toplam Satış" value={formatCurrency(sales.total)} accent />
                <SummaryCard label="Satış Adedi" value={formatNumber(sales.count, 0)} />
                <SummaryCard label="Brüt Kâr" value={formatCurrency(sales.gross_profit)} success />
                <SummaryCard label="Günlük Ortalama" value={formatCurrency(sales.daily_avg)} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="border border-slate-200 rounded-sm p-5">
                  <h3 className="text-lg font-display font-medium mb-3">Günlük Satış</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={sales.by_day}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(v) => v.slice(8, 10) + "." + v.slice(5, 7)} stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 0 }} formatter={(v) => formatCurrency(v)} labelFormatter={(l) => formatDate(l)} />
                      <Line type="monotone" dataKey="total" stroke="#0047AB" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="border border-slate-200 rounded-sm p-5">
                  <h3 className="text-lg font-display font-medium mb-3">En Çok Satan Ürünler (Ciro)</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={sales.by_product.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" fontSize={11} />
                      <YAxis dataKey="product_name" type="category" width={120} stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 0 }} formatter={(v) => formatCurrency(v)} />
                      <Bar dataKey="revenue" fill="#0047AB" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white">
                  <table className="dense w-full">
                    <thead><tr><th>Müşteri</th><th>Satış Adedi</th><th>Ciro</th></tr></thead>
                    <tbody>
                      {sales.by_customer.length === 0 && <tr><td colSpan={3} className="text-center text-slate-400 py-6">Veri yok</td></tr>}
                      {sales.by_customer.map((c) => (
                        <tr key={c.customer_id}><td>{c.customer_name}</td><td className="tabular">{formatNumber(c.count, 0)}</td><td className="tabular">{formatCurrency(c.revenue)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white">
                  <table className="dense w-full">
                    <thead><tr><th>Ürün</th><th>Miktar</th><th>Ciro</th></tr></thead>
                    <tbody>
                      {sales.by_product.length === 0 && <tr><td colSpan={3} className="text-center text-slate-400 py-6">Veri yok</td></tr>}
                      {sales.by_product.map((p) => (
                        <tr key={p.product_id}><td>{p.product_name}</td><td className="tabular">{formatNumber(p.quantity, 2)}</td><td className="tabular">{formatCurrency(p.revenue)}</td></tr>
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

function SummaryCard({ label, value, accent, success }) {
  return (
    <div className="border border-slate-200 bg-white p-5 rounded-sm">
      <div className="text-xs uppercase tracking-[0.1em] font-bold text-slate-500 mb-2">{label}</div>
      <div className={`kpi-value text-3xl tabular ${accent ? "text-[#0047AB]" : success ? "text-emerald-600" : "text-slate-900"}`}>{value}</div>
    </div>
  );
}

function DateRangeFilter({ start, end, setStart, setEnd }) {
  return (
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
  );
}
