import { useState, useContext, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AppContext from "../context/AppContext";
import UsefireFunctionsHook from "../utility/usefirebaseFuncHook";
import { useToast } from "@/hooks/use-toast";
import {
  Trash2, Plus, Eye, Play, Pause, SkipForward, SkipBack,
  ImageIcon, Palette, LayoutDashboard, Pencil, ChevronLeft,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type ViewMode = "overview" | "editor";

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function HeroBanner() {
  const { globalState, setGlobalState } = useContext(AppContext);
  const firebaseFunctions = UsefireFunctionsHook();
  const { updateStoreConfig } = firebaseFunctions;
  const getStoreConfig = firebaseFunctions.getStoreConfig || firebaseFunctions.fetchStoreConfig;
  const { toast } = useToast();

  const [config, setConfig] = useState(globalState.StoreConfig);
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [activePage, setActivePage] = useState("Home");
  const [activeTab, setActiveTab] = useState("0");
  const [loading, setLoading] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [showTextAnimation, setShowTextAnimation] = useState(true);
  const autoPlayIntervalRef = useRef<any>(null);

  // Overview carousel state — one per page card
  const [overviewSlideIndexes, setOverviewSlideIndexes] = useState<Record<string, number>>({
    Home: 0,
  });

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

  // ── default config ──────────────────────────────────────────────────────────
  const getDefaultConfig = () => ({
    HomeCustomization: {
      slideAnimation: "fade",
      carouselSliders: [
        {
          imageURL: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
          bannerHeading: "Welcome to Our Store",
          bannerSmallHeading: "Discover amazing products at great prices",
          Button1: { title: "Shop Now", color: "#10b981", textColor: "#ffffff", link: "/products" },
          Button2: { title: "Learn More", color: "#ffffff", textColor: "#000000", link: "/about" },
          textAnimation: "fadeIn",
        },
      ],
    },
    AboutCustomization: {
      banner: {
        bannerHeading: "About Us",
        bannerSmallHeading: "Learn more about our story and mission",
        backgroundColor: "#10b981",
        gradientEnabled: false,
        gradientColor1: "#10b981",
        gradientColor2: "#06b6d4",
        gradientDirection: "to right",
      },
    },
    BlogCustomization: {
      banner: {
        bannerHeading: "Our Blog",
        bannerSmallHeading: "Read our latest articles and updates",
        backgroundColor: "#3b82f6",
        gradientEnabled: false,
        gradientColor1: "#3b82f6",
        gradientColor2: "#8b5cf6",
        gradientDirection: "to right",
      },
    },
    ContactCustomization: {
      banner: {
        bannerHeading: "Contact Us",
        bannerSmallHeading: "Get in touch with our team",
        backgroundColor: "#f59e0b",
        gradientEnabled: false,
        gradientColor1: "#f59e0b",
        gradientColor2: "#ef4444",
        gradientDirection: "to right",
      },
    },
  });

  // ── load config ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadConfiguration = async () => {
      setLoading(true);
      let storedConfig = null;
      let authenticatedUser = null;

      try {
        const s = localStorage.getItem("StoreConfig");
        storedConfig = s ? JSON.parse(s) : null;
      } catch {}

      try {
        const a = localStorage.getItem("AuthenticatedUser");
        authenticatedUser = a ? JSON.parse(a) : null;
      } catch {}

      let firestoreConfig = null;
      if (getStoreConfig && typeof getStoreConfig === "function") {
        try {
          firestoreConfig = await getStoreConfig("StoreConfig001");
          if (firestoreConfig?.data) firestoreConfig = firestoreConfig.data;
        } catch {}
      }

      const defaultConfig = getDefaultConfig();
      const sourceConfig = firestoreConfig || storedConfig;
      let mergedConfig = { ...defaultConfig };

      if (sourceConfig) {
        Object.keys(defaultConfig).forEach((pageKey) => {
          if (sourceConfig[pageKey]) {
            mergedConfig[pageKey] = { ...defaultConfig[pageKey], ...sourceConfig[pageKey] };
            if (defaultConfig[pageKey].banner && sourceConfig[pageKey].banner) {
              mergedConfig[pageKey].banner = { ...defaultConfig[pageKey].banner, ...sourceConfig[pageKey].banner };
            }
          }
        });
        Object.keys(sourceConfig).forEach((key) => {
          if (!mergedConfig[key]) mergedConfig[key] = sourceConfig[key];
        });
      }

      setGlobalState((prev) => ({
        ...prev,
        StoreConfig: mergedConfig,
        AuthenticatedUser: authenticatedUser || prev.AuthenticatedUser,
      }));
      setConfig(mergedConfig);
      localStorage.setItem("StoreConfig", JSON.stringify(mergedConfig));
      setLoading(false);
    };

    loadConfiguration();
  }, []);

  useEffect(() => {
    if (globalState.StoreConfig && globalState.StoreConfig !== config) {
      setConfig(globalState.StoreConfig);
    }
  }, [globalState.StoreConfig]);

  // ── helpers ─────────────────────────────────────────────────────────────────
  const handleChange = (path: string, value: any) => {
    setConfig((prev) => {
      const updated = structuredClone(prev);
      const keys = path.split(".");
      let obj: any = updated;
      keys.slice(0, -1).forEach((key) => { if (!obj[key]) obj[key] = {}; obj = obj[key]; });
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      setGlobalState({ ...globalState, StoreConfig: config });
      localStorage.setItem("StoreConfig", JSON.stringify(config));
      await updateStoreConfig("StoreConfig001", config);
      toast({ title: "✅ Banner Configuration Saved", description: "Your banner configurations have been updated successfully." });
    } catch (error) {
      toast({ title: "❌ Error Saving Configuration", description: "There was an error saving. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getPageConfig = (page: string) => {
    if (!config) return {};
    return config[`${page}Customization`] || {};
  };

  const getCurrentPageConfig = () => getPageConfig(activePage);
  const isCarouselPage = (page = activePage) => page === "Home";

  const getSlides = (page = activePage) => isCarouselPage(page) ? (getPageConfig(page)?.carouselSliders || []) : [];
  const getCurrentSlides = () => getSlides(activePage);

  const getBanner = (page = activePage) => !isCarouselPage(page) ? (getPageConfig(page)?.banner || {}) : {};
  const getCurrentBanner = () => getBanner(activePage);

  const getCurrentAnimation = () => getCurrentPageConfig()?.slideAnimation || "fade";

  const updatePageConfig = (updates: any) => {
    handleChange(`${activePage}Customization`, { ...getCurrentPageConfig(), ...updates });
  };

  const updateBannerField = (field: string, value: any) => {
    handleChange(`${activePage}Customization.banner`, { ...getCurrentBanner(), [field]: value });
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
    const newSlides = [...(getCurrentSlides() || []), createEmptySlide()];
    updatePageConfig({ carouselSliders: newSlides });
    setActiveTab(String(newSlides.length - 1));
  };

  const removeSlide = (index: number) => {
    const currentSlides = getCurrentSlides();
    if (currentSlides.length === 1) { alert("You must have at least one slide"); return; }
    const newSlides = currentSlides.filter((_: any, i: number) => i !== index);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => updateSlideField(index, "imageURL", event.target?.result);
    reader.readAsDataURL(file);
  };

  const nextSlide = () => {
    const slides = getCurrentSlides();
    setPreviewSlideIndex((prev) => (prev + 1) % slides.length);
    setShowTextAnimation(false);
    setTimeout(() => setShowTextAnimation(true), 50);
  };

  const prevSlide = () => {
    const slides = getCurrentSlides();
    setPreviewSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
    setShowTextAnimation(false);
    setTimeout(() => setShowTextAnimation(true), 50);
  };

  useEffect(() => {
    if (!isCarouselPage()) return;
    const slides = getCurrentSlides();
    if (isPlaying && slides.length > 1) {
      autoPlayIntervalRef.current = setInterval(nextSlide, 5000);
    } else {
      clearInterval(autoPlayIntervalRef.current);
    }
    return () => clearInterval(autoPlayIntervalRef.current);
  }, [isPlaying, activePage]);

  useEffect(() => {
    setActiveTab("0");
    setPreviewSlideIndex(0);
    setIsPlaying(false);
    setShowTextAnimation(true);
  }, [activePage]);

  useEffect(() => {
    const tabIndex = parseInt(activeTab);
    if (!isNaN(tabIndex) && tabIndex !== previewSlideIndex) {
      setPreviewSlideIndex(tabIndex);
      setShowTextAnimation(false);
      setTimeout(() => setShowTextAnimation(true), 50);
    }
  }, [activeTab]);

  const getBannerBackgroundStyle = (banner: any) => {
    if (!banner) return {};
    if (banner.gradientEnabled) {
      return { backgroundImage: `linear-gradient(${banner.gradientDirection || "to right"}, ${banner.gradientColor1 || "#10b981"}, ${banner.gradientColor2 || "#06b6d4"})` };
    }
    return { backgroundColor: banner.backgroundColor || "#10b981" };
  };

  const gradientDirections = [
    { value: "to right", label: "Left to Right" },
    { value: "to left", label: "Right to Left" },
    { value: "to bottom", label: "Top to Bottom" },
    { value: "to top", label: "Bottom to Top" },
    { value: "to bottom right", label: "Diagonal ↘" },
    { value: "to bottom left", label: "Diagonal ↙" },
  ];

  const getTextAnimationStyle = (type: string) => {
    if (!showTextAnimation) return "opacity-0";
    const base = "transition-all duration-600 ease-out";
    switch (type) {
      case "fadeIn": return `${base} opacity-100`;
      case "slideUp": return `${base} opacity-100 translate-y-0`;
      case "slideDown": return `${base} opacity-100 -translate-y-0`;
      case "slideLeft": return `${base} opacity-100 translate-x-0`;
      case "slideRight": return `${base} opacity-100 -translate-x-0`;
      case "zoom": return `${base} opacity-100 scale-100`;
      default: return `${base} opacity-100`;
    }
  };

  const getTextInitialStyle = (type: string) => {
    switch (type) {
      case "fadeIn": return "opacity-0";
      case "slideUp": return "opacity-0 translate-y-8";
      case "slideDown": return "opacity-0 -translate-y-8";
      case "slideLeft": return "opacity-0 translate-x-8";
      case "slideRight": return "opacity-0 -translate-x-8";
      case "zoom": return "opacity-0 scale-90";
      default: return "opacity-0";
    }
  };

  const getContrastingTextColor = (hexColor: string) => {
    if (!hexColor) return "#ffffff";
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#000000" : "#ffffff";
  };

  const heroSlides = getCurrentSlides();
  const staticBanner = getCurrentBanner();
  const currentPreviewSlide = isCarouselPage() ? (heroSlides[previewSlideIndex] || heroSlides[0]) : null;

  // ── open a page in editor ───────────────────────────────────────────────────
  const openEditor = (pageName: string) => {
    setActivePage(pageName);
    setViewMode("editor");
  };

  // ── loading ─────────────────────────────────────────────────────────────────
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

  // ── OVERVIEW BANNER CARD ────────────────────────────────────────────────────
  const OverviewBannerCard = ({ page }: { page: typeof pages[0] }) => {
    const slides = getSlides(page.name);
    const banner = getBanner(page.name);
    const [slideIdx, setSlideIdx] = useState(0);

    // mini auto-cycle for carousel cards
    useEffect(() => {
      if (page.type !== "carousel" || slides.length <= 1) return;
      const t = setInterval(() => setSlideIdx((p) => (p + 1) % slides.length), 3500);
      return () => clearInterval(t);
    }, [slides.length]);

    const slide = slides[slideIdx] || slides[0];

    return (
      <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200 group relative">
        {/* banner preview */}
        {page.type === "carousel" && slide ? (
          <div className="relative w-full h-52">
            <img
              src={slide.imageURL}
              alt={slide.bannerHeading}
              className="w-full h-full object-cover transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
            <div className="absolute inset-0 flex items-center px-6">
              <div>
                <h2 className="text-xl font-bold text-white leading-tight line-clamp-1">
                  {slide.bannerHeading || "Banner Heading"}
                </h2>
                <p className="text-sm text-white/80 mt-1 line-clamp-1">
                  {slide.bannerSmallHeading || "Subtitle"}
                </p>
                <div className="flex gap-2 mt-3">
                  {slide.Button1?.title && (
                    <span
                      className="px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: slide.Button1.color || "#10b981",
                        color: slide.Button1.textColor || getContrastingTextColor(slide.Button1.color),
                      }}
                    >
                      {slide.Button1.title}
                    </span>
                  )}
                  {slide.Button2?.title && (
                    <span
                      className="px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: slide.Button2.color || "#ffffff",
                        color: slide.Button2.textColor || getContrastingTextColor(slide.Button2.color),
                      }}
                    >
                      {slide.Button2.title}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* slide dots */}
            {slides.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {slides.map((_: any, i: number) => (
                  <div
                    key={i}
                    onClick={() => setSlideIdx(i)}
                    className={`h-1.5 rounded-full cursor-pointer transition-all ${i === slideIdx ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            className="relative w-full h-52 flex flex-col items-center justify-center text-center px-6"
            style={getBannerBackgroundStyle(banner)}
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-3">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white line-clamp-1">
              {banner.bannerHeading || `${page.name} Banner`}
            </h2>
            <p className="text-sm text-white/80 mt-1 line-clamp-2">
              {banner.bannerSmallHeading || "Subtitle"}
            </p>
          </div>
        )}

        {/* footer bar */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-100">
          <div>
            <p className="font-semibold text-sm text-slate-800">{page.name} Page</p>
            <p className="text-xs text-slate-500">
              {page.type === "carousel"
                ? `${slides.length} slide${slides.length !== 1 ? "s" : ""} · ${getCurrentAnimation()} transition`
                : banner.gradientEnabled
                ? "Gradient background"
                : "Solid background"}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => openEditor(page.name)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
        </div>
      </div>
    );
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {viewMode === "editor" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("overview")}
              className="gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              All Banners
            </Button>
          )}
          <h1 className="text-2xl md:text-3xl font-bold">
            {viewMode === "overview" ? "Banner Manager" : `Editing: ${activePage} Page`}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* view toggle */}
          <div className="hidden sm:flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("overview")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                viewMode === "overview" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </button>
            <button
              onClick={() => setViewMode("editor")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                viewMode === "editor" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Pencil className="w-4 h-4" />
              Editor
            </button>
          </div>

          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-emerald-400 hover:bg-emerald-600 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      </div>

      {/* ── OVERVIEW MODE ────────────────────────────────────────────────────── */}
      {viewMode === "overview" && (
        <div className="space-y-4">
          <p className="text-slate-500 text-sm">
            This is how your banners currently look across all pages. Click <strong>Edit</strong> on any banner to customise it.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pages.map((page) => (
              <OverviewBannerCard key={page.name} page={page} />
            ))}
          </div>
        </div>
      )}

      {/* ── EDITOR MODE ──────────────────────────────────────────────────────── */}
      {viewMode === "editor" && (
        <>
          {/* PAGE SELECTOR */}
          <Card style={{ backgroundColor: "#f0f4f8" }}>
            <CardHeader>
              <CardTitle className="text-lg">Select Page to Customise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {pages.map((page) => (
                  <Button
                    key={page.name}
                    variant={activePage === page.name ? "default" : "outline"}
                    onClick={() => setActivePage(page.name)}
                    className={`flex items-center gap-2 ${activePage === page.name ? "bg-emerald-400 hover:bg-emerald-700" : ""}`}
                  >
                    {page.type === "carousel" ? <ImageIcon className="w-4 h-4" /> : <Palette className="w-4 h-4" />}
                    {page.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* HOME - CAROUSEL EDITOR */}
          {isCarouselPage() && (
            <>
              <Card style={{ backgroundColor: "#f0f4f8" }}>
                <CardHeader>
                  <CardTitle className="text-lg">{activePage} Page — Global Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Slide Transition Effect</Label>
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
                    <CardTitle>{activePage} Page — Carousel Slides</CardTitle>
                    <Button onClick={addSlide} size="sm" className="bg-emerald-400 hover:bg-emerald-600">
                      <Plus className="w-4 h-4 mr-2" /> Add Slide
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
                      {heroSlides.map((_: any, index: number) => (
                        <TabsTrigger key={index} value={String(index)} className="relative">
                          Slide {index + 1}
                          {heroSlides.length > 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); removeSlide(index); }}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {heroSlides.map((slide: any, index: number) => (
                      <TabsContent key={index} value={String(index)} className="mt-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Preview */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Eye className="w-4 h-4" /> Live Preview
                              </div>
                              {heroSlides.length > 1 && (
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="outline" onClick={prevSlide} className="h-8 w-8 p-0">
                                    <SkipBack className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setIsPlaying(!isPlaying)} className="h-8 w-8 p-0">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={nextSlide} className="h-8 w-8 p-0">
                                    <SkipForward className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            <div className="relative w-full h-[400px] rounded-lg overflow-hidden shadow-lg border-2 border-slate-200">
                              <img
                                key={previewSlideIndex}
                                src={currentPreviewSlide?.imageURL}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                              <div className="absolute inset-0 flex items-center">
                                <div className="px-8 max-w-xl">
                                  <h1 className={`text-4xl font-bold text-white mb-4 leading-tight ${showTextAnimation ? getTextAnimationStyle(currentPreviewSlide?.textAnimation) : getTextInitialStyle(currentPreviewSlide?.textAnimation)}`}>
                                    {currentPreviewSlide?.bannerHeading || "Banner Heading"}
                                  </h1>
                                  <p className={`text-lg text-white/90 mb-6 ${showTextAnimation ? getTextAnimationStyle(currentPreviewSlide?.textAnimation) : getTextInitialStyle(currentPreviewSlide?.textAnimation)}`} style={{ transitionDelay: "100ms" }}>
                                    {currentPreviewSlide?.bannerSmallHeading || "Banner subtitle"}
                                  </p>
                                  <div className={`flex gap-3 ${showTextAnimation ? getTextAnimationStyle(currentPreviewSlide?.textAnimation) : getTextInitialStyle(currentPreviewSlide?.textAnimation)}`} style={{ transitionDelay: "200ms" }}>
                                    {currentPreviewSlide?.Button1?.title && (
                                      <span className="px-6 py-3 rounded-full font-semibold shadow-lg"
                                        style={{ backgroundColor: currentPreviewSlide.Button1.color || "#10b981", color: currentPreviewSlide.Button1.textColor || getContrastingTextColor(currentPreviewSlide.Button1.color) }}>
                                        {currentPreviewSlide.Button1.title}
                                      </span>
                                    )}
                                    {currentPreviewSlide?.Button2?.title && (
                                      <span className="px-6 py-3 rounded-full font-semibold shadow-lg"
                                        style={{ backgroundColor: currentPreviewSlide.Button2.color || "#ffffff", color: currentPreviewSlide.Button2.textColor || getContrastingTextColor(currentPreviewSlide.Button2.color) }}>
                                        {currentPreviewSlide.Button2.title}
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

                          {/* Fields */}
                          <div className="space-y-4">
                            <div className="text-sm font-semibold text-slate-700">Edit Slide {index + 1}</div>

                            {[
                              { label: "Image URL", field: "imageURL", type: "input", placeholder: "Enter image URL" },
                            ].map(({ label, field, placeholder }) => (
                              <div key={field} className="space-y-2">
                                <Label>{label}</Label>
                                <Input placeholder={placeholder} value={slide[field] || ""} onChange={(e) => updateSlideField(index, field, e.target.value)} />
                              </div>
                            ))}

                            <div className="space-y-2">
                              <Label>Or Upload Image</Label>
                              <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, index)} />
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
                              <Input placeholder="e.g., Natural & Powerful" value={slide.bannerHeading || ""} onChange={(e) => updateSlideField(index, "bannerHeading", e.target.value)} />
                            </div>

                            <div className="space-y-2">
                              <Label>Subtitle</Label>
                              <Textarea placeholder="e.g., 100% plant-based ingredients" value={slide.bannerSmallHeading || ""} onChange={(e) => updateSlideField(index, "bannerSmallHeading", e.target.value)} rows={3} />
                            </div>

                            {/* Button 1 */}
                            <div className="border rounded-lg p-3 space-y-3 bg-white">
                              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Button 1</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1"><Label className="text-xs">Text</Label><Input placeholder="Shop Now" value={slide.Button1?.title || ""} onChange={(e) => updateSlideField(index, "Button1.title", e.target.value)} /></div>
                                <div className="space-y-1"><Label className="text-xs">Link</Label><Input placeholder="/products" value={slide.Button1?.link || ""} onChange={(e) => updateSlideField(index, "Button1.link", e.target.value)} /></div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Color</Label>
                                <div className="flex gap-2">
                                  <Input type="color" value={slide.Button1?.color || "#10b981"} onChange={(e) => updateSlideField(index, "Button1.color", e.target.value)} className="w-14 h-9" />
                                  <Input placeholder="#10b981" value={slide.Button1?.color || ""} onChange={(e) => updateSlideField(index, "Button1.color", e.target.value)} />
                                </div>
                              </div>
                            </div>

                            {/* Button 2 */}
                            <div className="border rounded-lg p-3 space-y-3 bg-white">
                              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Button 2</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1"><Label className="text-xs">Text</Label><Input placeholder="Learn More" value={slide.Button2?.title || ""} onChange={(e) => updateSlideField(index, "Button2.title", e.target.value)} /></div>
                                <div className="space-y-1"><Label className="text-xs">Link</Label><Input placeholder="/about" value={slide.Button2?.link || ""} onChange={(e) => updateSlideField(index, "Button2.link", e.target.value)} /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Background</Label>
                                  <div className="flex gap-2">
                                    <Input type="color" value={slide.Button2?.color || "#ffffff"} onChange={(e) => updateSlideField(index, "Button2.color", e.target.value)} className="w-14 h-9" />
                                    <Input placeholder="#ffffff" value={slide.Button2?.color || ""} onChange={(e) => updateSlideField(index, "Button2.color", e.target.value)} />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Text Color</Label>
                                  <div className="flex gap-2">
                                    <Input type="color" value={slide.Button2?.textColor || "#000000"} onChange={(e) => updateSlideField(index, "Button2.textColor", e.target.value)} className="w-14 h-9" />
                                    <Input placeholder="#000000" value={slide.Button2?.textColor || ""} onChange={(e) => updateSlideField(index, "Button2.textColor", e.target.value)} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            </>
          )}

          {/* STATIC PAGE BANNER EDITOR */}
          {!isCarouselPage() && (
            <Card style={{ backgroundColor: "#f0f4f8" }}>
              <CardHeader><CardTitle>{activePage} Page — Banner Settings</CardTitle></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Preview */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Eye className="w-4 h-4" /> Live Preview
                    </div>
                    <div
                      className="relative w-full h-[300px] rounded-lg overflow-hidden shadow-lg border-2 border-slate-200 flex flex-col items-center justify-center text-center px-8"
                      style={getBannerBackgroundStyle(staticBanner)}
                    >
                      <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
                        <Palette className="w-8 h-8 text-white" />
                      </div>
                      <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
                        {staticBanner.bannerHeading || `${activePage} Banner`}
                      </h1>
                      <p className="text-lg text-white/90 max-w-2xl">
                        {staticBanner.bannerSmallHeading || `Add your ${activePage.toLowerCase()} page description here`}
                      </p>
                    </div>
                  </div>

                  {/* Fields */}
                  <div className="space-y-4">
                    <div className="text-sm font-semibold text-slate-700">Edit {activePage} Banner</div>

                    <div className="space-y-2">
                      <Label>Main Heading</Label>
                      <Input placeholder={`e.g., ${activePage} Banner Title`} value={staticBanner.bannerHeading || ""} onChange={(e) => updateBannerField("bannerHeading", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Subtitle</Label>
                      <Textarea placeholder={`e.g., ${activePage} page description...`} value={staticBanner.bannerSmallHeading || ""} onChange={(e) => updateBannerField("bannerSmallHeading", e.target.value)} rows={3} />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="gradient" checked={staticBanner.gradientEnabled || false} onChange={(e) => updateBannerField("gradientEnabled", e.target.checked)} className="w-4 h-4" />
                      <Label htmlFor="gradient">Enable Gradient</Label>
                    </div>

                    {!staticBanner.gradientEnabled ? (
                      <div className="space-y-2">
                        <Label>Background Color</Label>
                        <div className="flex gap-2">
                          <Input type="color" value={staticBanner.backgroundColor || "#10b981"} onChange={(e) => updateBannerField("backgroundColor", e.target.value)} className="w-20 h-10" />
                          <Input placeholder="#10b981" value={staticBanner.backgroundColor || "#10b981"} onChange={(e) => updateBannerField("backgroundColor", e.target.value)} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label>Gradient Color 1</Label>
                          <div className="flex gap-2">
                            <Input type="color" value={staticBanner.gradientColor1 || "#10b981"} onChange={(e) => updateBannerField("gradientColor1", e.target.value)} className="w-20 h-10" />
                            <Input placeholder="#10b981" value={staticBanner.gradientColor1 || "#10b981"} onChange={(e) => updateBannerField("gradientColor1", e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Gradient Color 2</Label>
                          <div className="flex gap-2">
                            <Input type="color" value={staticBanner.gradientColor2 || "#06b6d4"} onChange={(e) => updateBannerField("gradientColor2", e.target.value)} className="w-20 h-10" />
                            <Input placeholder="#06b6d4" value={staticBanner.gradientColor2 || "#06b6d4"} onChange={(e) => updateBannerField("gradientColor2", e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Gradient Direction</Label>
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