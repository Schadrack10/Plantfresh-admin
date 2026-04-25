import { useState, useContext, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AppContext from "../context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  Trash2, Plus, Eye, Play, Pause, SkipForward, SkipBack,
  ImageIcon, Palette, LayoutDashboard, Pencil, ChevronLeft,
  Upload, Loader2, AlertCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ViewMode = "overview" | "editor";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getContrastingTextColor = (hexColor: string) => {
  if (!hexColor) return "#ffffff";
  const hex = hexColor.replace("#", "");
  if (hex.length < 6) return "#ffffff";
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? "#000000" : "#ffffff";
};

const PLACEHOLDER = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200";

const safeImageSrc = (url: string) => {
  if (!url) return PLACEHOLDER;
  if (url.startsWith("data:") && url.length < 500) return PLACEHOLDER;
  return url;
};

const getBannerBgStyle = (banner: any) => {
  if (!banner) return { backgroundColor: "#10b981" };
  if (banner.gradientEnabled) {
    return {
      backgroundImage: `linear-gradient(${banner.gradientDirection || "to right"}, ${banner.gradientColor1 || "#10b981"}, ${banner.gradientColor2 || "#06b6d4"})`,
    };
  }
  return { backgroundColor: banner.backgroundColor || "#10b981" };
};

// Banner page key resolver — matches whatever key exists in the site doc
const resolvePageKey = (pageName: string, cfg: any): string => {
  if (!cfg) return `${pageName}Customization`;
  const candidates = [
    `${pageName}Customization`,
    `${pageName.toLowerCase()}Customization`,
    pageName,
    pageName.toLowerCase(),
  ];
  for (const key of candidates) {
    if (key in cfg) return key;
  }
  return `${pageName}Customization`;
};

// ─── Overview Card ────────────────────────────────────────────────────────────
interface CardProps {
  page: { name: string; type: string };
  config: any;
  onEdit: (name: string) => void;
}

const OverviewBannerCard = ({ page, config, onEdit }: CardProps) => {
  const pageKey = resolvePageKey(page.name, config);
  const pageConfig = config?.[pageKey] ?? null;
  const slides: any[] = pageConfig?.carouselSliders ?? [];
  const banner: any = pageConfig?.banner ?? {};
  const slideCount = slides.length;
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    if (page.type !== "carousel" || slideCount <= 1) return;
    const t = setInterval(() => setSlideIdx(p => (p + 1) % slideCount), 3500);
    return () => clearInterval(t);
  }, [slideCount, page.type]);

  const slide = slides[slideIdx] ?? slides[0];

  return (
    <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200">
      {page.type === "carousel" && slide ? (
        <div className="relative w-full h-52 bg-slate-800">
          <img src={safeImageSrc(slide.imageURL)} alt={slide.bannerHeading ?? "slide"}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-0 flex items-center px-6">
            <div>
              <h2 className="text-xl font-bold text-white leading-tight line-clamp-1">
                {slide.bannerHeading || "Banner Heading"}
              </h2>
              <p className="text-sm text-white/80 mt-1 line-clamp-1">{slide.bannerSmallHeading || "Subtitle"}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {slide.Button1?.title && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: slide.Button1.color || "#10b981", color: slide.Button1.textColor || getContrastingTextColor(slide.Button1.color) }}>
                    {slide.Button1.title}
                  </span>
                )}
              </div>
            </div>
          </div>
          {slideCount > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {slides.map((_: any, i: number) => (
                <div key={i} onClick={() => setSlideIdx(i)}
                  className={`h-1.5 rounded-full cursor-pointer transition-all ${i === slideIdx ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full h-52 flex flex-col items-center justify-center text-center px-6"
          style={getBannerBgStyle(banner)}>
          <h2 className="text-xl font-bold text-white line-clamp-1">{banner.bannerHeading || `${page.name} Banner`}</h2>
          <p className="text-sm text-white/80 mt-1 line-clamp-2">{banner.bannerSmallHeading || "Subtitle"}</p>
        </div>
      )}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-100">
        <div>
          <p className="font-semibold text-sm text-slate-800">{page.name} Page</p>
          <p className="text-xs text-slate-500">
            {page.type === "carousel" ? `${slideCount} slide${slideCount !== 1 ? "s" : ""}` : "Static banner"}
          </p>
        </div>
        <Button size="sm" onClick={() => onEdit(page.name)} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5">
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HeroBanner() {
  const { globalState, db, storage } = useContext(AppContext);
  const { toast } = useToast();

  const activeTenant = (globalState as any)?.activeTenant;
  const tenantId = activeTenant?.Id;

  const [config, setConfig] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [activePage, setActivePage] = useState("Home");
  const [activeTab, setActiveTab] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [showTextAnimation, setShowTextAnimation] = useState(true);
  const autoPlayRef = useRef<any>(null);

  const slideAnimations = [
    { value: "fade", label: "Fade" }, { value: "slide", label: "Slide" },
    { value: "cube", label: "Cube" }, { value: "flip", label: "Flip" },
  ];

  const textAnimations = [
    { value: "fadeIn", label: "Fade In" }, { value: "slideUp", label: "Slide Up" },
    { value: "slideDown", label: "Slide Down" }, { value: "zoom", label: "Zoom In" },
  ];

  const pages = [
    { name: "Home", type: "carousel" },
    { name: "About", type: "static" },
    { name: "Blog", type: "static" },
    { name: "Contact", type: "static" },
  ];

  const gradientDirections = [
    { value: "to right", label: "Left → Right" }, { value: "to left", label: "Right → Left" },
    { value: "to bottom", label: "Top → Bottom" }, { value: "to top", label: "Bottom → Top" },
    { value: "to bottom right", label: "Diagonal ↘" },
  ];

  // ── Load from Sites/{tenantId} ────────────────────────────────────────────
  useEffect(() => {
    if (!db || !tenantId) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'Sites', tenantId));
        setConfig(snap.exists() ? snap.data() : {});
      } catch (err) {
        console.error('HeroBanner load error:', err);
        toast({ title: 'Could not load banner config', variant: 'destructive' });
        setConfig({});
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, tenantId]);

  // ── Config helpers ────────────────────────────────────────────────────────
  const handleChange = (path: string, value: any) => {
    setConfig((prev: any) => {
      const updated = structuredClone(prev);
      const keys = path.split(".");
      let obj: any = updated;
      keys.slice(0, -1).forEach(k => { if (!obj[k]) obj[k] = {}; obj = obj[k]; });
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const getPageConfig = (page = activePage) => config?.[resolvePageKey(page, config)] ?? null;
  const isCarouselPage = (page = activePage) => page === "Home";
  const getSlides = (page = activePage): any[] => getPageConfig(page)?.carouselSliders ?? [];
  const getCurrentSlides = () => getSlides(activePage);
  const getBanner = (page = activePage) => !isCarouselPage(page) ? (getPageConfig(page)?.banner ?? {}) : {};
  const getCurrentBanner = () => getBanner(activePage);
  const getCurrentAnimation = () => getPageConfig()?.slideAnimation ?? "fade";

  const updatePageConfig = (updates: any) => {
    const key = resolvePageKey(activePage, config);
    handleChange(key, { ...getPageConfig(), ...updates });
  };

  const updateBannerField = (field: string, value: any) => {
    const key = resolvePageKey(activePage, config);
    handleChange(`${key}.banner`, { ...getCurrentBanner(), [field]: value });
  };

  const createEmptySlide = () => ({
    imageURL: PLACEHOLDER,
    bannerHeading: "New Slide",
    bannerSmallHeading: "Add your description here",
    Button1: { title: "Shop Now", color: "#10b981", link: "/products" },
    Button2: { title: "Learn More", color: "#ffffff", textColor: "#000000", link: "/about" },
    textAnimation: "fadeIn",
  });

  const addSlide = () => {
    const newSlides = [...getCurrentSlides(), createEmptySlide()];
    updatePageConfig({ carouselSliders: newSlides });
    setActiveTab(String(newSlides.length - 1));
  };

  const removeSlide = (index: number) => {
    const slides = getCurrentSlides();
    if (slides.length === 1) { toast({ title: 'Need at least one slide', variant: 'destructive' }); return; }
    updatePageConfig({ carouselSliders: slides.filter((_: any, i: number) => i !== index) });
    setActiveTab("0");
    if (previewSlideIndex >= slides.length - 1) setPreviewSlideIndex(0);
  };

  const updateSlideField = (index: number, field: string, value: any) => {
    const newSlides = [...getCurrentSlides()];
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      newSlides[index] = { ...newSlides[index], [parent]: { ...newSlides[index][parent], [child]: value } };
    } else {
      newSlides[index] = { ...newSlides[index], [field]: value };
    }
    updatePageConfig({ carouselSliders: newSlides });
  };

  // ── Image upload → Firebase Storage + Assets collection ──────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;
    if (!storage) {
      toast({ title: "Firebase Storage not connected", variant: "destructive" });
      return;
    }
    try {
      setUploadingIndex(index);
      setUploadProgress(0);
      const fileName = `${Date.now()}_${file.name}`;
      const storagePath = `assets/${tenantId}/banners/${fileName}`;
      const storageRef = ref(storage, storagePath);
      const task = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        task.on("state_changed",
          snap => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => {
            const downloadURL = await getDownloadURL(task.snapshot.ref);
            // Save to Assets collection
            await addDoc(collection(db, 'Assets'), {
              TenantId: tenantId,
              URL: downloadURL,
              Type: 'banner',
              FileName: fileName,
              StoragePath: storagePath,
              CreatedAt: serverTimestamp(),
            });
            updateSlideField(index, "imageURL", downloadURL);
            resolve();
          }
        );
      });
      toast({ title: "Image uploaded" });
    } catch (err) {
      console.error("Upload error:", err);
      toast({ title: "❌ Upload failed", variant: "destructive" });
    } finally {
      setUploadingIndex(null);
      setUploadProgress(0);
    }
  };

  // ── Save to Sites/{tenantId} ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!db || !tenantId) {
      toast({ title: 'No active tenant', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, 'Sites', tenantId), {
        ...config,
        TenantId: tenantId,
        UpdatedAt: new Date(),
      }, { merge: true });
      toast({ title: "Saved", description: `Banner config updated for ${activeTenant?.Name}.` });
    } catch (err) {
      console.error("Save error:", err);
      toast({ title: "❌ Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Preview helpers ───────────────────────────────────────────────────────
  const triggerTextAnim = () => { setShowTextAnimation(false); setTimeout(() => setShowTextAnimation(true), 50); };
  const nextSlide = () => { setPreviewSlideIndex(p => (p + 1) % getCurrentSlides().length); triggerTextAnim(); };
  const prevSlide = () => { const l = getCurrentSlides().length; setPreviewSlideIndex(p => (p - 1 + l) % l); triggerTextAnim(); };

  useEffect(() => {
    if (!isCarouselPage()) return;
    if (isPlaying && getCurrentSlides().length > 1) { autoPlayRef.current = setInterval(nextSlide, 5000); }
    else { clearInterval(autoPlayRef.current); }
    return () => clearInterval(autoPlayRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, activePage, config]);

  useEffect(() => { setActiveTab("0"); setPreviewSlideIndex(0); setIsPlaying(false); }, [activePage]);
  useEffect(() => {
    const idx = parseInt(activeTab);
    if (!isNaN(idx) && idx !== previewSlideIndex) { setPreviewSlideIndex(idx); triggerTextAnim(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const getTextClass = (type: string, active: boolean) => {
    const base = "transition-all duration-500 ease-out";
    if (!active) return type === "zoom" ? "opacity-0 scale-90" : type.startsWith("slide") ? `opacity-0 ${type === "slideUp" ? "translate-y-8" : "-translate-y-8"}` : "opacity-0";
    return type === "zoom" ? `${base} opacity-100 scale-100` : type.startsWith("slide") ? `${base} opacity-100 translate-y-0` : `${base} opacity-100`;
  };

  const heroSlides = getCurrentSlides();
  const staticBanner = getCurrentBanner();
  const currentSlide = heroSlides[previewSlideIndex] ?? heroSlides[0];

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!tenantId) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <p className="font-semibold text-slate-700">No tenant selected</p>
          <p className="text-sm text-slate-500">Select a tenant from the sidebar to manage banners.</p>
        </div>
      </div>
    );
  }

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading {activeTenant?.Name} banners…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {viewMode === "editor" && (
            <Button variant="outline" size="sm" onClick={() => setViewMode("overview")} className="gap-1.5">
              <ChevronLeft className="w-4 h-4" /> All Banners
            </Button>
          )}
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {viewMode === "overview" ? "Banner Manager" : `Editing: ${activePage}`}
            </h2>
            <p className="text-xs text-slate-500">
              {activeTenant?.Name} · <span className="font-mono">Sites/{tenantId}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex border rounded-lg overflow-hidden">
            {(["overview", "editor"] as ViewMode[]).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 capitalize transition-colors
                  ${viewMode === m ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
                {m === "overview" ? <LayoutDashboard className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                {m}
              </button>
            ))}
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
            {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving…</> : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Overview */}
      {viewMode === "overview" && (
        <div className="space-y-4">
          <p className="text-slate-500 text-sm">Click <strong>Edit</strong> to customise each page banner.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pages.map(page => (
              <OverviewBannerCard key={page.name} page={page} config={config}
                onEdit={name => { setActivePage(name); setViewMode("editor"); }} />
            ))}
          </div>
        </div>
      )}

      {/* Editor */}
      {viewMode === "editor" && (
        <>
          {/* Page selector */}
          <Card style={{ backgroundColor: "#f0f4f8" }}>
            <CardHeader><CardTitle className="text-lg">Select Page</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {pages.map(page => (
                  <Button key={page.name} variant={activePage === page.name ? "default" : "outline"}
                    onClick={() => setActivePage(page.name)}
                    className={`gap-2 ${activePage === page.name ? "bg-emerald-500 hover:bg-emerald-600" : ""}`}>
                    {page.type === "carousel" ? <ImageIcon className="w-4 h-4" /> : <Palette className="w-4 h-4" />}
                    {page.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Carousel editor */}
          {isCarouselPage() && (
            <>
              <Card style={{ backgroundColor: "#f0f4f8" }}>
                <CardHeader><CardTitle className="text-lg">Slide Transition</CardTitle></CardHeader>
                <CardContent>
                  <div className="max-w-xs">
                    <Select value={getCurrentAnimation()} onValueChange={v => updatePageConfig({ slideAnimation: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {slideAnimations.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card style={{ backgroundColor: "#f0f4f8" }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Carousel Slides ({heroSlides.length})</CardTitle>
                    <Button onClick={addSlide} size="sm" className="bg-emerald-500 hover:bg-emerald-600">
                      <Plus className="w-4 h-4 mr-2" /> Add Slide
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {heroSlides.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">No slides. Click "Add Slide".</div>
                  ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
                        {heroSlides.map((_: any, i: number) => (
                          <TabsTrigger key={i} value={String(i)}>
                            Slide {i + 1}
                            {heroSlides.length > 1 && (
                              <button onClick={e => { e.stopPropagation(); removeSlide(i); }}
                                className="ml-2 text-red-400 hover:text-red-600">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {heroSlides.map((slide: any, index: number) => (
                        <TabsContent key={index} value={String(index)} className="mt-6 space-y-6">
                          {/* Preview */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Eye className="w-4 h-4" /> Live Preview
                              </div>
                              {heroSlides.length > 1 && (
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={prevSlide} className="h-8 w-8 p-0"><SkipBack className="h-4 w-4" /></Button>
                                  <Button size="sm" variant="outline" onClick={() => setIsPlaying(!isPlaying)} className="h-8 w-8 p-0">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={nextSlide} className="h-8 w-8 p-0"><SkipForward className="h-4 w-4" /></Button>
                                </div>
                              )}
                            </div>
                            <div className="relative w-full h-[380px] rounded-lg overflow-hidden shadow-lg border-2 border-slate-200 bg-slate-800">
                              <img src={safeImageSrc(currentSlide?.imageURL)} alt="Preview"
                                className="w-full h-full object-cover"
                                onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
                              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                              <div className="absolute inset-0 flex items-center px-8">
                                <div className="max-w-2xl">
                                  <h1 className={`text-3xl font-bold text-white mb-3 leading-tight ${getTextClass(currentSlide?.textAnimation, showTextAnimation)}`}>
                                    {currentSlide?.bannerHeading || "Banner Heading"}
                                  </h1>
                                  <p className={`text-base text-white/90 mb-5 ${getTextClass(currentSlide?.textAnimation, showTextAnimation)}`} style={{ transitionDelay: "100ms" }}>
                                    {currentSlide?.bannerSmallHeading || "Subtitle"}
                                  </p>
                                  <div className={`flex gap-3 flex-wrap ${getTextClass(currentSlide?.textAnimation, showTextAnimation)}`} style={{ transitionDelay: "200ms" }}>
                                    {currentSlide?.Button1?.title && (
                                      <span className="px-5 py-2.5 rounded-full font-semibold shadow-lg text-sm"
                                        style={{ backgroundColor: currentSlide.Button1.color || "#10b981", color: currentSlide.Button1.textColor || getContrastingTextColor(currentSlide.Button1.color) }}>
                                        {currentSlide.Button1.title}
                                      </span>
                                    )}
                                    {currentSlide?.Button2?.title && (
                                      <span className="px-5 py-2.5 rounded-full font-semibold shadow-lg text-sm"
                                        style={{ backgroundColor: currentSlide.Button2.color || "#ffffff", color: currentSlide.Button2.textColor || getContrastingTextColor(currentSlide.Button2.color) }}>
                                        {currentSlide.Button2.title}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Settings */}
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="border rounded-xl p-4 bg-white space-y-4">
                              <div className="text-sm font-semibold text-slate-700 pb-1 border-b">Content</div>
                              <div className="space-y-2">
                                <Label>Image URL</Label>
                                <Input placeholder="https://..."
                                  value={slide.imageURL?.startsWith("data:") ? "" : (slide.imageURL || "")}
                                  onChange={e => updateSlideField(index, "imageURL", e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <Label>Upload Image <span className="text-xs text-slate-400">(saved to Firebase Storage)</span></Label>
                                <label className="block cursor-pointer">
                                  <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors
                                    ${uploadingIndex === index ? "border-emerald-300 bg-emerald-50" : "border-slate-300 hover:border-emerald-400 hover:bg-emerald-50"}`}>
                                    {uploadingIndex === index
                                      ? <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm">
                                          <Loader2 className="w-4 h-4 animate-spin" /> Uploading… {uploadProgress}%
                                        </div>
                                      : <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                                          <Upload className="w-4 h-4" /> Click to upload
                                        </div>}
                                  </div>
                                  <input type="file" accept="image/*" className="hidden"
                                    disabled={uploadingIndex !== null}
                                    onChange={e => handleImageUpload(e, index)} />
                                </label>
                              </div>
                              <div className="space-y-2">
                                <Label>Text Animation</Label>
                                <Select value={slide.textAnimation || "fadeIn"} onValueChange={v => updateSlideField(index, "textAnimation", v)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {textAnimations.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Main Heading</Label>
                                <Input value={slide.bannerHeading || ""} onChange={e => updateSlideField(index, "bannerHeading", e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <Label>Subtitle</Label>
                                <Textarea value={slide.bannerSmallHeading || ""} onChange={e => updateSlideField(index, "bannerSmallHeading", e.target.value)} rows={3} />
                              </div>
                            </div>

                            <div className="border rounded-xl p-4 bg-white space-y-4">
                              <div className="text-sm font-semibold text-slate-700 pb-1 border-b">Buttons</div>
                              {[
                                { key: "Button1", label: "Button 1", defBg: "#10b981", defText: "#ffffff" },
                                { key: "Button2", label: "Button 2", defBg: "#ffffff", defText: "#000000" },
                              ].map(({ key, label, defBg, defText }) => (
                                <div key={key} className="border rounded-lg p-3 space-y-3 bg-slate-50">
                                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1"><Label className="text-xs">Text</Label>
                                      <Input value={slide[key]?.title || ""} onChange={e => updateSlideField(index, `${key}.title`, e.target.value)} /></div>
                                    <div className="space-y-1"><Label className="text-xs">Link</Label>
                                      <Input value={slide[key]?.link || ""} onChange={e => updateSlideField(index, `${key}.link`, e.target.value)} /></div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Background</Label>
                                      <div className="flex gap-2">
                                        <Input type="color" value={slide[key]?.color || defBg} onChange={e => updateSlideField(index, `${key}.color`, e.target.value)} className="w-14 h-9" />
                                        <Input value={slide[key]?.color || ""} onChange={e => updateSlideField(index, `${key}.color`, e.target.value)} placeholder={defBg} />
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Text Color</Label>
                                      <div className="flex gap-2">
                                        <Input type="color" value={slide[key]?.textColor || defText} onChange={e => updateSlideField(index, `${key}.textColor`, e.target.value)} className="w-14 h-9" />
                                        <Input value={slide[key]?.textColor || ""} onChange={e => updateSlideField(index, `${key}.textColor`, e.target.value)} placeholder={defText} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Static page banner editor */}
          {!isCarouselPage() && (
            <Card style={{ backgroundColor: "#f0f4f8" }}>
              <CardHeader><CardTitle>{activePage} Page — Banner</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="relative w-full h-[360px] rounded-lg overflow-hidden shadow-lg border-2 border-slate-200 flex flex-col items-center justify-center text-center px-8"
                  style={getBannerBgStyle(staticBanner)}>
                  <h1 className="text-4xl font-bold text-white mb-3 leading-tight drop-shadow-lg">
                    {staticBanner.bannerHeading || `${activePage} Banner`}
                  </h1>
                  <p className="text-lg text-white/90 max-w-2xl drop-shadow">
                    {staticBanner.bannerSmallHeading || `${activePage} subtitle`}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="border rounded-xl p-4 bg-white space-y-4">
                    <div className="text-sm font-semibold text-slate-700 pb-1 border-b">Content</div>
                    <div className="space-y-2">
                      <Label>Main Heading</Label>
                      <Input value={staticBanner.bannerHeading || ""} onChange={e => updateBannerField("bannerHeading", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Subtitle</Label>
                      <Textarea value={staticBanner.bannerSmallHeading || ""} onChange={e => updateBannerField("bannerSmallHeading", e.target.value)} rows={3} />
                    </div>
                  </div>

                  <div className="border rounded-xl p-4 bg-white space-y-4">
                    <div className="text-sm font-semibold text-slate-700 pb-1 border-b">Background</div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="gradient" checked={staticBanner.gradientEnabled || false}
                        onChange={e => updateBannerField("gradientEnabled", e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                      <Label htmlFor="gradient">Enable Gradient</Label>
                    </div>
                    {!staticBanner.gradientEnabled ? (
                      <div className="space-y-2">
                        <Label>Background Color</Label>
                        <div className="flex gap-2">
                          <Input type="color" value={staticBanner.backgroundColor || "#10b981"} onChange={e => updateBannerField("backgroundColor", e.target.value)} className="w-20 h-10" />
                          <Input value={staticBanner.backgroundColor || ""} onChange={e => updateBannerField("backgroundColor", e.target.value)} placeholder="#10b981" />
                        </div>
                      </div>
                    ) : (
                      <>
                        {[{ f: "gradientColor1", l: "Color 1", d: "#10b981" }, { f: "gradientColor2", l: "Color 2", d: "#06b6d4" }].map(({ f, l, d }) => (
                          <div key={f} className="space-y-2">
                            <Label>{l}</Label>
                            <div className="flex gap-2">
                              <Input type="color" value={staticBanner[f] || d} onChange={e => updateBannerField(f, e.target.value)} className="w-20 h-10" />
                              <Input value={staticBanner[f] || ""} onChange={e => updateBannerField(f, e.target.value)} placeholder={d} />
                            </div>
                          </div>
                        ))}
                        <div className="space-y-2">
                          <Label>Direction</Label>
                          <Select value={staticBanner.gradientDirection || "to right"} onValueChange={v => updateBannerField("gradientDirection", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {gradientDirections.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}