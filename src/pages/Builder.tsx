import { useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tenantService } from "@/services/firebase/tenantService";
import { siteService } from "@/services/firebase/siteService";
import { sectionTemplateService } from "@/services/firebase/sectionTemplateService";
import { Site, Tenant, Theme, SectionTemplate } from "@/types";
import AppContext from "../context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Eye, ChevronDown, ChevronUp, Leaf, Shield, Star, Heart, Sparkles, Zap, Globe, Sun, Moon, Wind, Droplets, Flame, Snowflake, Flower2, TreePine, Recycle, Package, Award, CheckCircle, Coffee, Home as HomeIcon, Save, Download } from "lucide-react";

const SECTION_TYPES = ["Hero", "Text", "Features", "Contact"];

const ICON_OPTIONS = [
  { value: 'Leaf', Icon: Leaf }, { value: 'Shield', Icon: Shield },
  { value: 'Star', Icon: Star }, { value: 'Heart', Icon: Heart },
  { value: 'Sparkles', Icon: Sparkles }, { value: 'Zap', Icon: Zap },
  { value: 'Globe', Icon: Globe }, { value: 'Sun', Icon: Sun },
  { value: 'Moon', Icon: Moon }, { value: 'Wind', Icon: Wind },
  { value: 'Droplets', Icon: Droplets }, { value: 'Flame', Icon: Flame },
  { value: 'Snowflake', Icon: Snowflake }, { value: 'Flower2', Icon: Flower2 },
  { value: 'TreePine', Icon: TreePine }, { value: 'Recycle', Icon: Recycle },
  { value: 'Package', Icon: Package }, { value: 'Award', Icon: Award },
  { value: 'CheckCircle', Icon: CheckCircle }, { value: 'Coffee', Icon: Coffee },
  { value: 'Home', Icon: HomeIcon },
];

const getIcon = (name: string) => ICON_OPTIONS.find((o) => o.value === name)?.Icon || Leaf;

const DEFAULT_FEATURES = {
  heading: 'Clean Your Home, Love Your Planet',
  headingHighlight: 'Love Your Planet',
  subheading: 'Experience the perfect balance of powerful cleaning and environmental responsibility.',
  badgeText: 'Award-Winning Formula',
  backgroundColor: '#f9fafb',
  headingColor: '#0f172a',
  highlightColor: '#00e676',
  bodyColor: '#475569',
  badgeBg: '#dcfce7',
  badgeTextColor: '#16a34a',
  cardBg: '#ffffff',
  cardBorder: '#e5e7eb',
  cardRadius: 16,
  iconColor: '#00e676',
  paddingY: 80,
  items: [
    { id: '1', icon: 'Leaf', title: '100% Natural', description: 'Plant-based ingredients' },
    { id: '2', icon: 'Shield', title: 'Non-Toxic', description: 'Safe for kids & pets' },
    { id: '3', icon: 'Sparkles', title: 'Powerful Clean', description: 'Professional results' },
    { id: '4', icon: 'Heart', title: 'Cruelty Free', description: 'Never tested on animals' },
  ],
};

const DEFAULT_ROOMS = {
  heading: 'Shop by Room',
  headingColor: '#0f172a',
  backgroundColor: '#f3f4f6',
  cardRadius: 16,
  paddingY: 80,
  rooms: [] as Array<{ id: string; name: string; productCount: number; categoryId: string; imageUrl: string }>,
};

const uid = () => Math.random().toString(36).slice(2, 9);

const ColorRow = ({ label, value, onChange }: any) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-slate-500">{label}</Label>
    <div className="flex gap-2">
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-14 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0"
      />
      <Input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-gray-50 font-mono text-sm"
      />
    </div>
  </div>
);

const SliderRow = ({ label, value, min, max, onChange, unit = 'px' }: any) => (
  <div className="space-y-1.5">
    <div className="flex justify-between">
      <Label className="text-xs text-slate-500">{label}</Label>
      <span className="text-xs font-mono text-slate-600">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-emerald-500"
    />
  </div>
);

const SectionCard = ({ title, icon: Icon, children, defaultOpen = false, preview }: { title: string; icon: any; children: ReactNode; defaultOpen?: boolean; preview?: ReactNode; }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card style={{ backgroundColor: '#f0f4f8' }}>
      <CardHeader className="flex flex-row items-center justify-between cursor-pointer select-none py-4" onClick={() => setOpen((p) => !p)}>
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <Icon className="w-5 h-5 text-emerald-500 flex-shrink-0" />{title}
        </CardTitle>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </CardHeader>
      {open && (
        <CardContent className="space-y-5 pt-0">
          {preview && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 border-0 border-none">
                <Eye className="w-4 h-4" /> Live Preview
              </div>
              {preview}
            </div>
          )}
          {children}
        </CardContent>
      )}
    </Card>
  );
};

const FeaturesPreview = ({ cfg }: { cfg: typeof DEFAULT_FEATURES }) => (
  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm p-5" style={{ backgroundColor: cfg.backgroundColor }}>
    <div className="text-center mb-4">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-2" style={{ backgroundColor: cfg.badgeBg, color: cfg.badgeTextColor }}>
        <Award className="w-3 h-3" />{cfg.badgeText}
      </div>
      <h2 className="text-sm font-bold mb-1" style={{ color: cfg.headingColor }}>
        {cfg.heading.replace(cfg.headingHighlight, '')}
        <span style={{ color: cfg.highlightColor }}>{cfg.headingHighlight}</span>
      </h2>
      <p className="text-xs" style={{ color: cfg.bodyColor }}>{cfg.subheading.slice(0, 80)}...</p>
    </div>
    <div className="grid grid-cols-4 gap-2">
      {cfg.items.slice(0, 4).map((item) => {
        const Icon = getIcon(item.icon);
        return (
          <div key={item.id} className="border p-3 text-center" style={{ backgroundColor: cfg.cardBg, borderColor: cfg.cardBorder, borderRadius: `${cfg.cardRadius}px` }}>
            <div className="w-8 h-8 mx-auto mb-1.5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cfg.iconColor}20` }}>
              <Icon className="w-4 h-4" style={{ color: cfg.iconColor }} />
            </div>
            <p className="font-semibold text-[10px] mb-0.5 truncate" style={{ color: cfg.headingColor }}>{item.title}</p>
            <p className="text-[9px] truncate" style={{ color: cfg.bodyColor }}>{item.description}</p>
          </div>
        );
      })}
    </div>
  </div>
);

const RoomsPreview = ({ cfg }: { cfg: typeof DEFAULT_ROOMS }) => (
  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm p-4" style={{ backgroundColor: cfg.backgroundColor }}>
    <h2 className="text-sm font-bold mb-3" style={{ color: cfg.headingColor }}>{cfg.heading}</h2>
    {cfg.rooms.length === 0 ? (
      <p className="text-xs text-slate-400 text-center py-4">No room cards yet — add some below or sync from products.</p>
    ) : (
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(cfg.rooms.length, 6)}, 1fr)` }}>
        {cfg.rooms.slice(0, 6).map((room) => (
          <div key={room.id} className="relative overflow-hidden aspect-square" style={{ borderRadius: `${cfg.cardRadius}px` }}>
            {room.imageUrl ? <img src={room.imageUrl} alt={room.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-300 flex items-center justify-center"><HomeIcon className="w-4 h-4 text-slate-400" /></div>}
            <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-1">
              <p className="text-white font-bold text-[8px] leading-tight truncate">{room.name}</p>
              <p className="text-white/70 text-[7px]">{room.productCount} Products</p>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default function Builder() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { globalState } = useContext(AppContext);

  const currentUser = globalState?.AuthenticatedUser || {};
  const isSuperAdmin = currentUser?.role === 'SuperAdmin';
  const currentUserId = currentUser?.uid || currentUser?.email || currentUser?.userId || "";
  const currentTenantId = currentUser?.tenantId || "";

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [sectionType, setSectionType] = useState<string>(SECTION_TYPES[0]);
  const [sectionContent, setSectionContent] = useState<string>("{}");
  const [theme, setTheme] = useState<Theme>({ PrimaryColor: "", SecondaryColor: "", BackgroundColor: "", TextColor: "" });
  const [loading, setLoading] = useState(false);
  const [featuresConfig, setFeaturesConfig] = useState<typeof DEFAULT_FEATURES>(DEFAULT_FEATURES);
  const [roomsConfig, setRoomsConfig] = useState<typeof DEFAULT_ROOMS>(DEFAULT_ROOMS);
  const [sectionTemplates, setSectionTemplates] = useState<SectionTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  const selectedPage = useMemo(() => site?.Pages?.find((page) => page.Id === selectedPageId) ?? null, [site, selectedPageId]);
  const previewUrl = tenant?.CustomDomain || (tenant?.Subdomain ? `https://${tenant.Subdomain}.plantfresh.app` : "");
  const canEdit = isSuperAdmin || tenant?.OwnerId === currentUserId || tenant?.Id === currentTenantId;

  useEffect(() => {
    if (!tenantId) return;

    const loadTenantAndSite = async () => {
      try {
        setLoading(true);
        const [tenantRecord, siteRecord] = await Promise.all([
          tenantService.getTenant(tenantId as string),
          siteService.getSite(tenantId as string),
        ]);

        if (!tenantRecord) {
          toast({ title: "Not found", description: "Tenant not found.", variant: "destructive" });
          navigate("/tenants");
          return;
        }

        setTenant(tenantRecord);
        setSite(siteRecord);
      } catch (error) {
        console.error(error);
        toast({ title: "Load failed", description: "Unable to load tenant or site.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    loadTenantAndSite();
  }, [tenantId, navigate, toast]);

  useEffect(() => {
    if (!site) return;

    if (site.Pages.length) {
      setSelectedPageId((current) => current || site.Pages[0].Id);
    }

    setTheme({
      PrimaryColor: site.Theme.PrimaryColor || "",
      SecondaryColor: site.Theme.SecondaryColor || "",
      BackgroundColor: site.Theme.BackgroundColor || "",
      TextColor: site.Theme.TextColor || "",
    });

    const extracted = site.Pages.flatMap((page) => page.Sections.map((section) => ({ page, section })));
    const featureSection = extracted.find(({ section }) => section.Type === 'Features');
    const roomSection = extracted.find(({ section }) => section.Type === 'Rooms');

    if (featureSection) {
      setFeaturesConfig({ ...DEFAULT_FEATURES, ...featureSection.section.Content } as typeof DEFAULT_FEATURES);
    } else {
      setFeaturesConfig(DEFAULT_FEATURES);
    }

    if (roomSection) {
      setRoomsConfig({ ...DEFAULT_ROOMS, ...roomSection.section.Content } as typeof DEFAULT_ROOMS);
    } else {
      setRoomsConfig(DEFAULT_ROOMS);
    }
  }, [site]);

  useEffect(() => {
    const defaults: Record<string, string> = {
      Hero: JSON.stringify({ heading: "Welcome to your store", subtitle: "Share your brand story.", buttonText: "Shop now" }, null, 2),
      Text: JSON.stringify({ heading: "About us", body: "Describe your business and mission." }, null, 2),
      Features: JSON.stringify({ items: ["Fast shipping", "Organic products", "24/7 support"] }, null, 2),
      Contact: JSON.stringify({ email: "hello@example.com", phone: "123-456-7890", address: "Your address here" }, null, 2),
    };
    setSectionContent(defaults[sectionType] || "{}");
  }, [sectionType]);

  useEffect(() => {
    if (!tenantId) return;
    const loadTemplates = async () => {
      try {
        const templates = await sectionTemplateService.getTenantSectionTemplates(tenantId as string);
        setSectionTemplates(templates);
      } catch (error) {
        console.error("Failed to load section templates:", error);
      }
    };
    loadTemplates();
  }, [tenantId]);

  const refreshSite = async () => {
    if (!tenantId) return;
    const latest = await siteService.getSite(tenantId);
    setSite(latest);
  };

  const handlePublishToggle = async () => {
    if (!tenant || !site) return;
    const nextStatus = !site.Published;
    setLoading(true);
    try {
      await siteService.publishSite(tenantId as string, nextStatus);
      await refreshSite();
      toast({ title: "Site updated", description: `Site is now ${nextStatus ? "published" : "unpublished"}.` });
    } catch (error) {
      console.error(error);
      toast({ title: "Publish failed", description: "Unable to update publish status.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPage = async () => {
    if (!tenant || !newPageTitle || !newPageSlug) {
      toast({ title: "Missing fields", description: "Please add a page title and slug.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await siteService.addPage(tenantId as string, { Title: newPageTitle, Slug: newPageSlug, Sections: [] });
      await refreshSite();
      setNewPageTitle("");
      setNewPageSlug("");
      toast({ title: "Page added", description: `${newPageTitle} has been created.` });
    } catch (error) {
      console.error(error);
      toast({ title: "Add failed", description: "Unable to create page.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTheme = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      await siteService.updateSiteTheme(tenantId as string, {
        PrimaryColor: theme.PrimaryColor,
        SecondaryColor: theme.SecondaryColor,
        BackgroundColor: theme.BackgroundColor,
        TextColor: theme.TextColor,
        FontFamily: site?.Theme?.FontFamily || "Inter, sans-serif",
      });
      await refreshSite();
      toast({ title: "Theme saved", description: "Site theme updated." });
    } catch (error) {
      console.error(error);
      toast({ title: "Save failed", description: "Unable to save theme.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSection = async () => {
    if (!selectedPage || !tenant) return;
    let parsedContent: Record<string, unknown>;
    try {
      parsedContent = JSON.parse(sectionContent) as Record<string, unknown>;
    } catch (error) {
      toast({ title: "Invalid section JSON", description: "Please provide valid JSON for section content.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await siteService.addSection(tenantId as string, selectedPage.Id, {
        Type: sectionType,
        Content: parsedContent,
        Order: selectedPage.Sections.length + 1,
      });
      await refreshSite();
      toast({ title: "Section added", description: `${sectionType} section has been added.` });
    } catch (error) {
      console.error(error);
      toast({ title: "Add failed", description: "Unable to create section.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePage = async () => {
    if (!selectedPage || !tenant) return;
    setLoading(true);
    try {
      await siteService.updatePage(tenantId as string, selectedPage.Id, {
        Title: selectedPage.Title,
        Slug: selectedPage.Slug,
      });
      await refreshSite();
      toast({ title: "Page saved", description: "Page settings updated." });
    } catch (error) {
      console.error(error);
      toast({ title: "Save failed", description: "Unable to save page.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSection = async (sectionId: string, updatedContent: Record<string, unknown>) => {
    if (!selectedPage || !tenant) return;
    setLoading(true);
    try {
      await siteService.updateSection(tenantId as string, selectedPage.Id, sectionId, {
        Content: updatedContent,
      });
      await refreshSite();
      toast({ title: "Section saved", description: "Section content updated." });
    } catch (error) {
      console.error(error);
      toast({ title: "Update failed", description: "Unable to save section.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!tenant) return;
    if (!confirm("Delete this page? This cannot be undone.")) return;
    setLoading(true);
    try {
      await siteService.deletePage(tenantId as string, pageId);
      await refreshSite();
      setSelectedPageId("");
      toast({ title: "Page deleted", description: "Page has been removed." });
    } catch (error) {
      console.error(error);
      toast({ title: "Delete failed", description: "Unable to delete page.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveFeaturePanels = async () => {
    if (!tenant || !site) return;
    setLoading(true);
    try {
      const workingPages = [...site.Pages];
      let featurePage = workingPages.find((page) => page.Slug === 'features' || page.Title.toLowerCase().includes('feature'));
      if (!featurePage) {
        featurePage = { Id: uid(), Title: 'Features', Slug: 'features', Sections: [] };
        workingPages.push(featurePage);
      }

      const updateOrCreateSection = (type: string, content: unknown) => {
        const existing = featurePage!.Sections.find((section) => section.Type === type);
        if (existing) {
          existing.Content = content as Record<string, unknown>;
        } else {
          featurePage!.Sections.push({ Id: uid(), Type: type, Content: content as Record<string, unknown>, Order: featurePage!.Sections.length + 1 });
        }
      };

      updateOrCreateSection('Features', featuresConfig);
      updateOrCreateSection('Rooms', roomsConfig);

      await siteService.updateSite(tenantId as string, { Pages: workingPages });
      await refreshSite();
      toast({ title: 'Site updated', description: 'Features and room sections were saved.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Save failed', description: 'Unable to persist features and room settings.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const addFeatureItem = () => setFeaturesConfig((prev) => ({ ...prev, items: [...prev.items, { id: uid(), icon: 'Leaf', title: 'New Feature', description: 'Description here' }] }));
  const removeFeatureItem = (id: string) => setFeaturesConfig((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
  const updateFeatureItem = (id: string, key: string, value: string) => {
    setFeaturesConfig((prev) => ({ ...prev, items: prev.items.map((item) => item.id === id ? { ...item, [key]: value } : item) }));
  };

  const addRoom = () => setRoomsConfig((prev) => ({ ...prev, rooms: [...prev.rooms, { id: uid(), name: 'New Room', productCount: 0, categoryId: '', imageUrl: '' }] }));
  const removeRoom = (id: string) => setRoomsConfig((prev) => ({ ...prev, rooms: prev.rooms.filter((room) => room.id !== id) }));
  const updateRoom = (id: string, key: string, value: string | number) => setRoomsConfig((prev) => ({
    ...prev,
    rooms: prev.rooms.map((room) => room.id === id ? { ...room, [key]: value } : room),
  }));

  const handleSaveTemplate = async () => {
    if (!tenantId || !templateName) {
      toast({ title: "Missing fields", description: "Please provide a template name.", variant: "destructive" });
      return;
    }

    let contentToSave: Record<string, unknown>;
    try {
      contentToSave = JSON.parse(sectionContent) as Record<string, unknown>;
    } catch (error) {
      toast({ title: "Invalid JSON", description: "Section content is not valid JSON.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const templateId = await sectionTemplateService.createSectionTemplate({
        TenantId: tenantId as string,
        Name: templateName,
        Description: templateDescription,
        Type: sectionType,
        Content: contentToSave,
        CreatedBy: currentUserId,
      });

      setSectionTemplates((prev) => [
        ...prev,
        {
          Id: templateId,
          TenantId: tenantId as string,
          Name: templateName,
          Description: templateDescription,
          Type: sectionType,
          Content: contentToSave,
          CreatedAt: new Date(),
          CreatedBy: currentUserId,
        },
      ]);

      setTemplateName("");
      setTemplateDescription("");
      toast({ title: "Template saved", description: `Section template "${templateName}" has been saved.` });
    } catch (error) {
      console.error(error);
      toast({ title: "Save failed", description: "Unable to save section template.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTemplate = (template: SectionTemplate) => {
    setSectionContent(JSON.stringify(template.Content, null, 2));
    setSectionType(template.Type);
    toast({ title: "Template loaded", description: `Loaded template: ${template.Name}` });
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Delete this section template? This cannot be undone.")) return;

    setLoading(true);
    try {
      await sectionTemplateService.deleteSectionTemplate(templateId);
      setSectionTemplates((prev) => prev.filter((t) => t.Id !== templateId));
      toast({ title: "Template deleted", description: "Section template has been removed." });
    } catch (error) {
      console.error(error);
      toast({ title: "Delete failed", description: "Unable to delete section template.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!tenant || !site) {
    return (
      <div className="p-4">
        <div className="text-xl font-semibold">Loading tenant builder…</div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="text-sm text-slate-600">You do not have permission to edit this tenant. Only the tenant owner or a SuperAdmin can modify this site.</p>
        <Button variant="secondary" onClick={() => navigate('/tenants')}>Back to tenant list</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Site Builder for {tenant.Name}</h1>
          <p className="text-sm text-slate-600">Edit pages, theme, and rich feature sections for this tenant.</p>
          {previewUrl && (
            <p className="mt-2 text-sm text-slate-500">Preview URL: <a href={previewUrl} target="_blank" rel="noreferrer" className="text-green-600 hover:underline">{previewUrl}</a></p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handlePublishToggle} disabled={loading}>
            {site.Published ? 'Unpublish site' : 'Publish site'}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/tenants')}>Back to tenants</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Pages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {site.Pages.map((page) => (
              <button
                key={page.Id}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selectedPageId === page.Id ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                onClick={() => setSelectedPageId(page.Id)}
              >
                <div className="font-semibold">{page.Title}</div>
                <div className="text-sm text-slate-500">/{page.Slug}</div>
              </button>
            ))}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-page-title">Page title</Label>
                <Input id="new-page-title" value={newPageTitle} onChange={(event) => setNewPageTitle(event.target.value)} placeholder="Shop page" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-page-slug">Page slug</Label>
                <Input id="new-page-slug" value={newPageSlug} onChange={(event) => setNewPageSlug(event.target.value)} placeholder="shop" />
              </div>
              <Button onClick={handleAddPage} disabled={loading}>Add page</Button>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Primary color</Label>
                <Input id="primary-color" type="color" value={theme.PrimaryColor} onChange={(event) => setTheme({ ...theme, PrimaryColor: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary-color">Secondary color</Label>
                <Input id="secondary-color" type="color" value={theme.SecondaryColor} onChange={(event) => setTheme({ ...theme, SecondaryColor: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="background-color">Background color</Label>
                <Input id="background-color" type="color" value={theme.BackgroundColor} onChange={(event) => setTheme({ ...theme, BackgroundColor: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="text-color">Text color</Label>
                <Input id="text-color" type="color" value={theme.TextColor} onChange={(event) => setTheme({ ...theme, TextColor: event.target.value })} />
              </div>
            </CardContent>
            <div className="flex justify-end p-4">
              <Button onClick={handleSaveTheme} disabled={loading}>Save theme</Button>
            </div>
          </Card>

          {selectedPage ? (
            <Card>
              <CardHeader>
                <CardTitle>Page settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="page-title">Title</Label>
                    <Input id="page-title" value={selectedPage.Title} onChange={(event) => {
                      const updated = { ...selectedPage, Title: event.target.value };
                      setSite((current) => current ? { ...current, Pages: current.Pages.map((page) => page.Id === selectedPage.Id ? updated : page) } : current);
                    }} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="page-slug">Slug</Label>
                    <Input id="page-slug" value={selectedPage.Slug} onChange={(event) => {
                      const updated = { ...selectedPage, Slug: event.target.value };
                      setSite((current) => current ? { ...current, Pages: current.Pages.map((page) => page.Id === selectedPage.Id ? updated : page) } : current);
                    }} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="destructive" onClick={() => handleDeletePage(selectedPage.Id)} disabled={loading}>Delete page</Button>
                  <Button onClick={handleSavePage} disabled={loading}>Save page</Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {selectedPage ? (
            <Card>
              <CardHeader>
                <CardTitle>Sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPage.Sections.map((section) => (
                  <div key={section.Id} className="rounded-2xl border border-slate-200 p-4 bg-white">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="text-sm font-semibold">{section.Type}</div>
                        <div className="text-xs text-slate-500">ID: {section.Id}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={async () => {
                        if (!tenant) return;
                        await handleUpdateSection(section.Id, section.Content);
                      }}>
                        Save section
                      </Button>
                    </div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Content JSON</label>
                    <textarea
                      value={JSON.stringify(section.Content, null, 2)}
                      onChange={(event) => {
                        const content = event.target.value;
                        setSite((current) => current ? {
                          ...current,
                          Pages: current.Pages.map((page) => page.Id === selectedPage.Id ? {
                            ...page,
                            Sections: page.Sections.map((sec) => sec.Id === section.Id ? { ...sec, Content: tryParseJson(content, sec.Content) } : sec)
                          } : page)
                        } : current);
                      }}
                      rows={8}
                      className="w-full rounded-2xl border border-slate-200 p-3 text-sm font-mono text-slate-900"
                    />
                  </div>
                ))}
                <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="section-type">Section type</Label>
                      <select
                        id="section-type"
                        value={sectionType}
                        onChange={(event) => setSectionType(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      >
                        {SECTION_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="section-content">Initial section payload</Label>
                      <textarea
                        id="section-content"
                        rows={8}
                        className="w-full rounded-2xl border border-slate-200 p-3 text-sm font-mono text-slate-900"
                        value={sectionContent}
                        onChange={(event) => setSectionContent(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button onClick={handleAddSection} disabled={loading}>Add section</Button>
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Save as template</Label>
                    <div className="grid gap-2 md:grid-cols-2">
                      <Input
                        placeholder="Template name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="bg-white"
                      />
                      <Input
                        placeholder="Brief description (optional)"
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <Button onClick={handleSaveTemplate} disabled={loading} variant="outline" className="w-full gap-1.5">
                      <Save className="w-4 h-4" />Save section as template
                    </Button>
                  </div>

                  {sectionTemplates.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                      <Label className="text-sm font-semibold">Saved templates</Label>
                      <div className="space-y-1.5">
                        {sectionTemplates.map((template) => (
                          <div key={template.Id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{template.Name}</div>
                              <div className="text-xs text-slate-500 truncate">{template.Type} — {template.Description}</div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleLoadTemplate(template)}
                                disabled={loading}
                                className="gap-1"
                              >
                                <Download className="w-3 h-3" />Load
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteTemplate(template.Id || "")}
                                disabled={loading}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4">
        <SectionCard title="Features Section" icon={Sparkles} preview={<FeaturesPreview cfg={featuresConfig} />} defaultOpen={true}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-xs text-slate-500">Badge Text</Label><Input value={featuresConfig.badgeText} onChange={(e) => setFeaturesConfig((prev) => ({ ...prev, badgeText: e.target.value }))} className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-slate-500">Main Heading</Label><Input value={featuresConfig.heading} onChange={(e) => setFeaturesConfig((prev) => ({ ...prev, heading: e.target.value }))} className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-slate-500">Highlighted Part</Label><Input value={featuresConfig.headingHighlight} onChange={(e) => setFeaturesConfig((prev) => ({ ...prev, headingHighlight: e.target.value }))} className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-slate-500">Subheading</Label><Input value={featuresConfig.subheading} onChange={(e) => setFeaturesConfig((prev) => ({ ...prev, subheading: e.target.value }))} className="bg-white" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t pt-4">
            <ColorRow label="Section Background" value={featuresConfig.backgroundColor} onChange={(v: string) => setFeaturesConfig((prev) => ({ ...prev, backgroundColor: v }))} />
            <ColorRow label="Heading Color" value={featuresConfig.headingColor} onChange={(v: string) => setFeaturesConfig((prev) => ({ ...prev, headingColor: v }))} />
            <ColorRow label="Highlight Color" value={featuresConfig.highlightColor} onChange={(v: string) => setFeaturesConfig((prev) => ({ ...prev, highlightColor: v }))} />
            <ColorRow label="Body Text" value={featuresConfig.bodyColor} onChange={(v: string) => setFeaturesConfig((prev) => ({ ...prev, bodyColor: v }))} />
            <ColorRow label="Badge Background" value={featuresConfig.badgeBg} onChange={(v: string) => setFeaturesConfig((prev) => ({ ...prev, badgeBg: v }))} />
            <ColorRow label="Badge Text" value={featuresConfig.badgeTextColor} onChange={(v: string) => setFeaturesConfig((prev) => ({ ...prev, badgeTextColor: v }))} />
            <ColorRow label="Card Background" value={featuresConfig.cardBg} onChange={(v: string) => setFeaturesConfig((prev) => ({ ...prev, cardBg: v }))} />
            <ColorRow label="Card Border" value={featuresConfig.cardBorder} onChange={(v: string) => setFeaturesConfig((prev) => ({ ...prev, cardBorder: v }))} />
            <ColorRow label="Icon Color" value={featuresConfig.iconColor} onChange={(v: string) => setFeaturesConfig((prev) => ({ ...prev, iconColor: v }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t pt-4">
            <SliderRow label="Card Border Radius" value={featuresConfig.cardRadius} min={0} max={32} onChange={(v: number) => setFeaturesConfig((prev) => ({ ...prev, cardRadius: v }))} />
            <SliderRow label="Section Padding" value={featuresConfig.paddingY} min={20} max={160} onChange={(v: number) => setFeaturesConfig((prev) => ({ ...prev, paddingY: v }))} />
          </div>
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Feature Items</Label>
              <Button size="sm" variant="outline" onClick={addFeatureItem} className="gap-1.5"><Plus className="w-4 h-4" />Add Item</Button>
            </div>
            {featuresConfig.items.map((item, idx) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Item {idx + 1}</span>
                  <button onClick={() => removeFeatureItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs text-slate-500">Title</Label><Input value={item.title} onChange={(e) => updateFeatureItem(item.id, 'title', e.target.value)} className="bg-gray-50" /></div>
                  <div className="space-y-1.5"><Label className="text-xs text-slate-500">Description</Label><Input value={item.description} onChange={(e) => updateFeatureItem(item.id, 'description', e.target.value)} className="bg-gray-50" /></div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Icon</Label>
                    <div className="grid grid-cols-6 gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-200 max-h-28 overflow-y-auto">
                      {ICON_OPTIONS.map(({ value, Icon: Ico }) => (
                        <button key={value} type="button" onClick={() => updateFeatureItem(item.id, 'icon', value)} className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${item.icon === value ? 'bg-emerald-100 ring-2 ring-emerald-500' : 'hover:bg-gray-200'}`}>
                          <Ico className="w-4 h-4" style={{ color: item.icon === value ? featuresConfig.iconColor : '#64748b' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Shop by Room / Category" icon={HomeIcon} preview={<RoomsPreview cfg={roomsConfig} />} defaultOpen={true}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-xs text-slate-500">Section Heading</Label><Input value={roomsConfig.heading} onChange={(e) => setRoomsConfig((prev) => ({ ...prev, heading: e.target.value }))} className="bg-white" /></div>
            <ColorRow label="Heading Color" value={roomsConfig.headingColor} onChange={(v: string) => setRoomsConfig((prev) => ({ ...prev, headingColor: v }))} />
            <ColorRow label="Section Background" value={roomsConfig.backgroundColor} onChange={(v: string) => setRoomsConfig((prev) => ({ ...prev, backgroundColor: v }))} />
          </div>
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Rooms</Label>
              <Button size="sm" variant="outline" onClick={addRoom} className="gap-1.5"><Plus className="w-4 h-4" />Add Room</Button>
            </div>
            {roomsConfig.rooms.map((room, idx) => (
              <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Room {idx + 1}</span>
                  <button onClick={() => removeRoom(room.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs text-slate-500">Name</Label><Input value={room.name} onChange={(e) => updateRoom(room.id, 'name', e.target.value)} className="bg-gray-50" /></div>
                  <div className="space-y-1.5"><Label className="text-xs text-slate-500">Products</Label><Input type="number" value={room.productCount} onChange={(e) => updateRoom(room.id, 'productCount', Number(e.target.value))} className="bg-gray-50" /></div>
                  <div className="space-y-1.5"><Label className="text-xs text-slate-500">Image URL</Label><Input value={room.imageUrl} onChange={(e) => updateRoom(room.id, 'imageUrl', e.target.value)} className="bg-gray-50" /></div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="flex justify-end">
          <Button onClick={saveFeaturePanels} disabled={loading}>Save feature sections</Button>
        </div>
      </div>
    </div>
  );
}

function tryParseJson(value: string, fallback: Record<string, unknown>) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return fallback;
  }
}
