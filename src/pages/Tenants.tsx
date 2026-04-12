import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Tenant, Template } from "@/types";
import { tenantService } from "@/services/firebase/tenantService";
import { templateService } from "@/services/firebase/templateService";
import { siteService } from "@/services/firebase/siteService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import AppContext from "../context/AppContext";
import { createTenantAdminAccount } from "../context/AppContextProvider";
import { collection, addDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";
import {
  AlertCircle, ExternalLink, Settings, Eye, EyeOff, UserPlus,
  Pencil, Trash2, Globe, GlobeLock, Check, X, Loader2,
} from "lucide-react";

export default function Tenants() {
  const navigate = useNavigate();
  const { globalState, db, setGlobalState } = useContext(AppContext);
  const { toast } = useToast();

  const [tenants, setTenants]     = useState<Tenant[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);

  // Create form
  const [tenantName, setTenantName]                 = useState("");
  const [subdomain, setSubdomain]                   = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [creating, setCreating]                     = useState(false);

  // Edit state — which tenant is being edited inline
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [editName, setEditName]             = useState("");
  const [editSubdomain, setEditSubdomain]   = useState("");
  const [savingEdit, setSavingEdit]         = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading]   = useState(false);

  // Publish toggle loading
  const [togglingId, setTogglingId]         = useState<string | null>(null);

  // Credentials modal
  const [showCredModal, setShowCredModal]     = useState(false);
  const [pendingTenantId, setPendingTenantId] = useState<string | null>(null);
  const [adminEmail, setAdminEmail]           = useState("");
  const [adminPassword, setAdminPassword]     = useState("");
  const [adminName, setAdminName]             = useState("");
  const [showPwd, setShowPwd]                 = useState(false);
  const [savingCreds, setSavingCreds]         = useState(false);

  const currentUser     = globalState?.AuthenticatedUser as any;
  const isSuperAdmin    =
    currentUser?.role === "SuperAdmin" ||
    currentUser?.isSuperAdmin === true  ||
    currentUser?.IsSuperAdmin === true;
  const currentUserId   = currentUser?.uid   || currentUser?.email || "";
  const currentTenantId = currentUser?.tenantId || currentUser?.TenantId;

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingTenants(true);
      try {
        const [templateList, tenantList] = await Promise.all([
          templateService.getAllTemplates(),
          tenantService.getAllTenants(),
        ]);
        setTemplates(templateList);
        const visible = isSuperAdmin
          ? tenantList
          : tenantList.filter(
              (t) => t.OwnerId === currentUserId || t.Id === currentTenantId
            );
        setTenants(visible);
        if (templateList.length && !selectedTemplateId) {
          setSelectedTemplateId(templateList[0].Id || "");
        }
      } catch (err) {
        console.error(err);
        toast({ title: "Load failed", description: "Unable to load data.", variant: "destructive" });
      } finally {
        setLoadingTenants(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshTenants = async () => {
    const all     = await tenantService.getAllTenants();
    const visible = isSuperAdmin
      ? all
      : all.filter((t) => t.OwnerId === currentUserId || t.Id === currentTenantId);
    setTenants(visible);
    setGlobalState((prev: any) => ({ ...prev, tenants: visible }));
    return visible;
  };

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreateTenant = async () => {
    if (!tenantName.trim() || !subdomain.trim() || !selectedTemplateId) {
      toast({ title: "Missing fields", description: "Fill in all fields.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const tenantId = await tenantService.createTenant({
        Name:       tenantName.trim(),
        Subdomain:  subdomain.toLowerCase().trim(),
        OwnerId:    currentUserId || "admin",
        TemplateId: selectedTemplateId,
      });
      setAdminEmail(`admin@${subdomain.toLowerCase().trim()}.com`);
      setAdminName(`${tenantName.trim()} Admin`);
      setPendingTenantId(tenantId);
      setShowCredModal(true);
      setTenantName("");
      setSubdomain("");
    } catch (err: any) {
      toast({ title: "Create failed", description: err?.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const startEdit = (tenant: any) => {
    setEditingId(tenant.Id);
    setEditName(tenant.Name);
    setEditSubdomain(tenant.Subdomain || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditSubdomain("");
  };

  const saveEdit = async (tenantId: string) => {
    if (!editName.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSavingEdit(true);
    try {
      // Update Tenants collection
      await updateDoc(doc(db, "Tenants", tenantId), {
        Name:      editName.trim(),
        Subdomain: editSubdomain.toLowerCase().trim(),
        UpdatedAt: new Date(),
      });
      // Also update Sites doc TenantId stays the same, just update name if stored
      try {
        await updateDoc(doc(db, "Sites", tenantId), {
          TenantName: editName.trim(),
          UpdatedAt:  new Date(),
        });
      } catch {} // Sites doc may not exist yet

      toast({ title: "✅ Tenant updated" });
      setEditingId(null);
      await refreshTenants();
    } catch (err: any) {
      toast({ title: "Update failed", description: err?.message, variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (tenantId: string) => {
    setDeleteLoading(true);
    try {
      // Delete Tenants doc
      await deleteDoc(doc(db, "Tenants", tenantId));
      // Delete Sites doc
      try { await deleteDoc(doc(db, "Sites", tenantId)); } catch {}

      toast({ title: "✅ Tenant deleted" });
      setDeletingId(null);
      await refreshTenants();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message, variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Publish toggle ────────────────────────────────────────────────────────
  const handleTogglePublish = async (tenant: any) => {
    setTogglingId(tenant.Id);
    try {
      const next = !tenant.Published;
      await siteService.publishSite(tenant.Id, next);
      // Optimistic update
      setTenants((prev) =>
        prev.map((t) => (t.Id === tenant.Id ? { ...t, Published: next } as any : t))
      );
      toast({
        title: next ? "✅ Site published" : "Site unpublished",
        description: `${tenant.Name} is now ${next ? "live" : "offline"}.`,
      });
    } catch (err: any) {
      toast({ title: "Toggle failed", description: err?.message, variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  // ── Create admin account ──────────────────────────────────────────────────
  const handleSaveCredentials = async () => {
    if (!adminEmail.trim() || !adminPassword.trim()) {
      toast({ title: "Missing fields", description: "Email and password are required.", variant: "destructive" });
      return;
    }
    if (adminPassword.length < 6) {
      toast({ title: "Weak password", description: "Min 6 characters.", variant: "destructive" });
      return;
    }
    if (!pendingTenantId) return;
    setSavingCreds(true);
    try {
      const { uid } = await createTenantAdminAccount(adminEmail.trim(), adminPassword.trim());
      await addDoc(collection(db, "Users"), {
        Email:        adminEmail.trim(),
        Name:         adminName.trim() || adminEmail.trim().split("@")[0],
        TenantId:     pendingTenantId,
        Role:         "Admin",
        IsAdmin:      true,
        IsSuperAdmin: false,
        uid,
        CreatedAt:    new Date(),
        EmailVerified: false,
      });
      await refreshTenants();
      toast({
        title:       "✅ Admin account created",
        description: `Account created for ${adminEmail.trim()}. Verification email sent.`,
      });
      setShowCredModal(false);
      setAdminEmail(""); setAdminPassword(""); setAdminName("");
      navigate(`/builder/${pendingTenantId}`);
      setPendingTenantId(null);
    } catch (err: any) {
      const msg =
        err.code === "auth/email-already-in-use" ? "That email is already registered." :
        err.code === "auth/weak-password"        ? "Password must be at least 6 characters." :
        err?.message || "Failed to create admin account.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSavingCreds(false);
    }
  };

  const handleSkipCredentials = async () => {
    if (pendingTenantId) {
      await addDoc(collection(db, "Users"), {
        Email:           adminEmail.trim() || `admin@tenant.com`,
        Name:            adminName.trim()  || "Tenant Admin",
        TenantId:        pendingTenantId,
        Role:            "Admin",
        IsAdmin:         true,
        IsSuperAdmin:    false,
        CreatedAt:       new Date(),
        PendingAuthSetup: true,
      });
    }
    await refreshTenants();
    toast({ title: "Tenant created", description: "Admin account setup skipped." });
    setShowCredModal(false);
    navigate(`/builder/${pendingTenantId}`);
    setPendingTenantId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Tenant Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Create and manage tenant storefronts.
        </p>
      </div>

      {/* Create form */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create new tenant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="t-name">Tenant name</Label>
                <Input id="t-name" value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)} placeholder="Green House" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-sub">Subdomain</Label>
                <Input id="t-sub" value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="greenhouse" />
                <p className="text-xs text-slate-400">
                  {subdomain ? `${subdomain}.yourplatform.com` : "e.g. greenhouse.yourplatform.com"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-tpl">Starter template</Label>
                <select id="t-tpl"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}>
                  {templates.length === 0 && <option value="">No templates yet</option>}
                  {templates.map((t) => <option key={t.Id} value={t.Id}>{t.Name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreateTenant} disabled={creating} className="min-w-[140px]">
                {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : "Create tenant"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tenant list */}
      {loadingTenants ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : tenants.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-400 text-sm">
            No tenants yet. {isSuperAdmin && "Use the form above to create your first one."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tenants.map((tenant: any) => (
            <Card key={tenant.Id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                {editingId === tenant.Id ? (
                  // ── Inline edit form ────────────────────────────────────
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-slate-500">Name</Label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="mt-1 h-8 text-sm" autoFocus />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Subdomain</Label>
                      <Input value={editSubdomain}
                        onChange={(e) => setEditSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        className="mt-1 h-8 text-sm font-mono" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => saveEdit(tenant.Id)} disabled={savingEdit}
                        className="gap-1 h-7 text-xs bg-emerald-500 hover:bg-emerald-600">
                        {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}
                        className="gap-1 h-7 text-xs text-slate-500">
                        <X className="w-3 h-3" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: "#4f46e5" }}
                    >
                      {tenant.Name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span className="truncate flex-1">{tenant.Name}</span>
                    {/* Published badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0
                      ${tenant.Published
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"}`}>
                      {tenant.Published ? "Live" : "Draft"}
                    </span>
                  </CardTitle>
                )}
              </CardHeader>

              {editingId !== tenant.Id && (
                <CardContent className="space-y-3 text-sm">
                  <div className="text-slate-500">
                    Subdomain: <span className="font-mono font-medium text-slate-700">{tenant.Subdomain}</span>
                  </div>
                  {tenant.AdminEmail && (
                    <div className="text-slate-500">
                      Admin: <span className="font-medium text-slate-700">{tenant.AdminEmail}</span>
                    </div>
                  )}
                  {tenant.PendingAuthSetup && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Admin account needs Firebase Auth setup</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="secondary"
                      onClick={() => navigate(`/builder/${tenant.Id}`)} className="gap-1.5">
                      <Settings className="w-3.5 h-3.5" /> Builder
                    </Button>

                    <Button size="sm" variant="outline"
                      onClick={() => window.open(`https://${tenant.Subdomain}.yourplatform.com`, "_blank")}
                      className="gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" /> Preview
                    </Button>

                    {/* Publish toggle */}
                    <Button size="sm" variant="outline"
                      onClick={() => handleTogglePublish(tenant)}
                      disabled={togglingId === tenant.Id}
                      className={`gap-1.5 ${tenant.Published
                        ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                        : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}>
                      {togglingId === tenant.Id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : tenant.Published
                        ? <GlobeLock className="w-3.5 h-3.5" />
                        : <Globe className="w-3.5 h-3.5" />}
                      {tenant.Published ? "Unpublish" : "Publish"}
                    </Button>

                    {/* Edit */}
                    <Button size="sm" variant="outline"
                      onClick={() => startEdit(tenant)} className="gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>

                    {/* Delete */}
                    <Button size="sm" variant="outline"
                      onClick={() => setDeletingId(tenant.Id)}
                      className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete Tenant
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{" "}
            <strong>{tenants.find((t) => t.Id === deletingId)?.Name}</strong>?
            This will also delete their site data. This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deletingId && handleDelete(deletingId)}
              disabled={deleteLoading}>
              {deleteLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting…</> : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create admin credentials modal */}
      <Dialog open={showCredModal} onOpenChange={() => {}}>
        <DialogContent className="max-w-[95vw] sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Create tenant admin account
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            Set up login credentials for this tenant's admin.
          </p>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="cred-name">Display name</Label>
              <Input id="cred-name" value={adminName}
                onChange={(e) => setAdminName(e.target.value)} placeholder="Tenant Admin" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="cred-email">Admin email <span className="text-red-500">*</span></Label>
              <Input id="cred-email" type="email" value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@example.com" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="cred-pwd">Password <span className="text-red-500">*</span></Label>
              <div className="relative mt-1">
                <Input id="cred-pwd" type={showPwd ? "text" : "password"} value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)} placeholder="Min. 6 characters" className="pr-10" />
                <button type="button" onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
              ✓ Your session will remain active while this account is created.
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button variant="ghost" onClick={handleSkipCredentials} className="text-slate-500 text-sm">
              Skip (set up later)
            </Button>
            <Button onClick={handleSaveCredentials} disabled={savingCreds} className="gap-1.5">
              {savingCreds ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Creating…</> : "Create account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}