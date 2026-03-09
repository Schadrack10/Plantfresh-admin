import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { useToast } from "@/hooks/use-toast";

type UserCategory = "all" | "admins" | "affiliates" | "users" | "banned";

const CACHE_KEY = "UsersList";
const CACHE_TS_KEY = "UsersListFetchedAt";
const CACHE_TTL_MS = 5 * 60 * 1000;

const formatDate = (val: any): string => {
  if (!val) return "-";
  if (val?.toDate) return val.toDate().toLocaleString();
  if (val?.seconds) return new Date(val.seconds * 1000).toLocaleString();
  if (typeof val === "string" || typeof val === "number")
    return new Date(val).toLocaleString();
  return "-";
};

export default function Users() {
  const db = getFirestore();
  const { toast } = useToast();
  const hasFetched = useRef(false);

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<UserCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit modal
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Ban modal
  const [openBan, setOpenBan] = useState(false);
  const [banTarget, setBanTarget] = useState<any>(null);
  const [banReason, setBanReason] = useState("");
  const [banLoading, setBanLoading] = useState(false);

  const [editValues, setEditValues] = useState({
    Name: "",
    UserID: "",
    Country: "",
    Phone: "",
    Address: "",
    City: "",
    PostalCode: "",
    IsAdmin: false,
    IsAffiliate: false,
    CreatedAt: null as any,
  });

  // ── on mount ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try { setUsers(JSON.parse(cached)); } catch {}
    }

    const fetchedAt = localStorage.getItem(CACHE_TS_KEY);
    const isStale = !fetchedAt || Date.now() - parseInt(fetchedAt, 10) > CACHE_TTL_MS;
    if (!cached || isStale) fetchUsers({ silent: !!cached });
  }, []);

  // ── fetch ───────────────────────────────────────────────────────────────────
  const fetchUsers = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);
    try {
      const snap = await getDocs(collection(db, "Users"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      localStorage.setItem(CACHE_KEY, JSON.stringify(list));
      localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      setUsers(list);
      if (!silent) toast({ title: "Users refreshed", description: `Loaded ${list.length} users` });
    } catch (err) {
      console.error(err);
      if (!silent) toast({ title: "Error loading users", variant: "destructive" });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // ── sort alphabetically by Name ──────────────────────────────────────────
  const sortedUsers = useMemo(() =>
    [...users].sort((a, b) =>
      (a.Name || "").toLowerCase().localeCompare((b.Name || "").toLowerCase())
    ), [users]);

  // ── filter by category ───────────────────────────────────────────────────
  const categoryFiltered = useMemo(() => {
    switch (activeCategory) {
      case "admins":     return sortedUsers.filter((u) => u.IsAdmin);
      case "affiliates": return sortedUsers.filter((u) => u.IsAffiliate);
      case "banned":     return sortedUsers.filter((u) => u.IsBanned);
      case "users":      return sortedUsers.filter((u) => !u.IsAdmin && !u.IsAffiliate);
      default:           return sortedUsers;
    }
  }, [sortedUsers, activeCategory]);

  // ── search across all fields ─────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categoryFiltered;
    return categoryFiltered.filter((u) =>
      [u.Name, u.UserID, u.Phone, u.Country, u.City, u.Address, u.AffiliateId]
        .some((field) => field && String(field).toLowerCase().includes(q))
    );
  }, [categoryFiltered, searchQuery]);

  const counts = {
    all:        sortedUsers.length,
    admins:     sortedUsers.filter((u) => u.IsAdmin).length,
    affiliates: sortedUsers.filter((u) => u.IsAffiliate).length,
    users:      sortedUsers.filter((u) => !u.IsAdmin && !u.IsAffiliate).length,
    banned:     sortedUsers.filter((u) => u.IsBanned).length,
  };

  // ── affiliate ID ─────────────────────────────────────────────────────────
  const generateAffiliateId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let id = "AFF-";
    for (let i = 0; i < 8; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
    return id;
  };

  // ── ban / unban ──────────────────────────────────────────────────────────
  const handleOpenBan = (user: any) => {
    setBanTarget(user);
    setBanReason("");
    setOpenBan(true);
  };

  const handleBanUser = async () => {
    if (!banReason.trim()) {
      toast({ title: "Reason required", description: "Please enter a reason for banning this user.", variant: "destructive" });
      return;
    }
    setBanLoading(true);
    try {
      const ref = doc(db, "Users", banTarget.id);
      const updateData = {
        IsBanned: true,
        BanReason: banReason.trim(),
        BannedAt: new Date().toISOString(),
      };
      await updateDoc(ref, updateData);

      const updatedList = users.map((u) =>
        u.id === banTarget.id ? { ...u, ...updateData } : u
      );
      setUsers(updatedList);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updatedList));

      toast({ title: "User banned", description: `${banTarget.Name || banTarget.UserID} has been banned.` });
      setOpenBan(false);
    } catch (err) {
      console.error(err);
      toast({ title: "Ban failed", description: "Could not ban user.", variant: "destructive" });
    } finally {
      setBanLoading(false);
    }
  };

  const handleUnbanUser = async (user: any) => {
    if (!confirm(`Unban ${user.Name || user.UserID}?`)) return;
    try {
      const ref = doc(db, "Users", user.id);
      const updateData = { IsBanned: false, BanReason: null, BannedAt: null };
      await updateDoc(ref, updateData);

      const updatedList = users.map((u) =>
        u.id === user.id ? { ...u, ...updateData } : u
      );
      setUsers(updatedList);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updatedList));

      toast({ title: "User unbanned", description: `${user.Name || user.UserID} has been unbanned.` });
    } catch (err) {
      console.error(err);
      toast({ title: "Unban failed", variant: "destructive" });
    }
  };

  // ── edit ─────────────────────────────────────────────────────────────────
  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setEditValues({
      Name: user.Name || "",
      UserID: user.UserID || "",
      Country: user.Country || "",
      Phone: user.Phone || "",
      Address: user.Address || "",
      City: user.City || "",
      PostalCode: user.PostalCode || "",
      IsAdmin: user.IsAdmin || false,
      IsAffiliate: user.IsAffiliate || false,
      CreatedAt: user.CreatedAt ?? null,
    });
    setOpenEdit(true);
  };

  const handleUpdateUser = async () => {
    try {
      const ref = doc(db, "Users", selectedUser.id);
      const { CreatedAt: _omit, ...writableValues } = editValues;
      const updateData: any = { ...writableValues };

      if (editValues.IsAffiliate && !selectedUser.AffiliateId)
        updateData.AffiliateId = generateAffiliateId();
      if (!editValues.IsAffiliate && selectedUser.AffiliateId)
        updateData.AffiliateId = null;

      await updateDoc(ref, updateData);

      const updatedList = users.map((u) =>
        u.id === selectedUser.id ? { ...u, ...updateData } : u
      );
      setUsers(updatedList);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updatedList));

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

  // ── delete ───────────────────────────────────────────────────────────────
  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteDoc(doc(db, "Users", id));
      const updatedList = users.filter((u) => u.id !== id);
      setUsers(updatedList);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updatedList));
      toast({ title: "User deleted" });
    } catch (err) {
      console.error(err);
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Users</h1>
        <Button onClick={() => fetchUsers({ silent: false })} disabled={loading} className="w-full sm:w-auto">
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-2 border-b pb-2 min-w-max md:min-w-0">
          {(
            [
              { key: "all",        label: "All Users",     color: "bg-blue-600"   },
              { key: "admins",     label: "Admins",        color: "bg-purple-600" },
              { key: "affiliates", label: "Affiliates",    color: "bg-green-600"  },
              { key: "users",      label: "Regular Users", color: "bg-gray-600"   },
              { key: "banned",     label: "Banned",        color: "bg-red-600"    },
            ] as const
          ).map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => { setActiveCategory(key); setSearchQuery(""); }}
              className={`px-3 md:px-4 py-2 rounded-t-lg font-medium transition-colors text-sm md:text-base whitespace-nowrap ${
                activeCategory === key
                  ? `${color} text-white`
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
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
            {searchQuery ? (
              `Search results for "${searchQuery}" (${filteredUsers.length})`
            ) : (
              <>
                {activeCategory === "all"        && `All Users (${filteredUsers.length})`}
                {activeCategory === "admins"     && `Administrators (${filteredUsers.length})`}
                {activeCategory === "affiliates" && `Affiliates (${filteredUsers.length})`}
                {activeCategory === "users"      && `Regular Users (${filteredUsers.length})`}
                {activeCategory === "banned"     && `Banned Users (${filteredUsers.length})`}
              </>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading && users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
              <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm">Loading users...</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="w-full border rounded-lg">
                  <thead>
                    <tr style={{ fontSize: "13px", background: "#0e172a", color: "#fff" }}>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap">Name ↑</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap">User ID</th>
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
                      <tr
                        key={user.id}
                        style={{
                          fontSize: "13px",
                          border: "1px solid rgb(207, 216, 221)",
                          backgroundColor: user.IsBanned ? "#fff5f5" : undefined,
                        }}
                        className="border-b"
                      >
                        <td className="p-2 md:p-3">
                          <div className="max-w-[150px] md:max-w-none truncate font-medium">
                            {user.Name || "-"}
                          </div>
                        </td>
                        <td className="p-2 md:p-3">
                          <div className="max-w-[180px] md:max-w-none truncate">{user.UserID || "-"}</div>
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
                            {user.IsAdmin && (
                              <span className="inline-block px-1.5 py-0.5 text-[10px] md:text-xs rounded bg-purple-100 text-purple-800 whitespace-nowrap">
                                Admin
                              </span>
                            )}
                            {user.IsAffiliate && (
                              <span className="inline-block px-1.5 py-0.5 text-[10px] md:text-xs rounded bg-green-100 text-green-800 whitespace-nowrap">
                                Affiliate
                              </span>
                            )}
                            {!user.IsAdmin && !user.IsAffiliate && !user.IsBanned && (
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
                            <Button variant="outline" size="sm" onClick={() => handleOpenEdit(user)} className="text-xs">
                              Edit
                            </Button>
                            {user.IsBanned ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnbanUser(user)}
                                className="text-xs border-green-500 text-green-700 hover:bg-green-50"
                              >
                                Unban
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenBan(user)}
                                className="text-xs border-orange-400 text-orange-700 hover:bg-orange-50"
                              >
                                Ban
                              </Button>
                            )}
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)} className="text-xs">
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredUsers.length === 0 && !loading && (
                  <p className="text-center text-gray-500 mt-4 text-sm px-4">
                    {searchQuery
                      ? `No users found matching "${searchQuery}".`
                      : activeCategory === "all"
                        ? "No users found."
                        : `No ${activeCategory} found.`}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── BAN MODAL ─────────────────────────────────────────────────────── */}
      <Dialog open={openBan} onOpenChange={setOpenBan}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-red-700">🚫 Ban User</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                You are about to ban <strong>{banTarget?.Name || banTarget?.UserID}</strong>.
                They will be immediately blocked from logging in and shown a ban notice with your reason.
              </p>
            </div>

            <div>
              <Label className="text-sm font-semibold">
                Reason for ban <span className="text-red-500">*</span>
              </Label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="e.g. Violation of terms of service, fraudulent activity..."
                rows={3}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                This reason will be shown to the user when they attempt to log in.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => setOpenBan(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleBanUser}
              disabled={banLoading}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            >
              {banLoading ? "Banning..." : "Confirm Ban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT MODAL ────────────────────────────────────────────────────── */}
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

            {selectedUser?.IsBanned && (
              <div className="p-2 md:p-3 bg-red-50 rounded border border-red-200 text-xs md:text-sm text-red-700">
                <span className="font-semibold">🚫 Banned</span>
                {selectedUser.BanReason && <> — {selectedUser.BanReason}</>}
                {selectedUser.BannedAt && (
                  <span className="block text-red-500 mt-0.5">Banned on {formatDate(selectedUser.BannedAt)}</span>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <Label>Name</Label>
                <Input value={editValues.Name} onChange={(e) => setEditValues({ ...editValues, Name: e.target.value })} />
              </div>
              <div>
                <Label>User ID (Email)</Label>
                <Input value={editValues.UserID} onChange={(e) => setEditValues({ ...editValues, UserID: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <Label>Phone</Label>
                <Input value={editValues.Phone} onChange={(e) => setEditValues({ ...editValues, Phone: e.target.value })} />
              </div>
              <div>
                <Label>Country</Label>
                <Input value={editValues.Country} onChange={(e) => setEditValues({ ...editValues, Country: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Address</Label>
              <Input value={editValues.Address} onChange={(e) => setEditValues({ ...editValues, Address: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <Label>City</Label>
                <Input value={editValues.City} onChange={(e) => setEditValues({ ...editValues, City: e.target.value })} />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input value={editValues.PostalCode} onChange={(e) => setEditValues({ ...editValues, PostalCode: e.target.value })} />
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <Label className="font-semibold">Permissions</Label>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isAdmin" checked={editValues.IsAdmin} onChange={(e) => setEditValues({ ...editValues, IsAdmin: e.target.checked })} className="h-4 w-4" />
                <Label htmlFor="isAdmin" className="cursor-pointer">Administrator</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isAffiliate" checked={editValues.IsAffiliate} onChange={(e) => setEditValues({ ...editValues, IsAffiliate: e.target.checked })} className="h-4 w-4" />
                <Label htmlFor="isAffiliate" className="cursor-pointer">Affiliate</Label>
              </div>
              {editValues.IsAffiliate && (
                <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                  <p className="text-xs text-green-800">
                    {selectedUser?.AffiliateId
                      ? <><strong>Current Affiliate ID:</strong> <span className="font-mono">{selectedUser.AffiliateId}</span></>
                      : "An Affiliate ID will be automatically generated when you save."}
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