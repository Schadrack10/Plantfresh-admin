import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Image, Users, FileText, Globe, TrendingUp, ShoppingCart, Star } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import AppContext from "../context/AppContext";
import { collection, getDocs, getDoc, doc, query, where } from "firebase/firestore";

interface StatCard {
  title: string;
  value: number | string;
  icon: any;
  color: string;
  bg: string;
  trend?: string;
}

export default function Dashboard() {
  const { globalState, db, setGlobalState } = useContext(AppContext);

  const activeTenant   = (globalState as any)?.activeTenant;
  const currentUser    = (globalState as any)?.AuthenticatedUser;
  const platformName   = (globalState as any)?.platformName || "Sitecore Admin";
  const isSuperAdmin   = currentUser?.role === "SuperAdmin";
  const effectiveTenantId = activeTenant?.Id || currentUser?.tenantId || null;

  const [stats, setStats]     = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(false);

  // Rehydrate session on first mount
  useEffect(() => {
    if (!currentUser) {
      try {
        const user   = JSON.parse(localStorage.getItem("AuthenticatedUser") || "null");
        const config = JSON.parse(localStorage.getItem("StoreConfig")       || "{}");
        if (user) setGlobalState((prev: any) => ({ ...prev, AuthenticatedUser: user, StoreConfig: config }));
      } catch {}
    }
  }, []);

  // Re-fetch whenever the active tenant changes
  useEffect(() => {
    if (!db) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        let productCount  = 0;
        let userCount     = 0;
        let orderCount    = 0;
        let blogCount     = 0;
        let heroSections  = 0;
        let tenantCount   = 0;

        if (effectiveTenantId) {
          // ── Scoped to active tenant ──────────────────────────────────
          const [prodSnap, userSnap, orderSnap] = await Promise.all([
            getDocs(query(collection(db, "Products"), where("TenantId", "==", effectiveTenantId))),
            getDocs(query(collection(db, "Users"),    where("TenantId", "==", effectiveTenantId))),
            getDocs(query(collection(db, "Orders"),   where("TenantId", "==", effectiveTenantId))).catch(() => ({ size: 0 })),
          ]);
          productCount = prodSnap.size;
          userCount    = userSnap.size;
          orderCount   = (orderSnap as any).size || 0;

          // Site sections count
          const siteSnap = await getDoc(doc(db, "Sites", effectiveTenantId));
          if (siteSnap.exists()) {
            const pages    = siteSnap.data()?.Pages || [];
            const sections = pages.flatMap((p: any) => p.Sections || []);
            heroSections   = sections.filter((s: any) => s.Type === "Hero").length;
          }

          // Blog posts
          try {
            const blogSnap = await getDocs(
              query(collection(db, "BlogPosts"), where("TenantId", "==", effectiveTenantId))
            );
            blogCount = blogSnap.size;
          } catch {}

        } else if (isSuperAdmin) {
          // ── SuperAdmin, platform-wide ────────────────────────────────
          const [tSnap, pSnap, uSnap] = await Promise.all([
            getDocs(collection(db, "Tenants")),
            getDocs(collection(db, "Products")),
            getDocs(collection(db, "Users")),
          ]);
          tenantCount  = tSnap.size;
          productCount = pSnap.size;
          userCount    = uSnap.size;
        }

        setStats(
          effectiveTenantId
            ? [
                { title: "Products",      value: productCount, icon: Package,       color: "text-blue-600",   bg: "bg-blue-50"   },
                { title: "Users",         value: userCount,    icon: Users,          color: "text-indigo-600", bg: "bg-indigo-50" },
                { title: "Orders",        value: orderCount,   icon: ShoppingCart,   color: "text-green-600",  bg: "bg-green-50"  },
                { title: "Blog Posts",    value: blogCount,    icon: FileText,       color: "text-purple-600", bg: "bg-purple-50" },
              ]
            : [
                { title: "Total Tenants", value: tenantCount,  icon: Globe,          color: "text-indigo-600", bg: "bg-indigo-50" },
                { title: "Products",      value: productCount, icon: Package,        color: "text-blue-600",   bg: "bg-blue-50"   },
                { title: "Users",         value: userCount,    icon: Users,          color: "text-green-600",  bg: "bg-green-50"  },
                { title: "Platform",      value: platformName, icon: TrendingUp,     color: "text-purple-600", bg: "bg-purple-50" },
              ]
        );
      } catch (err) {
        console.error("Dashboard stats error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, effectiveTenantId]);

  return (
    <div className="space-y-6">

      {/* ── Page header — shows active tenant name ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            {activeTenant ? activeTenant.Name : platformName}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeTenant
              ? `${activeTenant.Subdomain || ""} · ${currentUser?.role || "Admin"}`
              : isSuperAdmin
              ? "Platform overview — select a tenant in the sidebar to view their data"
              : "Welcome back"}
          </p>
        </div>

        {/* Active tenant badge */}
        {activeTenant && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
              Active: {activeTenant.Name}
            </span>
          </div>
        )}
      </div>

      {/* ── Stats grid ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-24" />
              </Card>
            ))
          : stats.map((stat) => (
              <Card key={stat.title} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                  <CardTitle className="text-xs sm:text-sm font-medium text-slate-500 truncate">
                    {stat.title}
                  </CardTitle>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.bg}`}>
                    <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent className="pb-4 px-4">
                  <div className="text-2xl sm:text-3xl font-bold text-slate-800 truncate">
                    {stat.value}
                  </div>
                  {stat.trend && (
                    <p className="text-xs text-slate-400 mt-0.5">{stat.trend}</p>
                  )}
                </CardContent>
              </Card>
            ))}
      </div>

      {/* ── Active tenant info card ──────────────────────────────────────── */}
      {activeTenant && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-700">Tenant Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-0.5">Name</p>
              <p className="font-semibold text-slate-800">{activeTenant.Name}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-0.5">Subdomain</p>
              <p className="font-mono text-slate-700">{activeTenant.Subdomain || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-0.5">Template</p>
              <p className="text-slate-700">{(activeTenant as any).TemplateId || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-0.5">Admin email</p>
              <p className="text-slate-700 truncate">{(activeTenant as any).AdminEmail || "—"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Logged-in user summary ───────────────────────────────────────── */}
      <Card className="border border-slate-200">
        <CardContent className="flex items-center gap-4 py-4">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
            style={{ backgroundColor: "#4f46e5" }}
          >
            {(currentUser?.email?.[0] || "?").toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate">{currentUser?.email || "—"}</p>
            <p className="text-xs text-slate-400">{currentUser?.role || "Admin"}</p>
          </div>
          <div className="ml-auto flex-shrink-0">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              currentUser?.role === "SuperAdmin"
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
            }`}>
              {currentUser?.role || "Admin"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}