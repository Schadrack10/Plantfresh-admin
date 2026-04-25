import React, { useState, useContext, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import AppContext from "../context/AppContext";
import { Eye, EyeOff, User, Lock, AlertCircle } from "lucide-react";
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";

type AppContextType = {
  db: any;
  globalState: {
    AuthenticatedUser?: any;
    [key: string]: unknown;
  };
  setGlobalState: (state: any) => void;
};

export default function Profile() {
  const { globalState, setGlobalState } = useContext(AppContext as React.Context<AppContextType>);
  const { toast } = useToast();

  const currentUser = globalState?.AuthenticatedUser;
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async () => {
    if (!passwordForm.newPassword.trim()) {
      toast({ title: "New password required", variant: "destructive" });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        toast({ title: "Not authenticated", description: "Please log in again.", variant: "destructive" });
        return;
      }

      // If user signed in recently, we can update password directly
      // Otherwise, we need to reauthenticate
      try {
        await updatePassword(user, passwordForm.newPassword);
        toast({
          title: "Password updated",
          description: "Your password has been changed successfully.",
        });
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } catch (error: any) {
        // If we need to reauthenticate
        if (error.code === 'auth/requires-recent-login' && passwordForm.currentPassword) {
          try {
            const credential = EmailAuthProvider.credential(
              user.email!,
              passwordForm.currentPassword
            );
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, passwordForm.newPassword);
            toast({
              title: "Password updated",
              description: "Your password has been changed successfully.",
            });
            setShowPasswordModal(false);
            setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
          } catch (reauthError: any) {
            toast({
              title: "Authentication failed",
              description: reauthError.code === 'auth/wrong-password'
                ? "Current password is incorrect."
                : "Failed to verify your identity. Please try again.",
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "Update failed",
            description: error.code === 'auth/weak-password'
              ? "Password is too weak. Please choose a stronger password."
              : "Failed to update password. Please try again.",
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Profile Settings</h1>
        <p className="text-slate-600 mt-1">
          Manage your account settings and security
        </p>
      </div>

      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="font-semibold">Email</Label>
              <p className="text-slate-800 mt-1">{currentUser?.email || "Not available"}</p>
            </div>
            <div>
              <Label className="font-semibold">Role</Label>
              <p className="text-slate-800 mt-1 capitalize">
                {currentUser?.role || currentUser?.Role || "User"}
              </p>
            </div>
            <div>
              <Label className="font-semibold">User ID</Label>
              <p className="font-mono text-sm text-slate-600 mt-1">
                {currentUser?.uid || currentUser?.userId || "Not available"}
              </p>
            </div>
            <div>
              <Label className="font-semibold">Tenant</Label>
              <p className="text-slate-800 mt-1">
                {globalState?.activeTenant?.Name || "Not selected"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-semibold text-slate-800">Password</h3>
              <p className="text-sm text-slate-600">Change your account password</p>
            </div>
            <Button
              onClick={() => setShowPasswordModal(true)}
              variant="outline"
              className="gap-2"
            >
              <Lock className="w-4 h-4" />
              Change Password
            </Button>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-800">Password Requirements</h4>
                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                  <li>• Minimum 8 characters long</li>
                  <li>• Should contain a mix of letters, numbers, and symbols</li>
                  <li>• Avoid using common words or personal information</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Change Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Enter your current password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Required only if you haven't logged in recently
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter your new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm your new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowPasswordModal(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordChange}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}