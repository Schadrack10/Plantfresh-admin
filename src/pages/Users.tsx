import React, { useState, useEffect, useRef, useMemo, useContext } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  collection, getDocs, updateDoc, deleteDoc, doc, query, where, setDoc,
  type Firestore,
} from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import AppContext from "../context/AppContext";
import { AlertCircle } from "lucide-react";

type UserCategory = "all" | "admins" | "affiliates" | "users" | "banned";

type UserFormValues = {
  Name: string;
  Email: string;
  Phone: string;
  Country: string;
  Address: string;
  City: string;
  PostalCode: string;
  IsAdmin: boolean;
  IsAffiliate: boolean;
  IsSuperAdmin: boolean;
};

type CreateUserFormValues = UserFormValues & {
  Password: string;
};

type UserRecord = {
  id?: string;
  UserID: string;
  Email: string;
  TenantId: string;
  TenantID?: string;
  Name?: string;
  Phone?: string;
  Country?: string;
  Address?: string;
  City?: string;
  PostalCode?: string;
  IsAdmin: boolean;
  IsSuperAdmin: boolean;
  IsAffiliate: boolean;
  IsBanned?: boolean;
  AffiliateId?: string;
  BanReason?: string | null;
  BannedAt?: string | null;
  CreatedAt?: string | { seconds: number } | { toDate: () => Date };
  Role?: string;
};

type AppContextType = {
  db: Firestore | null;
  globalState: {
    activeTenant?: { Id?: string; Name?: string } | null;
    [key: string]: unknown;
  };
};

const formatDate = (val: unknown): string => {
  if (!val) return "-";
  const maybeTimestamp = val as { toDate?: () => Date; seconds?: number };
  if (maybeTimestamp.toDate) return maybeTimestamp.toDate().toLocaleString();
  if (typeof maybeTimestamp.seconds === "number") return new Date(maybeTimestamp.seconds * 1000).toLocaleString();
  if (typeof val === "string" || typeof val === "number")
    return new Date(val).toLocaleString();
  return "-";
};

export default function Users() {
  const { db, globalState } = useContext(AppContext as React.Context<AppContextType>);
  const { toast } = useToast();

  const activeTenant = globalState?.activeTenant;
  const tenantId = activeTenant?.Id;

  // Cache key is per-tenant so switching tenants always loads fresh data
  const CACHE_KEY = `UsersList_${tenantId}`;
  const CACHE_TS_KEY = `UsersListFetchedAt_${tenantId}`;
  const CACHE_TTL_MS = 5 * 60 * 1000;

  const hasFetched = useRef(false);
  const prevTenantId = useRef<string | undefined>(undefined);

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<UserCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [openEdit, setOpenEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [openUnbanConfirm, setOpenUnbanConfirm] = useState(false);
  const [unbanTarget, setUnbanTarget] = useState<UserRecord | null>(null);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);

  const [banTarget, setBanTarget] = useState<UserRecord | null>(null);
  const [banReason, setBanReason] = useState("");
  const [openBan, setOpenBan] = useState(false);
  const [banLoading, setBanLoading] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);
  const [createValues, setCreateValues] = useState<CreateUserFormValues>({
    Name: "",
    Email: "",
    Phone: "",
    Country: "",
    Address: "",
    City: "",
    PostalCode: "",
    Password: "",
    IsAdmin: false,
    IsAffiliate: false,
    IsSuperAdmin: false,
  });

  const [editValues, setEditValues] = useState<UserFormValues & { CreatedAt: UserRecord["CreatedAt"] | null }>({
    Name: "", Email: "", Country: "", Phone: "",
    Address: "", City: "", PostalCode: "",
    IsAdmin: false, IsAffiliate: false,
    IsSuperAdmin: false,
    CreatedAt: null,
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
      try {
        setUsers(JSON.parse(cached) as UserRecord[]);
      } catch {
        // Ignore invalid cached data
      }
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
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as UserRecord[];
      localStorage.setItem(CACHE_KEY, JSON.stringify(list));
      localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      setUsers(list);
      if (!silent)
        toast({ title: "Users refreshed", description: `Loaded ${list.length} users for ${activeTenant?.Name}` });
    } catch (err) {
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
      case "users":      return sortedUsers.filter((u) => !u.IsAdmin && !u.IsAffiliate && !u.IsSuperAdmin && u.Role !== "Admin" && u.Role !== "SuperAdmin");
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
    users:      sortedUsers.filter((u) => !u.IsAdmin && !u.IsAffiliate && !u.IsSuperAdmin && u.Role !== "Admin" && u.Role !== "SuperAdmin").length,
    banned:     sortedUsers.filter((u) => u.IsBanned).length,
  };

  const generateUserId = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    for (let i = 0; i < 6; i += 1) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  };

  const generateAffiliateId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let id = "AFF-";
    for (let i = 0; i < 8; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
    return id;
  };

  // ── Ban / Unban ──────────────────────────────────────────────────────────
  const handleOpenBan = (user: UserRecord) => { setBanTarget(user); setBanReason(""); setOpenBan(true); };

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

  const handleOpenUnbanConfirm = (user: UserRecord) => {
    setUnbanTarget(user);
    setOpenUnbanConfirm(true);
  };

  const handleUnbanUser = async () => {
    if (!unbanTarget) return;
    try {
      const updateData = { IsBanned: false, BanReason: null, BannedAt: null };
      await updateDoc(doc(db, "Users", unbanTarget.id), updateData);
      const updated = users.map((u) => u.id === unbanTarget.id ? { ...u, ...updateData } : u);
      setUsers(updated);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      toast({ title: "User unbanned" });
      setOpenUnbanConfirm(false);
      setUnbanTarget(null);
    } catch (err) {
      toast({ title: "Unban failed", variant: "destructive" });
    }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────
  const handleOpenEdit = (user: UserRecord) => {
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

      const updateData: Partial<UserRecord> = {
        ...writableValues,
        Role:         role,
        IsAdmin:      editValues.IsAdmin || editValues.IsSuperAdmin,
        IsSuperAdmin: editValues.IsSuperAdmin,
        TenantId:     tenantId, // always ensure TenantId is set
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
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const resetCreateForm = () => {
    setCreateValues({
      Name: "",
      Email: "",
      Phone: "",
      Country: "",
      Address: "",
      City: "",
      PostalCode: "",
      Password: "",
      IsAdmin: false,
      IsAffiliate: false,
      IsSuperAdmin: false,
    });
  };

  const handleOpenCreate = () => {
    resetCreateForm();
    setOpenCreate(true);
  };

  const handleCreateUser = async () => {
    if (!createValues.Email.trim()) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    if (!createValues.Password.trim()) {
      toast({ title: "Password required", variant: "destructive" });
      return;
    }
    if (createValues.Password.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }

    const userId = generateUserId();
    const role = createValues.IsSuperAdmin
      ? "SuperAdmin"
      : createValues.IsAdmin
      ? "Admin"
      : "user";

    const createData: UserRecord & {
      TenantID: string;
      CreatedAt: string;
      IsBanned: boolean;
    } = {
      UserID:       userId,
      Name:         createValues.Name || createValues.Email,
      Email:        createValues.Email.trim(),
      Phone:        createValues.Phone.trim() || null,
      Country:      createValues.Country.trim() || null,
      Address:      createValues.Address.trim() || null,
      City:         createValues.City.trim() || null,
      PostalCode:   createValues.PostalCode.trim() || null,
      IsAdmin:      createValues.IsAdmin || createValues.IsSuperAdmin,
      IsSuperAdmin: createValues.IsSuperAdmin,
      IsAffiliate:  createValues.IsAffiliate,
      TenantId:     tenantId,
      TenantID:     tenantId,
      CreatedAt:    new Date().toISOString(),
      Role:         role,
      IsBanned:     false,
    };

    if (createValues.IsAffiliate) {
      createData.AffiliateId = generateAffiliateId();
    }

    try {
      // First create the Firebase Auth user
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        createValues.Email.trim(),
        createValues.Password
      );

      // Then create the Firestore record with the Firebase Auth UID
      createData.UserID = userCredential.user.uid;

      await setDoc(doc(db, "Users", userCredential.user.uid), createData);
      const newUsers = [{ id: userCredential.user.uid, ...createData }, ...users];
      setUsers(newUsers);
      localStorage.setItem(CACHE_KEY, JSON.stringify(newUsers));
      toast({ title: "User created", description: `${createData.Email} has been added and can now log in.` });
      setOpenCreate(false);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      const errorMessage = error?.code === "auth/email-already-in-use"
        ? "A user with this email already exists."
        : error?.code === "auth/invalid-email"
        ? "Please enter a valid email address."
        : error?.code === "auth/weak-password"
        ? "Password is too weak. Please choose a stronger password."
        : error?.message || "Failed to create user.";
      toast({ title: "Create failed", description: errorMessage, variant: "destructive" });
    }
  };

  const handleOpenDeleteConfirm = (user: UserRecord) => {
    setDeleteTarget(user);
    setOpenDeleteConfirm(true);
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "Users", deleteTarget.id));
      const updated = users.filter((u) => u.id !== deleteTarget.id);
      setUsers(updated);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      toast({ title: "User deleted" });
      setOpenDeleteConfirm(false);
      setDeleteTarget(null);
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
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={handleOpenCreate} variant="secondary" className="w-full sm:w-auto">
            Create User
          </Button>
          <Button onClick={() => fetchUsers({ silent: false })} disabled={loading} className="w-full sm:w-auto">
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
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
            { key: "all",        label: "All Users",     color: "", style: { backgroundColor: "var(--admin-primary)" }   },
            { key: "admins",     label: "Admins",        color: "bg-purple-600" },
            { key: "affiliates", label: "Affiliates",    color: "", style: { backgroundColor: "var(--admin-accent)" }  },
            { key: "users",      label: "Regular Users", color: "bg-gray-600"   },
            { key: "banned",     label: "Banned",        color: "bg-red-600"    },
          ] as const).map(({ key, label, color, style }) => (
            <button key={key}
              onClick={() => { setActiveCategory(key); setSearchQuery(""); }}
              className={`px-3 md:px-4 py-2 rounded-t-lg font-medium transition-colors text-sm md:text-base whitespace-nowrap
                ${activeCategory === key ? `${color} text-white` : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              style={activeCategory === key && style ? style : {}}>
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
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full border rounded-lg animate-pulse">
                <thead>
                  <tr style={{ fontSize: "13px", background: "#0e172a", color: "#fff" }}>
                    <th className="p-2 md:p-3 text-left whitespace-nowrap">Name</th>
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
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={idx} className="border-b bg-white">
                      {Array.from({ length: 8 }).map((__, cellIndex) => (
                        <td key={cellIndex} className="p-3">
                          <div className="h-4 rounded bg-slate-200"></div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="w-full border rounded-lg">
                  <thead>
                    <tr style={{ fontSize: "13px", background: "#0e172a", color: "#fff" }}>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap">Name ↑</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap">Email</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap hidden sm:table-cell">UserID</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap hidden lg:table-cell">Country</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap hidden xl:table-cell">Phone</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap">Status</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap hidden md:table-cell">Affiliate ID</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap hidden xl:table-cell">TenantID</th>
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
                        <td className="p-2 md:p-3 hidden sm:table-cell font-mono text-[11px] text-slate-600 truncate max-w-[120px]">{user.UserID || "-"}</td>
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
                              <span className="inline-block px-1.5 py-0.5 text-[10px] md:text-xs rounded whitespace-nowrap" style={{ backgroundColor: "var(--admin-primary-20)", color: "var(--admin-primary)" }}>
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
                          {user.TenantId || user.TenantID || "-"}
                        </td>
                        <td className="p-2 md:p-3 text-right">
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => handleOpenEdit(user)} className="text-xs">Edit</Button>
                            {user.IsBanned ? (
                              <Button variant="outline" size="sm" onClick={() => handleOpenUnbanConfirm(user)}
                                className="text-xs border-green-500 text-green-700 hover:bg-green-50">Unban</Button>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => handleOpenBan(user)}
                                className="text-xs border-orange-400 text-orange-700 hover:bg-orange-50">Ban</Button>
                            )}
                            <Button variant="destructive" size="sm" onClick={() => handleOpenDeleteConfirm(user)} className="text-xs">Delete</Button>
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

      {/* Unban Confirmation Modal */}
      <Dialog open={openUnbanConfirm} onOpenChange={setOpenUnbanConfirm}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-green-700">✅ Unban User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                Are you sure you want to unban <strong>{unbanTarget?.Name || unbanTarget?.Email}</strong>?
                They will be able to log in again.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => setOpenUnbanConfirm(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleUnbanUser} style={{ backgroundColor: "var(--admin-accent)" }} className="w-full sm:w-auto text-white">
              Confirm Unban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={openDeleteConfirm} onOpenChange={setOpenDeleteConfirm}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-red-700">🗑️ Delete User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                Are you sure you want to delete <strong>{deleteTarget?.Name || deleteTarget?.Email}</strong>?
                This action cannot be undone.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => setOpenDeleteConfirm(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleDeleteUser} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white">
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Modal */}
      <Dialog open={openBan} onOpenChange={setOpenBan}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-red-700">🚫 Ban User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                Are you sure you want to ban <strong>{banTarget?.Name || banTarget?.Email}</strong>?
                They will be unable to log in until unbanned.
              </p>
            </div>
            <div>
              <Label htmlFor="banReason">Reason for ban (required)</Label>
              <Input id="banReason" value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="e.g. Violation of terms" />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => setOpenBan(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleBanUser} disabled={banLoading} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white">
              {banLoading ? "Banning..." : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Modal */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Create User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label>Email</Label>
                <Input value={createValues.Email} onChange={(e) => setCreateValues({ ...createValues, Email: e.target.value })} placeholder="user@example.com" />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={createValues.Password} onChange={(e) => setCreateValues({ ...createValues, Password: e.target.value })} placeholder="Minimum 8 characters" />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={createValues.Name} onChange={(e) => setCreateValues({ ...createValues, Name: e.target.value })} placeholder="Optional" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Phone</Label>
                  <Input value={createValues.Phone} onChange={(e) => setCreateValues({ ...createValues, Phone: e.target.value })} placeholder="Optional" />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input value={createValues.Country} onChange={(e) => setCreateValues({ ...createValues, Country: e.target.value })} placeholder="Optional" />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input value={createValues.Address} onChange={(e) => setCreateValues({ ...createValues, Address: e.target.value })} placeholder="Optional" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Input value={createValues.City} onChange={(e) => setCreateValues({ ...createValues, City: e.target.value })} placeholder="Optional" />
                </div>
                <div>
                  <Label>Postal Code</Label>
                  <Input value={createValues.PostalCode} onChange={(e) => setCreateValues({ ...createValues, PostalCode: e.target.value })} placeholder="Optional" />
                </div>
              </div>
            </div>
            <div className="border-t pt-3 space-y-2">
              <Label className="font-semibold">Permissions</Label>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="createSuperAdmin" checked={createValues.IsSuperAdmin}
                  onChange={(e) => setCreateValues({ ...createValues, IsSuperAdmin: e.target.checked, IsAdmin: e.target.checked || createValues.IsAdmin })}
                  className="h-4 w-4" />
                <Label htmlFor="createSuperAdmin" className="cursor-pointer">Super Administrator</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="createAdmin" checked={createValues.IsAdmin}
                  onChange={(e) => setCreateValues({ ...createValues, IsAdmin: e.target.checked })}
                  className="h-4 w-4" />
                <Label htmlFor="createAdmin" className="cursor-pointer">Administrator</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="createAffiliate" checked={createValues.IsAffiliate}
                  onChange={(e) => setCreateValues({ ...createValues, IsAffiliate: e.target.checked })}
                  className="h-4 w-4" />
                <Label htmlFor="createAffiliate" className="cursor-pointer">Affiliate</Label>
              </div>
              <p className="text-xs text-slate-500">A user account will be created with email/password authentication. The user will be able to log in immediately.</p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => setOpenCreate(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleCreateUser} className="w-full sm:w-auto">Create User</Button>
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
            <div className="p-2 border rounded-lg text-xs" style={{ backgroundColor: "var(--admin-primary-10)", borderColor: "var(--admin-primary-20)", color: "var(--admin-primary)" }}>
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