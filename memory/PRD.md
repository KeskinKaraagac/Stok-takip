# StokTakip – Stok-Üretim-Satış Takip Uygulaması

## Problem Statement (verbatim)
> Türkçe arayüzlü, modern, responsive ve full-stack çalışan bir stok-üretim-satış takip web uygulaması. Ürün/üretim/müşteri/satış/stok hareketi yönetimi. Dashboard, CRUD ekranları, otomatik stok hesaplama, raporlama ve grafikler, CSV export. Çoklu rol (admin/personel/sadece-rapor), GBP £, açık tema, boş başlangıç.

## User Choices
- Auth: JWT email/password
- Roles: admin / personel / rapor (sadece-rapor)
- **Granular permissions** (18 keys, 7 groups) — admin can configure per-user
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
- /api/auth/forgot-password & /api/auth/reset-password (token-based, 1h expiry, single-use)
- **Granular permissions**: 18 keys / 7 groups (products.*, customers.*, productions.*, sales.*, stock.*, reports.view, users.manage)
- Admin always bypasses; personel/rapor have role-based defaults; admin can edit each user's permissions via Settings dialog
- Auto admin seed (admin@stoktakip.com / Admin123!)
- /api/users CRUD + /api/permissions endpoint

### Domain CRUD
- Products: code uniqueness, soft delete (active=false), initial stock movement on create
- Customers: detail view aggregates sales & total
- Productions: stock += quantity, creates `uretim` movement
- Sales: multi-line POS-style; stock validation; -=quantity per item; `satis` movements
- **Sales receipt PDF** at `/api/sales/{id}/receipt` (reportlab, A5)
- Stock: `/stock/adjust` (manuel/fire/iade); rejects negative stock; movement log

### Dashboard & Reports
- Dashboard KPIs (£ stock value, today/month sales), low-stock & expiring alerts, top-5 products, recent activity, 14-day sales trend (line chart)
- Reports: Stock, Financial, Category Distribution (pie), Production (bar + averages), Sales (line, bar, customer & product breakdown, gross profit)
- CSV export for products & stock report

### Frontend Pages
Login, Register, Dashboard, Ürün Kontrolü, Üretim Girişi, Müşteriler, Günlük Satış, Stok Durumu, Raporlar, Ayarlar

## Tests
- **70/70 backend pytest cases pass** (38 base + 10 password-reset/PDF + 22 perms/Excel)
- Frontend smoke-tested across all main pages including permission editor + Excel downloads

## Backlog (P1/P2)
- **P1**: Filter `active` flag in /customers (currently returns all); add `active_only` query param
- **P1**: Gate `dev_token` in `/auth/forgot-password` behind `DEV_MODE` env flag; wire real email sender (Resend/SendGrid)
- **P1**: Wire `canDelete` (sales.delete) into a per-row delete/cancel button on Sales page
- **P2**: Shadcn Calendar/Popover date picker on Sales page (replace native input)
- **P2**: KDV (tax) calculation, multi-currency support
- **P2**: Audit log per user / activity history
- **P2**: Refactor monolithic server.py (~1293 lines) into routers/services

## Test Credentials
- Admin: `admin@stoktakip.com` / `Admin123!`
