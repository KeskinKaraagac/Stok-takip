"""Iteration 3 tests: Granular permissions + Excel (.xlsx) export endpoints."""
import os
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "admin@stoktakip.com"
ADMIN_PASS = "Admin123!"

ALL_PERMS = {
    "products.view", "products.create", "products.edit", "products.delete",
    "customers.view", "customers.create", "customers.edit", "customers.delete",
    "productions.view", "productions.create", "productions.delete",
    "sales.view", "sales.create", "sales.delete",
    "stock.view", "stock.adjust",
    "reports.view",
    "users.manage",
}
PERSONEL_DEFAULTS = {
    "products.view", "products.create", "products.edit",
    "customers.view", "customers.create", "customers.edit",
    "productions.view", "productions.create",
    "sales.view", "sales.create",
    "stock.view", "stock.adjust",
    "reports.view",
}
RAPOR_DEFAULTS = {
    "products.view", "customers.view", "productions.view",
    "sales.view", "stock.view", "reports.view",
}


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _h(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN_EMAIL, ADMIN_PASS)


@pytest.fixture(scope="module")
def personel_user(admin_token):
    email = f"perm_personel_{uuid.uuid4().hex[:6]}@example.com"
    password = "Person123!"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": password, "name": "Personel Tester", "role": "personel"
    })
    assert r.status_code == 200, r.text
    uid = r.json()["user"]["id"]
    token = _login(email, password)
    yield {"id": uid, "email": email, "password": password, "token": token}
    # cleanup
    try:
        requests.delete(f"{API}/users/{uid}", headers=_h(admin_token))
    except Exception:
        pass


@pytest.fixture(scope="module")
def rapor_user(admin_token):
    email = f"perm_rapor_{uuid.uuid4().hex[:6]}@example.com"
    password = "Rapor123!"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": password, "name": "Rapor Tester", "role": "rapor"
    })
    assert r.status_code == 200, r.text
    uid = r.json()["user"]["id"]
    token = _login(email, password)
    yield {"id": uid, "email": email, "password": password, "token": token}
    try:
        requests.delete(f"{API}/users/{uid}", headers=_h(admin_token))
    except Exception:
        pass


# ============= GET /api/permissions =============
class TestPermissionsEndpoint:
    def test_permissions_list(self, admin_token):
        r = requests.get(f"{API}/permissions", headers=_h(admin_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert "all" in d and "groups" in d
        assert set(d["all"]) == ALL_PERMS
        assert len(d["all"]) == 18
        assert len(d["groups"]) == 7
        group_keys = {g["key"] for g in d["groups"]}
        assert group_keys == {"products", "customers", "productions", "sales", "stock", "reports", "users"}

    def test_permissions_requires_auth(self):
        r = requests.get(f"{API}/permissions")
        assert r.status_code == 401


# ============= GET /api/auth/me permissions =============
class TestAuthMePermissions:
    def test_admin_has_all_perms(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=_h(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert "permissions" in d
        assert set(d["permissions"]) == ALL_PERMS

    def test_personel_has_default_perms(self, personel_user):
        r = requests.get(f"{API}/auth/me", headers=_h(personel_user["token"]))
        assert r.status_code == 200
        d = r.json()
        assert set(d["permissions"]) == PERSONEL_DEFAULTS
        # personel should not have any *.delete
        assert not any(p.endswith(".delete") for p in d["permissions"])

    def test_rapor_has_view_only_defaults(self, rapor_user):
        r = requests.get(f"{API}/auth/me", headers=_h(rapor_user["token"]))
        assert r.status_code == 200
        d = r.json()
        assert set(d["permissions"]) == RAPOR_DEFAULTS


# ============= Register populates permissions =============
class TestRegisterDefaults:
    def test_register_personel_has_default_perms(self, admin_token):
        email = f"reg_def_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Pass1234!", "name": "RegDef", "role": "personel"
        })
        assert r.status_code == 200, r.text
        u = r.json()["user"]
        assert "permissions" in u
        assert set(u["permissions"]) == PERSONEL_DEFAULTS
        # cleanup
        requests.delete(f"{API}/users/{u['id']}", headers=_h(admin_token))


# ============= PUT /api/users with permissions =============
class TestUpdateUserPermissions:
    def test_admin_can_set_custom_permissions(self, admin_token, personel_user):
        # Grant products.delete in addition to defaults
        new_perms = list(PERSONEL_DEFAULTS) + ["products.delete"]
        r = requests.put(f"{API}/users/{personel_user['id']}",
                         json={"permissions": new_perms}, headers=_h(admin_token))
        assert r.status_code == 200, r.text
        u = r.json()
        assert "products.delete" in u["permissions"]
        # verify via /me as that user
        r2 = requests.get(f"{API}/auth/me", headers=_h(personel_user["token"]))
        assert "products.delete" in r2.json()["permissions"]

    def test_invalid_permission_key_rejected(self, admin_token, personel_user):
        r = requests.put(f"{API}/users/{personel_user['id']}",
                         json={"permissions": ["products.view", "bogus.perm"]},
                         headers=_h(admin_token))
        assert r.status_code == 400
        assert "Geçersiz" in r.json().get("detail", "")

    def test_non_admin_cannot_update_users(self, personel_user):
        # personel does not have users.manage
        r = requests.put(f"{API}/users/{personel_user['id']}",
                         json={"name": "Hack"}, headers=_h(personel_user["token"]))
        assert r.status_code == 403


# ============= Permission-gated CRUD =============
class TestPermissionGatedCRUD:
    def test_personel_can_create_product(self, personel_user):
        # ensure personel has products.create (defaults)
        code = f"PERMP{uuid.uuid4().hex[:5].upper()}"
        r = requests.post(f"{API}/products", json={
            "name": "Perm Test", "code": code, "category": "T", "unit": "kg",
            "unit_weight": 1.0, "sale_price": 10.0, "cost_price": 5.0,
            "current_stock": 10.0, "min_stock": 0, "shelf_life_days": 30, "active": True,
        }, headers=_h(personel_user["token"]))
        assert r.status_code == 200, r.text
        personel_user["last_pid"] = r.json()["id"]

    def test_personel_cannot_delete_product_by_default(self, admin_token, personel_user):
        # Reset perms back to defaults first (remove products.delete added in earlier test)
        requests.put(f"{API}/users/{personel_user['id']}",
                     json={"permissions": list(PERSONEL_DEFAULTS)}, headers=_h(admin_token))

        # Create product as admin
        code = f"PDEL{uuid.uuid4().hex[:5].upper()}"
        pr = requests.post(f"{API}/products", json={
            "name": "Del Test", "code": code, "category": "T", "unit": "kg",
            "unit_weight": 1.0, "sale_price": 10.0, "cost_price": 5.0,
            "current_stock": 10.0, "min_stock": 0, "shelf_life_days": 30, "active": True,
        }, headers=_h(admin_token))
        pid = pr.json()["id"]

        # personel tries to delete -> 403
        r = requests.delete(f"{API}/products/{pid}", headers=_h(personel_user["token"]))
        assert r.status_code == 403, r.text
        assert "products.delete" in r.json().get("detail", "")

        # Grant products.delete and retry
        new_perms = list(PERSONEL_DEFAULTS) + ["products.delete"]
        requests.put(f"{API}/users/{personel_user['id']}",
                     json={"permissions": new_perms}, headers=_h(admin_token))
        r2 = requests.delete(f"{API}/products/{pid}", headers=_h(personel_user["token"]))
        assert r2.status_code == 200, r2.text

    def test_rapor_cannot_create_product(self, rapor_user):
        code = f"RAP{uuid.uuid4().hex[:5].upper()}"
        r = requests.post(f"{API}/products", json={
            "name": "Rapor Forbidden", "code": code, "category": "T", "unit": "kg",
            "unit_weight": 1.0, "sale_price": 10.0, "cost_price": 5.0,
            "current_stock": 1.0, "min_stock": 0, "shelf_life_days": 30, "active": True,
        }, headers=_h(rapor_user["token"]))
        assert r.status_code == 403, r.text
        assert "products.create" in r.json().get("detail", "")


# ============= Excel export endpoints =============
XLSX_CT = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


class TestExcelExports:
    @pytest.mark.parametrize("path", [
        "/export/products.xlsx",
        "/export/stock.xlsx",
        "/export/sales.xlsx",
        "/export/productions.xlsx",
    ])
    def test_export_unauth(self, path):
        r = requests.get(f"{API}{path}")
        assert r.status_code == 401, f"{path} unauth status: {r.status_code}"

    @pytest.mark.parametrize("path,filename", [
        ("/export/products.xlsx", "urunler.xlsx"),
        ("/export/stock.xlsx", "stok-raporu.xlsx"),
        ("/export/sales.xlsx", "satislar.xlsx"),
        ("/export/productions.xlsx", "uretim.xlsx"),
    ])
    def test_export_admin_returns_xlsx(self, admin_token, path, filename):
        r = requests.get(f"{API}{path}", headers=_h(admin_token))
        assert r.status_code == 200, r.text[:300]
        ct = r.headers.get("content-type", "")
        assert XLSX_CT in ct, f"Wrong content-type for {path}: {ct}"
        # ZIP magic bytes for xlsx
        assert r.content[:2] == b"PK", f"{path} not a zip/xlsx: {r.content[:10]!r}"
        assert len(r.content) > 200, f"{path} too small"
        # Filename in content-disposition
        cd = r.headers.get("content-disposition", "")
        assert filename in cd, f"Filename {filename} missing in CD: {cd}"

    def test_rapor_can_export_view_endpoints(self, rapor_user):
        # rapor has products.view, reports.view, sales.view, productions.view
        for path in ["/export/products.xlsx", "/export/stock.xlsx",
                     "/export/sales.xlsx", "/export/productions.xlsx"]:
            r = requests.get(f"{API}{path}", headers=_h(rapor_user["token"]))
            assert r.status_code == 200, f"{path} rapor failed: {r.status_code}"
            assert r.content[:2] == b"PK"

    def test_export_products_without_view_perm(self, admin_token, personel_user):
        # Strip products.view from personel
        perms = [p for p in PERSONEL_DEFAULTS if p != "products.view"]
        requests.put(f"{API}/users/{personel_user['id']}",
                     json={"permissions": perms}, headers=_h(admin_token))
        r = requests.get(f"{API}/export/products.xlsx", headers=_h(personel_user["token"]))
        assert r.status_code == 403
        # restore
        requests.put(f"{API}/users/{personel_user['id']}",
                     json={"permissions": list(PERSONEL_DEFAULTS)}, headers=_h(admin_token))
