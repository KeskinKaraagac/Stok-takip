# StokTakip – Stok-Üretim-Satış Takip Uygulaması

## Problem Statement (verbatim)
> Türkçe arayüzlü, modern, responsive ve full-stack çalışan bir stok-üretim-satış takip web uygulaması. Ürün/üretim/müşteri/satış/stok hareketi yönetimi. Dashboard, CRUD ekranları, otomatik stok hesaplama, raporlama ve grafikler, CSV export. Çoklu rol (admin/personel/sadece-rapor), GBP £, açık tema, boş başlangıç.

## User Choices
- Auth: JWT email/password
- Roles: admin / personel / rapor (sadece-rapor)
- Theme: Light only
- Currency: **GBP £**
- Demo data: empty start
- Locale UI: Turkish

## Architecture
- **Backend**: FastAPI (Python) at `/api/*`, MongoDB via motor, JWT (PyJWT) + bcrypt
- **Frontend**: React (CRA + craco), react-router, axios, Recharts, Sonner, shadcn/ui
- **Design**: Swiss/Technical Dashboard, Cobalt Blue (#0047AB), Work Sans + Inter, sharp edges, dense tables

## Implemented (v1 – Feb 2026)
### Auth & Users
- /api/auth/{register, login, logout, me}; httpOnly cookies + Bearer fallback
- Auto admin seed (admin@stoktakip.com / Admin123!)
- /api/users CRUD (admin only) with role switching

### Domain CRUD
- Products: code uniqueness, soft delete (active=false), initial stock movement on create
- Customers: detail view aggregates sales & total
- Productions: stock += quantity, creates `uretim` movement
- Sales: multi-line POS-style; stock validation; -=quantity per item; `satis` movements
- Stock: `/stock/adjust` (manuel/fire/iade); rejects negative stock; movement log

### Dashboard & Reports
- Dashboard KPIs (£ stock value, today/month sales), low-stock & expiring alerts, top-5 products, recent activity, 14-day sales trend (line chart)
- Reports: Stock, Financial, Category Distribution (pie), Production (bar + averages), Sales (line, bar, customer & product breakdown, gross profit)
- CSV export for products & stock report

### Frontend Pages
Login, Register, Dashboard, Ürün Kontrolü, Üretim Girişi, Müşteriler, Günlük Satış, Stok Durumu, Raporlar, Ayarlar

## Tests
- 38/38 pytest backend tests pass — `/app/backend/tests/backend_test.py`
- Frontend smoke-tested across 6 main pages

## Backlog (P0/P1/P2)
- **P1**: Filter `active` flag in /customers (currently returns all); add `active_only` query param
- **P1**: PDF receipt printing for Sales
- **P2**: Password reset flow (`/auth/forgot-password`, `/auth/reset-password`)
- **P2**: Excel (xlsx) export instead of CSV
- **P2**: Audit log per user / activity history
- **P2**: Multi-currency support and tax (KDV) calculations
- **P2**: Direct deep-links for /productions, /users routes
- **P2**: Refactor monolithic server.py into routers/services

## Test Credentials
- Admin: `admin@stoktakip.com` / `Admin123!`
