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

export default function Users() {
  const db = getFirestore();
  const { toast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // modal state
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // editable values
  const [editValues, setEditValues] = useState({
    Name: "",
    Email: "",
    Country: "",
    PhotoURL: "",
    IsAdmin: false,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const snap = await getDocs(collection(db, "Users"));

      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setUsers(list);
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
      Email: user.Email || "",
      Country: user.Country || "",
      PhotoURL: user.PhotoURL || "",
      IsAdmin: user.IsAdmin || false,
    });
    setOpenEdit(true);
  };

  // update Firestore record
  const handleUpdateUser = async () => {
    try {
      const ref = doc(db, "Users", selectedUser.id);

      await updateDoc(ref, editValues);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, ...editValues } : u
        )
      );

      toast({
        title: "User updated",
        description: "User details saved successfully",
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
    try {
      await deleteDoc(doc(db, "Users", id));

      setUsers((prev) => prev.filter((u) => u.id !== id));

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Users</h1>

        <Button onClick={fetchUsers} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardHeader>
          <CardTitle style={{ fontSize: "16px" }}>All Users</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border rounded-lg">
              <thead className="bg-gray-100">
                <tr style={{ fontSize: "14px", background:"#0e172a", color:"#fff" }}>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Country</th>
                  <th className="p-3 text-left">Admin</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr
                    style={{ fontSize: "14px" , border:"1px solid rgb(207, 216, 221)"}}
                    key={user.id}
                    className="border-b"
                  >
                    <td className="p-3">{user.Name || "-"}</td>
                    <td className="p-3">{user.Email}</td>
                    <td className="p-3">{user.Country || "-"}</td>
                    <td className="p-3">
                      {user.IsAdmin ? "Administrator" : "User"}
                    </td>

                    <td className="p-3 text-right space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => handleOpenEdit(user)}
                      >
                        Edit
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && !loading && (
              <p className="text-center text-gray-500 mt-4">No users found.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* EDIT USER MODAL */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={editValues.Name}
                onChange={(e) =>
                  setEditValues({ ...editValues, Name: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                value={editValues.Email}
                onChange={(e) =>
                  setEditValues({ ...editValues, Email: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Country</Label>
              <Input
                value={editValues.Country}
                onChange={(e) =>
                  setEditValues({ ...editValues, Country: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Photo URL</Label>
              <Input
                value={editValues.PhotoURL}
                onChange={(e) =>
                  setEditValues({ ...editValues, PhotoURL: e.target.value })
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editValues.IsAdmin}
                onChange={(e) =>
                  setEditValues({
                    ...editValues,
                    IsAdmin: e.target.checked,
                  })
                }
              />
              <Label>Administrator</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpenEdit(false)}>
              Cancel
            </Button>

            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
