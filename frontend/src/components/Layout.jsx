import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Factory,
  Users,
  ShoppingCart,
  Layers,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import { useLanguage } from "../context/LanguageContext";
import { useState } from "react";
import { Toaster } from "sonner";

const MENU = [
  { to: "/", key: "dashboard", icon: LayoutDashboard, end: true, roles: ["admin", "personel", "rapor"] },
  { to: "/products", key: "products", icon: Package, roles: ["admin", "personel", "rapor"] },
  { to: "/production", key: "production", icon: Factory, roles: ["admin", "personel"] },
  { to: "/customers", key: "customers", icon: Users, roles: ["admin", "personel", "rapor"] },
  { to: "/sales", key: "sales", icon: ShoppingCart, roles: ["admin", "personel"] },
  { to: "/stock", key: "stock", icon: Layers, roles: ["admin", "personel", "rapor"] },
  { to: "/reports", key: "reports", icon: BarChart3, roles: ["admin", "personel", "rapor"] },
  { to: "/my-settings", key: "mySettings", icon: Settings, roles: ["admin", "personel", "rapor"] },
  { to: "/settings", key: "settings", icon: Settings, roles: ["admin"] },
];

const ROLE_KEYS = {
  admin: "role_admin",
  personel: "role_personel",
  rapor: "role_rapor",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { company, logoUrl } = useCompany();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = MENU.filter((m) => !m.roles || m.roles.includes(user?.role));

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="bottom-right" richColors />

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between border-b border-slate-200 px-4 h-14 bg-white sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <img src={logoUrl} alt={company.name} className="w-8 h-8 object-contain" />
          <span className="font-display font-semibold tracking-tight text-slate-900">{company.name}</span>
        </div>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-sm"
          data-testid="mobile-menu-toggle"
          aria-label="Menü"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-slate-50 border-r border-slate-200 flex flex-col z-40 transition-transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        data-testid="sidebar"
      >
        <div className="px-5 h-16 flex items-center gap-3 border-b border-slate-200 bg-white">
          <img src={logoUrl} alt={company.name} className="w-10 h-10 object-contain" data-testid="sidebar-logo" />
          <div className="leading-tight min-w-0">
            <div className="font-display text-base font-bold text-slate-900 tracking-tight truncate">{company.name}</div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 mt-1">Üretim & Satış</div>
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {items.map((m) => {
            const Icon = m.icon;
            return (
              <NavLink
                key={m.to}
                to={m.to}
                end={m.end}
                onClick={() => setMobileOpen(false)}
                data-testid={`sidebar-link-${m.key}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors border-l-2 ${
                    isActive
                      ? "border-[#0047AB] bg-white text-slate-900 font-medium"
                      : "border-transparent text-slate-600 hover:bg-white hover:text-slate-900"
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {t(m.key)}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider" data-testid="user-info">
            {user?.name}
          </div>
          <div className="text-xs text-slate-400 mb-3">{t(ROLE_KEYS[user?.role]) || user?.role}</div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="flex items-center gap-2 w-full text-sm text-slate-700 hover:text-[#0047AB] transition-colors"
          >
            <LogOut className="w-4 h-4" /> {t("logout")}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <main className="lg:ml-64 min-h-screen p-4 sm:p-6 lg:p-8 bg-white">
        <Outlet />
      </main>
    </div>
  );
}
