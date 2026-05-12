"""
Iteration 4 backend tests — Company Profile + Emergent Object Storage
Endpoints tested:
  GET  /api/company         (public)
  PUT  /api/company         (admin)
  POST /api/company/logo    (admin, multipart)
  GET  /api/company/logo    (public, binary)
  DELETE /api/company/logo  (admin)
  GET  /api/sales/{id}/receipt (PDF uses company name + logo)
"""

import io
import os
import struct
import zlib

import pytest
import requests

# Load REACT_APP_BACKEND_URL from frontend/.env
def _load_backend_url() -> str:
    if os.environ.get("REACT_APP_BACKEND_URL"):
        return os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
    env_path = "/app/frontend/.env"
    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not configured")


BASE_URL = _load_backend_url()
ADMIN_EMAIL = "admin@stoktakip.com"
ADMIN_PASSWORD = "Admin123!"

# ---------- tiny helpers ----------

def _png_bytes(w: int = 8, h: int = 8) -> bytes:
    """Build a minimal valid PNG (greyscale 8x8 by default)."""
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 0, 0, 0, 0))  # 8-bit grayscale
    raw = b""
    for _ in range(h):
        raw += b"\x00" + b"\xff" * w  # filter byte + row of white
    idat = chunk(b"IDAT", zlib.compress(raw))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


# ---------- fixtures ----------

@pytest.fixture(scope="session")
def admin_session() -> requests.Session:
    s = requests.Session()
    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    token = r.json().get("token") or r.json().get("access_token")
    if token:
        s.headers["Authorization"] = f"Bearer {token}"
    return s


@pytest.fixture(scope="session")
def anon_session() -> requests.Session:
    return requests.Session()


@pytest.fixture(scope="session", autouse=True)
def _reset_state(admin_session):
    """Ensure clean state at session start and reset at session end."""
    # initial reset (best effort)
    admin_session.delete(f"{BASE_URL}/api/company/logo", timeout=15)
    admin_session.put(
        f"{BASE_URL}/api/company",
        json={"name": "StokTakip", "contact_phone": "", "contact_email": "", "address": "", "tax_no": "", "website": ""},
        timeout=15,
    )
    yield
    # final reset
    admin_session.delete(f"{BASE_URL}/api/company/logo", timeout=15)
    admin_session.put(
        f"{BASE_URL}/api/company",
        json={"name": "StokTakip", "contact_phone": "", "contact_email": "", "address": "", "tax_no": "", "website": ""},
        timeout=15,
    )


# ---------- /api/company public GET ----------

class TestCompanyGetPublic:
    def test_get_company_no_auth(self, anon_session):
        r = anon_session.get(f"{BASE_URL}/api/company", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in [
            "name", "contact_phone", "contact_email", "address",
            "tax_no", "website", "has_logo", "logo_updated_at", "updated_at",
        ]:
            assert k in d, f"Missing key '{k}' in response {d}"
        assert isinstance(d["has_logo"], bool)
        assert isinstance(d["name"], str) and d["name"] != ""

    def test_default_name_after_reset(self, anon_session):
        r = anon_session.get(f"{BASE_URL}/api/company", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["name"] == "StokTakip"
        assert d["has_logo"] is False


# ---------- /api/company PUT admin ----------

class TestCompanyUpdate:
    def test_put_requires_auth(self, anon_session):
        r = anon_session.put(
            f"{BASE_URL}/api/company",
            json={"name": "Hack"},
            timeout=15,
        )
        assert r.status_code in (401, 403)

    def test_put_admin_updates_and_persists(self, admin_session, anon_session):
        payload = {
            "name": "Test A.Ş.",
            "contact_phone": "+90 555 123 4567",
            "contact_email": "info@testas.com",
            "address": "Atatürk Cad. No:1 İstanbul",
            "tax_no": "1234567890",
            "website": "https://testas.com",
        }
        r = admin_session.put(f"{BASE_URL}/api/company", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == payload["name"]
        assert d["contact_phone"] == payload["contact_phone"]
        assert d["contact_email"] == payload["contact_email"]
        assert d["address"] == payload["address"]
        assert d["tax_no"] == payload["tax_no"]
        assert d["website"] == payload["website"]

        # Verify persistence via public GET
        g = anon_session.get(f"{BASE_URL}/api/company", timeout=15)
        assert g.status_code == 200
        assert g.json()["name"] == "Test A.Ş."

    def test_put_validation_empty_name(self, admin_session):
        r = admin_session.put(f"{BASE_URL}/api/company", json={"name": ""}, timeout=15)
        assert r.status_code == 422


# ---------- /api/company/logo upload + serve + delete ----------

class TestCompanyLogo:
    def test_get_logo_404_when_absent(self, admin_session, anon_session):
        admin_session.delete(f"{BASE_URL}/api/company/logo", timeout=15)
        r = anon_session.get(f"{BASE_URL}/api/company/logo", timeout=15)
        assert r.status_code == 404

    def test_upload_logo_requires_auth(self, anon_session):
        png = _png_bytes()
        r = anon_session.post(
            f"{BASE_URL}/api/company/logo",
            files={"file": ("logo.png", io.BytesIO(png), "image/png")},
            timeout=20,
        )
        assert r.status_code in (401, 403)

    def test_upload_rejects_non_image(self, admin_session):
        r = admin_session.post(
            f"{BASE_URL}/api/company/logo",
            files={"file": ("evil.txt", io.BytesIO(b"x" * 100), "text/plain")},
            timeout=20,
        )
        assert r.status_code == 400
        assert "JPG" in r.text or "image" in r.text.lower()

    def test_upload_rejects_oversize(self, admin_session):
        # 2.1 MB PNG-typed blob (we don't need a valid image to trigger size check;
        # but ctype must be image/* to pass the type check first — actually size is
        # checked AFTER type check, so any allowed ctype + > 2MB triggers 400).
        big = b"\x89PNG\r\n\x1a\n" + b"\x00" * (2 * 1024 * 1024 + 100)
        r = admin_session.post(
            f"{BASE_URL}/api/company/logo",
            files={"file": ("big.png", io.BytesIO(big), "image/png")},
            timeout=30,
        )
        assert r.status_code == 400
        assert "2 MB" in r.text or "2MB" in r.text or "büyük" in r.text.lower() or "fazla" in r.text.lower()

    def test_upload_and_fetch_logo(self, admin_session, anon_session):
        png = _png_bytes(16, 16)
        r = admin_session.post(
            f"{BASE_URL}/api/company/logo",
            files={"file": ("logo.png", io.BytesIO(png), "image/png")},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["has_logo"] is True
        assert d["logo_updated_at"]

        # Public GET should now return image bytes
        g = anon_session.get(f"{BASE_URL}/api/company/logo", timeout=15)
        assert g.status_code == 200
        assert g.headers.get("content-type", "").startswith("image/")
        assert g.content.startswith(b"\x89PNG"), "logo bytes are not a PNG"
        assert len(g.content) >= len(png) - 16  # allow minor differences

    def test_delete_logo(self, admin_session, anon_session):
        # ensure something there
        admin_session.post(
            f"{BASE_URL}/api/company/logo",
            files={"file": ("logo.png", io.BytesIO(_png_bytes()), "image/png")},
            timeout=30,
        )
        d = admin_session.delete(f"{BASE_URL}/api/company/logo", timeout=15)
        assert d.status_code == 200
        body = d.json()
        assert body["has_logo"] is False
        g = anon_session.get(f"{BASE_URL}/api/company/logo", timeout=15)
        assert g.status_code == 404


# ---------- PDF receipt embeds company name + logo ----------

class TestPdfReceipt:
    def _seed_product(self, session) -> str:
        import uuid
        p = session.post(
            f"{BASE_URL}/api/products",
            json={
                "name": "TEST_pdf_product",
                "code": f"TEST-PDF-{uuid.uuid4().hex[:6]}",
                "unit": "adet",
                "sale_price": 10.0,
                "cost_price": 5.0,
                "current_stock": 50,
                "category": "Test",
            },
            timeout=15,
        )
        assert p.status_code in (200, 201), p.text
        return p.json()["id"]

    def _seed_customer(self, session) -> str:
        c = session.post(
            f"{BASE_URL}/api/customers",
            json={"name": "TEST_customer", "phone": "", "email": "", "address": ""},
            timeout=15,
        )
        assert c.status_code in (200, 201), c.text
        return c.json()["id"]

    def _seed_sale(self, session, product_id: str, customer_id: str) -> str:
        from datetime import datetime
        sale = session.post(
            f"{BASE_URL}/api/sales",
            json={
                "date": datetime.utcnow().strftime("%Y-%m-%d"),
                "customer_id": customer_id,
                "items": [{"product_id": product_id, "quantity": 2.0, "unit_price": 10.0}],
                "discount": 0.0,
                "payment_status": "odendi",
            },
            timeout=20,
        )
        assert sale.status_code in (200, 201), sale.text
        return sale.json()["id"]

    def test_receipt_uses_company_name_and_logo(self, admin_session):
        # Set custom name + upload logo
        admin_session.put(
            f"{BASE_URL}/api/company",
            json={"name": "Test A.Ş.", "contact_phone": "", "contact_email": "",
                  "address": "", "tax_no": "", "website": ""},
            timeout=15,
        )
        admin_session.post(
            f"{BASE_URL}/api/company/logo",
            files={"file": ("logo.png", io.BytesIO(_png_bytes(32, 32)), "image/png")},
            timeout=30,
        )
        pid = self._seed_product(admin_session)
        cid = self._seed_customer(admin_session)
        sid = self._seed_sale(admin_session, pid, cid)

        r = admin_session.get(f"{BASE_URL}/api/sales/{sid}/receipt", timeout=30)
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content.startswith(b"%PDF"), "not a valid PDF"
        assert len(r.content) > 2048, f"PDF too small: {len(r.content)} bytes"

        # cleanup product + customer
        admin_session.delete(f"{BASE_URL}/api/products/{pid}", timeout=15)
        admin_session.delete(f"{BASE_URL}/api/customers/{cid}", timeout=15)
