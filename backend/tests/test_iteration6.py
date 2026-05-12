"""Iteration 6 tests: new dashboard category_weight / category_sale_value + reports category-distribution weight & sale_value."""
import os
import requests
import pytest

def _load_env():
    env_file = "/app/frontend/.env"
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    return os.environ.get("REACT_APP_BACKEND_URL", "")

BASE_URL = _load_env().rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@stoktakip.com"
ADMIN_PASS = "Admin123!"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --- Dashboard summary new fields ---
class TestDashboardCategoryFields:
    def test_dashboard_returns_category_weight_array(self, admin_headers):
        r = requests.get(f"{API}/dashboard/summary", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "category_weight" in data, "Missing category_weight in dashboard summary"
        assert isinstance(data["category_weight"], list)
        if data["category_weight"]:
            row = data["category_weight"][0]
            assert "category" in row and "weight" in row
            assert isinstance(row["weight"], (int, float))

    def test_dashboard_category_weight_sorted_desc(self, admin_headers):
        r = requests.get(f"{API}/dashboard/summary", headers=admin_headers)
        weights = [c["weight"] for c in r.json().get("category_weight", [])]
        assert weights == sorted(weights, reverse=True), f"category_weight not sorted desc: {weights}"

    def test_dashboard_returns_category_sale_value_array(self, admin_headers):
        r = requests.get(f"{API}/dashboard/summary", headers=admin_headers)
        data = r.json()
        assert "category_sale_value" in data, "Missing category_sale_value"
        assert isinstance(data["category_sale_value"], list)
        if data["category_sale_value"]:
            row = data["category_sale_value"][0]
            assert "category" in row and "value" in row
            assert isinstance(row["value"], (int, float))

    def test_dashboard_category_sale_value_sorted_desc(self, admin_headers):
        r = requests.get(f"{API}/dashboard/summary", headers=admin_headers)
        values = [c["value"] for c in r.json().get("category_sale_value", [])]
        assert values == sorted(values, reverse=True), f"category_sale_value not sorted desc: {values}"

    def test_dashboard_total_stock_kg_preserved(self, admin_headers):
        r = requests.get(f"{API}/dashboard/summary", headers=admin_headers)
        data = r.json()
        assert "total_stock_weight" in data
        # consistency: sum of category_weight should approximate total_stock_weight
        total_cat = sum(c["weight"] for c in data.get("category_weight", []))
        assert abs(total_cat - float(data["total_stock_weight"])) < 0.01

    def test_dashboard_today_month_weight_keys_present(self, admin_headers):
        r = requests.get(f"{API}/dashboard/summary", headers=admin_headers)
        data = r.json()
        for k in ["today_weight", "month_weight", "today_quantity", "month_quantity"]:
            assert k in data, f"Missing {k}"


# --- Reports category-distribution ---
class TestReportsCategoryDistribution:
    def test_category_distribution_has_weight_and_sale_value(self, admin_headers):
        r = requests.get(f"{API}/reports/category-distribution", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        if data:
            row = data[0]
            for k in ["category", "weight", "value", "sale_value", "units", "count"]:
                assert k in row, f"Missing {k} in category-distribution row: {row.keys()}"
            assert isinstance(row["weight"], (int, float))
            assert isinstance(row["sale_value"], (int, float))

    def test_category_distribution_consistency_with_stock_report(self, admin_headers):
        r_dist = requests.get(f"{API}/reports/category-distribution", headers=admin_headers)
        r_stock = requests.get(f"{API}/reports/stock", headers=admin_headers)
        assert r_dist.status_code == 200 and r_stock.status_code == 200
        dist = r_dist.json()
        stock = r_stock.json()
        sum_weight = sum(c["weight"] for c in dist)
        assert abs(sum_weight - float(stock.get("total_stock_weight", 0))) < 0.01


# --- Regression: core endpoints still up ---
class TestRegression:
    def test_products_list(self, admin_headers):
        r = requests.get(f"{API}/products", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_customers_list(self, admin_headers):
        r = requests.get(f"{API}/customers", headers=admin_headers)
        assert r.status_code == 200

    def test_productions_list(self, admin_headers):
        r = requests.get(f"{API}/productions", headers=admin_headers)
        assert r.status_code == 200

    def test_sales_list(self, admin_headers):
        r = requests.get(f"{API}/sales", headers=admin_headers)
        assert r.status_code == 200

    def test_stock_movements_list(self, admin_headers):
        r = requests.get(f"{API}/stock/movements", headers=admin_headers)
        assert r.status_code == 200

    def test_reports_stock_excel_export(self, admin_headers):
        r = requests.get(f"{API}/export/stock.xlsx", headers=admin_headers)
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "spreadsheet" in ct or "excel" in ct or "octet-stream" in ct, ct

    def test_auth_me(self, admin_headers):
        r = requests.get(f"{API}/auth/me", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL
