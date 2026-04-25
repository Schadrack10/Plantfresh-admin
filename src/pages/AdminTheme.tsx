import { useState, useEffect, useContext } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import AppContext from "../context/AppContext";
import {
  Loader2, Palette, Shield, Eye, Type, Sliders,
  LayoutDashboard, Monitor,
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_ADMIN_THEME = {
  primaryColor:     "#4f46e5",
  secondaryColor:   "#7c3aed",
  accentColor:      "#22c55e",
  buttonColor:      "#4f46e5",
  buttonTextColor:  "#ffffff",
  buttonHoverColor: "#4338ca",
  navbarBg:         "#1e1b4b",
  platformName:     "Sitecore Admin",
  logoText:         "Sitecore Admin",
};

// ─── Admin Login default lives here — under StoreConfigs/StoreConfig001 ────────
// Firestore path: StoreConfigs/StoreConfig001 → AuthCustomization → adminLogin
const DEFAULT_ADMIN_LOGIN_CONFIG = {
  layout:     "center",
  transition: "zoom",
  images:     ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200"],
  background: { type: "image", imageUrl: "", gradient: "linear-gradient(135deg,#1e293b,#0f172a)" },
  branding:   { logoUrl: "", logoText: "Admin", showLogo: true },
  text: {
    title: "Admin Login", subtitle: "Access the admin panel",
    titleColor: "#111827", subtitleColor: "#6b7280",
    titleSize: "text-2xl", titleWeight: "font-bold",
  },
  button: {
    loginText: "Sign In", registerText: "",
    color: "#4f46e5", colorTo: "", gradient: false,
    textColor: "#ffffff", radius: "rounded-xl", shadow: "shadow-lg",
  },
  options: { showGoogle: true, showForgotPassword: true },
  style: {
    overlayOpacity: 50, imageBlur: 0, cardBlur: 8,
    cardBg: "#ffffff", cardBgOpacity: 95,
    cardBorder: "transparent", cardRadius: "rounded-2xl",
    inputBorderColor: "#e5e7eb", inputRadius: "rounded-xl", leftPanelGlass: false,
  },
};

const LOGIN_TRANSITIONS  = [{ value: "fade", label: "Fade" }, { value: "slide", label: "Slide" }, { value: "slideUp", label: "Slide Up" }, { value: "zoom", label: "Zoom" }];
const LOGIN_LAYOUTS      = [{ value: "center", label: "Center" }, { value: "split", label: "Split" }];
const RADIUS_OPTIONS     = [{ value: "rounded-none", label: "Square" }, { value: "rounded-lg", label: "Rounded" }, { value: "rounded-xl", label: "Large" }, { value: "rounded-2xl", label: "XL" }, { value: "rounded-full", label: "Pill" }];
const SHADOW_OPTIONS     = [{ value: "shadow-none", label: "None" }, { value: "shadow-sm", label: "Small" }, { value: "shadow-md", label: "Medium" }, { value: "shadow-lg", label: "Large" }, { value: "shadow-xl", label: "XL" }];
const FONT_SIZE_OPTIONS  = [{ value: "text-lg", label: "Small" }, { value: "text-xl", label: "Medium" }, { value: "text-2xl", label: "Large" }, { value: "text-3xl", label: "XL" }, { value: "text-4xl", label: "2XL" }];
const FONT_WEIGHT_OPTIONS = [{ value: "font-normal", label: "Normal" }, { value: "font-medium", label: "Medium" }, { value: "font-semibold", label: "Semibold" }, { value: "font-bold", label: "Bold" }, { value: "font-extrabold", label: "Extra Bold" }];

// ─── Helpers ────────────────────────────────────────────────────────────────
const hexToRgba = (hex: string, opacity: number) => {
  const r = parseInt((hex || "#ffffff").slice(1, 3), 16);
  const g = parseInt((hex || "#ffffff").slice(3, 5), 16);
  const b = parseInt((hex || "#ffffff").slice(5, 7), 16);
  return `rgba(${r},${g},${b},${(opacity ?? 100) / 100})`;
};

const buildBtnStyle = (button: any) => ({
  background: button?.gradient && button?.colorTo
    ? `linear-gradient(135deg, ${button.color}, ${button.colorTo})`
    : button?.color || "#4f46e5",
  color:  button?.textColor || "#ffffff",
  border: "none",
});

const buildCardStyle = (style: any) => ({
  backgroundColor: hexToRgba(style?.cardBg || "#ffffff", style?.cardBgOpacity ?? 100),
  borderColor:     style?.cardBorder && style.cardBorder !== "transparent" ? style.cardBorder : "transparent",
  borderWidth:     style?.cardBorder && style.cardBorder !== "transparent" ? "1px" : "0",
  borderStyle:     "solid" as const,
  backdropFilter:  style?.cardBlur ? `blur(${style.cardBlur}px)` : undefined,
});

// ─── Shared sub-components ──────────────────────────────────────────────────
const Toggle = ({ checked, onChange, label }: any) => (
  <div className="flex items-center justify-between py-2.5">
    <span className="text-sm text-gray-600">{label}</span>
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "" : "bg-gray-300"}`}
      style={checked ? { backgroundColor: "var(--admin-primary)" } : {}}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  </div>
);

const ColorRow = ({ label, value, onChange }: any) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-slate-500">{label}</Label>
    <div className="flex gap-2">
      <input
        type="color" value={value || "#000000"} onChange={e => onChange(e.target.value)}
        className="h-9 w-14 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0"
      />
      <Input value={value || ""} onChange={e => onChange(e.target.value)} className="flex-1 bg-gray-50 font-mono text-sm" />
    </div>
  </div>
);

const SliderRow = ({ label, value, min, max, onChange, unit = "" }: any) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <Label className="text-xs text-slate-500">{label}</Label>
      <span className="text-xs font-mono text-slate-600">{value}{unit}</span>
    </div>
    <input
      type="range" min={min} max={max} value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-500"
    />
  </div>
);

// ─── Admin Login Preview — accurately reflects saved config ──────────────────
const AdminLoginPreview = ({ config }: any) => {
  const getBgStyle = () => {
    if (config.background?.type === "image" && config.background?.imageUrl)
      return { backgroundImage: `url(${config.background.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" };
    return { background: config.background?.gradient || "linear-gradient(135deg,#1e293b,#0f172a)" };
  };

  const cardStyle   = buildCardStyle(config.style || {});
  const buttonStyle = buildBtnStyle(config.button || {});
  const isCenter    = config.layout === "center";

  const FormCard = () => (
    <div className={`w-full max-w-sm ${config.style?.cardRadius || "rounded-2xl"} p-5`} style={cardStyle}>
      {config.branding?.showLogo && (
        <div className="flex items-center gap-2.5 mb-4">
          {config.branding?.logoUrl
            ? <img src={config.branding.logoUrl} alt="" className="w-9 h-9 rounded-xl object-cover" />
            : <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: config.button?.color || "#4f46e5" }}>
                <span className="font-bold text-sm" style={{ color: config.button?.textColor || "#fff" }}>
                  {(config.branding?.logoText || "A")[0].toUpperCase()}
                </span>
              </div>
          }
          <p className="text-sm font-semibold" style={{ color: config.text?.titleColor || "#111827" }}>
            {config.branding?.logoText}
          </p>
        </div>
      )}
      <h3
        className={`${config.text?.titleSize || "text-2xl"} ${config.text?.titleWeight || "font-bold"} mb-1`}
        style={{ color: config.text?.titleColor || "#111827" }}
      >
        {config.text?.title}
      </h3>
      <p className="text-xs mb-4" style={{ color: config.text?.subtitleColor || "#6b7280" }}>
        {config.text?.subtitle}
      </p>
      <div className="space-y-2.5">
        {config.options?.showGoogle && (
          <div className="h-9 border border-gray-200 rounded-lg flex items-center justify-center gap-1.5 bg-white">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-3.5 h-3.5" />
            <span className="text-xs text-gray-600 font-medium">Continue with Google</span>
          </div>
        )}
        <div className={`h-9 ${config.style?.inputRadius || "rounded-xl"} bg-gray-50 border`} style={{ borderColor: config.style?.inputBorderColor || "#e5e7eb" }} />
        <div className={`h-9 ${config.style?.inputRadius || "rounded-xl"} bg-gray-50 border`} style={{ borderColor: config.style?.inputBorderColor || "#e5e7eb" }} />
        <div
          className={`h-9 ${config.button?.radius || "rounded-xl"} ${config.button?.shadow || "shadow-lg"} flex items-center justify-center text-sm font-semibold`}
          style={buttonStyle}
        >
          {config.button?.loginText || "Sign In"}
        </div>
        {config.options?.showForgotPassword && (
          <p className="text-xs text-center" style={{ color: config.button?.color || "#4f46e5" }}>Forgot password?</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-md">
      <div className="relative h-[360px]" style={getBgStyle()}>
        {config.style?.imageBlur > 0 && (
          <div className="absolute inset-0" style={{ backdropFilter: `blur(${config.style.imageBlur}px)` }} />
        )}
        <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${(config.style?.overlayOpacity ?? 50) / 100})` }} />

        {isCenter ? (
          <div className="relative z-10 h-full flex items-center justify-center p-5">
            <FormCard />
          </div>
        ) : (
          <div className="relative z-10 h-full flex">
            {/* Left panel */}
            <div className="w-1/2 flex items-center justify-center p-8">
              <div className="text-white text-center">
                {config.branding?.showLogo && (
                  <div className="flex items-center justify-center gap-2 mb-4">
                    {config.branding?.logoUrl
                      ? <img src={config.branding.logoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      : <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                          <span className="font-bold text-sm">{(config.branding?.logoText || "A")[0].toUpperCase()}</span>
                        </div>
                    }
                    <span className="font-bold">{config.branding?.logoText}</span>
                  </div>
                )}
                <h1 className={`${config.text?.titleSize || "text-2xl"} ${config.text?.titleWeight || "font-bold"} mb-2 leading-tight`}>
                  {config.text?.title}
                </h1>
                <p className="text-sm opacity-80">{config.text?.subtitle}</p>
              </div>
            </div>
            {/* Right card */}
            <div className="w-1/2 flex items-center justify-center p-6" style={buildCardStyle({ ...config.style, cardBgOpacity: 100 })}>
              <FormCard />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sidebar Preview — live rendering of the admin sidebar theme ─────────────
const SidebarPreview = ({ theme }: any) => {
  const previewBg        = theme.navbarBg      || DEFAULT_ADMIN_THEME.navbarBg;
  const previewSecondary = theme.secondaryColor || DEFAULT_ADMIN_THEME.secondaryColor;
  const previewPrimary   = theme.primaryColor   || DEFAULT_ADMIN_THEME.primaryColor;

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-md">
      <div className="flex" style={{ backgroundColor: previewBg, minHeight: "360px" }}>
        {/* Sidebar */}
        <div className="w-48 flex flex-col border-r border-white/10 flex-shrink-0">
          <div className="px-4 py-3.5 flex items-center gap-2.5 border-b border-white/10">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: previewSecondary }}>
              <span className="text-white text-xs font-bold">{(theme.logoText || "S")[0].toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs text-white leading-tight truncate">{theme.platformName || "Sitecore Admin"}</p>
              <p className="text-[10px] text-white/40">Admin Panel</p>
            </div>
          </div>
          <div className="px-2 py-3 space-y-0.5 flex-1">
            <p className="px-2 text-[9px] font-semibold uppercase tracking-widest text-white/30 mb-2">Manage</p>
            {["Dashboard", "Tenants", "Users", "Products", "Blog Posts"].map((item, i) => (
              <div
                key={item}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs"
                style={{ backgroundColor: i === 0 ? `${previewSecondary}cc` : "transparent", color: i === 0 ? "#fff" : "rgba(255,255,255,0.65)" }}
              >
                <div className="w-3 h-3 rounded bg-white/20 flex-shrink-0" />
                <span>{item}</span>
                {i === 0 && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            ))}
          </div>
          <div className="mx-2 mb-2 px-2.5 py-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: previewSecondary }}>S</div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-white truncate">SuperAdmin</p>
              <p className="text-[9px] text-white/40 truncate">superadmin@…</p>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col bg-slate-50/5">
          {/* Top bar */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white/80">Dashboard</p>
              <p className="text-[10px] text-white/30">Overview</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 px-3 rounded-md text-[10px] font-semibold flex items-center" style={{ backgroundColor: previewPrimary, color: theme.buttonTextColor || "#fff" }}>
                + New
              </div>
            </div>
          </div>
          {/* Stats cards */}
          <div className="p-3 grid grid-cols-2 gap-2">
            {["Tenants", "Users", "Orders", "Revenue"].map((label, i) => (
              <div key={label} className="rounded-lg p-2.5" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-[9px] text-white/40 mb-1">{label}</p>
                <p className="text-sm font-bold text-white">{["12", "340", "1.2k", "R48k"][i]}</p>
                <div className="mt-1.5 h-0.5 rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${[60, 80, 45, 70][i]}%`, backgroundColor: previewPrimary }} />
                </div>
              </div>
            ))}
          </div>
          {/* Table preview */}
          <div className="mx-3 rounded-lg overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
            <div className="px-3 py-2 flex items-center justify-between border-b border-white/10">
              <p className="text-[10px] font-semibold text-white/60">Recent Activity</p>
            </div>
            {["Plant Fresh", "Too Sweet", "Gold & Kiara"].map(name => (
              <div key={name} className="px-3 py-1.5 flex items-center gap-2 border-b border-white/5">
                <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: previewSecondary + "66" }} />
                <span className="text-[10px] text-white/60 flex-1">{name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: previewPrimary + "33", color: previewPrimary }}>Active</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Tab: Platform Theme ────────────────────────────────────────────────────
const THEME_EDITOR_TABS = [
  { key: "identity", label: "Identity",  icon: Type },
  { key: "colors",   label: "Colors",    icon: Palette },
];

const PlatformThemeTab = ({ theme, setTheme }: any) => {
  const [editorTab, setEditorTab] = useState("identity");
  const t = (key: string, val: any) => setTheme((prev: any) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-5">
      {/* Info banner — same style as AdminLoginTab */}
      <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ backgroundColor: "var(--admin-primary-10)", borderColor: "var(--admin-primary-20)", borderWidth: "1px", borderStyle: "solid" }}>
        <LayoutDashboard className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--admin-primary)" }} />
        <div>
          <p className="text-xs font-semibold" style={{ color: "var(--admin-primary)" }}>Platform-wide — applies to all admins</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--admin-primary)" }}>
            Controls the sidebar, colors, and branding shown in the admin panel.
            Saved to <code className="font-mono">StoreConfigs/StoreConfig001 → AdminTheme</code>.
          </p>
        </div>
      </div>

      {/* Live preview card — same as AdminLoginTab */}
      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
            <Eye className="w-4 h-4" /> Live Preview
          </div>
          <SidebarPreview theme={theme} />
        </CardContent>
      </Card>

      {/* Tabbed editor — identical structure to AdminLoginTab */}
      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="flex border-b bg-slate-50">
          {THEME_EDITOR_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setEditorTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2
                  ${editorTab === tab.key ? "bg-white" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                style={editorTab === tab.key ? { borderColor: "var(--admin-primary)", color: "var(--admin-primary)" } : {}}
              >
                <Icon className="w-4 h-4" /><span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {/* IDENTITY TAB */}
          {editorTab === "identity" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5 text-sm font-medium"><Type className="w-3.5 h-3.5 text-violet-500" />Platform Name & Logo</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Platform Name</Label>
                    <Input value={theme.platformName} onChange={e => t("platformName", e.target.value)} placeholder="Sitecore Admin" className="bg-gray-50" />
                    <p className="text-xs text-slate-400">Shown in the sidebar header and browser tab.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Logo Text</Label>
                    <Input value={theme.logoText} onChange={e => t("logoText", e.target.value)} placeholder="Sitecore Admin" className="bg-gray-50" />
                    <p className="text-xs text-slate-400">First letter is used as the logo icon.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COLORS TAB */}
          {editorTab === "colors" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5 text-sm font-medium"><Palette className="w-3.5 h-3.5" style={{ color: "var(--admin-primary)" }} />Sidebar</Label>
                <ColorRow label="Sidebar Background" value={theme.navbarBg}        onChange={(v: string) => t("navbarBg", v)} />
                <ColorRow label="Active Item / Hover" value={theme.secondaryColor} onChange={(v: string) => t("secondaryColor", v)} />
              </div>

              <div className="space-y-3 border-t pt-4">
                <Label className="flex items-center gap-1.5 text-sm font-medium">Accent & Brand</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ColorRow label="Primary Accent" value={theme.primaryColor} onChange={(v: string) => t("primaryColor", v)} />
                  <ColorRow label="Accent Color"   value={theme.accentColor}  onChange={(v: string) => t("accentColor", v)} />
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <Label className="flex items-center gap-1.5 text-sm font-medium">Buttons</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ColorRow label="Button Color"      value={theme.buttonColor}      onChange={(v: string) => t("buttonColor", v)} />
                  <ColorRow label="Button Text Color" value={theme.buttonTextColor}  onChange={(v: string) => t("buttonTextColor", v)} />
                </div>
                <ColorRow label="Button Hover Color" value={theme.buttonHoverColor} onChange={(v: string) => t("buttonHoverColor", v)} />
                {/* Live button preview */}
                <div className="h-9 rounded-xl flex items-center justify-center text-sm font-semibold shadow-md"
                  style={{ backgroundColor: theme.buttonColor || "#4f46e5", color: theme.buttonTextColor || "#ffffff" }}>
                  Preview Button
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Tab: Admin Login Screen ─────────────────────────────────────────────────
const EDITOR_TABS = [
  { key: "content",  label: "Content",  icon: Type },
  { key: "buttons",  label: "Buttons",  icon: Palette },
  { key: "styling",  label: "Styling",  icon: Sliders },
];

const AdminLoginTab = ({ config, setConfig }: any) => {
  const [editorTab, setEditorTab] = useState("content");

  const set = (path: string, value: any) => {
    setConfig((prev: any) => {
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let node: any = updated;
      keys.slice(0, -1).forEach(k => { if (!node[k]) node[k] = {}; node = node[k]; });
      node[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  return (
    <div className="space-y-5">
      {/* Info note */}
      <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ backgroundColor: "var(--admin-primary-10)", borderColor: "var(--admin-primary-20)", borderWidth: "1px", borderStyle: "solid" }}>
        <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--admin-primary)" }} />
        <div>
          <p className="text-xs font-semibold" style={{ color: "var(--admin-primary)" }}>Platform-wide — not per tenant</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--admin-primary)" }}>
            This login screen is shared by all admins regardless of tenant.
            It is saved to <code className="font-mono">StoreConfigs/StoreConfig001 → AuthCustomization → adminLogin</code>.
          </p>
        </div>
      </div>

      {/* Preview */}
      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
            <Eye className="w-4 h-4" /> Live Preview
          </div>
          <AdminLoginPreview config={config} />
        </CardContent>
      </Card>

      {/* Transition & layout selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card style={{ backgroundColor: "#f0f4f8" }}>
          <CardHeader><CardTitle className="text-base">Layout</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {LOGIN_LAYOUTS.map(opt => (
                <button key={opt.value} onClick={() => set("layout", opt.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all
                    ${config.layout === opt.value ? "text-indigo-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                  style={config.layout === opt.value ? { borderColor: "var(--admin-primary)", backgroundColor: "var(--admin-primary-10)", color: "var(--admin-primary)" } : {}}>
                  {opt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card style={{ backgroundColor: "#f0f4f8" }}>
          <CardHeader><CardTitle className="text-base">Image Transition</CardTitle></CardHeader>
          <CardContent>
            <Select value={config.transition || "zoom"} onValueChange={v => set("transition", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOGIN_TRANSITIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed editor */}
      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="flex border-b bg-slate-50">
          {EDITOR_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setEditorTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2
                  ${editorTab === tab.key ? "bg-white" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                style={editorTab === tab.key ? { borderColor: "var(--admin-primary)", color: "var(--admin-primary)" } : {}}
              >
                <Icon className="w-4 h-4" /><span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {/* CONTENT */}
          {editorTab === "content" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5 text-sm font-medium"><Type className="w-3.5 h-3.5 text-violet-500" />Text</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Title</Label>
                    <Input value={config.text?.title || ""} onChange={e => set("text.title", e.target.value)} className="bg-gray-50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Subtitle</Label>
                    <Input value={config.text?.subtitle || ""} onChange={e => set("text.subtitle", e.target.value)} className="bg-gray-50" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-1.5 text-sm font-medium">Branding</Label>
                <Toggle checked={config.branding?.showLogo} onChange={(v: boolean) => set("branding.showLogo", v)} label="Show Logo / Brand Name" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Brand Name</Label>
                    <Input value={config.branding?.logoText || ""} onChange={e => set("branding.logoText", e.target.value)} className="bg-gray-50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Logo URL</Label>
                    <Input value={config.branding?.logoUrl || ""} onChange={e => set("branding.logoUrl", e.target.value)} placeholder="https://..." className="bg-gray-50" />
                  </div>
                </div>
                {config.branding?.logoUrl && (
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <img src={config.branding.logoUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <span className="text-xs text-slate-500">Logo preview</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-1.5 text-sm font-medium">Background</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Image URL</Label>
                    <Input value={config.background?.imageUrl || ""} onChange={e => set("background.imageUrl", e.target.value)} placeholder="https://..." className="bg-gray-50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Gradient (fallback)</Label>
                    <Input value={config.background?.gradient || ""} onChange={e => set("background.gradient", e.target.value)} placeholder="linear-gradient(...)" className="bg-gray-50" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Background Type</Label>
                  <div className="flex gap-3">
                    {["image", "gradient"].map(t => (
                      <button key={t} onClick={() => set("background.type", t)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 capitalize transition-all
                          ${config.background?.type === t ? "text-indigo-700" : "border-gray-200 text-gray-500"}`}
                        style={config.background?.type === t ? { borderColor: "var(--admin-primary)", backgroundColor: "var(--admin-primary-10)", color: "var(--admin-primary)" } : {}}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-sm font-medium mb-2">Options</Label>
                <div className="divide-y divide-gray-100">
                  <Toggle checked={!!config.options?.showGoogle}         onChange={(v: boolean) => set("options.showGoogle", v)}         label="Show Google Sign-In" />
                  <Toggle checked={!!config.options?.showForgotPassword} onChange={(v: boolean) => set("options.showForgotPassword", v)} label="Show Forgot Password Link" />
                </div>
              </div>
            </div>
          )}

          {/* BUTTONS */}
          {editorTab === "buttons" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5 text-sm font-medium"><Palette className="w-3.5 h-3.5 text-green-500" />Button Color</Label>
                <Toggle checked={!!config.button?.gradient} onChange={(v: boolean) => set("button.gradient", v)} label="Use gradient (2 colors)" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ColorRow
                    label={config.button?.gradient ? "Color From" : "Button Color"}
                    value={config.button?.color}
                    onChange={(v: string) => set("button.color", v)}
                  />
                  {config.button?.gradient && (
                    <ColorRow label="Color To" value={config.button?.colorTo || "#4338ca"} onChange={(v: string) => set("button.colorTo", v)} />
                  )}
                </div>
                <div
                  className={`h-10 ${config.button?.radius || "rounded-xl"} ${config.button?.shadow || "shadow-lg"} flex items-center justify-center text-sm font-semibold`}
                  style={buildBtnStyle(config.button)}
                >
                  {config.button?.loginText || "Preview"}
                </div>
              </div>

              <ColorRow label="Button Text Color" value={config.button?.textColor || "#ffffff"} onChange={(v: string) => set("button.textColor", v)} />

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Button Shape</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {RADIUS_OPTIONS.map(r => (
                    <button key={r.value} onClick={() => set("button.radius", r.value)}
                      className={`py-2 text-xs font-medium border-2 transition-all ${r.value}
                        ${config.button?.radius === r.value ? "text-indigo-700" : "border-gray-200 text-gray-500"}`}
                      style={config.button?.radius === r.value ? { borderColor: "var(--admin-primary)", backgroundColor: "var(--admin-primary-10)", color: "var(--admin-primary)" } : {}}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Button Shadow</Label>
                <Select value={config.button?.shadow || "shadow-none"} onValueChange={v => set("button.shadow", v === "shadow-none" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SHADOW_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-medium text-slate-700">Button Label</Label>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Login Button Text</Label>
                  <Input value={config.button?.loginText || ""} onChange={e => set("button.loginText", e.target.value)} className="bg-gray-50" />
                </div>
              </div>
            </div>
          )}

          {/* STYLING */}
          {editorTab === "styling" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5 text-sm font-medium"><Type className="w-3.5 h-3.5 text-violet-500" />Text Styling</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ColorRow label="Title Color"    value={config.text?.titleColor    || "#111827"} onChange={(v: string) => set("text.titleColor", v)} />
                  <ColorRow label="Subtitle Color" value={config.text?.subtitleColor || "#6b7280"} onChange={(v: string) => set("text.subtitleColor", v)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Title Size</Label>
                    <Select value={config.text?.titleSize || "text-2xl"} onValueChange={v => set("text.titleSize", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FONT_SIZE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Title Weight</Label>
                    <Select value={config.text?.titleWeight || "font-bold"} onValueChange={v => set("text.titleWeight", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FONT_WEIGHT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <Label className="flex items-center gap-1.5 text-sm font-medium">Background Effects</Label>
                <SliderRow label="Overlay Opacity" value={config.style?.overlayOpacity ?? 50} min={0} max={90} onChange={(v: number) => set("style.overlayOpacity", v)} unit="%" />
                <SliderRow label="Image Blur"       value={config.style?.imageBlur ?? 0}        min={0} max={20} onChange={(v: number) => set("style.imageBlur", v)}       unit="px" />
              </div>

              <div className="space-y-3 border-t pt-4">
                <Label className="flex items-center gap-1.5 text-sm font-medium">Form Card</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ColorRow label="Card Background" value={config.style?.cardBg || "#ffffff"} onChange={(v: string) => set("style.cardBg", v)} />
                  <ColorRow label="Card Border"     value={config.style?.cardBorder === "transparent" ? "#ffffff" : (config.style?.cardBorder || "#ffffff")} onChange={(v: string) => set("style.cardBorder", v)} />
                </div>
                <SliderRow label="Background Opacity" value={config.style?.cardBgOpacity ?? 95} min={10} max={100} onChange={(v: number) => set("style.cardBgOpacity", v)} unit="%" />
                <SliderRow label="Backdrop Blur"      value={config.style?.cardBlur ?? 8}        min={0}  max={24}  onChange={(v: number) => set("style.cardBlur", v)}        unit="px" />
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Card Radius</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {RADIUS_OPTIONS.map(r => (
                      <button key={r.value} onClick={() => set("style.cardRadius", r.value)}
                        className={`py-2 text-xs font-medium border-2 transition-all ${r.value}
                          ${config.style?.cardRadius === r.value ? "text-indigo-700" : "border-gray-200 text-gray-500"}`}
                        style={config.style?.cardRadius === r.value ? { borderColor: "var(--admin-primary)", backgroundColor: "var(--admin-primary-10)", color: "var(--admin-primary)" } : {}}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <Label className="flex items-center gap-1.5 text-sm font-medium">Input Fields</Label>
                <ColorRow label="Border Color" value={config.style?.inputBorderColor || "#e5e7eb"} onChange={(v: string) => set("style.inputBorderColor", v)} />
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Input Radius</Label>
                  <Select value={config.style?.inputRadius || "rounded-xl"} onValueChange={v => set("style.inputRadius", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RADIUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Top-level tabs ──────────────────────────────────────────────────────────
const TOP_TABS = [
  { key: "theme", label: "Platform Theme", icon: LayoutDashboard },
  { key: "login", label: "Admin Login",    icon: Monitor },
];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AdminTheme() {
  const { db, globalState, setGlobalState } = useContext(AppContext);
  const { toast } = useToast();

  const currentUser  = (globalState as any)?.AuthenticatedUser;
  const isSuperAdmin =
    currentUser?.role         === "SuperAdmin" ||
    currentUser?.isSuperAdmin === true         ||
    currentUser?.IsSuperAdmin === true;

  const [theme,            setTheme]            = useState(DEFAULT_ADMIN_THEME);
  const [adminLoginConfig, setAdminLoginConfig] = useState(DEFAULT_ADMIN_LOGIN_CONFIG);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [activeTab, setActiveTab] = useState("theme");

  // ── Load: AdminTheme from StoreConfigs; adminLogin from AuthCustomization ──
  useEffect(() => {
    if (!db) return;
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "StoreConfigs", "StoreConfig001"));
        if (snap.exists()) {
          const data = snap.data();

          // Platform theme (colors, platformName)
          const savedTheme = data?.AdminTheme;
          const generalName =
            data?.GeneralSettings?.platformName ||
            data?.GeneralSettings?.storeName    ||
            "Sitecore Admin";
          if (savedTheme) {
            setTheme({ ...DEFAULT_ADMIN_THEME, ...savedTheme, platformName: savedTheme.platformName || generalName });
          } else {
            setTheme({ ...DEFAULT_ADMIN_THEME, platformName: generalName });
          }

          // Admin login lives in AuthCustomization.adminLogin (NOT in AdminTheme)
          const savedAdminLogin = data?.AuthCustomization?.adminLogin;
          if (savedAdminLogin) {
            setAdminLoginConfig(prev => ({
              ...prev,
              ...savedAdminLogin,
              style:    { ...prev.style,    ...(savedAdminLogin.style    || {}) },
              button:   { ...prev.button,   ...(savedAdminLogin.button   || {}) },
              text:     { ...prev.text,     ...(savedAdminLogin.text     || {}) },
              branding: { ...prev.branding, ...(savedAdminLogin.branding || {}) },
              options:  { ...prev.options,  ...(savedAdminLogin.options  || {}) },
            }));
          }
        }
      } catch (err) {
        toast({ title: "Could not load admin theme", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  // ── Save: AdminTheme → AdminTheme field; adminLogin → AuthCustomization.adminLogin ──
  const handleSave = async () => {
    if (!db) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "StoreConfigs", "StoreConfig001"), {
        // Platform theme (sidebar colors, logo text, etc.)
        AdminTheme: theme,
        // Admin login config lives under AuthCustomization alongside tenant configs
        AuthCustomization: {
          adminLogin: adminLoginConfig,
        },
        GeneralSettings: { platformName: theme.platformName },
        UpdatedAt: new Date(),
      }, { merge: true });
      // merge: true ensures tenant userLogin/affiliateLogin under AuthCustomization are NOT overwritten

      setGlobalState((prev: any) => ({ ...prev, platformName: theme.platformName }));
      toast({ title: "Admin theme saved", description: "Changes applied immediately." });
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
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--admin-primary)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Admin Platform Theme</h2>
          <p className="text-xs text-slate-500">
            Platform-wide settings — separate from any tenant's storefront.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: "var(--admin-btn-bg)", color: "var(--admin-btn-text)" }}>
          {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving…</> : "Save Changes"}
        </Button>
      </div>

      {/* Top-level tab bar */}
      <div className="hidden sm:flex border rounded-lg overflow-hidden w-fit">
        {TOP_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors
                ${activeTab === tab.key ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              <Icon className="w-4 h-4" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "theme" && <PlatformThemeTab theme={theme} setTheme={setTheme} />}
      {activeTab === "login" && <AdminLoginTab config={adminLoginConfig} setConfig={setAdminLoginConfig} />}
    </div>
  );
}