import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from "recharts";
import api from "../lib/api";
import { formatCurrency, formatNumber, formatDate, formatApiError, exportCSV } from "../lib/format";
import { downloadXlsx } from "../lib/permissions";
import { useLanguage } from "../context/LanguageContext";
import PageHeader from "../components/PageHeader";
import { toast } from "sonner";

const COLORS = ["#0047AB", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

const renderPieLabel = (unit) => ({ cx, cy, midAngle, outerRadius, value, name, percent }) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 22;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const anchor = x > cx ? "start" : "end";
  const formatted = unit === "£"
    ? `£${Number(value).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`
    : `${Number(value).toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${unit}`;
  return (
    <text x={x} y={y} fill="#0f172a" fontSize={11} fontWeight={600} textAnchor={anchor} dominantBaseline="central">
      {`${name}: ${formatted} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

export default function Reports() {
  const { t } = useLanguage();
  const [stock, setStock] = useState(null);
  const [cats, setCats] = useState([]);
  const [prod, setProd] = useState(null);
  const [sales, setSales] = useState(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [activeTab, setActiveTab] = useState("stock");

  const loadStatic = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([api.get("/reports/stock"), api.get("/reports/category-distribution")]);
      setStock(s.data); setCats(c.data);
    } catch (e) { toast.error(formatApiError(e)); }
  }, []);
  const loadDynamic = useCallback(async () => {
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
  }, [start, end]);
  useEffect(() => { loadStatic(); }, [loadStatic]);
  useEffect(() => { loadDynamic(); }, [loadDynamic]);

  const stockRows = useMemo(() => stock?.rows || [], [stock]);

  // Category breakdown for stock tab header
  const stockCategorySummary = useMemo(() => {
    const map = {};
    for (const r of stockRows) {
      const cat = r.category || "—";
      map[cat] = (map[cat] || 0) + Number(r.stock_weight || 0);
    }
    return Object.entries(map)
      .map(([category, weight]) => ({ category, weight }))
      .sort((a, b) => b.weight - a.weight);
  }, [stockRows]);

  const exportStock = () => {
    if (!stock) return;
    exportCSV("stok-raporu.csv", stock.rows, [
      { key: "name", label: t("product") },
      { key: "code", label: t("code") },
      { key: "category", label: t("category") },
      { key: "current_stock", label: t("stock"), format: (v) => formatNumber(v, 0) },
      { key: "stock_weight", label: t("stock_weight"), format: (v) => formatNumber(v, 2) },
    ]);
  };

  const printReport = () => {
    const titles = {
      stock: t("current_stock_report"),
      financial: t("financial_report"),
      distribution: t("distribution_report"),
      production: t("production_report"),
      sales: t("sales_report"),
    };
    const originalTitle = document.title;
    document.title = `${t("reports")} - ${titles[activeTab] || ""}`;
    window.print();
    window.setTimeout(() => {
      document.title = originalTitle;
    }, 250);
  };

  return (
    <div id="report-print-area" data-testid="reports-page" className="animate-fadeIn">
      <PageHeader title={t("reports")} subtitle={t("reports_subtitle")} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-sm report-print-hide">
          <TabsTrigger value="stock" data-testid="tab-stock-report">{t("current_stock_report")}</TabsTrigger>
          <TabsTrigger value="financial" data-testid="tab-financial">{t("financial_report")}</TabsTrigger>
          <TabsTrigger value="distribution" data-testid="tab-distribution">{t("distribution_report")}</TabsTrigger>
          <TabsTrigger value="production" data-testid="tab-production">{t("production_report")}</TabsTrigger>
          <TabsTrigger value="sales" data-testid="tab-sales">{t("sales_report")}</TabsTrigger>
        </TabsList>

        {/* ===== CURRENT STOCK ===== */}
        <TabsContent value="stock" className="mt-4">
          {stock && (
            <>
              {/* Category kg summary chips */}
              {stockCategorySummary.length > 0 && (
                <div className="mb-4 border border-slate-200 rounded-sm bg-white p-4" data-testid="stock-category-summary">
                  <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
                    {t("stock_by_category_header")}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    {stockCategorySummary.map((c, i) => (
                      <div
                        key={c.category}
                        className="border-l-4 bg-slate-50 px-3 py-2 rounded-sm flex flex-col"
                        style={{ borderLeftColor: COLORS[i % COLORS.length] }}
                      >
                        <span className="text-xs text-slate-500 truncate" title={c.category}>{c.category}</span>
                        <span className="text-lg font-semibold tabular text-slate-900">{formatNumber(c.weight, 2)} <span className="text-xs font-normal text-slate-500">kg</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 mb-3 report-print-hide">
                <Button variant="outline" onClick={exportStock} className="rounded-sm">
                  <Download className="w-4 h-4 mr-2" /> {t("csv")}
                </Button>
                <Button variant="outline" onClick={() => downloadXlsx("/export/stock.xlsx", "stok-raporu.xlsx").catch((e) => toast.error(formatApiError(e)))} className="rounded-sm">
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> {t("excel")}
                </Button>
                <PdfButton onClick={printReport} t={t} />
              </div>
              <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white">
                <table className="dense w-full">
                  <thead><tr>
                    <th>{t("product")}</th>
                    <th>{t("code")}</th>
                    <th>{t("category")}</th>
                    <th>{t("unit")}</th>
                    <th>{t("stock")}</th>
                    <th>{t("stock_weight_kg")}</th>
                  </tr></thead>
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

        {/* ===== FINANCIAL ===== */}
        <TabsContent value="financial" className="mt-4">
          {stock && (
            <>
              <div className="flex justify-end mb-3 report-print-hide">
                <PdfButton onClick={printReport} t={t} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <SummaryCard label={t("total_stock_fin_value")} value={formatCurrency(stock.total_cost_value)} accent />
                <SummaryCard label={t("potential_sale_value")} value={formatCurrency(stock.total_sale_value)} />
                <SummaryCard label={t("total_stock_count")} value={formatNumber(stockRows.reduce((a, b) => a + Number(b.current_stock || 0), 0), 0)} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-sm p-5 bg-white">
                  <h3 className="text-lg font-display font-medium mb-3">{t("category_financial_value")}</h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <PieChart margin={{ top: 10, right: 80, bottom: 10, left: 80 }}>
                      <Pie
                        data={cats}
                        dataKey="value"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={renderPieLabel("£")}
                        labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
                      >
                        {cats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 0 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white">
                  <table className="dense w-full">
                    <thead><tr><th>{t("category")}</th><th>{t("product_count")}</th><th>{t("stock_qty")}</th><th>{t("financial_value")}</th></tr></thead>
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

        {/* ===== DISTRIBUTION ===== */}
        <TabsContent value="distribution" className="mt-4">
          <div className="flex justify-end mb-3 report-print-hide">
            <PdfButton onClick={printReport} t={t} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-sm p-5 bg-white">
              <h3 className="text-lg font-display font-medium mb-3">{t("category_stock_dist")}</h3>
              <ResponsiveContainer width="100%" height={360}>
                <PieChart margin={{ top: 10, right: 80, bottom: 10, left: 80 }}>
                  <Pie
                    data={cats}
                    dataKey="weight"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={renderPieLabel("kg")}
                    labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
                  >
                    {cats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `${formatNumber(v, 2)} kg`} contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 0 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="border border-slate-200 rounded-sm p-5 bg-white">
              <h3 className="text-lg font-display font-medium mb-3">{t("product_stock_chart")}</h3>
              {stock && (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={stockRows.slice(0, 12)} margin={{ top: 20, right: 10, left: 0, bottom: 70 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-30} textAnchor="end" height={70} interval={0} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 0 }} formatter={(v) => formatNumber(v, 0)} />
                    <Bar dataKey="current_stock" fill="#0047AB" radius={[2, 2, 0, 0]}>
                      <LabelList dataKey="current_stock" position="top" formatter={(v) => formatNumber(v, 0)} fill="#0f172a" fontSize={11} fontWeight={600} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ===== PRODUCTION ===== */}
        <TabsContent value="production" className="mt-4">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 report-print-hide">
            <DateRangeFilter start={start} end={end} setStart={setStart} setEnd={setEnd} t={t} />
            <PdfButton onClick={printReport} t={t} />
          </div>
          {prod && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <SummaryCard label={t("total_production")} value={`${formatNumber(prod.total_weight, 2)} kg`} accent />
                <SummaryCard label={t("daily_avg")} value={`${formatNumber(prod.daily_avg_weight, 2)} kg`} />
                <SummaryCard label={t("weekly_avg")} value={`${formatNumber(prod.weekly_avg_weight, 2)} kg`} />
              </div>
              <div className="border border-slate-200 rounded-sm p-5 mb-4 bg-white">
                <h3 className="text-lg font-display font-medium mb-3">{t("daily_production_kg")}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prod.by_day} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(v) => v.slice(8, 10) + "." + v.slice(5, 7)} stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 0 }} formatter={(v) => `${formatNumber(v, 2)} kg`} labelFormatter={(l) => formatDate(l)} />
                    <Bar dataKey="weight" fill="#0047AB" radius={[2, 2, 0, 0]}>
                      <LabelList dataKey="weight" position="top" formatter={(v) => formatNumber(v, 1)} fill="#0f172a" fontSize={10} fontWeight={600} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="text-base font-display font-medium">{t("avg_production_per_product")}</h3>
                </div>
                <table className="dense w-full">
                  <thead><tr>
                    <th>{t("product")}</th>
                    <th>{t("total_quantity_unit")}</th>
                    <th>{t("total_quantity_kg")}</th>
                    <th>{t("records")}</th>
                    <th>{t("avg_qty")}</th>
                    <th>{t("avg_kg")}</th>
                  </tr></thead>
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

        {/* ===== SALES (Depo Çıkış) ===== */}
        <TabsContent value="sales" className="mt-4">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 report-print-hide">
            <DateRangeFilter start={start} end={end} setStart={setStart} setEnd={setEnd} t={t} />
            <PdfButton onClick={printReport} t={t} />
          </div>
          {sales && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                <SummaryCard label={t("total_exit_kg")} value={`${formatNumber(sales.total_weight, 2)} kg`} accent />
                <SummaryCard label={t("total_exit_qty")} value={formatNumber(sales.total_quantity, 0)} />
                <SummaryCard label={t("exits_count")} value={formatNumber(sales.count, 0)} />
                <SummaryCard label={t("daily_avg_kg")} value={`${formatNumber(sales.daily_avg_weight, 2)} kg`} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="border border-slate-200 rounded-sm p-5 bg-white">
                  <h3 className="text-lg font-display font-medium mb-3">{t("daily_exit_kg")}</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={sales.by_day} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(v) => v.slice(8, 10) + "." + v.slice(5, 7)} stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 0 }} formatter={(v) => `${formatNumber(v, 2)} kg`} labelFormatter={(l) => formatDate(l)} />
                      <Line type="monotone" dataKey="weight" stroke="#0047AB" strokeWidth={2} dot={{ r: 3, fill: "#0047AB" }} activeDot={{ r: 5 }}>
                        <LabelList dataKey="weight" position="top" formatter={(v) => v > 0 ? formatNumber(v, 1) : ""} fill="#0f172a" fontSize={10} fontWeight={600} />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="border border-slate-200 rounded-sm p-5 bg-white">
                  <h3 className="text-lg font-display font-medium mb-3">{t("top_products_by_weight")}</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={sales.by_product.slice(0, 10)} layout="vertical" margin={{ left: 20, right: 70, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" fontSize={11} />
                      <YAxis dataKey="product_name" type="category" width={120} stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 0 }} formatter={(v) => `${formatNumber(v, 2)} kg`} />
                      <Bar dataKey="weight" fill="#0047AB" radius={[0, 2, 2, 0]}>
                        <LabelList dataKey="weight" position="right" formatter={(v) => `${formatNumber(v, 1)} kg`} fill="#0f172a" fontSize={11} fontWeight={600} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-sm overflow-x-auto bg-white">
                  <div className="p-3 border-b border-slate-200 text-sm font-medium">{t("top_customers")}</div>
                  <table className="dense w-full">
                    <thead><tr><th>{t("customer")}</th><th>{t("exit_qty")}</th><th>{t("exit_kg")}</th></tr></thead>
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
                  <div className="p-3 border-b border-slate-200 text-sm font-medium">{t("product_based_exit")}</div>
                  <table className="dense w-full">
                    <thead><tr><th>{t("product")}</th><th>{t("quantity")}</th><th>kg</th></tr></thead>
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
    <div className="report-card border border-slate-200 bg-white p-5 rounded-sm transition-all hover:shadow-md hover:border-[#0047AB]/30">
      <div className="text-xs uppercase tracking-[0.1em] font-bold text-slate-500 mb-2">{label}</div>
      <div className={`kpi-value text-3xl tabular ${accent ? "text-[#0047AB]" : "text-slate-900"}`}>{value}</div>
    </div>
  );
}

function PdfButton({ onClick, t }) {
  return (
    <Button variant="outline" onClick={onClick} className="rounded-sm">
      <FileText className="w-4 h-4 mr-2" /> {t("print_pdf")}
    </Button>
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
