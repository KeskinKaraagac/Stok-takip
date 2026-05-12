import { useEffect, useState } from "react";
import { ShieldCheck, KeyRound } from "lucide-react";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
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
  const [permGroups, setPermGroups] = useState([]);
  const [permDialog, setPermDialog] = useState(null); // user being edited
  const [permSet, setPermSet] = useState(new Set());

  const load = async () => {
    try {
      const [u, p] = await Promise.all([api.get("/users"), api.get("/permissions")]);
      setUsers(u.data);
      setPermGroups(p.data.groups || []);
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

  const openPerm = (u) => {
    setPermDialog(u);
    setPermSet(new Set(u.permissions || []));
  };

  const togglePerm = (key) => {
    const next = new Set(permSet);
    if (next.has(key)) next.delete(key); else next.add(key);
    setPermSet(next);
  };

  const toggleGroup = (group, allOn) => {
    const next = new Set(permSet);
    group.actions.forEach(([k]) => {
      if (allOn) next.delete(k); else next.add(k);
    });
    setPermSet(next);
  };

  const savePerms = async () => {
    try {
      await api.put(`/users/${permDialog.id}`, { permissions: Array.from(permSet) });
      toast.success("İzinler güncellendi");
      setPermDialog(null);
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
      <PageHeader title="Ayarlar" subtitle="Sistem ayarları ve kullanıcı yetki yönetimi" />

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
          <p className="text-sm text-slate-500">Her kullanıcının modül bazlı yetkilerini ayrı ayrı düzenleyebilirsiniz.</p>
        </div>
        <table className="dense w-full">
          <thead><tr><th>Ad</th><th>E-posta</th><th>Rol</th><th>İzin Sayısı</th><th>Aktif</th><th>Kayıt</th><th className="text-right">İşlem</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} data-testid={`user-row-${u.id}`}>
                <td className="font-medium">{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <Select value={u.role} onValueChange={(v) => updateField(u.id, "role", v)} disabled={u.id === user?.id || u.role === "admin"}>
                    <SelectTrigger className="rounded-sm h-8 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Yönetici</SelectItem>
                      <SelectItem value="personel">Personel</SelectItem>
                      <SelectItem value="rapor">Sadece Rapor</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td>
                  {u.role === "admin" ? (
                    <Badge variant="outline" className="rounded-sm bg-[#0047AB]/10 text-[#0047AB] border-[#0047AB]/30">Tüm yetkiler</Badge>
                  ) : (
                    <span className="text-slate-700">{(u.permissions || []).length} izin</span>
                  )}
                </td>
                <td>
                  <Switch checked={u.active} onCheckedChange={(v) => updateField(u.id, "active", v)} disabled={u.id === user?.id} />
                </td>
                <td>{formatDateTime(u.created_at)}</td>
                <td className="text-right whitespace-nowrap">
                  {u.role !== "admin" && (
                    <Button variant="outline" size="sm" className="rounded-sm mr-2" onClick={() => openPerm(u)} data-testid={`edit-perms-${u.id}`}>
                      <KeyRound className="w-3.5 h-3.5 mr-1" /> İzinler
                    </Button>
                  )}
                  {u.id !== user?.id && (
                    <Button variant="outline" size="sm" className="rounded-sm" onClick={() => setConfirmDel(u)} data-testid={`delete-user-${u.id}`}>Sil</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!permDialog} onOpenChange={(o) => !o && setPermDialog(null)}>
        <DialogContent className="rounded-sm max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="perm-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0047AB]" />
              {permDialog?.name} — Yetki Yönetimi
            </DialogTitle>
            <DialogDescription>
              Aşağıdan kullanıcının hangi modüllerde ne yapabileceğini seçin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {permGroups.map((group) => {
              const all = group.actions.every(([k]) => permSet.has(k));
              const some = group.actions.some(([k]) => permSet.has(k));
              return (
                <div key={group.key} className="border border-slate-200 p-4 rounded-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-display font-medium text-slate-800">{group.label}</div>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group, all)}
                      className="text-xs uppercase tracking-wider text-[#0047AB] hover:underline"
                      data-testid={`toggle-group-${group.key}`}
                    >
                      {all ? "Tümünü Kaldır" : some ? "Tümünü Seç" : "Tümünü Seç"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {group.actions.map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm cursor-pointer" data-testid={`perm-${key}`}>
                        <Checkbox checked={permSet.has(key)} onCheckedChange={() => togglePerm(key)} className="rounded-sm" />
                        <span className="text-slate-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPermDialog(null)} className="rounded-sm">İptal</Button>
            <Button onClick={savePerms} className="bg-[#0047AB] hover:bg-[#003380] rounded-sm" data-testid="save-perms-btn">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
