# StokTakip – Stok-Üretim-Satış Takip Uygulaması

## Problem Statement (verbatim)
> Türkçe arayüzlü, modern, responsive ve full-stack çalışan bir stok-üretim-satış takip web uygulaması. Ürün/üretim/müşteri/satış/stok hareketi yönetimi. Dashboard, CRUD ekranları, otomatik stok hesaplama, raporlama ve grafikler, CSV/Excel/PDF export. Çoklu rol (admin/personel/sadece-rapor), GBP £, açık tema, boş başlangıç.
> 12-Point Refactor (Feb 2026): kg/adet odaklı metrikler, müşteri tipleri (Cash & Carry / Retail / Shop), "Depo Çıkış" yeniden adlandırma, TR/EN dil seçici, granular izinler, profil düzenleme, şirket profili + logo yükleme.

## User Choices
- Auth: JWT email/password
- Roles: admin / personel / rapor (sadece-rapor)
- **Granular permissions** (18 keys, 7 groups) — admin can configure per-user
- Theme: Light only
- Currency: **GBP £**
- Demo data: empty start
- Locale UI: Turkish + English (toggle in Settings)

## Architecture
- **Backend**: FastAPI (Python) at `/api/*`, MongoDB via motor, JWT (PyJWT) + bcrypt, reportlab (PDF), openpyxl (Excel), Emergent Object Storage (logo)
- **Frontend**: React (CRA + craco), react-router, axios, Recharts, Sonner, shadcn/ui, LanguageContext (TR/EN)
- **Design**: Swiss/Technical Dashboard, Cobalt Blue (#0047AB), Work Sans + Inter, sharp edges, dense tables

## Implemented (Feb 2026)
### Auth & Users
- /api/auth/{register, login, logout, me, forgot-password, reset-password}; httpOnly cookies + Bearer fallback
- PUT /api/auth/me (self profile editor: name, email, password with current_password verify)
- **Granular permissions**: 18 keys / 7 groups
- Auto admin seed (admin@stoktakip.com / Admin123!)
- /api/users CRUD (admin can change email + password) + /api/permissions

### Domain CRUD
- Products: code uniqueness, soft delete, initial stock movement (NO cost_price/dates/shelf_life — removed in refactor)
- Customers: types Cash & Carry / Retail / Shop (+ legacy Bireysel/Kurumsal)
- Productions: stock += quantity, weight tracking
- Sales ("Depo Çıkış"): multi-line; stamps each item with {weight, product_unit, unit_weight, product_category}; total_weight & total_quantity on sale doc
- Sales receipt PDF at /api/sales/{id}/receipt (reportlab, A5, embedded logo)
- Stock adjustments + movement log

### Dashboard & Reports (kg/adet focused)
- Dashboard KPIs: Toplam Ürün / Toplam Stok (kg) / Bugünkü Çıkış (adet+kg) / Bu Ay Çıkış
- Charts: Stok Mali Değer (kategori pie), Son 14 Gün Çıkış Trendi (kg line)
- Reports: weight-based aggregations, top customers by weight, top products by weight

### Company & Storage
- PUT /api/company, POST/DELETE /api/company/logo (Emergent Object Storage)
- Logo embedded in PDFs and sidebar

### i18n (NEW — completed in this session)
- LanguageContext with TR/EN toggle in Settings
- TRANSLATIONS map covers: sidebar, dashboard KPIs, page subtitles, common labels, products/production/customers/sales/stock/reports/settings strings
- Settings page fully translated (company profile labels, table headers, role select options, perm dialog, user edit dialog, toast messages)
- Sidebar role badge (Administrator/Staff/Report Only) translated via Layout.jsx

## Tests
- **99/99 backend pytest cases pass** (38 base + 10 PW-reset/PDF + 22 perms/Excel + 17 iteration5 + 12 misc)
- Frontend smoke validated: TR→EN switch on /settings, sidebar nav, dashboard KPIs, /sales rename

## Backlog (P1/P2)
- **P1**: Translate remaining Turkish strings on Products/Production/Customers/Reports/Stock pages (Settings + Sidebar now complete)
- **P2**: Replace native `<input type="date">` on /sales with shadcn Calendar/Popover
- **P2**: Refactor monolithic server.py (~1674 lines) into routers/services
- **P2**: Gate dev_token in /auth/forgot-password behind DEV_MODE env flag; wire real email sender
- **P2**: KDV (tax) calc, audit log, multi-currency

## Test Credentials
- Admin: `admin@stoktakip.com` / `Admin123!`
