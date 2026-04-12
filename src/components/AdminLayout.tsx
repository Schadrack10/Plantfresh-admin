import { useEffect, useState, useContext, useRef } from "react";
import {
  LayoutDashboard, User2Icon, Package, FileText,
  LogOut, Handshake, Layers, ChevronDown, Check,
  Globe, Image, Palette,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import AppContext from "../context/AppContext";
import { Tenant } from "@/types";

const ADMIN_THEME_DEFAULTS = {
  primaryColor:   "#4f46e5",
  secondaryColor: "#7c3aed",
  navbarBg:       "#1e1b4b",
};

const ALL_MENU_ITEMS = [
  { title: "Dashboard",      url: "/",               icon: LayoutDashboard, superAdminOnly: false },
  { title: "Tenants",        url: "/tenants",        icon: Layers,          superAdminOnly: true  },
  { title: "Templates",      url: "/templates",      icon: Image,           superAdminOnly: true  },
  { title: "Users",          url: "/users",          icon: User2Icon,       superAdminOnly: false },
  { title: "Products",       url: "/products",       icon: Package,         superAdminOnly: false },
  { title: "Blog Posts",     url: "/blog",           icon: FileText,        superAdminOnly: false },
  { title: "Affiliation",    url: "/affiliation",    icon: Handshake,       superAdminOnly: false },
  { title: "Platform Theme", url: "/admin-theme",    icon: Palette,         superAdminOnly: true  },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const { db, globalState, setGlobalState } = useContext(AppContext);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [adminTheme, setAdminTheme] = useState(ADMIN_THEME_DEFAULTS);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const tenants      = (globalState?.tenants      || []) as Tenant[];
  const activeTenant = (globalState?.activeTenant || null) as Tenant | null;
  const currentUser  = globalState?.AuthenticatedUser as any;
  const platformName = (globalState as any)?.platformName || "Sitecore Admin";

  const isSuperAdmin =
    currentUser?.role === "SuperAdmin" ||
    currentUser?.isSuperAdmin === true  ||
    currentUser?.IsSuperAdmin === true;

  const menuItems = ALL_MENU_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin);

  // ── Listen to AdminTheme from StoreConfigs/StoreConfig001 ONLY ────────────
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      doc(db, "StoreConfigs", "StoreConfig001"),
      (snap) => {
        if (!snap.exists()) return;
        const adminT = snap.data()?.AdminTheme;
        if (adminT?.primaryColor || adminT?.navbarBg) {
          setAdminTheme({
            primaryColor:   adminT.primaryColor   || ADMIN_THEME_DEFAULTS.primaryColor,
            secondaryColor: adminT.secondaryColor || ADMIN_THEME_DEFAULTS.secondaryColor,
            navbarBg:       adminT.navbarBg       || ADMIN_THEME_DEFAULTS.navbarBg,
          });
        }
        const name =
          snap.data()?.AdminTheme?.platformName ||
          snap.data()?.GeneralSettings?.platformName ||
          snap.data()?.GeneralSettings?.storeName    ||
          "Sitecore Admin";
        setGlobalState((prev: any) => {
          if (prev.platformName === name) return prev;
          return { ...prev, platformName: name };
        });
      },
      (err) => console.error("AdminTheme listener error:", err)
    );
    return () => unsub();
  }, [db]);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelectTenant = (tenant: Tenant) => {
    setDropdownOpen(false);
    localStorage.setItem("activeTenantId", tenant.Id || "");
    setGlobalState((prev: any) => ({ ...prev, activeTenant: tenant }));
  };

  const handleLogout = () => { localStorage.clear(); navigate("/login"); };

  // ── Derived colours ───────────────────────────────────────────────────────
  const sidebarBg   = adminTheme.navbarBg;
  const sidebarText = "#ffffff";
  const activeBg    = `${adminTheme.secondaryColor}cc`;
  const hoverBg     = "rgba(255,255,255,0.10)";
  const borderColor = "rgba(255,255,255,0.15)";
  const labelColor  = "rgba(255,255,255,0.50)";
  const userInitial   = (currentUser?.email?.[0] || "?").toUpperCase();
  const tenantInitial = (activeTenant?.Name?.[0]  || "?").toUpperCase();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <SidebarContent style={{ backgroundColor: sidebarBg }} className="flex flex-col h-full">

            {/* Brand header */}
            <div className="px-5 py-4 flex items-center gap-3 flex-shrink-0"
              style={{ borderBottom: `1px solid ${borderColor}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: adminTheme.secondaryColor }}>
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm leading-tight truncate" style={{ color: sidebarText }}>
                  {platformName}
                </p>
                <p className="text-[11px] leading-tight" style={{ color: labelColor }}>Admin Panel</p>
              </div>
            </div>

            {/* Nav items */}
            <SidebarGroup className="flex-1 overflow-y-auto py-2">
              <SidebarGroupLabel
                className="px-4 text-[10px] font-semibold uppercase tracking-widest mb-1"
                style={{ color: labelColor }}>
                Manage
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <NavLink to={item.url} end>
                        {({ isActive }) => (
                          <SidebarMenuButton
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg mx-1 transition-all text-sm font-medium"
                            style={{
                              backgroundColor: isActive ? activeBg : "transparent",
                              color:           sidebarText,
                              opacity:         isActive ? 1 : 0.85,
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) e.currentTarget.style.backgroundColor = hoverBg;
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                            }}
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            <span>{item.title}</span>
                            {isActive && (
                              <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: sidebarText }} />
                            )}
                          </SidebarMenuButton>
                        )}
                      </NavLink>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Bottom: tenant switcher + user + logout */}
            <div className="flex-shrink-0" style={{ borderTop: `1px solid ${borderColor}` }}>

              {/* Tenant switcher */}
              {tenants.length > 0 && (
                <div className="p-3 relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.10)",
                      color:           sidebarText,
                      border:          `1px solid ${borderColor}`,
                    }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ backgroundColor: adminTheme.secondaryColor }}>
                      {tenantInitial}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold truncate" style={{ color: sidebarText }}>
                        {activeTenant?.Name || "Select tenant"}
                      </p>
                      {(activeTenant as any)?.Subdomain && (
                        <p className="text-[10px] truncate" style={{ color: labelColor }}>
                          {(activeTenant as any).Subdomain}
                        </p>
                      )}
                    </div>
                    <ChevronDown
                      className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
                      style={{
                        color:     labelColor,
                        transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </button>

                  {dropdownOpen && (
                    <div
                      className="absolute bottom-full left-3 right-3 mb-1 rounded-xl overflow-hidden shadow-2xl z-50"
                      style={{
                        backgroundColor: sidebarBg,
                        border:          `1px solid ${borderColor}`,
                        maxHeight:       "260px",
                        overflowY:       "auto",
                      }}
                    >
                      <div
                        className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider sticky top-0"
                        style={{
                          color:           labelColor,
                          borderBottom:    `1px solid ${borderColor}`,
                          backgroundColor: sidebarBg,
                        }}
                      >
                        {isSuperAdmin ? "All Tenants" : "Your Tenant"}
                      </div>
                      {tenants.map((tenant) => {
                        const isSelected = activeTenant?.Id === tenant.Id;
                        return (
                          <button
                            key={tenant.Id}
                            onClick={() => handleSelectTenant(tenant)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all"
                            style={{
                              backgroundColor: isSelected ? activeBg : "transparent",
                              color:           sidebarText,
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = hoverBg;
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                            }}
                          >
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                              style={{
                                backgroundColor: isSelected
                                  ? "rgba(255,255,255,0.25)"
                                  : "rgba(255,255,255,0.10)",
                              }}
                            >
                              {tenant.Name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-xs font-semibold truncate" style={{ color: sidebarText }}>
                                {tenant.Name}
                              </p>
                              <p className="text-[10px] truncate" style={{ color: labelColor }}>
                                {(tenant as any).Subdomain || ""}
                              </p>
                            </div>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: sidebarText }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* User card */}
              <div
                className="mx-3 mb-2 px-3 py-2.5 rounded-xl flex items-center gap-3"
                style={{ backgroundColor: "rgba(255,255,255,0.07)" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                  style={{ backgroundColor: adminTheme.secondaryColor }}
                >
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: sidebarText }}>
                    {currentUser?.email || "Unknown"}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: labelColor }}>
                    {currentUser?.role || "Admin"}
                  </p>
                </div>
              </div>

              {/* Logout */}
              <div className="px-3 pb-3">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ color: sidebarText, opacity: 0.8 }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = hoverBg;
                    e.currentTarget.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.opacity = "0.8";
                  }}
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </SidebarContent>
        </Sidebar>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0">
          <header
            className="h-14 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 border-b relative bg-white"
            style={{ borderColor: "#e5e7eb" }}
          >
            <SidebarTrigger />
            <div
              className="absolute left-0 bottom-0 h-0.5 w-full pointer-events-none"
              style={{
                background: `linear-gradient(to right, ${adminTheme.primaryColor}, ${adminTheme.secondaryColor})`,
              }}
            />
            <div className="flex items-center gap-2">
              {activeTenant && (
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium hidden sm:inline-block"
                  style={{
                    backgroundColor: `${adminTheme.primaryColor}18`,
                    color:           adminTheme.primaryColor,
                  }}
                >
                  {activeTenant.Name}
                </span>
              )}
              <span className="text-sm font-semibold" style={{ color: adminTheme.primaryColor }}>
                {platformName}
              </span>
            </div>
          </header>

          <div className="flex-1 overflow-auto bg-gray-50 p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}