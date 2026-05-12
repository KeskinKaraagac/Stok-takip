# StokTakip – Stok-Üretim-Satış Takip Uygulaması

## Problem Statement (verbatim)
> Türkçe arayüzlü, modern, responsive ve full-stack çalışan bir stok-üretim-satış takip web uygulaması. Ürün/üretim/müşteri/satış/stok hareketi yönetimi. Dashboard, CRUD ekranları, otomatik stok hesaplama, raporlama ve grafikler, CSV/Excel/PDF export. Çoklu rol (admin/personel/sadece-rapor), GBP £, açık tema, boş başlangıç.
> Refactor (Feb 2026): kg/adet odaklı metrikler, müşteri tipleri (Cash & Carry / Retail / Shop), "Depo Çıkış" yeniden adlandırma, TR/EN dil seçici, granular izinler, profil düzenleme, şirket profili + logo yükleme.
> Iteration 6 (Feb 2026): Tam i18n yayılımı (Products/Production/Customers/Stock/Reports), Dashboard kg-odaklı KPI'lar, kategoriye göre stok pasta + potansiyel satış bar grafiği, Raporlar'da kategori bazlı kg özet kartları + grafik üzerinde değer etiketleri, SaaS-kalitesinde polish.

## User Choices
- Auth: JWT email/password
- Roles: admin / personel / rapor
- **Granular permissions** (18 keys, 7 groups)
- Theme: Light only
- Currency: **GBP £**
- Locale UI: Turkish + English (Settings'ten toggle)

## Architecture
- **Backend**: FastAPI at `/api/*`, MongoDB via motor, JWT + bcrypt, reportlab (PDF), openpyxl (Excel), Emergent Object Storage (logo)
- **Frontend**: React (CRA + craco), react-router, axios, Recharts, Sonner, shadcn/ui, LanguageContext (TR/EN)
- **Design**: Swiss/Technical Dashboard, Cobalt Blue (#0047AB), Work Sans + Inter, sharp edges, dense tables, fadeIn micro-animations

## Implemented (Feb 2026)
### Auth, Users, Permissions
- /api/auth (register, login, logout, me, forgot/reset password); JWT cookies + Bearer
- PUT /api/auth/me (self profile w/ current_password verify), PUT /api/users/{id} (admin can change email + password)
- Granular permissions (18 keys, 7 groups) per user

### Domain CRUD
- Products (no cost_price/dates after refactor), Customers (Cash & Carry/Retail/Shop), Productions (kg/adet), Sales ("Depo Çıkış" with total_weight/total_quantity stamping)
- Sales receipt PDF at /api/sales/{id}/receipt (reportlab, A5, embedded logo)
- Stock adjustments + movement log

### Dashboard (Iteration 6)
- 4 KPI cards ALL kg-focused: Toplam Ürün (count + kg sub), Toplam Stok (kg), Bugünkü Çıkış (kg + qty sub), Bu Ay Çıkış (kg + qty sub)
- 14-day exit trend line chart
- **NEW**: "Kategoriye Göre Toplam Stok (kg)" pie chart with custom renderPieLabel — labels show `Category: X kg (Y%)` on each slice
- **NEW**: "Kategoriye Göre Potansiyel Satış Değeri" horizontal bar chart with LabelList currency labels on each bar

### Reports (Iteration 6)
- Güncel Stok tab: **NEW** kategori bazlı kg özet kartları (renkli border-l-4 chips) ABOVE the table
- Mali Değer tab: pie chart with custom labels showing `Category: £value (%)`
- Ürün/Kategori tab: pie chart with kg labels, bar chart with quantity labels on top (via LabelList)
- Üretim tab: daily production bar chart with kg labels on top of bars
- Çıkış tab: daily exit line chart + horizontal product bar chart with kg labels

### i18n (Iteration 5+6)
- LanguageContext with TR/EN toggle in Settings
- ~150 translation keys
- **FULL coverage**: Dashboard, Products, Production, Customers, Stock, Reports
- **FULL coverage**: Settings (Iteration 5)
- Sidebar role badge + menu items translated
- Stock movement types translate (uretim/satis/manuel/fire/iade/baslangic ↔ production/sale/manual/waste/return/initial)

### Company & Storage
- PUT /api/company, POST/DELETE /api/company/logo (Emergent Object Storage)
- Logo embedded in PDFs and sidebar

### SaaS Polish (Iteration 6)
- @keyframes fadeIn + slideInUp; animate-fadeIn on every page wrapper
- KPI cards hover state with shadow + border-color + slight translate-y
- Action buttons with transition-colors
- Bar/Pie chart value labels for at-a-glance data reading
- Focus rings with Cobalt Blue color

## Tests
- **Backend**: 114/114 pytest cases pass (38 base + 10 PW-reset/PDF + 22 perms/Excel + 17 iter5 + 15 iter6 + 12 misc)
- **Frontend** smoke validated end-to-end via testing agent: Dashboard new charts/KPIs, Reports stock-category-summary + all chart labels, EN translation coverage on 5 pages, TR round-trip

## Backlog (P1/P2)
- **P2**: Replace native `<input type="date">` on /sales with shadcn Calendar/Popover
- **P2**: Refactor monolithic server.py (~1695 lines) into routers/services
- **P2**: Gate dev_token in /auth/forgot-password behind DEV_MODE env flag; wire real email sender
- **P2**: KDV (tax) calc, audit log, multi-currency

## Test Credentials
- Admin: `admin@stoktakip.com` / `Admin123!`
