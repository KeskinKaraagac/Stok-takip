// Permission helper
import api from "./api";

export const PERMISSION_LABELS = {
  "products.view": "Görüntüleme",
  "products.create": "Ekleme",
  "products.edit": "Düzenleme",
  "products.delete": "Silme/Pasif",
  "customers.view": "Görüntüleme",
  "customers.create": "Ekleme",
  "customers.edit": "Düzenleme",
  "customers.delete": "Silme/Pasif",
  "productions.view": "Görüntüleme",
  "productions.create": "Ekleme",
  "productions.delete": "Silme",
  "sales.view": "Görüntüleme",
  "sales.create": "Satış Yapma",
  "sales.delete": "Silme/İptal",
  "stock.view": "Görüntüleme",
  "stock.adjust": "Manuel Düzeltme",
  "reports.view": "Görüntüleme",
  "users.manage": "Kullanıcı Yönetimi",
};

export function hasPermission(user, perm) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return Array.isArray(user.permissions) && user.permissions.includes(perm);
}

export async function downloadXlsx(path, filename, params = {}) {
  const res = await api.get(path, { params, responseType: "blob" });
  const url = URL.createObjectURL(new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
