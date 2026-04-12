import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tenantService } from "@/services/firebase/tenantService";
import { siteService } from "@/services/firebase/siteService";
import { Site, Tenant, Theme } from "@/types";
import AppContext from "../context/AppContext";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, ChevronLeft, Globe, GlobeLock,
  Layers, Palette, Sparkles, Image, KeyRound, Loader2,
} from "lucide-react";

import Features    from "./Features";
import HeroBanner  from "./HeroBanner";
import AuthManager from "./AuthManager";

const SECTION_TYPES = ["Hero", "Text", "Features", "Rooms", "Contact", "Banner", "Products", "Blog"];

function tryParseJson(value: string, fallback: Record<string, unknown>) {
  try { return JSON.parse(value) as Record<string, unknown>; }
  catch { return fallback; }
}

const uid = () => Math.random().toString(36).slice(2, 9);

export default function Builder() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate     = useNavigate();
  const { toast }    = useToast();
  const { globalState, setGlobalState } = useContext(AppContext);

  const currentUser  = globalState?.AuthenticatedUser as any;
  const isSuperAdmin =
    currentUser?.role === "SuperAdmin" ||
    currentUser?.isSuperAdmin === true  ||
    currentUser?.IsSuperAdmin === true;

  const [tenant, setTenant]               = useState<Tenant | null>(null);
  const [site, setSite]                   = useState<Site | null>(null);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [newPageTitle, setNewPageTitle]   = useState("");
  const [newPageSlug, setNewPageSlug]     = useState("");
  const [sectionType, setSectionType]     = useState(SECTION_TYPES[0]);
  const [sectionContent, setSectionContent] = useState("{}");
  const [theme, setTheme]                 = useState<Theme>({
    PrimaryColor: "", SecondaryColor: "", BackgroundColor: "", TextColor: "",
  });
  const [loading, setLoading]             = useState(false);
  const [pageLoading, setPageLoading]     = useState(true);

  const selectedPage = useMemo(
    () => site?.Pages?.find((p) => p.Id === selectedPageId) ?? null,
    [site, selectedPageId]
  );

  const canEdit =
    isSuperAdmin ||
    (tenant as any)?.OwnerId === currentUser?.uid ||
    (tenant as any)?.OwnerId === currentUser?.email ||
    tenant?.Id === (currentUser?.tenantId || currentUser?.TenantId);

  useEffect(() => {
    if (!tenantId) return;
    setGlobalState((prev: any) => ({
      ...prev,
      activeTenant: prev.activeTenant?.Id === tenantId
        ? prev.activeTenant
        : { ...(prev.activeTenant || {}), Id: tenantId, Name: tenant?.Name || "" },
    }));
  }, [tenantId, tenant?.Name]);

  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      setPageLoading(true);
      try {
        const [tenantRecord, siteRecord] = await Promise.all([
          tenantService.getTenant(tenantId),
          siteService.getSite(tenantId),
        ]);
        if (!tenantRecord) {
          toast({ title: "Not found", description: "Tenant not found.", variant: "destructive" });
          navigate(isSuperAdmin ? "/tenants" : "/");
          return;
        }
        setTenant(tenantRecord);
        setSite(siteRecord);
      } catch (err) {
        console.error(err);
        toast({ title: "Load failed", variant: "destructive" });
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, [tenantId]);

  useEffect(() => {
    if (!site) return;
    if (site.Pages?.length && !selectedPageId) {
      setSelectedPageId(site.Pages[0].Id);
    }
    setTheme({
      PrimaryColor:   site.Theme?.PrimaryColor   || "",
      SecondaryColor: site.Theme?.SecondaryColor || "",
      BackgroundColor:site.Theme?.BackgroundColor|| "",
      TextColor:      site.Theme?.TextColor      || "",
    });
  }, [site]);

  useEffect(() => {
    const defaults: Record<string, string> = {
      Hero:     JSON.stringify({ heading: "Welcome", subtitle: "Your tagline here.", buttonText: "Shop now" }, null, 2),
      Text:     JSON.stringify({ heading: "About us", body: "Describe your business." }, null, 2),
      Features: JSON.stringify({ items: ["Fast shipping", "Organic products", "24/7 support"] }, null, 2),
      Contact:  JSON.stringify({ email: "hello@example.com", phone: "123-456-7890" }, null, 2),
    };
    setSectionContent(defaults[sectionType] || "{}");
  }, [sectionType]);

  const refreshSite = async () => {
    if (!tenantId) return;
    const latest = await siteService.getSite(tenantId);
    setSite(latest);
    return latest;
  };

  const handlePublishToggle = async () => {
    if (!site) return;
    const next = !site.Published;
    setLoading(true);
    try {
      await siteService.publishSite(tenantId!, next);
      await refreshSite();
      toast({ title: next ? "Site published" : "Site unpublished" });
    } catch (err) {
      toast({ title: "Failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPage = async () => {
    if (!newPageTitle || !newPageSlug) {
      toast({ title: "Missing fields", description: "Add a title and slug.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await siteService.addPage(tenantId!, { Title: newPageTitle, Slug: newPageSlug, Sections: [] });
      await refreshSite();
      setNewPageTitle(""); setNewPageSlug("");
      toast({ title: `Page "${newPageTitle}" added` });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm("Delete this page?")) return;
    setLoading(true);
    try {
      await siteService.deletePage(tenantId!, pageId);
      await refreshSite();
      setSelectedPageId("");
      toast({ title: "Page deleted" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleSavePage = async () => {
    if (!selectedPage) return;
    setLoading(true);
    try {
      await siteService.updatePage(tenantId!, selectedPage.Id, {
        Title: selectedPage.Title, Slug: selectedPage.Slug,
      });
      toast({ title: "Page saved" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleAddSection = async () => {
    if (!selectedPage) return;
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(sectionContent); }
    catch { toast({ title: "Invalid JSON", variant: "destructive" }); return; }
    setLoading(true);
    try {
      await siteService.addSection(tenantId!, selectedPage.Id, {
        Type: sectionType, Content: parsed, Order: selectedPage.Sections.length + 1,
      });
      await refreshSite();
      toast({ title: `${sectionType} section added` });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleUpdateSection = async (sectionId: string, content: Record<string, unknown>) => {
    if (!selectedPage) return;
    setLoading(true);
    try {
      await siteService.updateSection(tenantId!, selectedPage.Id, sectionId, { Content: content });
      await refreshSite();
      toast({ title: "Section saved" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!selectedPage || !confirm("Delete this section?")) return;
    setLoading(true);
    try {
      if (typeof (siteService as any).deleteSection === "function") {
        await (siteService as any).deleteSection(tenantId!, selectedPage.Id, sectionId);
      } else {
        const updatedSections = selectedPage.Sections.filter((s) => s.Id !== sectionId);
        await siteService.updatePage(tenantId!, selectedPage.Id, {
          ...selectedPage, Sections: updatedSections,
        } as any);
      }
      await refreshSite();
      toast({ title: "Section deleted" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  // ── Theme ─────────────────────────────────────────────────────────────────
  const handleSaveTheme = async () => {
    setLoading(true);
    try {
      await siteService.updateSiteTheme(tenantId!, {
        PrimaryColor:    theme.PrimaryColor,
        SecondaryColor:  theme.SecondaryColor,
        BackgroundColor: theme.BackgroundColor,
        TextColor:       theme.TextColor,
        FontFamily:      site?.Theme?.FontFamily || "Inter, sans-serif",
      });
      await refreshSite();
      toast({ title: "Theme saved" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  // ── Loading / access states ───────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto" />
          <p className="text-sm text-slate-500">Loading site builder…</p>
        </div>
      </div>
    );
  }

  if (!tenant || !site) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Site not found</h1>
        <p className="text-sm text-slate-500">This tenant does not have a site yet.</p>
        {isSuperAdmin && <Button onClick={() => navigate("/tenants")}>Back to tenants</Button>}
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="text-sm text-slate-500">You do not have permission to edit this site.</p>
        {isSuperAdmin && <Button onClick={() => navigate("/tenants")}>Back to tenants</Button>}
      </div>
    );
  }

  const previewUrl = (tenant as any)?.CustomDomain ||
    ((tenant as any)?.Subdomain ? `https://${(tenant as any).Subdomain}.yourplatform.com` : "");

  return (
    <div className="space-y-4 pb-12">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <Button variant="outline" size="sm" onClick={() => navigate("/tenants")} className="gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Tenants
            </Button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{tenant.Name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {(tenant as any).Subdomain && (
                <span className="font-mono">{(tenant as any).Subdomain}.yourplatform.com</span>
              )}
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noreferrer"
                  className="ml-2 text-indigo-500 hover:underline">Preview ↗</a>
              )}
            </p>
          </div>
        </div>

        <Button
          onClick={handlePublishToggle}
          disabled={loading}
          className={`gap-2 ${site.Published
            ? "bg-amber-500 hover:bg-amber-600"
            : "bg-emerald-500 hover:bg-emerald-600"}`}
        >
          {site.Published
            ? <><GlobeLock className="w-4 h-4" />Unpublish</>
            : <><Globe className="w-4 h-4" />Publish site</>}
        </Button>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs defaultValue="pages">
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="pages" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Layers className="w-4 h-4" /> Pages
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Palette className="w-4 h-4" /> Theme
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Sparkles className="w-4 h-4" /> Features & Config
          </TabsTrigger>
          <TabsTrigger value="banners" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Image className="w-4 h-4" /> Banners
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="auth" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <KeyRound className="w-4 h-4" /> Auth Screens
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── PAGES TAB ──────────────────────────────────────────────── */}
        <TabsContent value="pages" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Page list */}
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle className="text-base">Pages</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {site.Pages?.map((page) => (
                  <button key={page.Id}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition
                      ${selectedPageId === page.Id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 bg-white hover:border-slate-300"}`}
                    onClick={() => setSelectedPageId(page.Id)}>
                    <div className="font-semibold text-sm">{page.Title}</div>
                    <div className="text-xs text-slate-500">/{page.Slug}</div>
                  </button>
                ))}

                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add page</p>
                  <Input placeholder="Page title" value={newPageTitle}
                    onChange={(e) => setNewPageTitle(e.target.value)} className="h-8 text-sm" />
                  <Input placeholder="slug (e.g. about)" value={newPageSlug}
                    onChange={(e) => setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="h-8 text-sm font-mono" />
                  <Button size="sm" onClick={handleAddPage} disabled={loading} className="w-full gap-1.5">
                    <Plus className="w-4 h-4" /> Add page
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Page editor */}
            <div className="lg:col-span-2 space-y-4">
              {selectedPage ? (
                <>
                  {/* Page settings */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Page settings</CardTitle>
                        <Button size="sm" variant="destructive" onClick={() => handleDeletePage(selectedPage.Id)}
                          disabled={loading} className="gap-1.5">
                          <Trash2 className="w-3.5 h-3.5" /> Delete page
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">Title</Label>
                          <Input value={selectedPage.Title}
                            onChange={(e) => {
                              const updated = { ...selectedPage, Title: e.target.value };
                              setSite((c) => c ? { ...c, Pages: c.Pages.map((p) => p.Id === selectedPage.Id ? updated : p) } : c);
                            }} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">Slug</Label>
                          <Input value={selectedPage.Slug}
                            onChange={(e) => {
                              const updated = { ...selectedPage, Slug: e.target.value };
                              setSite((c) => c ? { ...c, Pages: c.Pages.map((p) => p.Id === selectedPage.Id ? updated : p) } : c);
                            }} className="font-mono" />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button size="sm" onClick={handleSavePage} disabled={loading}>Save page</Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sections */}
                  <Card>
                    <CardHeader><CardTitle className="text-base">Sections ({selectedPage.Sections?.length || 0})</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {selectedPage.Sections?.map((section) => (
                        <div key={section.Id} className="rounded-xl border border-slate-200 p-4 bg-white space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-semibold">{section.Type}</span>
                              <span className="ml-2 text-xs text-slate-400 font-mono">{section.Id}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="h-7 text-xs"
                                onClick={() => handleUpdateSection(section.Id, section.Content)}>
                                Save
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteSection(section.Id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <Label className="text-xs text-slate-500">Content JSON</Label>
                          <textarea
                            value={JSON.stringify(section.Content, null, 2)}
                            onChange={(e) => {
                              setSite((c) => c ? {
                                ...c,
                                Pages: c.Pages.map((pg) => pg.Id === selectedPage.Id ? {
                                  ...pg,
                                  Sections: pg.Sections.map((s) =>
                                    s.Id === section.Id
                                      ? { ...s, Content: tryParseJson(e.target.value, s.Content) }
                                      : s
                                  ),
                                } : pg),
                              } : c);
                            }}
                            rows={6}
                            className="w-full rounded-xl border border-slate-200 p-3 text-xs font-mono text-slate-800 resize-y"
                          />
                        </div>
                      ))}

                      {/* Add section */}
                      <div className="rounded-xl border border-dashed border-slate-300 p-4 space-y-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add section</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500">Section type</Label>
                            <select value={sectionType} onChange={(e) => setSectionType(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
                              {SECTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1.5 sm:col-span-1">
                            <Label className="text-xs text-slate-500">Initial payload (JSON)</Label>
                            <textarea value={sectionContent}
                              onChange={(e) => setSectionContent(e.target.value)}
                              rows={4}
                              className="w-full rounded-xl border border-slate-200 p-3 text-xs font-mono" />
                          </div>
                        </div>
                        <Button size="sm" onClick={handleAddSection} disabled={loading} className="gap-1.5">
                          <Plus className="w-4 h-4" /> Add section
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-slate-400 text-sm">
                    Select a page from the list to edit its sections.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── THEME TAB ──────────────────────────────────────────────── */}
        <TabsContent value="theme" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Site Theme</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Primary color",    key: "PrimaryColor"   },
                  { label: "Secondary color",  key: "SecondaryColor" },
                  { label: "Background color", key: "BackgroundColor"},
                  { label: "Text color",       key: "TextColor"      },
                ].map(({ label, key }) => (
                  <div key={key} className="space-y-2">
                    <Label className="text-sm">{label}</Label>
                    <div className="flex gap-2">
                      <input type="color" value={(theme as any)[key] || "#000000"}
                        onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                        className="h-10 w-14 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0" />
                      <Input value={(theme as any)[key] || ""}
                        onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                        className="font-mono text-sm" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Live preview strip */}
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <div className="h-3" style={{ background: theme.PrimaryColor || "#4f46e5" }} />
                <div className="p-4 flex items-center gap-4" style={{ backgroundColor: theme.BackgroundColor || "#ffffff" }}>
                  <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: theme.PrimaryColor || "#4f46e5" }} />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: theme.TextColor || "#111827" }}>
                      {tenant.Name} — theme preview
                    </p>
                    <p className="text-xs" style={{ color: theme.SecondaryColor || "#6b7280" }}>
                      Secondary / accent color
                    </p>
                  </div>
                  <div className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ backgroundColor: theme.PrimaryColor || "#4f46e5" }}>
                    Button
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveTheme} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save theme"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── FEATURES TAB — reuses Features page scoped to this tenant ── */}
        <TabsContent value="features" className="mt-4">
          <Features />
        </TabsContent>

        <TabsContent value="banners" className="mt-4">
          <HeroBanner />
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="auth" className="mt-4">
            <AuthManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}