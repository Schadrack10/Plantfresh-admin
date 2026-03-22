import { useEffect, useState, useContext } from "react";
import { LayoutDashboard, User2Icon, KeyRound, Image, Package, Star, MessageSquare, FileText, LogOut, Handshake, Leaf } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { onSnapshot, doc } from "firebase/firestore";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import AppContext from "../context/AppContext";

const menuItems = [
  { title: "Dashboard",       url: "/",             icon: LayoutDashboard },
  { title: "Users",           url: "/users",         icon: User2Icon },
  { title: "Auth Management", url: "/auth-manager",  icon: KeyRound },
  { title: "Banner Management", url: "/banner",      icon: Image },
  { title: "Products",        url: "/products",      icon: Package },
  { title: "Features",        url: "/features",      icon: Star },
  { title: "Blog Posts",      url: "/blog",          icon: FileText },
  { title: "Affiliation",     url: "/affiliation",   icon: Handshake },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const { db } = useContext(AppContext);

  const [theme, setTheme] = useState({
    primaryColor:   "#16a34a",
    secondaryColor: "#10b981",
    storeName:      "PlantFresh",
    navbarBg:       "#16a34a",
  });

  // Live theme listener — updates instantly when StoreConfig changes
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      doc(db, "StoreConfigs", "StoreConfig001"),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const t    = data?.ThemeCustomization  || {};
        const g    = data?.GeneralSettings     || {};
        const n    = data?.NavbarCustomization || {};
        setTheme({
          primaryColor:   t.primaryColor                    || "#16a34a",
          secondaryColor: t.secondaryColor                  || "#10b981",
          storeName:      g.storeName                       || "PlantFresh",
          navbarBg:       n.background || t.primaryColor    || "#16a34a",
        });
      },
      (err) => console.error("Admin theme listener error:", err)
    );
    return () => unsub();
  }, [db]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const { primaryColor, secondaryColor, storeName, navbarBg } = theme;

  // Derived sidebar palette — keeps admin feeling "professional" while
  // respecting the store's brand colours
  const sidebarBg      = navbarBg;               // matches user-facing navbar
  const sidebarText    = "#ffffff";
  const activeBg       = `${secondaryColor}cc`;  // slightly transparent accent
  const activeText     = "#ffffff";
  const hoverBg        = "rgba(255,255,255,0.12)";
  const borderColor    = "rgba(255,255,255,0.18)";
  const labelColor     = "rgba(255,255,255,0.55)";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <Sidebar>
          <SidebarContent
            style={{ backgroundColor: sidebarBg, color: sidebarText }}
            className="flex flex-col h-full"
          >
            {/* Brand header */}
            <div
              className="p-5 flex items-center gap-3 flex-shrink-0"
              style={{ borderBottom: `1px solid ${borderColor}` }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              >
                <Leaf className="w-4 h-4" style={{ color: sidebarText }} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-base leading-tight truncate" style={{ color: sidebarText }}>
                  {storeName}
                </p>
                <p className="text-xs leading-tight" style={{ color: labelColor }}>
                  Admin Panel
                </p>
              </div>
            </div>

            {/* Nav items */}
            <SidebarGroup className="flex-1 overflow-y-auto py-3">
              <SidebarGroupLabel
                className="px-4 text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: labelColor }}
              >
                Management
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
                              backgroundColor: isActive ? activeBg   : "transparent",
                              color:           isActive ? activeText : sidebarText,
                            }}
                            onMouseEnter={e => {
                              if (!isActive) e.currentTarget.style.backgroundColor = hoverBg;
                            }}
                            onMouseLeave={e => {
                              if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                            }}
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            <span>{item.title}</span>
                            {/* Active indicator dot */}
                            {isActive && (
                              <span
                                className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: activeText }}
                              />
                            )}
                          </SidebarMenuButton>
                        )}
                      </NavLink>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Logout */}
            <div
              className="p-4 flex-shrink-0"
              style={{ borderTop: `1px solid ${borderColor}` }}
            >
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{ color: sidebarText }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <LogOut className="h-4 w-4 flex-shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </SidebarContent>
        </Sidebar>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header
            className="h-16 flex items-center justify-between px-6 flex-shrink-0 border-b"
            style={{ borderColor: "#e5e7eb", backgroundColor: "#ffffff" }}
          >
            <SidebarTrigger />
            {/* Subtle brand accent strip at bottom of header */}
            <div
              className="absolute left-0 bottom-0 h-0.5 w-full pointer-events-none"
              style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
            />
            <span className="text-sm font-medium" style={{ color: primaryColor }}>
              {storeName} Admin
            </span>
          </header>

          <div className="p-6 flex-1 overflow-auto bg-gray-50">
            <Outlet />
          </div>
        </main>

      </div>
    </SidebarProvider>
  );
}