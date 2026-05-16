"""Tests for new features: password reset flow and sales receipt PDF."""
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
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def temp_user():
    """Create a temp user we can safely reset password for."""
    email = f"reset_{uuid.uuid4().hex[:8]}@example.com"
    password = "OrigPass1!"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": password, "name": "Reset Test", "role": "personel"
    })
    assert r.status_code == 200, r.text
    return {"email": email, "password": password, "id": r.json()["user"]["id"]}


# ============= Password Reset Tests =============
class TestForgotPassword:
    def test_forgot_password_valid_email_creates_admin_request(self, temp_user, admin_headers):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": temp_user["email"]})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is True
        assert "dev_token" not in d, f"dev_token should not be exposed: {d}"
        assert "dev_link" not in d, f"dev_link should not be exposed: {d}"

        users = requests.get(f"{API}/users", headers=admin_headers)
        assert users.status_code == 200, users.text
        u = next((item for item in users.json() if item["id"] == temp_user["id"]), None)
        assert u is not None
        assert u.get("password_reset_requested") is True
        assert u.get("password_reset_requested_at")

    def test_forgot_password_nonexistent_email_no_enumeration(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": "nope_{}@example.com".format(uuid.uuid4().hex[:6])})
        assert r.status_code == 200
        d = r.json()
        assert d.get("ok") is True
        # No enumeration: response shape stays generic and no reset link leaks.
        assert "dev_token" not in d, f"dev_token leak: {d}"
        assert "dev_link" not in d, f"dev_link leak: {d}"

    def test_forgot_password_invalid_email_format(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": "not-an-email"})
        assert r.status_code == 422


class TestAdminPasswordResetRequest:
    def test_reset_password_invalid_token(self):
        r = requests.post(f"{API}/auth/reset-password", json={"token": "totallybogus_" + uuid.uuid4().hex, "password": "ValidPass123"})
        assert r.status_code == 400
        assert "Geçersiz token" in r.json().get("detail", "")

    def test_admin_sets_new_password_and_resolves_request(self, temp_user, admin_headers):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": temp_user["email"]})
        assert r.status_code == 200, r.text

        new_password = "BrandNewPw123!"
        r2 = requests.put(f"{API}/users/{temp_user['id']}", json={"password": new_password}, headers=admin_headers)
        assert r2.status_code == 200, r2.text
        assert r2.json().get("password_reset_requested") is False

        # Verify login fails with OLD password
        r3 = requests.post(f"{API}/auth/login", json={"email": temp_user["email"], "password": temp_user["password"]})
        assert r3.status_code == 401, "Old password should no longer work"

        # Verify login succeeds with NEW password
        r4 = requests.post(f"{API}/auth/login", json={"email": temp_user["email"], "password": new_password})
        assert r4.status_code == 200, r4.text
        assert "access_token" in r4.json()

        users = requests.get(f"{API}/users", headers=admin_headers)
        assert users.status_code == 200, users.text
        u = next((item for item in users.json() if item["id"] == temp_user["id"]), None)
        assert u is not None
        assert u.get("password_reset_requested") is False

        temp_user["password"] = new_password


# ============= Sales Receipt PDF Tests =============
@pytest.fixture(scope="module")
def sale_id(admin_headers):
    # Create a product
    code = f"PDF{uuid.uuid4().hex[:6].upper()}"
    pr = requests.post(f"{API}/products", json={
        "name": "PDF Test Ürün", "code": code, "category": "Test", "unit": "kg",
        "unit_weight": 1.0, "sale_price": 50.0, "cost_price": 30.0,
        "current_stock": 100.0, "min_stock": 0, "shelf_life_days": 30, "active": True,
    }, headers=admin_headers)
    assert pr.status_code == 200, pr.text
    pid = pr.json()["id"]

    # Create a customer
    cr = requests.post(f"{API}/customers", json={
        "name": "PDF Test Müşteri", "phone": "5550001111", "customer_type": "Bireysel", "active": True,
    }, headers=admin_headers)
    assert cr.status_code == 200, cr.text
    cid = cr.json()["id"]

    # Create a sale
    sr = requests.post(f"{API}/sales", json={
        "date": "2026-01-15T10:00:00",
        "customer_id": cid,
        "items": [{"product_id": pid, "quantity": 3.0, "unit_price": 50.0}],
        "discount": 5.0,
        "payment_status": "odendi",
    }, headers=admin_headers)
    assert sr.status_code == 200, sr.text
    sid = sr.json()["id"]
    yield sid
    # cleanup best-effort
    requests.delete(f"{API}/sales/{sid}", headers=admin_headers)
    requests.delete(f"{API}/products/{pid}", headers=admin_headers)
    requests.delete(f"{API}/customers/{cid}", headers=admin_headers)


class TestSalesReceipt:
    def test_receipt_pdf_authenticated(self, admin_headers, sale_id):
        r = requests.get(f"{API}/sales/{sale_id}/receipt", headers=admin_headers)
        assert r.status_code == 200, r.text
        ct = r.headers.get("content-type", "")
        assert "application/pdf" in ct, f"Wrong content-type: {ct}"
        assert r.content[:4] == b"%PDF", f"Not a PDF, starts with: {r.content[:8]!r}"
        assert len(r.content) > 500, "PDF suspiciously small"

    def test_receipt_pdf_unauthenticated(self, sale_id):
        r = requests.get(f"{API}/sales/{sale_id}/receipt")
        assert r.status_code == 401, r.text

    def test_receipt_pdf_invalid_id(self, admin_headers):
        r = requests.get(f"{API}/sales/nonexistent-id-{uuid.uuid4().hex}/receipt", headers=admin_headers)
        assert r.status_code == 404, r.text
