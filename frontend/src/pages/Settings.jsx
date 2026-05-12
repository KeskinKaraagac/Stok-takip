import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "../components/ui/alert-dialog";
import api from "../lib/api";
import { formatApiError, formatDateTime } from "../lib/format";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const ROLE_LABEL = { admin: "Yönetici", personel: "Personel", rapor: "Sadece Rapor" };

export default function Settings() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, []);

  const updateField = async (id, field, value) => {
    try {
      await api.put(`/users/${id}`, { [field]: value });
      toast.success("Güncellendi");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const remove = async () => {
    try {
      await api.delete(`/users/${confirmDel.id}`);
      toast.success("Kullanıcı silindi");
      setConfirmDel(null);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div data-testid="settings-page">
      <PageHeader title="Ayarlar" subtitle="Sistem ayarları ve kullanıcı yönetimi" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="border border-slate-200 p-5 rounded-sm">
          <h3 className="text-lg font-display font-medium mb-4">Profil Bilgileri</h3>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Ad Soyad</dt><dd className="text-slate-900">{user?.name}</dd>
            <dt className="text-slate-500">E-posta</dt><dd className="text-slate-900">{user?.email}</dd>
            <dt className="text-slate-500">Rol</dt><dd><Badge className="rounded-sm bg-[#0047AB] text-white">{ROLE_LABEL[user?.role]}</Badge></dd>
            <dt className="text-slate-500">Kayıt Tarihi</dt><dd className="text-slate-900">{formatDateTime(user?.created_at)}</dd>
          </dl>
        </div>
        <div className="border border-slate-200 p-5 rounded-sm">
          <h3 className="text-lg font-display font-medium mb-4">Uygulama Ayarları</h3>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Para Birimi</dt><dd className="text-slate-900">£ GBP</dd>
            <dt className="text-slate-500">Tarih Formatı</dt><dd className="text-slate-900">DD.MM.YYYY</dd>
            <dt className="text-slate-500">Dil</dt><dd className="text-slate-900">Türkçe</dd>
            <dt className="text-slate-500">Tema</dt><dd className="text-slate-900">Açık</dd>
          </dl>
        </div>
      </div>

      <div className="border border-slate-200 rounded-sm bg-white overflow-x-auto" data-testid="users-table">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-lg font-display font-medium">Kullanıcı Yönetimi</h3>
          <p className="text-sm text-slate-500">Roller: Yönetici, Personel, Sadece Rapor</p>
        </div>
        <table className="dense w-full">
          <thead><tr><th>Ad</th><th>E-posta</th><th>Rol</th><th>Aktif</th><th>Kayıt</th><th className="text-right">İşlem</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} data-testid={`user-row-${u.id}`}>
                <td className="font-medium">{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <Select value={u.role} onValueChange={(v) => updateField(u.id, "role", v)} disabled={u.id === user?.id}>
                    <SelectTrigger className="rounded-sm h-8 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Yönetici</SelectItem>
                      <SelectItem value="personel">Personel</SelectItem>
                      <SelectItem value="rapor">Sadece Rapor</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td>
                  <Switch checked={u.active} onCheckedChange={(v) => updateField(u.id, "active", v)} disabled={u.id === user?.id} />
                </td>
                <td>{formatDateTime(u.created_at)}</td>
                <td className="text-right">
                  {u.id !== user?.id && (
                    <Button variant="outline" size="sm" className="rounded-sm" onClick={() => setConfirmDel(u)} data-testid={`delete-user-${u.id}`}>Sil</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent className="rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcı silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>"{confirmDel?.email}" silinecek.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">İptal</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-red-600 hover:bg-red-700 rounded-sm">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
