import { useState, useContext, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AppContext from "../context/AppContext";
import UsefireFunctionsHook from "../utility/usefirebaseFuncHook";
import { useToast } from "@/hooks/use-toast";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  Trash2, Plus, Eye, Play, Pause, SkipForward, SkipBack,
  ImageIcon, Palette, LayoutDashboard, Pencil, ChevronLeft,
  Upload, Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type ViewMode = "overview" | "editor";

// ─────────────────────────────────────────────────────────────────────────────
// PURE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const getContrastingTextColor = (hexColor: string) => {
  if (!hexColor) return "#ffffff";
  const hex = hexColor.replace("#", "");
  if (hex.length < 6) return "#ffffff";
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? "#000000" : "#ffffff";
};

const safeImageSrc = (url: string) => {
  const PLACEHOLDER = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200";
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

const resolvePageKey = (pageName: string, cfg: any): string => {
  if (!cfg) return `${pageName}Customization`;
  const candidates = [
    `${pageName}Customization`,
    `${pageName}UsCustomization`,
    `${pageName}sCustomization`,
    pageName,
    pageName.toLowerCase(),
    `${pageName.toLowerCase()}Customization`,
    `${pageName.toLowerCase()}customization`,
  ];
  for (const key of candidates) {
    if (key in cfg) return key;
  }
  return `${pageName}Customization`;
};

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW CARD
// ─────────────────────────────────────────────────────────────────────────────
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
  const slideAnim = pageConfig?.slideAnimation ?? "fade";

  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    if (page.type !== "carousel" || slideCount <= 1) return;
    const t = setInterval(() => setSlideIdx((p) => (p + 1) % slideCount), 3500);
    return () => clearInterval(t);
  }, [slideCount, page.type]);

  const slide = slides[slideIdx] ?? slides[0];

  return (
    <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200">
      {page.type === "carousel" && slide ? (
        <div className="relative w-full h-52 bg-slate-800">
          <img src={safeImageSrc(slide.imageURL)} alt={slide.bannerHeading ?? "slide"}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-0 flex items-center px-6">
            <div>
              <h2 className="text-xl font-bold text-white leading-tight line-clamp-1">{slide.bannerHeading || "Banner Heading"}</h2>
              <p className="text-sm text-white/80 mt-1 line-clamp-1">{slide.bannerSmallHeading || "Subtitle"}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {slide.Button1?.title && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: slide.Button1.color || "#10b981", color: slide.Button1.textColor || getContrastingTextColor(slide.Button1.color) }}>
                    {slide.Button1.title}
                  </span>
                )}
                {slide.Button2?.title && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: slide.Button2.color || "#ffffff", color: slide.Button2.textColor || getContrastingTextColor(slide.Button2.color) }}>
                    {slide.Button2.title}
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
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-3">
            <Palette className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white line-clamp-1">{banner.bannerHeading || `${page.name} Banner`}</h2>
          <p className="text-sm text-white/80 mt-1 line-clamp-2">{banner.bannerSmallHeading || "Subtitle"}</p>
        </div>
      )}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-100">
        <div>
          <p className="font-semibold text-sm text-slate-800">{page.name} Page</p>
          <p className="text-xs text-slate-500">
            {page.type === "carousel"
              ? `${slideCount} slide${slideCount !== 1 ? "s" : ""} · ${slideAnim} transition`
              : banner.gradientEnabled ? "Gradient background" : "Solid background"}
          </p>
        </div>
        <Button size="sm" onClick={() => onEdit(page.name)} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5">
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function HeroBanner() {
  const { globalState, setGlobalState, storage } = useContext(AppContext);
  const firebaseFunctions = UsefireFunctionsHook();
  const { updateStoreConfig } = firebaseFunctions;
  const getStoreConfig = firebaseFunctions.getStoreConfig ?? firebaseFunctions.fetchStoreConfig;
  const { toast } = useToast();

  const [config, setConfig] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [activePage, setActivePage] = useState("Home");
  const [activeTab, setActiveTab] = useState("0");
  const [loading, setLoading] = useState(true);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [showTextAnimation, setShowTextAnimation] = useState(true);
  const autoPlayRef = useRef<any>(null);

  const slideAnimations = [
    { value: "fade", label: "Fade" },
    { value: "slide", label: "Slide" },
    { value: "cube", label: "Cube" },
    { value: "flip", label: "Flip" },
    { value: "coverflow", label: "Coverflow" },
  ];

  const textAnimations = [
    { value: "fadeIn", label: "Fade In" },
    { value: "slideUp", label: "Slide Up" },
    { value: "slideDown", label: "Slide Down" },
    { value: "slideLeft", label: "Slide Left" },
    { value: "slideRight", label: "Slide Right" },
    { value: "zoom", label: "Zoom In" },
  ];

  const pages = [
    { name: "Home", type: "carousel" },
    { name: "About", type: "static" },
    { name: "Blog", type: "static" },
    { name: "Contact", type: "static" },
  ];

  const gradientDirections = [
    { value: "to right", label: "Left → Right" },
    { value: "to left", label: "Right → Left" },
    { value: "to bottom", label: "Top → Bottom" },
    { value: "to top", label: "Bottom → Top" },
    { value: "to bottom right", label: "Diagonal ↘" },
    { value: "to bottom left", label: "Diagonal ↙" },
  ];

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let cfg: any = null;
        if (typeof getStoreConfig === "function") {
          const raw = await getStoreConfig("StoreConfig001");
          cfg = raw?.data ?? raw;
        }
        if (cfg && Object.keys(cfg).length > 0) {
          console.log("✅ [HeroBanner] Loaded. Keys:", Object.keys(cfg));
          setConfig(cfg);
          setGlobalState((prev: any) => ({ ...prev, StoreConfig: cfg }));
        } else if (globalState?.StoreConfig && Object.keys(globalState.StoreConfig).length > 0) {
          setConfig(globalState.StoreConfig);
        } else {
          setConfig({});
        }
      } catch (err) {
        console.error("❌ [HeroBanner] Load error:", err);
        setConfig(globalState?.StoreConfig ?? {});
        toast({ title: "Could not load config", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Config helpers ────────────────────────────────────────────────────────
  const handleChange = (path: string, value: any) => {
    setConfig((prev: any) => {
      const updated = structuredClone(prev);
      const keys = path.split(".");
      let obj: any = updated;
      keys.slice(0, -1).forEach((k) => { if (!obj[k]) obj[k] = {}; obj = obj[k]; });
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const getPageConfig = (page = activePage) => {
    if (!config) return null;
    return config[resolvePageKey(page, config)] ?? null;
  };

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
    imageURL: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
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
    if (slides.length === 1) { alert("You must have at least one slide"); return; }
    const newSlides = slides.filter((_: any, i: number) => i !== index);
    updatePageConfig({ carouselSliders: newSlides });
    setActiveTab("0");
    if (previewSlideIndex >= newSlides.length) setPreviewSlideIndex(0);
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

  // ── Firebase Storage upload ───────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!storage) {
      toast({ title: "⚠️ Firebase Storage not available", variant: "destructive" });
      const reader = new FileReader();
      reader.onload = (ev) => updateSlideField(index, "imageURL", ev.target?.result);
      reader.readAsDataURL(file);
      return;
    }
    try {
      setUploadingIndex(index);
      setUploadProgress(0);
      const storageRef = ref(storage, `banners/home_slide_${index}_${Date.now()}_${file.name}`);
      const task = uploadBytesResumable(storageRef, file);
      await new Promise<void>((resolve, reject) => {
        task.on("state_changed",
          (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => { updateSlideField(index, "imageURL", await getDownloadURL(task.snapshot.ref)); resolve(); }
        );
      });
      toast({ title: "✅ Image uploaded to Firebase Storage" });
    } catch (err) {
      console.error("Upload error:", err);
      toast({ title: "❌ Upload failed", variant: "destructive" });
    } finally {
      setUploadingIndex(null);
      setUploadProgress(0);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setLoading(true);
    try {
      setGlobalState((prev: any) => ({ ...prev, StoreConfig: config }));
      await updateStoreConfig("StoreConfig001", config);
      toast({ title: "✅ Saved", description: "Banner configuration updated." });
    } catch (err) {
      console.error("❌ Save error:", err);
      toast({ title: "❌ Save failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Preview ───────────────────────────────────────────────────────────────
  const triggerTextAnim = () => { setShowTextAnimation(false); setTimeout(() => setShowTextAnimation(true), 50); };
  const nextSlide = () => { setPreviewSlideIndex((p) => (p + 1) % getCurrentSlides().length); triggerTextAnim(); };
  const prevSlide = () => { const l = getCurrentSlides().length; setPreviewSlideIndex((p) => (p - 1 + l) % l); triggerTextAnim(); };

  useEffect(() => {
    if (!isCarouselPage()) return;
    if (isPlaying && getCurrentSlides().length > 1) { autoPlayRef.current = setInterval(nextSlide, 5000); }
    else { clearInterval(autoPlayRef.current); }
    return () => clearInterval(autoPlayRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, activePage, config]);

  useEffect(() => { setActiveTab("0"); setPreviewSlideIndex(0); setIsPlaying(false); setShowTextAnimation(true); }, [activePage]);

  useEffect(() => {
    const idx = parseInt(activeTab);
    if (!isNaN(idx) && idx !== previewSlideIndex) { setPreviewSlideIndex(idx); triggerTextAnim(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const getTextClass = (type: string, active: boolean) => {
    const base = "transition-all duration-500 ease-out";
    if (!active) {
      switch (type) {
        case "slideUp": return "opacity-0 translate-y-8";
        case "slideDown": return "opacity-0 -translate-y-8";
        case "slideLeft": return "opacity-0 translate-x-8";
        case "slideRight": return "opacity-0 -translate-x-8";
        case "zoom": return "opacity-0 scale-90";
        default: return "opacity-0";
      }
    }
    switch (type) {
      case "slideUp": case "slideDown": return `${base} opacity-100 translate-y-0`;
      case "slideLeft": case "slideRight": return `${base} opacity-100 translate-x-0`;
      case "zoom": return `${base} opacity-100 scale-100`;
      default: return `${base} opacity-100`;
    }
  };

  const heroSlides = getCurrentSlides();
  const staticBanner = getCurrentBanner();
  const currentSlide = heroSlides[previewSlideIndex] ?? heroSlides[0];

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading banner configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {viewMode === "editor" && (
            <Button variant="outline" size="sm" onClick={() => setViewMode("overview")} className="gap-1.5">
              <ChevronLeft className="w-4 h-4" /> All Banners
            </Button>
          )}
          <h1 className="text-2xl md:text-3xl font-bold">
            {viewMode === "overview" ? "Banner Manager" : `Editing: ${activePage} Page`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex border rounded-lg overflow-hidden">
            {(["overview", "editor"] as ViewMode[]).map((m) => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 capitalize transition-colors ${viewMode === m ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
                {m === "overview" ? <LayoutDashboard className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                {m}
              </button>
            ))}
          </div>
          <Button onClick={handleSave} disabled={loading} className="bg-emerald-400 hover:bg-emerald-600 disabled:opacity-50">
            {loading ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      </div>

      {/* ── OVERVIEW ── */}
      {viewMode === "overview" && (
        <div className="space-y-4">
          <p className="text-slate-500 text-sm">
            Previews show your actual Firestore data. Click <strong>Edit</strong> to customise.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pages.map((page) => (
              <OverviewBannerCard key={page.name} page={page} config={config}
                onEdit={(name) => { setActivePage(name); setViewMode("editor"); }} />
            ))}
          </div>
        </div>
      )}

      {/* ── EDITOR ── */}
      {viewMode === "editor" && (
        <>
          {/* Page selector */}
          <Card style={{ backgroundColor: "#f0f4f8" }}>
            <CardHeader><CardTitle className="text-lg">Select Page</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {pages.map((page) => (
                  <Button key={page.name}
                    variant={activePage === page.name ? "default" : "outline"}
                    onClick={() => setActivePage(page.name)}
                    className={`gap-2 ${activePage === page.name ? "bg-emerald-400 hover:bg-emerald-700" : ""}`}>
                    {page.type === "carousel" ? <ImageIcon className="w-4 h-4" /> : <Palette className="w-4 h-4" />}
                    {page.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── HOME carousel editor ── */}
          {isCarouselPage() && (
            <>
              <Card style={{ backgroundColor: "#f0f4f8" }}>
                <CardHeader><CardTitle className="text-lg">Slide Transition Effect</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2 max-w-xs">
                    <Select value={getCurrentAnimation()} onValueChange={(v) => updatePageConfig({ slideAnimation: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {slideAnimations.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card style={{ backgroundColor: "#f0f4f8" }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Carousel Slides ({heroSlides.length})</CardTitle>
                    <Button onClick={addSlide} size="sm" className="bg-emerald-400 hover:bg-emerald-600">
                      <Plus className="w-4 h-4 mr-2" /> Add Slide
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {heroSlides.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">No slides found. Click "Add Slide".</div>
                  ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
                        {heroSlides.map((_: any, i: number) => (
                          <TabsTrigger key={i} value={String(i)}>
                            Slide {i + 1}
                            {heroSlides.length > 1 && (
                              <button onClick={(e) => { e.stopPropagation(); removeSlide(i); }} className="ml-2 text-red-400 hover:text-red-600">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {heroSlides.map((slide: any, index: number) => (
                        <TabsContent key={index} value={String(index)} className="mt-6 space-y-6">

                          {/* ── Full width preview ── */}
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
                            <div className="relative w-full h-[420px] rounded-lg overflow-hidden shadow-lg border-2 border-slate-200 bg-slate-800">
                              <img key={previewSlideIndex} src={safeImageSrc(currentSlide?.imageURL)} alt="Preview"
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200"; }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                              <div className="absolute inset-0 flex items-center px-8">
                                <div className="max-w-2xl">
                                  <h1 className={`text-4xl font-bold text-white mb-4 leading-tight ${getTextClass(currentSlide?.textAnimation, showTextAnimation)}`}>
                                    {currentSlide?.bannerHeading || "Banner Heading"}
                                  </h1>
                                  <p className={`text-lg text-white/90 mb-6 ${getTextClass(currentSlide?.textAnimation, showTextAnimation)}`} style={{ transitionDelay: "100ms" }}>
                                    {currentSlide?.bannerSmallHeading || "Subtitle"}
                                  </p>
                                  <div className={`flex gap-3 flex-wrap ${getTextClass(currentSlide?.textAnimation, showTextAnimation)}`} style={{ transitionDelay: "200ms" }}>
                                    {currentSlide?.Button1?.title && (
                                      <span className="px-6 py-3 rounded-full font-semibold shadow-lg"
                                        style={{ backgroundColor: currentSlide.Button1.color || "#10b981", color: currentSlide.Button1.textColor || getContrastingTextColor(currentSlide.Button1.color) }}>
                                        {currentSlide.Button1.title}
                                      </span>
                                    )}
                                    {currentSlide?.Button2?.title && (
                                      <span className="px-6 py-3 rounded-full font-semibold shadow-lg"
                                        style={{ backgroundColor: currentSlide.Button2.color || "#ffffff", color: currentSlide.Button2.textColor || getContrastingTextColor(currentSlide.Button2.color) }}>
                                        {currentSlide.Button2.title}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {heroSlides.length > 1 && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                  {heroSlides.map((_: any, idx: number) => (
                                    <div key={idx} className={`h-2 rounded-full transition-all ${idx === previewSlideIndex ? "w-8 bg-white" : "w-2 bg-white/50"}`} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ── Settings below preview ── */}
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="border rounded-xl p-4 bg-white space-y-4">
                              <div className="text-sm font-semibold text-slate-700 pb-1 border-b">Content</div>
                              <div className="space-y-2">
                                <Label>Image URL</Label>
                                <Input placeholder="https://..."
                                  value={slide.imageURL?.startsWith("data:") ? "" : (slide.imageURL || "")}
                                  onChange={(e) => updateSlideField(index, "imageURL", e.target.value)} />
                                {slide.imageURL?.startsWith("data:") && slide.imageURL.length < 500 && (
                                  <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                    ⚠️ Image corrupted (Firestore size limit). Please re-upload.
                                  </p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Upload Image <span className="text-xs text-slate-400">(saved to Firebase Storage)</span></Label>
                                <label className="block cursor-pointer">
                                  <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${uploadingIndex === index ? "border-emerald-300 bg-emerald-50" : "border-slate-300 hover:border-emerald-400 hover:bg-emerald-50"}`}>
                                    {uploadingIndex === index ? (
                                      <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Uploading... {uploadProgress}%
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                                        <Upload className="w-4 h-4" /> Click to upload image
                                      </div>
                                    )}
                                  </div>
                                  <input type="file" accept="image/*" className="hidden" disabled={uploadingIndex !== null} onChange={(e) => handleImageUpload(e, index)} />
                                </label>
                                {slide.imageURL && !slide.imageURL.startsWith("data:") && (
                                  <div className="w-full h-16 rounded overflow-hidden border bg-slate-100">
                                    <img src={slide.imageURL} className="w-full h-full object-cover" alt="thumb"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Text Animation</Label>
                                <Select value={slide.textAnimation || "fadeIn"} onValueChange={(v) => updateSlideField(index, "textAnimation", v)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {textAnimations.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Main Heading</Label>
                                <Input value={slide.bannerHeading || ""} onChange={(e) => updateSlideField(index, "bannerHeading", e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <Label>Subtitle</Label>
                                <Textarea value={slide.bannerSmallHeading || ""} onChange={(e) => updateSlideField(index, "bannerSmallHeading", e.target.value)} rows={3} />
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
                                    <div className="space-y-1"><Label className="text-xs">Text</Label><Input value={slide[key]?.title || ""} onChange={(e) => updateSlideField(index, `${key}.title`, e.target.value)} /></div>
                                    <div className="space-y-1"><Label className="text-xs">Link</Label><Input value={slide[key]?.link || ""} onChange={(e) => updateSlideField(index, `${key}.link`, e.target.value)} /></div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Background</Label>
                                      <div className="flex gap-2">
                                        <Input type="color" value={slide[key]?.color || defBg} onChange={(e) => updateSlideField(index, `${key}.color`, e.target.value)} className="w-14 h-9" />
                                        <Input value={slide[key]?.color || ""} onChange={(e) => updateSlideField(index, `${key}.color`, e.target.value)} placeholder={defBg} />
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Text Color</Label>
                                      <div className="flex gap-2">
                                        <Input type="color" value={slide[key]?.textColor || defText} onChange={(e) => updateSlideField(index, `${key}.textColor`, e.target.value)} className="w-14 h-9" />
                                        <Input value={slide[key]?.textColor || ""} onChange={(e) => updateSlideField(index, `${key}.textColor`, e.target.value)} placeholder={defText} />
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

          {/* ── STATIC PAGE banner editor — matches Home layout ── */}
          {!isCarouselPage() && (
            <Card style={{ backgroundColor: "#f0f4f8" }}>
              <CardHeader><CardTitle>{activePage} Page — Banner Settings</CardTitle></CardHeader>
              <CardContent className="space-y-6">

                {/* Full-width live preview */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Eye className="w-4 h-4" /> Live Preview
                  </div>
                  <div
                    className="relative w-full h-[420px] rounded-lg overflow-hidden shadow-lg border-2 border-slate-200 flex flex-col items-center justify-center text-center px-8"
                    style={getBannerBgStyle(staticBanner)}
                  >
                    {/* decorative circle */}
                    <div className="w-20 h-20 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center mb-6">
                      <Palette className="w-10 h-10 text-white/80" />
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
                      {staticBanner.bannerHeading || `${activePage} Banner`}
                    </h1>
                    <p className="text-xl text-white/90 max-w-2xl drop-shadow">
                      {staticBanner.bannerSmallHeading || `${activePage} page description`}
                    </p>
                  </div>
                </div>

                {/* Settings below — two columns matching Home layout */}
                <div className="grid md:grid-cols-2 gap-6">

                  {/* LEFT: Text content */}
                  <div className="border rounded-xl p-4 bg-white space-y-4">
                    <div className="text-sm font-semibold text-slate-700 pb-1 border-b">Content</div>
                    <div className="space-y-2">
                      <Label>Main Heading</Label>
                      <Input value={staticBanner.bannerHeading || ""} onChange={(e) => updateBannerField("bannerHeading", e.target.value)} placeholder={`e.g., ${activePage} Title`} />
                    </div>
                    <div className="space-y-2">
                      <Label>Subtitle</Label>
                      <Textarea value={staticBanner.bannerSmallHeading || ""} onChange={(e) => updateBannerField("bannerSmallHeading", e.target.value)} rows={3} placeholder="Add a subtitle..." />
                    </div>
                  </div>

                  {/* RIGHT: Background */}
                  <div className="border rounded-xl p-4 bg-white space-y-4">
                    <div className="text-sm font-semibold text-slate-700 pb-1 border-b">Background</div>

                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="gradient" checked={staticBanner.gradientEnabled || false}
                        onChange={(e) => updateBannerField("gradientEnabled", e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                      <Label htmlFor="gradient">Enable Gradient</Label>
                    </div>

                    {!staticBanner.gradientEnabled ? (
                      <div className="space-y-2">
                        <Label>Background Color</Label>
                        <div className="flex gap-2">
                          <Input type="color" value={staticBanner.backgroundColor || "#10b981"} onChange={(e) => updateBannerField("backgroundColor", e.target.value)} className="w-20 h-10" />
                          <Input value={staticBanner.backgroundColor || ""} onChange={(e) => updateBannerField("backgroundColor", e.target.value)} placeholder="#10b981" />
                        </div>
                      </div>
                    ) : (
                      <>
                        {[
                          { f: "gradientColor1", l: "Color 1", d: "#10b981" },
                          { f: "gradientColor2", l: "Color 2", d: "#06b6d4" },
                        ].map(({ f, l, d }) => (
                          <div key={f} className="space-y-2">
                            <Label>{l}</Label>
                            <div className="flex gap-2">
                              <Input type="color" value={staticBanner[f] || d} onChange={(e) => updateBannerField(f, e.target.value)} className="w-20 h-10" />
                              <Input value={staticBanner[f] || ""} onChange={(e) => updateBannerField(f, e.target.value)} placeholder={d} />
                            </div>
                          </div>
                        ))}
                        <div className="space-y-2">
                          <Label>Direction</Label>
                          <Select value={staticBanner.gradientDirection || "to right"} onValueChange={(v) => updateBannerField("gradientDirection", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {gradientDirections.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
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