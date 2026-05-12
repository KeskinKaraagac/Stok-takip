"""Iteration 5 tests: weight-focused sales, customer types, profile editor, admin user PUT (email/password),
products with optional cost fields, dashboard new shape, reports weight aggregates."""
import os
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "admin@stoktakip.com"
ADMIN_PASS = "Admin123!"


@pytest.fixture(scope="module")
def admin_headers():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def created_ids(admin_headers):
    """Holds ids created in module so we can cleanup at the end."""
    ids = {"products": [], "customers": [], "sales": [], "users": []}
    yield ids
    # Cleanup
    for sid in ids["sales"]:
        requests.delete(f"{API}/sales/{sid}", headers=admin_headers)
    for pid in ids["products"]:
        requests.delete(f"{API}/products/{pid}", headers=admin_headers)
    for cid in ids["customers"]:
        requests.delete(f"{API}/customers/{cid}", headers=admin_headers)
    for uid in ids["users"]:
        requests.delete(f"{API}/users/{uid}", headers=admin_headers)


# ============= Products with optional cost fields =============
class TestProductMinimalPayload:
    def test_create_product_without_cost_and_dates(self, admin_headers, created_ids):
        """POST /api/products without cost_price/shelf_life_days/production_date/expiry_date should succeed."""
        code = f"MIN{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "name": "Minimal Ürün",
            "code": code,
            "category": "Test",
            "unit": "kg",
            "unit_weight": 1.0,
            "sale_price": 20.0,
            "current_stock": 50.0,
            "min_stock": 5.0,
            "active": True,
        }
        r = requests.post(f"{API}/products", json=payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["code"] == code
        # Defaults
        assert p.get("cost_price", 0) == 0
        assert p.get("shelf_life_days") in (None, 0)
        created_ids["products"].append(p["id"])


# ============= Customer Types =============
class TestCustomerTypes:
    @pytest.mark.parametrize("ctype", ["Cash & Carry", "Retail", "Shop"])
    def test_create_customer_with_new_types(self, admin_headers, created_ids, ctype):
        r = requests.post(f"{API}/customers", json={
            "name": f"TEST_{ctype}_{uuid.uuid4().hex[:6]}",
            "phone": "5550000000",
            "customer_type": ctype,
            "active": True,
        }, headers=admin_headers)
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["customer_type"] == ctype
        created_ids["customers"].append(c["id"])

    def test_admin_can_toggle_customer_active(self, admin_headers, created_ids):
        # create a customer
        r = requests.post(f"{API}/customers", json={
            "name": f"TEST_toggle_{uuid.uuid4().hex[:6]}",
            "customer_type": "Retail", "active": True,
        }, headers=admin_headers)
        assert r.status_code == 200
        cid = r.json()["id"]
        created_ids["customers"].append(cid)
        r2 = requests.put(f"{API}/customers/{cid}", json={
            "name": "TEST_toggled", "customer_type": "Retail", "active": False
        }, headers=admin_headers)
        assert r2.status_code == 200, r2.text
        assert r2.json()["active"] is False


# ============= Sales: weight, no payment_status =============
@pytest.fixture(scope="module")
def kg_product(admin_headers, created_ids):
    code = f"KG{uuid.uuid4().hex[:6].upper()}"
    r = requests.post(f"{API}/products", json={
        "name": "KG Ürün", "code": code, "category": "Süt", "unit": "kg",
        "unit_weight": 1.0, "sale_price": 30.0, "current_stock": 200.0,
        "min_stock": 0, "active": True,
    }, headers=admin_headers)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    created_ids["products"].append(pid)
    return pid


@pytest.fixture(scope="module")
def adet_product(admin_headers, created_ids):
    """adet product with 0.5 kg unit_weight."""
    code = f"AD{uuid.uuid4().hex[:6].upper()}"
    r = requests.post(f"{API}/products", json={
        "name": "Adet Ürün", "code": code, "category": "Et", "unit": "adet",
        "unit_weight": 0.5, "sale_price": 100.0, "current_stock": 100.0,
        "min_stock": 0, "active": True,
    }, headers=admin_headers)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    created_ids["products"].append(pid)
    return pid


@pytest.fixture(scope="module")
def customer_for_sales(admin_headers, created_ids):
    r = requests.post(f"{API}/customers", json={
        "name": f"TEST_sales_{uuid.uuid4().hex[:6]}",
        "customer_type": "Cash & Carry", "active": True,
    }, headers=admin_headers)
    cid = r.json()["id"]
    created_ids["customers"].append(cid)
    return cid


class TestSalesWeight:
    def test_sale_without_payment_status(self, admin_headers, kg_product, customer_for_sales, created_ids):
        """POST /api/sales without payment_status — should succeed (now optional)."""
        r = requests.post(f"{API}/sales", json={
            "date": "2026-01-15T10:00:00",
            "customer_id": customer_for_sales,
            "items": [{"product_id": kg_product, "quantity": 5.0, "unit_price": 30.0}],
            "discount": 0.0,
            # NO payment_status
        }, headers=admin_headers)
        assert r.status_code == 200, r.text
        s = r.json()
        assert s["net_total"] == 150.0
        assert s.get("payment_status", "") == ""
        # Weight fields present
        assert "total_weight" in s
        assert "total_quantity" in s
        assert abs(s["total_weight"] - 5.0) < 1e-6  # kg-unit: qty=weight
        assert abs(s["total_quantity"] - 5.0) < 1e-6
        # Item weight
        assert s["items"][0].get("weight") == 5.0
        assert s["items"][0].get("product_unit") == "kg"
        created_ids["sales"].append(s["id"])

    def test_sale_adet_product_weight_computed(self, admin_headers, adet_product, customer_for_sales, created_ids):
        """For adet-unit product, weight = qty * unit_weight (0.5)."""
        r = requests.post(f"{API}/sales", json={
            "date": "2026-01-16T10:00:00",
            "customer_id": customer_for_sales,
            "items": [{"product_id": adet_product, "quantity": 10.0, "unit_price": 100.0}],
            "discount": 0.0,
            "payment_status": "odendi",
        }, headers=admin_headers)
        assert r.status_code == 200, r.text
        s = r.json()
        assert abs(s["total_weight"] - 5.0) < 1e-6  # 10 * 0.5
        assert abs(s["total_quantity"] - 10.0) < 1e-6
        assert s["items"][0].get("weight") == 5.0
        assert s["items"][0].get("product_unit") == "adet"
        assert s["items"][0].get("unit_weight") == 0.5
        created_ids["sales"].append(s["id"])


# ============= Dashboard new shape =============
class TestDashboardIteration5:
    def test_summary_has_new_keys_and_no_expiring(self, admin_headers):
        r = requests.get(f"{API}/dashboard/summary", headers=admin_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        required = ["total_products", "total_stock_weight",
                   "today_quantity", "today_weight",
                   "month_quantity", "month_weight",
                   "category_value", "exit_trend", "top_products"]
        for k in required:
            assert k in d, f"missing key {k}"
        # Removed
        assert "expiring_products" not in d
        assert "sales_trend" not in d
        # exit_trend shape
        assert len(d["exit_trend"]) == 14
        for entry in d["exit_trend"]:
            assert "date" in entry and "quantity" in entry and "weight" in entry
        # category_value shape
        assert isinstance(d["category_value"], list)
        for c in d["category_value"]:
            assert "category" in c and "value" in c
        # top_products has weight
        for p in d["top_products"]:
            assert "weight" in p


# ============= Reports weight aggregates =============
class TestReportsWeight:
    def test_report_production_weight(self, admin_headers, kg_product):
        """Create a production then check report fields."""
        r = requests.post(f"{API}/productions", json={
            "date": "2026-01-15T08:00:00",
            "product_id": kg_product,
            "quantity": 20.0,
            "unit": "kg",
            "lot_number": "L1",
        }, headers=admin_headers)
        assert r.status_code == 200, r.text
        # Report
        rep = requests.get(f"{API}/reports/production?start=2026-01-01&end=2026-12-31",
                           headers=admin_headers)
        assert rep.status_code == 200, rep.text
        d = rep.json()
        for k in ["total_weight", "daily_avg_weight", "weekly_avg_weight", "monthly_avg_weight"]:
            assert k in d, f"missing {k}"
        # by_product entries have new fields
        assert d["by_product"], "by_product should be non-empty"
        for p in d["by_product"]:
            for k in ["weight", "avg_weight", "avg_quantity", "count"]:
                assert k in p, f"by_product missing {k}"

    def test_report_sales_weight(self, admin_headers):
        r = requests.get(f"{API}/reports/sales?start=2026-01-01&end=2026-12-31",
                         headers=admin_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["total_quantity", "total_weight"]:
            assert k in d
        # by_day has weight
        for entry in d["by_day"]:
            assert "weight" in entry
        for p in d["by_product"]:
            assert "weight" in p
        for c in d["by_customer"]:
            assert "weight" in c

    def test_report_stock_weight(self, admin_headers):
        r = requests.get(f"{API}/reports/stock", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        assert "rows" in d
        for row in d["rows"]:
            assert "stock_weight" in row
            assert "category" in row


# ============= Self profile (PUT /api/auth/me) =============
class TestSelfProfile:
    def test_update_self_name(self, admin_headers):
        # Get current
        me_resp = requests.get(f"{API}/auth/me", headers=admin_headers)
        original_name = me_resp.json().get("name", "")
        # Update name
        r = requests.put(f"{API}/auth/me", json={"name": "Admin Updated"}, headers=admin_headers)
        assert r.status_code == 200, r.text
        assert r.json()["name"] == "Admin Updated"
        # Verify via /me
        me2 = requests.get(f"{API}/auth/me", headers=admin_headers)
        assert me2.json()["name"] == "Admin Updated"
        # Restore
        requests.put(f"{API}/auth/me", json={"name": original_name or "Admin"}, headers=admin_headers)

    def test_update_self_password_wrong_current(self, admin_headers):
        r = requests.put(f"{API}/auth/me", json={
            "current_password": "WrongPass!!", "new_password": "NewPass123"
        }, headers=admin_headers)
        assert r.status_code == 400
        assert "Mevcut şifre" in r.json().get("detail", "")

    def test_update_self_password_correct_then_revert(self):
        # Use a freshly created user so we don't affect admin
        email = f"selfpw_{uuid.uuid4().hex[:8]}@example.com"
        orig_pw = "OrigPw123"
        reg = requests.post(f"{API}/auth/register", json={
            "email": email, "password": orig_pw, "name": "SelfPw", "role": "personel"
        })
        assert reg.status_code == 200, reg.text
        token = reg.json()["access_token"]
        uid = reg.json()["user"]["id"]
        h = {"Authorization": f"Bearer {token}"}
        # Update password
        new_pw = "NewPw456!"
        r = requests.put(f"{API}/auth/me", json={
            "current_password": orig_pw, "new_password": new_pw
        }, headers=h)
        assert r.status_code == 200, r.text
        # Login w/ new password works
        l = requests.post(f"{API}/auth/login", json={"email": email, "password": new_pw})
        assert l.status_code == 200
        # Login w/ old password fails
        l2 = requests.post(f"{API}/auth/login", json={"email": email, "password": orig_pw})
        assert l2.status_code == 401
        # Cleanup
        admin = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}).json()
        requests.delete(f"{API}/users/{uid}",
                        headers={"Authorization": f"Bearer {admin['access_token']}"})


# ============= Admin user PUT — email & password =============
class TestAdminUserUpdate:
    def test_admin_change_user_email(self, admin_headers, created_ids):
        email = f"adminupd_{uuid.uuid4().hex[:8]}@example.com"
        reg = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Pw123456", "name": "Upd", "role": "personel"
        })
        assert reg.status_code == 200
        uid = reg.json()["user"]["id"]
        created_ids["users"].append(uid)
        new_email = f"newadm_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.put(f"{API}/users/{uid}", json={"email": new_email}, headers=admin_headers)
        assert r.status_code == 200, r.text
        assert r.json()["email"] == new_email
        # Can login with new email
        l = requests.post(f"{API}/auth/login", json={"email": new_email, "password": "Pw123456"})
        assert l.status_code == 200

    def test_admin_change_user_email_conflict(self, admin_headers, created_ids):
        # Create two users, try to set user2's email to user1's
        email1 = f"u1_{uuid.uuid4().hex[:8]}@example.com"
        email2 = f"u2_{uuid.uuid4().hex[:8]}@example.com"
        r1 = requests.post(f"{API}/auth/register", json={
            "email": email1, "password": "Pw123456", "name": "U1", "role": "personel"
        })
        r2 = requests.post(f"{API}/auth/register", json={
            "email": email2, "password": "Pw123456", "name": "U2", "role": "personel"
        })
        created_ids["users"].extend([r1.json()["user"]["id"], r2.json()["user"]["id"]])
        # Try clash
        conflict = requests.put(f"{API}/users/{r2.json()['user']['id']}",
                                json={"email": email1}, headers=admin_headers)
        assert conflict.status_code == 400

    def test_admin_change_user_password(self, admin_headers, created_ids):
        email = f"pwch_{uuid.uuid4().hex[:8]}@example.com"
        reg = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "OldPw123", "name": "PwCh", "role": "personel"
        })
        uid = reg.json()["user"]["id"]
        created_ids["users"].append(uid)
        new_pw = "BrandNewPw789"
        r = requests.put(f"{API}/users/{uid}", json={"password": new_pw}, headers=admin_headers)
        assert r.status_code == 200, r.text
        # Login with old fails
        l_old = requests.post(f"{API}/auth/login", json={"email": email, "password": "OldPw123"})
        assert l_old.status_code == 401
        # Login with new succeeds
        l_new = requests.post(f"{API}/auth/login", json={"email": email, "password": new_pw})
        assert l_new.status_code == 200
