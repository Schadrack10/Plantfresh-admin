import { useState, useEffect } from "react";
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

type UserCategory = "all" | "admins" | "affiliates" | "users";

export default function Users() {
  const db = getFirestore();
  const { toast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<UserCategory>("all");

  // modal state
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // editable values
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
  });

  useEffect(() => {
    const UsersList = JSON.parse(localStorage.getItem("UsersList") || "[]");
    setUsers(UsersList);
  }, []);

  // Filter users by category
  const getFilteredUsers = () => {
    switch (activeCategory) {
      case "admins":
        return users.filter((user) => user.IsAdmin);
      case "affiliates":
        return users.filter((user) => user.IsAffiliate);
      case "users":
        return users.filter((user) => !user.IsAdmin && !user.IsAffiliate);
      default:
        return users;
    }
  };

  const filteredUsers = getFilteredUsers();

  // Get counts for each category
  const getCategoryCounts = () => {
    return {
      all: users.length,
      admins: users.filter((u) => u.IsAdmin).length,
      affiliates: users.filter((u) => u.IsAffiliate).length,
      users: users.filter((u) => !u.IsAdmin && !u.IsAffiliate).length,
    };
  };

  const counts = getCategoryCounts();

  // Generate a unique Affiliate ID
  const generateAffiliateId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let id = "AFF-";
    for (let i = 0; i < 8; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const snap = await getDocs(collection(db, "Users"));

      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      localStorage.setItem("UsersList", JSON.stringify(list));
      setUsers(list);

      toast({
        title: "Users refreshed",
        description: `Loaded ${list.length} users successfully`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error loading users",
        description: "Failed to fetch users from Firestore",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // open modal + load values
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
    });
    setOpenEdit(true);
  };

  // update Firestore record
  const handleUpdateUser = async () => {
    try {
      const ref = doc(db, "Users", selectedUser.id);

      // Prepare update data
      const updateData: any = { ...editValues };

      // If user is being made an affiliate and doesn't have an AffiliateId, generate one
      if (editValues.IsAffiliate && !selectedUser.AffiliateId) {
        updateData.AffiliateId = generateAffiliateId();
      }

      // If user is no longer an affiliate, remove the AffiliateId
      if (!editValues.IsAffiliate && selectedUser.AffiliateId) {
        updateData.AffiliateId = null;
      }

      await updateDoc(ref, updateData);

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, ...updateData } : u
        )
      );

      // Update localStorage
      const updatedList = users.map((u) =>
        u.id === selectedUser.id ? { ...u, ...updateData } : u
      );
      localStorage.setItem("UsersList", JSON.stringify(updatedList));

      toast({
        title: "User updated",
        description: editValues.IsAffiliate && !selectedUser.AffiliateId
          ? "User updated and Affiliate ID generated"
          : "User details saved successfully",
      });

      setOpenEdit(false);
    } catch (err) {
      console.error(err);
      toast({
        title: "Update failed",
        description: "Could not update user",
        variant: "destructive",
      });
    }
  };

  // delete user
  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "Users", id));

      setUsers((prev) => prev.filter((u) => u.id !== id));

      // Update localStorage
      const updatedList = users.filter((u) => u.id !== id);
      localStorage.setItem("UsersList", JSON.stringify(updatedList));

      toast({
        title: "User deleted",
        description: "User removed successfully",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Delete failed",
        description: "Could not delete user",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Users</h1>

        <Button onClick={fetchUsers} disabled={loading} className="w-full sm:w-auto">
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Category Filter Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-2 border-b pb-2 min-w-max md:min-w-0">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 md:px-4 py-2 rounded-t-lg font-medium transition-colors text-sm md:text-base whitespace-nowrap ${
              activeCategory === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All Users ({counts.all})
          </button>

          <button
            onClick={() => setActiveCategory("admins")}
            className={`px-3 md:px-4 py-2 rounded-t-lg font-medium transition-colors text-sm md:text-base whitespace-nowrap ${
              activeCategory === "admins"
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Admins ({counts.admins})
          </button>

          <button
            onClick={() => setActiveCategory("affiliates")}
            className={`px-3 md:px-4 py-2 rounded-t-lg font-medium transition-colors text-sm md:text-base whitespace-nowrap ${
              activeCategory === "affiliates"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Affiliates ({counts.affiliates})
          </button>

          <button
            onClick={() => setActiveCategory("users")}
            className={`px-3 md:px-4 py-2 rounded-t-lg font-medium transition-colors text-sm md:text-base whitespace-nowrap ${
              activeCategory === "users"
                ? "bg-gray-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Regular Users ({counts.users})
          </button>
        </div>
      </div>

      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardHeader>
          <CardTitle style={{ fontSize: "16px" }}>
            {activeCategory === "all" && `All Users (${filteredUsers.length})`}
            {activeCategory === "admins" && `Administrators (${filteredUsers.length})`}
            {activeCategory === "affiliates" && `Affiliates (${filteredUsers.length})`}
            {activeCategory === "users" && `Regular Users (${filteredUsers.length})`}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full border rounded-lg">
                <thead className="bg-gray-100">
                  <tr style={{ fontSize: "13px", background: "#0e172a", color: "#fff" }} className="md:text-sm">
                    <th className="p-2 md:p-3 text-left whitespace-nowrap">Name</th>
                    <th className="p-2 md:p-3 text-left whitespace-nowrap">User ID</th>
                    <th className="p-2 md:p-3 text-left whitespace-nowrap hidden lg:table-cell">Country</th>
                    <th className="p-2 md:p-3 text-left whitespace-nowrap hidden xl:table-cell">Phone</th>
                    <th className="p-2 md:p-3 text-left whitespace-nowrap">Status</th>
                    <th className="p-2 md:p-3 text-left whitespace-nowrap hidden md:table-cell">Affiliate ID</th>
                    <th className="p-2 md:p-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      style={{ fontSize: "13px", border: "1px solid rgb(207, 216, 221)" }}
                      key={user.id}
                      className="border-b md:text-sm"
                    >
                      <td className="p-2 md:p-3">
                        <div className="max-w-[150px] md:max-w-none truncate">
                          {user.Name || "-"}
                        </div>
                      </td>
                      <td className="p-2 md:p-3">
                        <div className="max-w-[180px] md:max-w-none truncate">
                          {user.UserID || "-"}
                        </div>
                      </td>
                      <td className="p-2 md:p-3 hidden lg:table-cell">{user.Country || "-"}</td>
                      <td className="p-2 md:p-3 hidden xl:table-cell">{user.Phone || "-"}</td>
                      <td className="p-2 md:p-3">
                        <div className="flex flex-col gap-1">
                          {user.IsAdmin && (
                            <span className="inline-block px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs rounded bg-purple-100 text-purple-800 whitespace-nowrap">
                              Admin
                            </span>
                          )}
                          {user.IsAffiliate && (
                            <span className="inline-block px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs rounded bg-green-100 text-green-800 whitespace-nowrap">
                              Affiliate
                            </span>
                          )}
                          {!user.IsAdmin && !user.IsAffiliate && (
                            <span className="inline-block px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs rounded bg-gray-100 text-gray-800 whitespace-nowrap">
                              User
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 md:p-3 font-mono text-[10px] md:text-xs hidden md:table-cell">
                        {user.AffiliateId || "-"}
                      </td>

                      <td className="p-2 md:p-3 text-right">
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(user)}
                            className="text-xs md:text-sm"
                          >
                            Edit
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-xs md:text-sm"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && !loading && (
              <p className="text-center text-gray-500 mt-4 text-sm md:text-base px-4">
                {activeCategory === "all"
                  ? "No users found. Click 'Refresh' to load users from Firestore."
                  : `No ${activeCategory} found.`}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* EDIT USER MODAL */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Edit User</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 md:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <Label className="text-sm md:text-base">Name</Label>
                <Input
                  value={editValues.Name}
                  onChange={(e) =>
                    setEditValues({ ...editValues, Name: e.target.value })
                  }
                  className="text-sm md:text-base"
                />
              </div>

              <div>
                <Label className="text-sm md:text-base">User ID (Email)</Label>
                <Input
                  value={editValues.UserID}
                  onChange={(e) =>
                    setEditValues({ ...editValues, UserID: e.target.value })
                  }
                  className="text-sm md:text-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <Label className="text-sm md:text-base">Phone</Label>
                <Input
                  value={editValues.Phone}
                  onChange={(e) =>
                    setEditValues({ ...editValues, Phone: e.target.value })
                  }
                  className="text-sm md:text-base"
                />
              </div>

              <div>
                <Label className="text-sm md:text-base">Country</Label>
                <Input
                  value={editValues.Country}
                  onChange={(e) =>
                    setEditValues({ ...editValues, Country: e.target.value })
                  }
                  className="text-sm md:text-base"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm md:text-base">Address</Label>
              <Input
                value={editValues.Address}
                onChange={(e) =>
                  setEditValues({ ...editValues, Address: e.target.value })
                }
                className="text-sm md:text-base"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <Label className="text-sm md:text-base">City</Label>
                <Input
                  value={editValues.City}
                  onChange={(e) =>
                    setEditValues({ ...editValues, City: e.target.value })
                  }
                  className="text-sm md:text-base"
                />
              </div>

              <div>
                <Label className="text-sm md:text-base">Postal Code</Label>
                <Input
                  value={editValues.PostalCode}
                  onChange={(e) =>
                    setEditValues({ ...editValues, PostalCode: e.target.value })
                  }
                  className="text-sm md:text-base"
                />
              </div>
            </div>

            <div className="border-t pt-3 md:pt-4 space-y-2 md:space-y-3">
              <Label className="text-sm md:text-base font-semibold">Permissions</Label>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAdmin"
                  checked={editValues.IsAdmin}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      IsAdmin: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="isAdmin" className="cursor-pointer text-sm md:text-base">
                  Administrator
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAffiliate"
                  checked={editValues.IsAffiliate}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      IsAffiliate: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="isAffiliate" className="cursor-pointer text-sm md:text-base">
                  Affiliate
                </Label>
              </div>

              {editValues.IsAffiliate && (
                <div className="mt-2 p-2 md:p-3 bg-green-50 rounded border border-green-200">
                  <p className="text-xs md:text-sm text-green-800">
                    {selectedUser?.AffiliateId ? (
                      <>
                        <strong>Current Affiliate ID:</strong>{" "}
                        <span className="font-mono break-all">{selectedUser.AffiliateId}</span>
                      </>
                    ) : (
                      "An Affiliate ID will be automatically generated when you save."
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              variant="secondary" 
              onClick={() => setOpenEdit(false)}
              className="w-full sm:w-auto text-sm md:text-base"
            >
              Cancel
            </Button>

            <Button 
              onClick={handleUpdateUser}
              className="w-full sm:w-auto text-sm md:text-base"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}