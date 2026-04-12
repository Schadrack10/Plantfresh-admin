import { useState, useEffect, useRef, useMemo, useContext } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  collection, getDocs, updateDoc, deleteDoc, doc, query, where,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import AppContext from "../context/AppContext";
import { AlertCircle } from "lucide-react";

type UserCategory = "all" | "admins" | "affiliates" | "users" | "banned";

const formatDate = (val: any): string => {
  if (!val) return "-";
  if (val?.toDate) return val.toDate().toLocaleString();
  if (val?.seconds) return new Date(val.seconds * 1000).toLocaleString();
  if (typeof val === "string" || typeof val === "number")
    return new Date(val).toLocaleString();
  return "-";
};

export default function Users() {
  const { db, globalState } = useContext(AppContext);
  const { toast } = useToast();

  const activeTenant = (globalState as any)?.activeTenant;
  const tenantId = activeTenant?.Id;

  // Cache key is per-tenant so switching tenants always loads fresh data
  const CACHE_KEY = `UsersList_${tenantId}`;
  const CACHE_TS_KEY = `UsersListFetchedAt_${tenantId}`;
  const CACHE_TTL_MS = 5 * 60 * 1000;

  const hasFetched = useRef(false);
  const prevTenantId = useRef<string | undefined>(undefined);

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<UserCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [openEdit, setOpenEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [openBan, setOpenBan] = useState(false);
  const [banTarget, setBanTarget] = useState<any>(null);
  const [banReason, setBanReason] = useState("");
  const [banLoading, setBanLoading] = useState(false);

  const [editValues, setEditValues] = useState({
    Name: "", Email: "", Country: "", Phone: "",
    Address: "", City: "", PostalCode: "",
    IsAdmin: false, IsAffiliate: false,
    IsSuperAdmin: false, Role: "user",
    CreatedAt: null as any,
  });

  // ── Re-fetch when tenant switches ────────────────────────────────────────
  useEffect(() => {
    if (!tenantId || !db) return;
    // Reset if tenant changed
    if (prevTenantId.current !== tenantId) {
      hasFetched.current = false;
      setUsers([]);
      prevTenantId.current = tenantId;
    }
    if (hasFetched.current) return;
    hasFetched.current = true;

    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try { setUsers(JSON.parse(cached)); } catch {}
    }
    const fetchedAt = localStorage.getItem(CACHE_TS_KEY);
    const isStale = !fetchedAt || Date.now() - parseInt(fetchedAt, 10) > CACHE_TTL_MS;
    if (!cached || isStale) fetchUsers({ silent: !!cached });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, db]);

  // ── Fetch users scoped to tenantId ───────────────────────────────────────
  const fetchUsers = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!db || !tenantId) return;
    if (!silent) setLoading(true);
    try {
      // Scope to this tenant only
      const q = query(collection(db, "Users"), where("TenantId", "==", tenantId));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      localStorage.setItem(CACHE_KEY, JSON.stringify(list));
      localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      setUsers(list);
      if (!silent)
        toast({ title: "Users refreshed", description: `Loaded ${list.length} users for ${activeTenant?.Name}` });
    } catch (err) {
      console.error(err);
      if (!silent) toast({ title: "Error loading users", variant: "destructive" });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const sortedUsers = useMemo(() =>
    [...users].sort((a, b) =>
      (a.Name || "").toLowerCase().localeCompare((b.Name || "").toLowerCase())
    ), [users]);

  const categoryFiltered = useMemo(() => {
    switch (activeCategory) {
      case "admins":     return sortedUsers.filter((u) => u.IsAdmin || u.IsSuperAdmin || u.Role === "Admin" || u.Role === "SuperAdmin");
      case "affiliates": return sortedUsers.filter((u) => u.IsAffiliate);
      case "banned":     return sortedUsers.filter((u) => u.IsBanned);
      case "users":      return sortedUsers.filter((u) => !u.IsAdmin && !u.IsAffiliate && !u.IsSuperAdmin);
      default:           return sortedUsers;
    }
  }, [sortedUsers, activeCategory]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categoryFiltered;
    return categoryFiltered.filter((u) =>
      [u.Name, u.Email, u.UserID, u.Phone, u.Country, u.City, u.AffiliateId, u.TenantId]
        .some((field) => field && String(field).toLowerCase().includes(q))
    );
  }, [categoryFiltered, searchQuery]);

  const counts = {
    all:        sortedUsers.length,
    admins:     sortedUsers.filter((u) => u.IsAdmin || u.IsSuperAdmin || u.Role === "Admin" || u.Role === "SuperAdmin").length,
    affiliates: sortedUsers.filter((u) => u.IsAffiliate).length,
    users:      sortedUsers.filter((u) => !u.IsAdmin && !u.IsAffiliate && !u.IsSuperAdmin).length,
    banned:     sortedUsers.filter((u) => u.IsBanned).length,
  };

  const generateAffiliateId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let id = "AFF-";
    for (let i = 0; i < 8; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
    return id;
  };

  // ── Ban / Unban ──────────────────────────────────────────────────────────
  const handleOpenBan = (user: any) => { setBanTarget(user); setBanReason(""); setOpenBan(true); };

  const handleBanUser = async () => {
    if (!banReason.trim()) {
      toast({ title: "Reason required", variant: "destructive" });
      return;
    }
    setBanLoading(true);
    try {
      const updateData = { IsBanned: true, BanReason: banReason.trim(), BannedAt: new Date().toISOString() };
      await updateDoc(doc(db, "Users", banTarget.id), updateData);
      const updated = users.map((u) => u.id === banTarget.id ? { ...u, ...updateData } : u);
      setUsers(updated);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      toast({ title: "User banned", description: `${banTarget.Name || banTarget.Email} has been banned.` });
      setOpenBan(false);
    } catch (err) {
      toast({ title: "Ban failed", variant: "destructive" });
    } finally {
      setBanLoading(false);
    }
  };

  const handleUnbanUser = async (user: any) => {
    if (!confirm(`Unban ${user.Name || user.Email}?`)) return;
    try {
      const updateData = { IsBanned: false, BanReason: null, BannedAt: null };
      await updateDoc(doc(db, "Users", user.id), updateData);
      const updated = users.map((u) => u.id === user.id ? { ...u, ...updateData } : u);
      setUsers(updated);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      toast({ title: "User unbanned" });
    } catch (err) {
      toast({ title: "Unban failed", variant: "destructive" });
    }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────
  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setEditValues({
      Name:        user.Name        || "",
      Email:       user.Email       || user.UserID || "",
      Country:     user.Country     || "",
      Phone:       user.Phone       || "",
      Address:     user.Address     || "",
      City:        user.City        || "",
      PostalCode:  user.PostalCode  || "",
      IsAdmin:     user.IsAdmin     || false,
      IsAffiliate: user.IsAffiliate || false,
      IsSuperAdmin: user.IsSuperAdmin || false,
      // Normalise Role — derive from boolean flags if Role string is missing
      Role: user.Role || (user.IsSuperAdmin ? "SuperAdmin" : user.IsAdmin ? "Admin" : "user"),
      CreatedAt:   user.CreatedAt   ?? null,
    });
    setOpenEdit(true);
  };

  const handleUpdateUser = async () => {
    try {
      const { CreatedAt: _omit, ...writableValues } = editValues;

      // Keep Role string in sync with boolean flags so onSnapshot listener
      // in AppContextProvider picks up the change immediately
      const role = editValues.IsSuperAdmin
        ? "SuperAdmin"
        : editValues.IsAdmin
        ? "Admin"
        : "user";

      const updateData: any = {
        ...writableValues,
        Role:        role,
        IsAdmin:     editValues.IsAdmin || editValues.IsSuperAdmin,
        IsSuperAdmin: editValues.IsSuperAdmin,
        TenantId:    tenantId, // always ensure TenantId is set
      };

      if (editValues.IsAffiliate && !selectedUser.AffiliateId)
        updateData.AffiliateId = generateAffiliateId();
      if (!editValues.IsAffiliate && selectedUser.AffiliateId)
        updateData.AffiliateId = null;

      await updateDoc(doc(db, "Users", selectedUser.id), updateData);

      const updated = users.map((u) => u.id === selectedUser.id ? { ...u, ...updateData } : u);
      setUsers(updated);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));

      toast({
        title: "User updated",
        description: editValues.IsAffiliate && !selectedUser.AffiliateId
          ? "User updated and Affiliate ID generated"
          : "User details saved successfully",
      });
      setOpenEdit(false);
    } catch (err) {
      console.error(err);
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteDoc(doc(db, "Users", id));
      const updated = users.filter((u) => u.id !== id);
      setUsers(updated);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      toast({ title: "User deleted" });
    } catch (err) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  // ── No tenant guard ───────────────────────────────────────────────────────
  if (!tenantId) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <p className="font-semibold text-slate-700">No tenant selected</p>
          <p className="text-sm text-slate-500">Select a tenant from the sidebar to manage its users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Users</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeTenant?.Name} · <span className="font-mono">TenantId: {tenantId}</span>
          </p>
        </div>
        <Button onClick={() => fetchUsers({ silent: false })} disabled={loading} className="w-full sm:w-auto">
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search name, email, phone, country…" className="pl-9 pr-9" />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-2 border-b pb-2 min-w-max md:min-w-0">
          {([
            { key: "all",        label: "All Users",     color: "bg-blue-600"   },
            { key: "admins",     label: "Admins",        color: "bg-purple-600" },
            { key: "affiliates", label: "Affiliates",    color: "bg-green-600"  },
            { key: "users",      label: "Regular Users", color: "bg-gray-600"   },
            { key: "banned",     label: "Banned",        color: "bg-red-600"    },
          ] as const).map(({ key, label, color }) => (
            <button key={key}
              onClick={() => { setActiveCategory(key); setSearchQuery(""); }}
              className={`px-3 md:px-4 py-2 rounded-t-lg font-medium transition-colors text-sm md:text-base whitespace-nowrap
                ${activeCategory === key ? `${color} text-white` : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
              {label} ({counts[key]})
              {key === "banned" && counts.banned > 0 && activeCategory !== "banned" && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full">!</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardHeader>
          <CardTitle style={{ fontSize: "16px" }}>
            {searchQuery
              ? `Search results for "${searchQuery}" (${filteredUsers.length})`
              : `${activeCategory === "all" ? "All Users" : activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} (${filteredUsers.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
              <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm">Loading users for {activeTenant?.Name}…</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="w-full border rounded-lg">
                  <thead>
                    <tr style={{ fontSize: "13px", background: "#0e172a", color: "#fff" }}>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap">Name ↑</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap">Email</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap hidden lg:table-cell">Country</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap hidden xl:table-cell">Phone</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap">Status</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap hidden md:table-cell">Affiliate ID</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap hidden xl:table-cell">Joined</th>
                      <th className="p-2 md:p-3 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id}
                        style={{
                          fontSize: "13px",
                          border: "1px solid rgb(207,216,221)",
                          backgroundColor: user.IsBanned ? "#fff5f5" : undefined,
                        }}
                        className="border-b">
                        <td className="p-2 md:p-3">
                          <div className="max-w-[150px] md:max-w-none truncate font-medium">{user.Name || "-"}</div>
                        </td>
                        <td className="p-2 md:p-3">
                          <div className="max-w-[180px] md:max-w-none truncate">{user.Email || user.UserID || "-"}</div>
                        </td>
                        <td className="p-2 md:p-3 hidden lg:table-cell">{user.Country || "-"}</td>
                        <td className="p-2 md:p-3 hidden xl:table-cell">{user.Phone || "-"}</td>
                        <td className="p-2 md:p-3">
                          <div className="flex flex-col gap-1">
                            {user.IsBanned && (
                              <span className="inline-block px-1.5 py-0.5 text-[10px] md:text-xs rounded bg-red-100 text-red-800 whitespace-nowrap font-semibold">
                                🚫 Banned
                              </span>
                            )}
                            {(user.IsSuperAdmin || user.Role === "SuperAdmin") && (
                              <span className="inline-block px-1.5 py-0.5 text-[10px] md:text-xs rounded bg-indigo-100 text-indigo-800 whitespace-nowrap">
                                SuperAdmin
                              </span>
                            )}
                            {(user.IsAdmin || user.Role === "Admin") && !user.IsSuperAdmin && (
                              <span className="inline-block px-1.5 py-0.5 text-[10px] md:text-xs rounded bg-purple-100 text-purple-800 whitespace-nowrap">
                                Admin
                              </span>
                            )}
                            {user.IsAffiliate && (
                              <span className="inline-block px-1.5 py-0.5 text-[10px] md:text-xs rounded bg-green-100 text-green-800 whitespace-nowrap">
                                Affiliate
                              </span>
                            )}
                            {!user.IsAdmin && !user.IsAffiliate && !user.IsBanned && !user.IsSuperAdmin && (
                              <span className="inline-block px-1.5 py-0.5 text-[10px] md:text-xs rounded bg-gray-100 text-gray-800 whitespace-nowrap">
                                User
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 md:p-3 font-mono text-[10px] md:text-xs hidden md:table-cell">
                          {user.AffiliateId || "-"}
                        </td>
                        <td className="p-2 md:p-3 text-xs text-gray-500 hidden xl:table-cell whitespace-nowrap">
                          {formatDate(user.CreatedAt)}
                        </td>
                        <td className="p-2 md:p-3 text-right">
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => handleOpenEdit(user)} className="text-xs">Edit</Button>
                            {user.IsBanned ? (
                              <Button variant="outline" size="sm" onClick={() => handleUnbanUser(user)}
                                className="text-xs border-green-500 text-green-700 hover:bg-green-50">Unban</Button>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => handleOpenBan(user)}
                                className="text-xs border-orange-400 text-orange-700 hover:bg-orange-50">Ban</Button>
                            )}
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)} className="text-xs">Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && !loading && (
                  <p className="text-center text-gray-500 mt-4 text-sm px-4">
                    {searchQuery ? `No users found matching "${searchQuery}".` : `No ${activeCategory} found for ${activeTenant?.Name}.`}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ban Modal */}
      <Dialog open={openBan} onOpenChange={setOpenBan}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-red-700">🚫 Ban User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                You are about to ban <strong>{banTarget?.Name || banTarget?.Email}</strong>.
                They will be blocked from logging in and shown your reason.
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Reason <span className="text-red-500">*</span></Label>
              <textarea value={banReason} onChange={(e) => setBanReason(e.target.value)}
                placeholder="e.g. Violation of terms of service…" rows={3}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => setOpenBan(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleBanUser} disabled={banLoading} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white">
              {banLoading ? "Banning..." : "Confirm Ban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 md:space-y-4">
            {editValues.CreatedAt && (
              <div className="p-2 md:p-3 bg-gray-50 rounded border border-gray-200 text-xs md:text-sm text-gray-600">
                <span className="font-semibold">Joined: </span>{formatDate(editValues.CreatedAt)}
              </div>
            )}
            {/* Tenant badge */}
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-700">
              <span className="font-semibold">Tenant: </span>{activeTenant?.Name}
              <span className="ml-2 font-mono opacity-60">{tenantId}</span>
            </div>
            {selectedUser?.IsBanned && (
              <div className="p-2 md:p-3 bg-red-50 rounded border border-red-200 text-xs md:text-sm text-red-700">
                <span className="font-semibold">🚫 Banned</span>
                {selectedUser.BanReason && <> — {selectedUser.BanReason}</>}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div><Label>Name</Label>
                <Input value={editValues.Name} onChange={(e) => setEditValues({ ...editValues, Name: e.target.value })} /></div>
              <div><Label>Email</Label>
                <Input value={editValues.Email} onChange={(e) => setEditValues({ ...editValues, Email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div><Label>Phone</Label>
                <Input value={editValues.Phone} onChange={(e) => setEditValues({ ...editValues, Phone: e.target.value })} /></div>
              <div><Label>Country</Label>
                <Input value={editValues.Country} onChange={(e) => setEditValues({ ...editValues, Country: e.target.value })} /></div>
            </div>
            <div><Label>Address</Label>
              <Input value={editValues.Address} onChange={(e) => setEditValues({ ...editValues, Address: e.target.value })} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div><Label>City</Label>
                <Input value={editValues.City} onChange={(e) => setEditValues({ ...editValues, City: e.target.value })} /></div>
              <div><Label>Postal Code</Label>
                <Input value={editValues.PostalCode} onChange={(e) => setEditValues({ ...editValues, PostalCode: e.target.value })} /></div>
            </div>

            {/* Permissions — Role field kept in sync so onSnapshot fires */}
            <div className="border-t pt-3 space-y-2">
              <Label className="font-semibold">Permissions</Label>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isSuperAdmin" checked={editValues.IsSuperAdmin}
                  onChange={(e) => setEditValues({ ...editValues, IsSuperAdmin: e.target.checked, IsAdmin: e.target.checked || editValues.IsAdmin })}
                  className="h-4 w-4" />
                <Label htmlFor="isSuperAdmin" className="cursor-pointer">Super Administrator</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isAdmin" checked={editValues.IsAdmin}
                  onChange={(e) => setEditValues({ ...editValues, IsAdmin: e.target.checked })}
                  className="h-4 w-4" />
                <Label htmlFor="isAdmin" className="cursor-pointer">Administrator</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isAffiliate" checked={editValues.IsAffiliate}
                  onChange={(e) => setEditValues({ ...editValues, IsAffiliate: e.target.checked })}
                  className="h-4 w-4" />
                <Label htmlFor="isAffiliate" className="cursor-pointer">Affiliate</Label>
              </div>
              {editValues.IsAffiliate && (
                <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                  <p className="text-xs text-green-800">
                    {selectedUser?.AffiliateId
                      ? <><strong>Affiliate ID:</strong> <span className="font-mono">{selectedUser.AffiliateId}</span></>
                      : "An Affiliate ID will be auto-generated on save."}
                  </p>
                </div>
              )}
              {/* Role preview */}
              <div className="mt-1 p-2 bg-slate-50 rounded border border-slate-200">
                <p className="text-xs text-slate-600">
                  <span className="font-semibold">Role will be saved as: </span>
                  <span className="font-mono">{editValues.IsSuperAdmin ? "SuperAdmin" : editValues.IsAdmin ? "Admin" : "user"}</span>
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => setOpenEdit(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleUpdateUser} className="w-full sm:w-auto">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}