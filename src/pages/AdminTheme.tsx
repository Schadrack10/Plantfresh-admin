import { useState, useEffect, useContext } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import AppContext from "../context/AppContext";
import { Loader2, Palette, Shield } from "lucide-react";

const DEFAULT_ADMIN_THEME = {
  primaryColor:   "#4f46e5",
  secondaryColor: "#7c3aed",
  navbarBg:       "#1e1b4b",
  platformName:   "Sitecore Admin",
  logoText:       "Sitecore Admin",
};

const ColorRow = ({ label, value, onChange }: any) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-slate-500">{label}</Label>
    <div className="flex gap-2">
      <input type="color" value={value || "#000000"} onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0" />
      <Input value={value || ""} onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-gray-50 font-mono text-sm" />
    </div>
  </div>
);

export default function AdminTheme() {
  const { db, globalState, setGlobalState } = useContext(AppContext);
  const { toast } = useToast();

  const currentUser  = (globalState as any)?.AuthenticatedUser;
  const isSuperAdmin =
    currentUser?.role === "SuperAdmin" ||
    currentUser?.isSuperAdmin === true  ||
    currentUser?.IsSuperAdmin === true;

  const [theme, setTheme]   = useState(DEFAULT_ADMIN_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!db) return;
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "StoreConfigs", "StoreConfig001"));
        if (snap.exists()) {
          const saved = snap.data()?.AdminTheme;
          const generalName =
            snap.data()?.GeneralSettings?.platformName ||
            snap.data()?.GeneralSettings?.storeName    ||
            "Sitecore Admin";
          if (saved) {
            setTheme({ ...DEFAULT_ADMIN_THEME, ...saved, platformName: saved.platformName || generalName });
          } else {
            setTheme({ ...DEFAULT_ADMIN_THEME, platformName: generalName });
          }
        }
      } catch (err) {
        console.error("AdminTheme load error:", err);
        toast({ title: "Could not load admin theme", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [db]);

  const handleSave = async () => {
    if (!db) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "StoreConfigs", "StoreConfig001"), {
        AdminTheme: theme,
        GeneralSettings: { platformName: theme.platformName },
        UpdatedAt: new Date(),
      }, { merge: true });

      setGlobalState((prev: any) => ({
        ...prev,
        platformName: theme.platformName,
      }));

      toast({ title: "Admin theme saved", description: "Sidebar will update immediately." });
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center space-y-3">
          <Shield className="w-10 h-10 text-red-400 mx-auto" />
          <p className="font-semibold text-slate-700">SuperAdmin access only</p>
          <p className="text-sm text-slate-500">You don't have permission to edit admin platform settings.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Live preview colours
  const previewBg        = theme.navbarBg       || DEFAULT_ADMIN_THEME.navbarBg;
  const previewPrimary   = theme.primaryColor   || DEFAULT_ADMIN_THEME.primaryColor;
  const previewSecondary = theme.secondaryColor || DEFAULT_ADMIN_THEME.secondaryColor;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Admin Platform Theme</h1>
        <p className="text-sm text-slate-500 mt-1">
          Customise the admin site's own branding — sidebar, header, and platform name.
          This is completely separate from any tenant's storefront theme.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Settings ──────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Platform name */}
          <Card style={{ backgroundColor: "#f0f4f8" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="w-5 h-5 text-indigo-500" />
                Platform Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Platform Name</Label>
                <Input
                  value={theme.platformName}
                  onChange={(e) => setTheme({ ...theme, platformName: e.target.value })}
                  placeholder="Sitecore Admin"
                  className="bg-white"
                />
                <p className="text-xs text-slate-400">
                  Shown in the sidebar header and browser tab.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Logo Text</Label>
                <Input
                  value={theme.logoText}
                  onChange={(e) => setTheme({ ...theme, logoText: e.target.value })}
                  placeholder="Sitecore Admin"
                  className="bg-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card style={{ backgroundColor: "#f0f4f8" }}>
            <CardHeader>
              <CardTitle className="text-base">Sidebar & Accent Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ColorRow
                label="Sidebar Background"
                value={theme.navbarBg}
                onChange={(v: string) => setTheme({ ...theme, navbarBg: v })}
              />
              <ColorRow
                label="Primary / Accent Color"
                value={theme.primaryColor}
                onChange={(v: string) => setTheme({ ...theme, primaryColor: v })}
              />
              <ColorRow
                label="Secondary / Hover Color"
                value={theme.secondaryColor}
                onChange={(v: string) => setTheme({ ...theme, secondaryColor: v })}
              />

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                <span className="font-semibold">📍 Stored at:</span>{" "}
                <span className="font-mono">StoreConfigs/StoreConfig001/AdminTheme</span>
                <br />
                <span className="text-blue-500 mt-1 block">
                  Tenant site themes are stored separately in{" "}
                  <span className="font-mono">Sites/{"{"}{"}tenantId{"}</span> and never affect this panel.
                </span>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 h-11"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              : "Save Admin Theme"}
          </Button>
        </div>

        {/* ── Live Preview ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-600">Live Preview</p>

          {/* Sidebar preview */}
          <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-200">
            <div
              className="flex flex-col"
              style={{ backgroundColor: previewBg, minHeight: "420px" }}
            >
              {/* Brand header */}
              <div className="px-5 py-4 flex items-center gap-3 border-b border-white/15">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: previewSecondary }}>
                  <span className="text-white text-sm font-bold">
                    {(theme.logoText || "S")[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-sm text-white leading-tight">{theme.platformName || "Sitecore Admin"}</p>
                  <p className="text-[11px] text-white/50">Admin Panel</p>
                </div>
              </div>

              {/* Mock nav items */}
              <div className="px-3 py-3 space-y-1">
                <p className="px-2 text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-2">Manage</p>
                {["Dashboard", "Tenants", "Users", "Products", "Blog Posts"].map((item, i) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm"
                    style={{
                      backgroundColor: i === 0
                        ? `${previewSecondary}cc`
                        : "transparent",
                      color: "rgba(255,255,255,0.85)",
                    }}
                  >
                    <div className="w-4 h-4 rounded bg-white/20 flex-shrink-0" />
                    <span>{item}</span>
                    {i === 0 && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                ))}
              </div>

              {/* Mock user card */}
              <div className="mt-auto mx-3 mb-3 px-3 py-2.5 rounded-xl flex items-center gap-3"
                style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: previewSecondary }}>S</div>
                <div>
                  <p className="text-xs font-semibold text-white">superadmin@example.com</p>
                  <p className="text-[10px] text-white/50">SuperAdmin</p>
                </div>
              </div>
            </div>
          </div>

          {/* Header preview */}
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <div className="relative h-12 bg-white flex items-center justify-between px-4">
              <div className="w-6 h-4 bg-slate-200 rounded" />
              <div
                className="absolute left-0 bottom-0 h-0.5 w-full"
                style={{ background: `linear-gradient(to right, ${previewPrimary}, ${previewSecondary})` }}
              />
              <span className="text-sm font-semibold" style={{ color: previewPrimary }}>
                {theme.platformName || "Sitecore Admin"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}