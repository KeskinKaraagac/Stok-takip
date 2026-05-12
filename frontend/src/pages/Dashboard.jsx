import { useEffect, useState } from "react";
import { Package, PoundSterling, TrendingUp, AlertTriangle, Calendar, Factory, ShoppingCart } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import api from "../lib/api";
import { formatCurrency, formatNumber, formatDate, formatDateTime, formatApiError } from "../lib/format";
import PageHeader from "../components/PageHeader";
import { toast } from "sonner";

function KPI({ icon: Icon, label, value, sub, accent = false, testId }) {
  return (
    <div className="border border-slate-200 bg-white p-5 rounded-sm" data-testid={testId}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-[0.1em] font-bold text-slate-500">{label}</div>
        <div className={`w-8 h-8 flex items-center justify-center ${accent ? "bg-[#0047AB] text-white" : "bg-slate-100 text-slate-600"}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="kpi-value text-4xl text-slate-900 tabular">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-2">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard/summary")
      .then((r) => setData(r.data))
      .catch((e) => toast.error(formatApiError(e)));
  }, []);

  if (!data) {
    return (
      <div className="text-slate-500 text-sm" data-testid="dashboard-loading">Yükleniyor...</div>
    );
  }

  return (
    <div data-testid="dashboard-page">
      <PageHeader title="Dashboard" subtitle="Genel iş durumu özeti" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI icon={Package} label="Toplam Ürün" value={formatNumber(data.total_products, 0)} sub={`${formatNumber(data.total_stock_units, 2)} birim stok`} testId="kpi-total-products" />
        <KPI icon={PoundSterling} label="Stok Mali Değeri" value={formatCurrency(data.total_stock_value_cost)} sub={`Satış değeri: ${formatCurrency(data.total_stock_value_sale)}`} accent testId="kpi-stock-value" />
        <KPI icon={TrendingUp} label="Bugünkü Satış" value={formatCurrency(data.today_sales)} sub="Net tutar" testId="kpi-today-sales" />
        <KPI icon={Calendar} label="Bu Ayki Satış" value={formatCurrency(data.month_sales)} sub="Cari ay toplamı" testId="kpi-month-sales" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 border border-slate-200 p-5 rounded-sm" data-testid="chart-sales-trend">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-medium text-slate-800">Son 14 Gün Satış Trendi</h3>
            <span className="text-xs uppercase tracking-wider text-slate-500">£ GBP</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.sales_trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(v) => v.slice(8, 10) + "." + v.slice(5, 7)} stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `£${v}`} />
              <Tooltip
                contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 0, fontSize: 12 }}
                formatter={(value) => [formatCurrency(value), "Satış"]}
                labelFormatter={(l) => formatDate(l)}
              />
              <Line type="monotone" dataKey="total" stroke="#0047AB" strokeWidth={2} dot={{ r: 3, fill: "#0047AB" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-slate-200 p-5 rounded-sm" data-testid="top-products">
          <h3 className="font-display text-lg font-medium text-slate-800 mb-4">En Çok Satan 5 Ürün</h3>
          {data.top_products.length === 0 ? (
            <div className="text-sm text-slate-400">Henüz satış kaydı yok.</div>
          ) : (
            <ul className="space-y-3">
              {data.top_products.map((p, i) => (
                <li key={p.product_id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center">{i + 1}</div>
                    <div>
                      <div className="text-slate-800">{p.product_name}</div>
                      <div className="text-xs text-slate-500">{formatNumber(p.quantity, 2)} adet</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-slate-900 tabular">{formatCurrency(p.revenue)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="border border-slate-200 p-5 rounded-sm" data-testid="low-stock-alert">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="font-display text-lg font-medium text-slate-800">Minimum Stok Altındaki Ürünler</h3>
          </div>
          {data.low_stock_products.length === 0 ? (
            <div className="text-sm text-slate-400">Düşük stoklu ürün yok.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.low_stock_products.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-500">Kod: {p.code}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-600 font-semibold tabular">{formatNumber(p.current_stock, 2)} {p.unit}</div>
                    <div className="text-xs text-slate-500">Min: {formatNumber(p.min_stock, 2)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-slate-200 p-5 rounded-sm" data-testid="expiring-alert">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-red-500" />
            <h3 className="font-display text-lg font-medium text-slate-800">Raf Ömrü Yaklaşan Ürünler</h3>
          </div>
          {data.expiring_products.length === 0 ? (
            <div className="text-sm text-slate-400">Yaklaşan SKT yok.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.expiring_products.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-500">Kod: {p.code}</div>
                  </div>
                  <div className="text-red-600 text-sm tabular">{formatDate(p.expiry_date)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-slate-200 p-5 rounded-sm" data-testid="recent-productions">
          <div className="flex items-center gap-2 mb-4">
            <Factory className="w-4 h-4 text-[#0047AB]" />
            <h3 className="font-display text-lg font-medium text-slate-800">Son Üretim Hareketleri</h3>
          </div>
          {data.recent_productions.length === 0 ? (
            <div className="text-sm text-slate-400">Henüz üretim kaydı yok.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recent_productions.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="text-slate-800">{p.lot_number || "Lot: -"}</div>
                    <div className="text-xs text-slate-500">{formatDate(p.date)}</div>
                  </div>
                  <div className="text-slate-700 tabular">{formatNumber(p.quantity, 2)} {p.unit}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-slate-200 p-5 rounded-sm" data-testid="recent-sales">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-4 h-4 text-[#0047AB]" />
            <h3 className="font-display text-lg font-medium text-slate-800">Son Satış Hareketleri</h3>
          </div>
          {data.recent_sales.length === 0 ? (
            <div className="text-sm text-slate-400">Henüz satış kaydı yok.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recent_sales.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="text-slate-800">{s.customer_name}</div>
                    <div className="text-xs text-slate-500">{formatDateTime(s.created_at)}</div>
                  </div>
                  <div className="text-slate-900 font-medium tabular">{formatCurrency(s.net_total)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
