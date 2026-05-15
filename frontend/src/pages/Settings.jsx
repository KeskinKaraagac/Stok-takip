import { useEffect, useRef, useState } from "react";
import { ShieldCheck, KeyRound, Upload, Trash2, Building2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
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
import { useCompany } from "../context/CompanyContext";
import { useLanguage } from "../context/LanguageContext";
import { toast } from "sonner";

export default function Settings() {
  const { user, refresh: refreshAuth } = useAuth();
  const { company, logoUrl, reload: reloadCompany } = useCompany();
  const { t, lang, setLang } = useLanguage();
  const ROLE_LABEL = { admin: t("role_admin"), personel: t("role_personel"), rapor: t("role_rapor") };
  const [users, setUsers] = useState([]);
  const [confirmDel, setConfirmDel] = useState(null);
  const [permGroups, setPermGroups] = useState([]);
  const [permDialog, setPermDialog] = useState(null);
  const [permSet, setPermSet] = useState(new Set());
  const [companyForm, setCompanyForm] = useState({ name: "", contact_phone: "", contact_email: "", address: "", tax_no: "", website: "" });
  const [companySaving, setCompanySaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Profile editor
  const [profileForm, setProfileForm] = useState({ name: "", email: "", current_password: "", new_password: "" });
  const [profileSaving, setProfileSaving] = useState(false);

  // User editor (admin editing other users)
  const [userEdit, setUserEdit] = useState(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "", password: "" });
  const [createOpen, setCreateOpen] = useState(false);

const [createForm, setCreateForm] = useState({
  name: "",
  email: "",
  password: "",
  role: "personel",
});
  const createUser = async () => {
  try {
    await api.post("/auth/register", {
      name: createForm.name,
      email: createForm.email,
      password: createForm.password,
      role: createForm.role,
      language: "en",
    });

    toast.success("User created successfully");
    setCreateOpen(false);
    setCreateForm({
      name: "",
      email: "",
      password: "",
      role: "personel",
    });
    load();
  } catch (e) {
    toast.error(formatApiError(e));
  }
};

  useEffect(() => {
    setCompanyForm({
      name: company.name || "",
      contact_phone: company.contact_phone || "",
      contact_email: company.contact_email || "",
      address: company.address || "",
      tax_no: company.tax_no || "",
      website: company.website || "",
    });
  }, [company]);

  useEffect(() => {
    if (user) setProfileForm({ name: user.name || "", email: user.email || "", current_password: "", new_password: "" });
  }, [user]);

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
      toast.success(t("toast_updated"));
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
      toast.success(t("toast_perms_updated"));
      setPermDialog(null);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const remove = async () => {
    try {
      await api.delete(`/users/${confirmDel.id}`);
      toast.success(t("toast_user_deleted"));
      setConfirmDel(null);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const saveCompany = async () => {
    if (!companyForm.name.trim()) { toast.error(t("toast_company_name_required")); return; }
    setCompanySaving(true);
    try {
      await api.put("/company", companyForm);
      toast.success(t("toast_company_updated"));
      await reloadCompany();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setCompanySaving(false); }
  };

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error(t("toast_logo_too_big")); return; }
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { toast.error(t("toast_logo_type")); return; }
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post("/company/logo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(t("toast_logo_updated"));
      await reloadCompany();
    } catch (err) { toast.error(formatApiError(err)); }
    finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeLogo = async () => {
    try {
      await api.delete("/company/logo");
      toast.success(t("toast_logo_removed"));
      await reloadCompany();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      const body = { name: profileForm.name, email: profileForm.email };
      if (profileForm.new_password) {
        body.current_password = profileForm.current_password;
        body.new_password = profileForm.new_password;
      }
      await api.put("/auth/me", body);
      toast.success(t("toast_profile_updated"));
      setProfileForm({ ...profileForm, current_password: "", new_password: "" });
      await refreshAuth();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setProfileSaving(false); }
  };

  const openUserEdit = (u) => {
    setUserEdit(u);
    setUserForm({ name: u.name || "", email: u.email || "", role: u.role, password: "" });
  };
  const saveUserEdit = async () => {
    try {
      const body = { name: userForm.name, email: userForm.email, role: userForm.role };
      if (userForm.password) body.password = userForm.password;
      await api.put(`/users/${userEdit.id}`, body);
      toast.success(t("toast_user_updated"));
      setUserEdit(null);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div data-testid="settings-page">
      <PageHeader title={t("settings_title")} subtitle={t("settings_subtitle")} />

      <div className="border border-slate-200 rounded-sm bg-white mb-6" data-testid="company-profile-card">
        <div className="p-5 border-b border-slate-200 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#0047AB]" />
          <h3 className="text-lg font-display font-medium">{t("company_profile")}</h3>
          <span className="text-xs text-slate-500 ml-auto">{t("company_profile_pdf_note")}</span>
        </div>
        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Logo */}
          <div className="lg:col-span-1">
            <Label className="text-xs uppercase tracking-wider text-slate-500">{t("logo")}</Label>
            <div className="mt-2 border border-slate-200 rounded-sm p-4 flex flex-col items-center gap-3">
              <img src={logoUrl} alt={company.name} className="w-32 h-32 object-contain bg-slate-50 p-2 rounded-sm border border-slate-100" data-testid="company-logo-preview" />
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadLogo} className="hidden" data-testid="company-logo-input" />
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1 rounded-sm" onClick={() => fileInputRef.current?.click()} disabled={logoUploading} data-testid="upload-logo-btn">
                  <Upload className="w-3.5 h-3.5 mr-2" /> {logoUploading ? t("uploading") : t("upload")}
                </Button>
                {company.has_logo && (
                  <Button variant="outline" className="rounded-sm" onClick={removeLogo} data-testid="remove-logo-btn">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 text-center">{t("logo_size_note")}</p>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("company_name")} *</Label>
              <Input value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} className="rounded-sm mt-1" data-testid="company-name-input" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("phone")}</Label>
              <Input value={companyForm.contact_phone} onChange={(e) => setCompanyForm({ ...companyForm, contact_phone: e.target.value })} className="rounded-sm mt-1" placeholder="+44 20 1234 5678" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("email")}</Label>
              <Input value={companyForm.contact_email} onChange={(e) => setCompanyForm({ ...companyForm, contact_email: e.target.value })} className="rounded-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("tax_no")}</Label>
              <Input value={companyForm.tax_no} onChange={(e) => setCompanyForm({ ...companyForm, tax_no: e.target.value })} className="rounded-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("website")}</Label>
              <Input value={companyForm.website} onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} className="rounded-sm mt-1" placeholder="https://..." />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("address")}</Label>
              <Textarea value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} className="rounded-sm mt-1" rows={2} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button onClick={saveCompany} disabled={companySaving} className="bg-[#0047AB] hover:bg-[#003380] rounded-sm" data-testid="save-company-btn">
                {companySaving ? t("saving") : t("save_company")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="border border-slate-200 p-5 rounded-sm">
          <h3 className="text-lg font-display font-medium mb-4">{t("profile_info")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("name")}</Label>
              <Input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="rounded-sm mt-1" data-testid="profile-name-input" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("email")}</Label>
              <Input value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} className="rounded-sm mt-1" data-testid="profile-email-input" />
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">{t("change_password")} ({t("optional")})</div>
              <div className="grid grid-cols-2 gap-2">
                <Input type="password" placeholder={t("current_password")} value={profileForm.current_password} onChange={(e) => setProfileForm({ ...profileForm, current_password: e.target.value })} className="rounded-sm" />
                <Input type="password" placeholder={t("new_password")} value={profileForm.new_password} onChange={(e) => setProfileForm({ ...profileForm, new_password: e.target.value })} className="rounded-sm" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{t("role")}: <Badge className="rounded-sm bg-[#0047AB] text-white ml-1">{ROLE_LABEL[user?.role]}</Badge></span>
            <Button onClick={saveProfile} disabled={profileSaving} size="sm" className="bg-[#0047AB] hover:bg-[#003380] rounded-sm" data-testid="save-profile-btn">
              {profileSaving ? "..." : t("save")}
            </Button>
          </div>
        </div>
        <div className="border border-slate-200 p-5 rounded-sm">
          <h3 className="text-lg font-display font-medium mb-4">{t("app_settings")}</h3>
          <dl className="grid grid-cols-2 gap-2 text-sm mb-4">
            <dt className="text-slate-500">{t("currency")}</dt><dd className="text-slate-900">£ GBP</dd>
            <dt className="text-slate-500">{t("date_format")}</dt><dd className="text-slate-900">DD.MM.YYYY</dd>
            <dt className="text-slate-500">{t("theme")}</dt><dd className="text-slate-900">Light</dd>
          </dl>
          <div className="pt-3 border-t border-slate-200">
            <Label className="text-xs uppercase tracking-wider text-slate-500">{t("language")}</Label>
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger className="rounded-sm mt-1" data-testid="language-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tr">Türkçe</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-sm bg-white overflow-x-auto" data-testid="users-table">
      <div className="flex items-center justify-between">
  <div>
    <h3 className="text-lg font-display font-medium">{t("user_management")}</h3>
    <p className="text-sm text-slate-500">{t("user_management_desc")}</p>
  </div>

  <Button
    onClick={() => setCreateOpen(true)}
    className="bg-[#0047AB] hover:bg-[#003380] rounded-sm"
  >
    Create User
  </Button>
</div>
        <table className="dense w-full">
          <thead><tr>
            <th>{t("name")}</th>
            <th>{t("email")}</th>
            <th>{t("role")}</th>
            <th>{t("permission_count")}</th>
            <th>{t("active")}</th>
            <th>{t("registered")}</th>
            <th className="text-right">{t("actions")}</th>
          </tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} data-testid={`user-row-${u.id}`}>
                <td className="font-medium">{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <Select value={u.role} onValueChange={(v) => updateField(u.id, "role", v)} disabled={u.id === user?.id || u.role === "admin"}>
                    <SelectTrigger className="rounded-sm h-8 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t("role_admin")}</SelectItem>
                      <SelectItem value="personel">{t("role_personel")}</SelectItem>
                      <SelectItem value="rapor">{t("role_rapor")}</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td>
                  {u.role === "admin" ? (
                    <Badge variant="outline" className="rounded-sm bg-[#0047AB]/10 text-[#0047AB] border-[#0047AB]/30">{t("all_permissions")}</Badge>
                  ) : (
                    <span className="text-slate-700">{(u.permissions || []).length} {t("permission_unit")}</span>
                  )}
                </td>
                <td>
                  <Switch checked={u.active} onCheckedChange={(v) => updateField(u.id, "active", v)} disabled={u.id === user?.id} />
                </td>
                <td>{formatDateTime(u.created_at)}</td>
                <td className="text-right whitespace-nowrap">
                  {u.id !== user?.id && (
                    <Button variant="outline" size="sm" className="rounded-sm mr-2" onClick={() => openUserEdit(u)} data-testid={`edit-user-${u.id}`}>{t("edit")}</Button>
                  )}
                  {u.role !== "admin" && (
                    <Button variant="outline" size="sm" className="rounded-sm mr-2" onClick={() => openPerm(u)} data-testid={`edit-perms-${u.id}`}>
                      <KeyRound className="w-3.5 h-3.5 mr-1" /> {t("permissions")}
                    </Button>
                  )}
                  {u.id !== user?.id && (
                    <Button variant="outline" size="sm" className="rounded-sm" onClick={() => setConfirmDel(u)} data-testid={`delete-user-${u.id}`}>{t("delete")}</Button>
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
              {permDialog?.name} — {t("permission_management")}
            </DialogTitle>
            <DialogDescription>
              {t("permission_dialog_desc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {permGroups.map((group) => {
              const all = group.actions.every(([k]) => permSet.has(k));
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
                      {all ? t("deselect_all") : t("select_all")}
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
            <Button variant="outline" onClick={() => setPermDialog(null)} className="rounded-sm">{t("cancel")}</Button>
            <Button onClick={savePerms} className="bg-[#0047AB] hover:bg-[#003380] rounded-sm" data-testid="save-perms-btn">{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userEdit} onOpenChange={(o) => !o && setUserEdit(null)}>
        <DialogContent className="rounded-sm max-w-md" data-testid="user-edit-dialog">
          <DialogHeader><DialogTitle>{t("edit")} — {userEdit?.email}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("name")}</Label>
              <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="rounded-sm mt-1" data-testid="user-edit-name" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("email")}</Label>
              <Input value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="rounded-sm mt-1" data-testid="user-edit-email" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("role")}</Label>
              <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                <SelectTrigger className="rounded-sm mt-1" data-testid="user-edit-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t("role_admin")}</SelectItem>
                  <SelectItem value="personel">{t("role_personel")}</SelectItem>
                  <SelectItem value="rapor">{t("role_rapor")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">{t("new_password")} ({t("optional")})</Label>
              <Input type="password" placeholder="••••••" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="rounded-sm mt-1" data-testid="user-edit-password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserEdit(null)} className="rounded-sm">{t("cancel")}</Button>
            <Button onClick={saveUserEdit} className="bg-[#0047AB] hover:bg-[#003380] rounded-sm" data-testid="save-user-edit-btn">{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent className="rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_user_q")}</AlertDialogTitle>
            <AlertDialogDescription>"{confirmDel?.email}" {t("delete_user_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-red-600 hover:bg-red-700 rounded-sm">{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
