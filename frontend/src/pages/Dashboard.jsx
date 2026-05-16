import { useEffect, useState } from "react";
import { Package, Layers, ArrowDownToLine, Calendar, Factory, ShoppingCart, AlertTriangle } from "lucide-react";
import {
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, LabelList,
} from "recharts";
import api from "../lib/api";
import { formatCurrency, formatNumber, formatDate, formatDateTime, formatApiError } from "../lib/format";
import PageHeader from "../components/PageHeader";
import { useLanguage } from "../context/LanguageContext";
import { toast } from "sonner";

const PIE_COLORS = ["#145BFF", "#10b981", "#f59e0b", "#ef4444", "#7c3aed", "#06b6d4", "#ec4899", "#84cc16"];

const renderPieLabel = (unit, decimals = 1) => ({ cx, cy, midAngle, outerRadius, value, name, percent }) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 22;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const anchor = x > cx ? "start" : "end";
  const formatted = unit === "£"
    ? `£${Number(value).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`
    : `${Number(value).toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${unit}`;
  return (
    <text x={x} y={y} fill="#0f172a" fontSize={11} fontWeight={600} textAnchor={anchor} dominantBaseline="central">
      {`${name}: ${formatted} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

function KPI({ icon: Icon, label, value, sub, accent = false, testId }) {
  return (
    <div
      className="sphere-kpi border border-slate-200 bg-white p-5 rounded-lg transition-all duration-200 hover:-translate-y-[1px] hover:border-[#145BFF]/30 hover:shadow-lg"
      data-testid={testId}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-[0.1em] font-bold text-slate-500">{label}</div>
        <div className={`w-8 h-8 flex items-center justify-center rounded-md transition-transform group-hover:scale-110 ${accent ? "bg-[#145BFF] text-white" : "bg-blue-50 text-[#145BFF]"}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="kpi-value text-4xl text-slate-900 tabular">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-2">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard/summary")
      .then((r) => setData(r.data))
      .catch((e) => toast.error(formatApiError(e)));
  }, []);

  if (!data) return <div className="text-slate-500 text-sm" data-testid="dashboard-loading">{t("loading")}</div>;

  const categoryWeight = data.category_weight || [];
  const categorySaleValue = data.category_sale_value || [];

  return (
    <div data-testid="dashboard-page" className="animate-fadeIn">
      <PageHeader title={t("dashboard")} subtitle={t("dashboard_subtitle")} />

      {/* KPI row — all kg-focused */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI
          icon={Package}
          label={t("total_products")}
          value={formatNumber(data.total_products, 0)}
          sub={`${formatNumber(data.total_stock_weight, 2)} kg`}
          testId="kpi-total-products"
        />
        <KPI
          icon={Layers}
          label={t("total_stock_kg")}
          value={`${formatNumber(data.total_stock_weight, 2)}`}
          sub={`${formatNumber(data.total_stock_units, 0)} ${t("unit").toLowerCase()}`}
          accent
          testId="kpi-stock-weight"
        />
        <KPI
          icon={ArrowDownToLine}
          label={t("today_exit")}
          value={`${formatNumber(data.today_weight, 2)} kg`}
          sub={`${formatNumber(data.today_quantity, 0)} ${t("unit").toLowerCase()} • ${formatCurrency(data.today_sales)}`}
          testId="kpi-today-exit"
        />
        <KPI
          icon={Calendar}
          label={t("month_exit")}
          value={`${formatNumber(data.month_weight, 2)} kg`}
          sub={`${formatNumber(data.month_quantity, 0)} ${t("unit").toLowerCase()} • ${formatCurrency(data.month_sales)}`}
          testId="kpi-month-exit"
        />
      </div>

      {/* Exit trend + Category Stock Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="sphere-card lg:col-span-2 border border-slate-200 p-5 rounded-lg bg-white" data-testid="chart-exit-trend">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-medium text-slate-800">{t("exit_trend")}</h3>
            <span className="text-xs uppercase tracking-wider text-slate-500">kg</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.exit_trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(v) => v.slice(8, 10) + "." + v.slice(5, 7)} stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ border: "1px solid #dfe7f2", borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${formatNumber(v, 2)} kg`, t("weight_label")]} labelFormatter={(l) => formatDate(l)} />
              <Line type="monotone" dataKey="weight" stroke="#145BFF" strokeWidth={3} dot={{ r: 3, fill: "#145BFF" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="sphere-card border border-slate-200 p-5 rounded-lg bg-white" data-testid="category-weight-pie">
          <h3 className="font-display text-lg font-medium text-slate-800 mb-4">{t("category_weight_title")}</h3>
          {categoryWeight.length === 0 ? (
            <div className="text-sm text-slate-400 py-12 text-center">{t("no_records")}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart margin={{ top: 10, right: 60, bottom: 10, left: 60 }}>
                <Pie
                  data={categoryWeight}
                  dataKey="weight"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={renderPieLabel("kg")}
                  labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
                >
                  {categoryWeight.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `${formatNumber(v, 2)} kg`} contentStyle={{ border: "1px solid #dfe7f2", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category Potential Sale Value Bar */}
      <div className="sphere-card border border-slate-200 p-5 rounded-lg bg-white mb-6" data-testid="category-sale-bar">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-medium text-slate-800">{t("category_sale_value_title")}</h3>
          <span className="text-xs uppercase tracking-wider text-slate-500">£</span>
        </div>
        {categorySaleValue.length === 0 ? (
          <div className="text-sm text-slate-400 py-12 text-center">{t("no_records")}</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, 60 + categorySaleValue.length * 38)}>
            <BarChart data={categorySaleValue} layout="vertical" margin={{ left: 20, right: 80, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v) => `£${formatNumber(v, 0)}`} />
              <YAxis dataKey="category" type="category" width={140} stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ border: "1px solid #dfe7f2", borderRadius: 8 }} formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="value" fill="#145BFF" radius={[0, 6, 6, 0]}>
                <LabelList dataKey="value" position="right" formatter={(v) => formatCurrency(v)} fill="#0f172a" fontSize={12} fontWeight={600} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top products + Low stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="sphere-card border border-slate-200 p-5 rounded-lg bg-white" data-testid="top-products">
          <h3 className="font-display text-lg font-medium text-slate-800 mb-4">{t("top_products")}</h3>
          {data.top_products.length === 0 ? <div className="text-sm text-slate-400">{t("no_exits")}</div> : (
            <ul className="space-y-3">
              {data.top_products.map((p, i) => (
                <li key={p.product_id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center">{i + 1}</div>
                    <div>
                      <div className="text-slate-800">{p.product_name}</div>
                      <div className="text-xs text-slate-500">{formatNumber(p.weight, 2)} kg • {formatNumber(p.quantity, 0)} {t("unit").toLowerCase()}</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-slate-900 tabular">{formatCurrency(p.revenue)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sphere-card border border-slate-200 p-5 rounded-lg bg-white" data-testid="low-stock-alert">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="font-display text-lg font-medium text-slate-800">{t("low_stock_title")}</h3>
          </div>
          {data.low_stock_products.length === 0 ? <div className="text-sm text-slate-400">{t("no_low_stock")}</div> : (
            <ul className="divide-y divide-slate-100">
              {data.low_stock_products.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-500">{t("code")}: {p.code}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-600 font-semibold tabular">{formatNumber(p.current_stock, 0)} {p.unit}</div>
                    <div className="text-xs text-slate-500">Min: {formatNumber(p.min_stock, 0)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="sphere-card border border-slate-200 p-5 rounded-lg bg-white" data-testid="recent-productions">
          <div className="flex items-center gap-2 mb-4">
            <Factory className="w-4 h-4 text-[#145BFF]" />
            <h3 className="font-display text-lg font-medium text-slate-800">{t("recent_productions")}</h3>
          </div>
          {data.recent_productions.length === 0 ? <div className="text-sm text-slate-400">{t("no_production")}</div> : (
            <ul className="divide-y divide-slate-100">
              {data.recent_productions.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="text-slate-800">{p.lot_number || `Lot: -`}</div>
                    <div className="text-xs text-slate-500">{formatDate(p.date)}</div>
                  </div>
                  <div className="text-slate-700 tabular">{formatNumber(p.quantity, 0)} {p.unit}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sphere-card border border-slate-200 p-5 rounded-lg bg-white" data-testid="recent-sales">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-4 h-4 text-[#145BFF]" />
            <h3 className="font-display text-lg font-medium text-slate-800">{t("recent_exits")}</h3>
          </div>
          {data.recent_sales.length === 0 ? <div className="text-sm text-slate-400">{t("no_exits")}</div> : (
            <ul className="divide-y divide-slate-100">
              {data.recent_sales.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="text-slate-800">{s.customer_name}</div>
                    <div className="text-xs text-slate-500">{formatDateTime(s.created_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-900 font-medium tabular">{formatNumber(s.total_weight || 0, 2)} kg</div>
                    <div className="text-xs text-slate-500">{formatNumber(s.total_quantity || 0, 0)} {t("unit").toLowerCase()}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
