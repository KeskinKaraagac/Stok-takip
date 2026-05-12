"""Comprehensive backend tests for Stok-Üretim-Satış API (Turkish stock app)."""
import os
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://depo-yonetim-14.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "admin@stoktakip.com"
ADMIN_PASS = "Admin123!"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data and "user" in data
    return data["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def state():
    """Shared mutable state between ordered tests."""
    return {}


# ---------- Auth Tests ----------
class TestAuth:
    def test_root(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_login_admin_success(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 20

    def test_login_sets_cookies(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
        assert r.status_code == 200
        cookies = r.cookies
        assert "access_token" in cookies
        assert "refresh_token" in cookies

    def test_me_authenticated(self, admin_headers):
        r = requests.get(f"{API}/auth/me", headers=admin_headers)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == ADMIN_EMAIL
        assert u["role"] == "admin"

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_register_personel(self, state):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Pass1234", "name": "Test Personel", "role": "personel"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["email"] == email
        assert data["user"]["role"] == "personel"
        assert "access_token" in data
        state["personel_email"] = email
        state["personel_token"] = data["access_token"]
        state["personel_id"] = data["user"]["id"]

    def test_register_rapor(self, state):
        email = f"rapor_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Pass1234", "name": "Test Rapor", "role": "rapor"
        })
        assert r.status_code == 200
        state["rapor_token"] = r.json()["access_token"]

    def test_register_duplicate(self, state):
        r = requests.post(f"{API}/auth/register", json={
            "email": state["personel_email"], "password": "Pass1234", "name": "Dup"
        })
        assert r.status_code == 400

    def test_logout(self):
        r = requests.post(f"{API}/auth/logout")
        assert r.status_code == 200


# ---------- Products ----------
class TestProducts:
    def test_create_product(self, admin_headers, state):
        code = f"P{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "name": "Test Ürün", "code": code, "category": "Süt Ürünleri", "unit": "kg",
            "unit_weight": 1.0, "sale_price": 25.50, "cost_price": 15.00,
            "current_stock": 100.0, "min_stock": 10.0, "shelf_life_days": 30,
            "active": True,
        }
        r = requests.post(f"{API}/products", json=payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["code"] == code
        assert p["current_stock"] == 100.0
        assert "id" in p
        state["product_id"] = p["id"]
        state["product_code"] = code

    def test_create_duplicate_code(self, admin_headers, state):
        r = requests.post(f"{API}/products", json={
            "name": "Dup", "code": state["product_code"], "unit": "adet",
            "sale_price": 1, "cost_price": 1, "current_stock": 0, "min_stock": 0,
        }, headers=admin_headers)
        assert r.status_code == 400

    def test_list_products(self, admin_headers):
        r = requests.get(f"{API}/products", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_update_product_stock_creates_movement(self, admin_headers, state):
        pid = state["product_id"]
        r = requests.put(f"{API}/products/{pid}", json={
            "name": "Test Ürün Güncel", "code": state["product_code"], "category": "Süt Ürünleri",
            "unit": "kg", "unit_weight": 1.0, "sale_price": 26.0, "cost_price": 15.0,
            "current_stock": 120.0, "min_stock": 10.0, "shelf_life_days": 30, "active": True,
        }, headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["current_stock"] == 120.0

        mv = requests.get(f"{API}/stock/movements?product_id={pid}", headers=admin_headers)
        assert mv.status_code == 200
        types = [m["movement_type"] for m in mv.json()]
        assert "manuel" in types

    def test_personel_cannot_delete(self, state):
        h = {"Authorization": f"Bearer {state['personel_token']}"}
        r = requests.delete(f"{API}/products/{state['product_id']}", headers=h)
        assert r.status_code == 403

    def test_rapor_cannot_create(self, state):
        h = {"Authorization": f"Bearer {state['rapor_token']}"}
        r = requests.post(f"{API}/products", json={
            "name": "X", "code": "XXX", "unit": "adet", "sale_price": 1, "cost_price": 1,
            "current_stock": 0, "min_stock": 0,
        }, headers=h)
        assert r.status_code == 403


# ---------- Customers ----------
class TestCustomers:
    def test_create_customer(self, admin_headers, state):
        r = requests.post(f"{API}/customers", json={
            "name": "Test Müşteri", "phone": "5551234567", "email": "musteri@test.com",
            "customer_type": "Kurumsal", "active": True,
        }, headers=admin_headers)
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["name"] == "Test Müşteri"
        state["customer_id"] = c["id"]

    def test_get_customer_with_sales(self, admin_headers, state):
        r = requests.get(f"{API}/customers/{state['customer_id']}", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        assert "customer" in d and "sales" in d and "total_sales" in d

    def test_update_customer(self, admin_headers, state):
        r = requests.put(f"{API}/customers/{state['customer_id']}", json={
            "name": "Test Müşteri 2", "phone": "5559999999", "customer_type": "Bireysel", "active": True
        }, headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["name"] == "Test Müşteri 2"


# ---------- Productions ----------
class TestProductions:
    def test_create_production_increments_stock(self, admin_headers, state):
        before = requests.get(f"{API}/products", headers=admin_headers).json()
        old_stock = next(p["current_stock"] for p in before if p["id"] == state["product_id"])
        r = requests.post(f"{API}/productions", json={
            "date": "2026-01-15T10:00:00",
            "product_id": state["product_id"],
            "quantity": 50.0, "unit": "kg", "lot_number": "LOT001", "cost": 750.0,
        }, headers=admin_headers)
        assert r.status_code == 200, r.text
        after = requests.get(f"{API}/products", headers=admin_headers).json()
        new_stock = next(p["current_stock"] for p in after if p["id"] == state["product_id"])
        assert abs(new_stock - (old_stock + 50.0)) < 1e-6

        mv = requests.get(f"{API}/stock/movements?product_id={state['product_id']}", headers=admin_headers).json()
        assert any(m["movement_type"] == "uretim" for m in mv)


# ---------- Sales ----------
class TestSales:
    def test_create_sale_decrements_stock(self, admin_headers, state):
        before = requests.get(f"{API}/products", headers=admin_headers).json()
        old_stock = next(p["current_stock"] for p in before if p["id"] == state["product_id"])
        r = requests.post(f"{API}/sales", json={
            "date": "2026-01-15T12:00:00",
            "customer_id": state["customer_id"],
            "items": [{"product_id": state["product_id"], "quantity": 10.0, "unit_price": 30.0}],
            "discount": 0.0,
            "payment_status": "odendi",
        }, headers=admin_headers)
        assert r.status_code == 200, r.text
        sale = r.json()
        assert sale["net_total"] == 300.0
        state["sale_id"] = sale["id"]
        after = requests.get(f"{API}/products", headers=admin_headers).json()
        new_stock = next(p["current_stock"] for p in after if p["id"] == state["product_id"])
        assert abs(new_stock - (old_stock - 10.0)) < 1e-6

    def test_insufficient_stock(self, admin_headers, state):
        r = requests.post(f"{API}/sales", json={
            "date": "2026-01-15T13:00:00",
            "customer_id": state["customer_id"],
            "items": [{"product_id": state["product_id"], "quantity": 999999.0, "unit_price": 10.0}],
            "discount": 0.0, "payment_status": "bekliyor",
        }, headers=admin_headers)
        assert r.status_code == 400


# ---------- Stock Adjust ----------
class TestStock:
    def test_adjust_positive(self, admin_headers, state):
        r = requests.post(f"{API}/stock/adjust", json={
            "product_id": state["product_id"], "movement_type": "manuel",
            "quantity": 5.0, "description": "Test ekleme",
        }, headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["new_stock"] > r.json()["previous_stock"]

    def test_adjust_negative(self, admin_headers, state):
        r = requests.post(f"{API}/stock/adjust", json={
            "product_id": state["product_id"], "movement_type": "fire",
            "quantity": -2.0, "description": "Fire",
        }, headers=admin_headers)
        assert r.status_code == 200

    def test_adjust_negative_rejected(self, admin_headers, state):
        r = requests.post(f"{API}/stock/adjust", json={
            "product_id": state["product_id"], "movement_type": "fire",
            "quantity": -999999.0,
        }, headers=admin_headers)
        assert r.status_code == 400

    def test_list_movements_filter(self, admin_headers, state):
        r = requests.get(f"{API}/stock/movements?product_id={state['product_id']}", headers=admin_headers)
        assert r.status_code == 200
        movs = r.json()
        assert len(movs) > 0
        assert all(m["product_id"] == state["product_id"] for m in movs)


# ---------- Dashboard & Reports ----------
class TestDashboardReports:
    def test_dashboard_summary(self, admin_headers):
        r = requests.get(f"{API}/dashboard/summary", headers=admin_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        # Iteration 5: removed 'expiring_products', renamed 'sales_trend' -> 'exit_trend'
        for key in ["total_products", "total_stock_value_cost", "today_sales", "month_sales",
                    "low_stock_products", "top_products",
                    "recent_productions", "recent_sales", "exit_trend",
                    "total_stock_weight", "today_quantity", "today_weight",
                    "month_quantity", "month_weight", "category_value"]:
            assert key in d, f"Missing key {key}"
        assert "expiring_products" not in d
        assert len(d["exit_trend"]) == 14

    def test_report_stock(self, admin_headers):
        r = requests.get(f"{API}/reports/stock", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        assert "rows" in d and "total_cost_value" in d

    def test_report_category(self, admin_headers):
        r = requests.get(f"{API}/reports/category-distribution", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_report_production(self, admin_headers):
        r = requests.get(f"{API}/reports/production?start=2026-01-01&end=2026-12-31", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        assert "by_day" in d and "total" in d

    def test_report_sales(self, admin_headers):
        r = requests.get(f"{API}/reports/sales?start=2026-01-01&end=2026-12-31", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        assert "by_day" in d and "gross_profit" in d


# ---------- Users (admin) ----------
class TestUsers:
    def test_list_users_admin(self, admin_headers):
        r = requests.get(f"{API}/users", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_users_non_admin_forbidden(self, state):
        h = {"Authorization": f"Bearer {state['personel_token']}"}
        r = requests.get(f"{API}/users", headers=h)
        assert r.status_code == 403

    def test_update_user_role(self, admin_headers, state):
        r = requests.put(f"{API}/users/{state['personel_id']}", json={"role": "rapor"}, headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["role"] == "rapor"

    def test_admin_cannot_delete_self(self, admin_headers):
        me = requests.get(f"{API}/auth/me", headers=admin_headers).json()
        r = requests.delete(f"{API}/users/{me['id']}", headers=admin_headers)
        assert r.status_code == 400

    def test_delete_user(self, admin_headers, state):
        r = requests.delete(f"{API}/users/{state['personel_id']}", headers=admin_headers)
        assert r.status_code == 200


# ---------- Cleanup ----------
class TestZCleanup:
    def test_soft_delete_product(self, admin_headers, state):
        r = requests.delete(f"{API}/products/{state['product_id']}", headers=admin_headers)
        assert r.status_code == 200
        prods = requests.get(f"{API}/products?active_only=true", headers=admin_headers).json()
        assert not any(p["id"] == state["product_id"] for p in prods)

    def test_soft_delete_customer(self, admin_headers, state):
        r = requests.delete(f"{API}/customers/{state['customer_id']}", headers=admin_headers)
        assert r.status_code == 200
