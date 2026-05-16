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
    <div className="relative min-h-screen overflow-hidden bg-[#09111f] text-slate-900">
      <Toaster position="bottom-right" richColors />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(135deg,#08111f_0%,#0f766e_34%,#43376b_68%,#92400e_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="pointer-events-none fixed -left-24 top-16 h-80 w-80 rotate-12 border border-white/[0.12] bg-white/[0.04] backdrop-blur-2xl" />
      <div className="pointer-events-none fixed bottom-10 right-8 h-80 w-96 -rotate-6 border border-white/10 bg-black/[0.12] backdrop-blur-xl" />

      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/20 bg-white/[0.72] px-4 shadow-[0_18px_60px_rgba(0,0,0,0.12)] backdrop-blur-2xl lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <img src={logoUrl} alt={company.name} className="h-8 w-8 object-contain" />
          <span className="truncate font-display font-semibold tracking-tight text-slate-900">{company.name}</span>
        </div>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-sm p-2 text-slate-700 hover:bg-white/70"
          data-testid="mobile-menu-toggle"
          aria-label={t("menu")}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/[0.24] bg-white/[0.72] shadow-[24px_0_80px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition-transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        data-testid="sidebar"
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/30 bg-white/[0.38] px-5">
          <img src={logoUrl} alt={company.name} className="h-10 w-10 object-contain" data-testid="sidebar-logo" />
          <div className="min-w-0 leading-tight">
            <div className="truncate font-display text-base font-bold tracking-tight text-slate-900">{company.name}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-slate-500">{t("brand_subtitle")}</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
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
                  `flex items-center gap-3 border-l-2 px-5 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "border-[#0f766e] bg-white/[0.72] font-medium text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                      : "border-transparent text-slate-600 hover:bg-white/[0.46] hover:text-slate-950"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {t(m.key)}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/30 p-4">
          <div className="mb-2 text-xs uppercase tracking-wider text-slate-500" data-testid="user-info">
            {user?.name}
          </div>
          <div className="mb-3 text-xs text-slate-400">{t(ROLE_KEYS[user?.role]) || user?.role}</div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="flex w-full items-center gap-2 text-sm text-slate-700 transition-colors hover:text-[#0f766e]"
          >
            <LogOut className="h-4 w-4" /> {t("logout")}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/[0.45] backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <main className="glass-workspace relative z-10 min-h-screen p-4 sm:p-6 lg:ml-64 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
