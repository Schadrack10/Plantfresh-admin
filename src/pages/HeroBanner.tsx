import { useState, useContext, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AppContext from "../context/AppContext";
import UsefireFunctionsHook from "../utility/usefirebaseFuncHook";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Eye, Play, Pause, SkipForward, SkipBack, ImageIcon, Palette } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function HeroBanner() {
  const { globalState, setGlobalState } = useContext(AppContext);
  const { updateStoreConfig } = UsefireFunctionsHook();
  const { toast } = useToast();
  
  // LOCAL CONFIG STATE - Use StoreConfig from global state
  const [config, setConfig] = useState(globalState.StoreConfig);
  
  // UI state
  const [activePage, setActivePage] = useState("Home");
  const [activeTab, setActiveTab] = useState("0");
  const [loading, setLoading] = useState(false);
  
  // Preview animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [showTextAnimation, setShowTextAnimation] = useState(true);
  const autoPlayIntervalRef = useRef(null);

  // Animation options
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

  // LOAD CONFIG IMMEDIATELY ON PAGE RELOAD
  useEffect(() => {
    const storedConfig = JSON.parse(localStorage.getItem("StoreConfig"));
    const authenticatedUser = JSON.parse(
      localStorage.getItem("AuthenticatedUser")
    );

    if (storedConfig || authenticatedUser) {
      setGlobalState((prev) => ({
        ...prev,
        StoreConfig: storedConfig || prev.StoreConfig,
        AuthenticatedUser: authenticatedUser || prev.AuthenticatedUser,
      }));

      setConfig(storedConfig || globalState.StoreConfig);
    }
  }, []); // runs only on first mount

  // Update local config when global state changes
  useEffect(() => {
    setConfig(globalState.StoreConfig);
  }, [globalState.StoreConfig]);

  // ⛏ UPDATE NESTED CONFIG PATH
  const handleChange = (path: string, value: any) => {
    setConfig((prev) => {
      const updated = structuredClone(prev);
      const keys = path.split(".");
      let obj: any = updated;

      keys.slice(0, -1).forEach((key) => {
        if (!obj[key]) obj[key] = {};
        obj = obj[key];
      });

      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  // SAVE TO GLOBAL + FIREBASE
  const handleSave = () => {
    setGlobalState({
      ...globalState,
      StoreConfig: config,
    });

    console.log("Saved banner config: ", config);
    localStorage.setItem("StoreConfig", JSON.stringify(config));

    updateStoreConfig("StoreConfig001", config);
    toast({
      title: "Banner Configuration Saved",
      description: "Your banner configurations have been updated successfully.",
    });
  };

  // Get current page configuration
  const getCurrentPageConfig = () => {
    const pageKey = `${activePage}Customization`;
    return config[pageKey] || {};
  };

  const isCarouselPage = () => {
    return activePage === "Home";
  };

  const getCurrentSlides = () => {
    if (!isCarouselPage()) return [];
    return getCurrentPageConfig()?.carouselSliders || [];
  };

  const getCurrentBanner = () => {
    if (isCarouselPage()) return null;
    return getCurrentPageConfig()?.banner || {};
  };

  const getCurrentAnimation = () => {
    return getCurrentPageConfig()?.slideAnimation || "fade";
  };

  // Update page configuration
  const updatePageConfig = (updates: any) => {
    const pageKey = `${activePage}Customization`;
    handleChange(pageKey, {
      ...getCurrentPageConfig(),
      ...updates,
    });
  };

  // Update banner field for static pages
  const updateBannerField = (field: string, value: any) => {
    const currentBanner = getCurrentBanner();
    handleChange(`${activePage}Customization.banner`, {
      ...currentBanner,
      [field]: value,
    });
  };

  // Create empty slide for Home (with images)
  const createEmptySlide = () => {
    return {
      imageURL: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
      bannerHeading: "New Slide",
      bannerSmallHeading: "Add your description here",
      Button1: {
        title: "Shop Now",
        color: "#10b981",
        link: "/products",
      },
      Button2: {
        title: "Learn More",
        color: "#ffffff",
        textColor: "#000000",
        link: "/about",
      },
      textAnimation: "fadeIn",
    };
  };

  // Add new slide (Home only)
  const addSlide = () => {
    const currentSlides = getCurrentSlides();
    const newSlides = [...(currentSlides || []), createEmptySlide()];
    updatePageConfig({ carouselSliders: newSlides });
    setActiveTab(String(newSlides.length - 1));
  };

  // Remove slide
  const removeSlide = (index: number) => {
    const currentSlides = getCurrentSlides();
    if (currentSlides.length === 1) {
      alert("You must have at least one slide");
      return;
    }
    const newSlides = currentSlides.filter((_: any, i: number) => i !== index);
    updatePageConfig({ carouselSliders: newSlides });
    setActiveTab("0");
    
    if (previewSlideIndex >= newSlides.length) {
      setPreviewSlideIndex(0);
    }
  };

  // Update slide field
  const updateSlideField = (index: number, field: string, value: any) => {
    const currentSlides = getCurrentSlides();
    const newSlides = [...currentSlides];
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      newSlides[index] = {
        ...newSlides[index],
        [parent]: {
          ...newSlides[index][parent],
          [child]: value,
        },
      };
    } else {
      newSlides[index] = { ...newSlides[index], [field]: value };
    }
    
    updatePageConfig({ carouselSliders: newSlides });
  };

  // Update global animation
  const updateGlobalAnimation = (animation: string) => {
    updatePageConfig({ slideAnimation: animation });
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      updateSlideField(index, 'imageURL', event.target?.result);
    };
    reader.readAsDataURL(file);
  };

  // Preview Controls
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
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

  // Auto-play functionality
  useEffect(() => {
    if (!isCarouselPage()) return;
    
    const slides = getCurrentSlides();
    if (isPlaying && slides.length > 1) {
      autoPlayIntervalRef.current = setInterval(() => {
        nextSlide();
      }, 5000);
    } else {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    }

    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, [isPlaying, activePage]);

  // Reset when changing pages
  useEffect(() => {
    setActiveTab("0");
    setPreviewSlideIndex(0);
    setIsPlaying(false);
    setShowTextAnimation(true);
  }, [activePage]);

  // Sync preview slide with active tab
useEffect(() => {
  const tabIndex = parseInt(activeTab);
  if (!isNaN(tabIndex) && tabIndex !== previewSlideIndex) {
    setPreviewSlideIndex(tabIndex);
    // Reset animation when switching tabs
    setShowTextAnimation(false);
    setTimeout(() => setShowTextAnimation(true), 50);
  }
}, [activeTab]);

  // Get background style for static banners
const getBannerBackgroundStyle = (banner: any) => {
  if (!banner) return {};

  if (banner.gradientEnabled) {
    return {
      backgroundImage: `linear-gradient(${banner.gradientDirection || "to right"}, 
        ${banner.gradientColor1 || "#10b981"}, 
        ${banner.gradientColor2 || "#06b6d4"})`,
    };
  }

  return {
    backgroundColor: banner.backgroundColor || "#10b981",
  };
};


  // Get gradient direction options
  const gradientDirections = [
    { value: "to right", label: "Left to Right" },
    { value: "to left", label: "Right to Left" },
    { value: "to bottom", label: "Top to Bottom" },
    { value: "to top", label: "Bottom to Top" },
    { value: "to bottom right", label: "Diagonal ↘" },
    { value: "to bottom left", label: "Diagonal ↙" },
  ];

  const getTextAnimationStyle = (animationType: string) => {
    if (!showTextAnimation) return "opacity-0";
    
    const baseStyle = "transition-all duration-600 ease-out";
    switch (animationType) {
      case "fadeIn":
        return `${baseStyle} opacity-100`;
      case "slideUp":
        return `${baseStyle} opacity-100 translate-y-0`;
      case "slideDown":
        return `${baseStyle} opacity-100 -translate-y-0`;
      case "slideLeft":
        return `${baseStyle} opacity-100 translate-x-0`;
      case "slideRight":
        return `${baseStyle} opacity-100 -translate-x-0`;
      case "zoom":
        return `${baseStyle} opacity-100 scale-100`;
      default:
        return `${baseStyle} opacity-100`;
    }
  };

  const getTextInitialStyle = (animationType: string) => {
    switch (animationType) {
      case "fadeIn":
        return "opacity-0";
      case "slideUp":
        return "opacity-0 translate-y-8";
      case "slideDown":
        return "opacity-0 -translate-y-8";
      case "slideLeft":
        return "opacity-0 translate-x-8";
      case "slideRight":
        return "opacity-0 -translate-x-8";
      case "zoom":
        return "opacity-0 scale-90";
      default:
        return "opacity-0";
    }
  };

  const heroSlides = getCurrentSlides();
  const staticBanner = getCurrentBanner();
  const currentPreviewSlide = isCarouselPage() ? (heroSlides[previewSlideIndex] || heroSlides[0]) : null;

  // Helper function to get contrasting text color
  const getContrastingTextColor = (hexColor: string) => {
    if (!hexColor) return '#ffffff';
    
    // Remove the # if present
    const hex = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Banner Manager</h1>
        <Button 
          onClick={handleSave} 
          className="bg-emerald-400 hover:bg-emerald-600"
        >
          Save All Changes
        </Button>
      </div>

      {/* PAGE SELECTOR */}
      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardHeader>
          <CardTitle className="text-lg">Select Page to Customize</CardTitle>
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

      {/* HOME PAGE - CAROUSEL EDITOR */}
      {isCarouselPage() && (
        <>
          <Card style={{ backgroundColor: "#f0f4f8" }}>
            <CardHeader>
              <CardTitle className="text-lg">{activePage} Page - Global Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Slide Transition Effect</Label>
                <Select value={getCurrentAnimation()} onValueChange={updateGlobalAnimation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {slideAnimations.map(anim => (
                      <SelectItem key={anim.value} value={anim.value}>
                        {anim.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: "#f0f4f8" }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{activePage} Page - Carousel Slides</CardTitle>
                <Button onClick={addSlide} size="sm" className="bg-emerald-400 hover:bg-emerald-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Slide
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
                  {heroSlides.map((_, index) => (
                    <TabsTrigger 
                      key={index} 
                      value={String(index)}
                      className="relative"
                    >
                      Slide {index + 1}
                      {heroSlides.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSlide(index);
                          }}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {heroSlides.map((slide, index) => (
                  <TabsContent key={index} value={String(index)} className="mt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Eye className="w-4 h-4" />
                            Live Preview
                          </div>
                          
                          {heroSlides.length > 1 && (
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={prevSlide} className="h-8 w-8 p-0">
                                <SkipBack className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={togglePlayPause} className="h-8 w-8 p-0">
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
                              <h1 className={`text-4xl font-bold text-white mb-4 leading-tight ${
                                showTextAnimation 
                                  ? getTextAnimationStyle(currentPreviewSlide?.textAnimation)
                                  : getTextInitialStyle(currentPreviewSlide?.textAnimation)
                              }`}>
                                {currentPreviewSlide?.bannerHeading || "Banner Heading"}
                              </h1>
                              <p className={`text-lg text-white/90 mb-6 ${
                                showTextAnimation 
                                  ? getTextAnimationStyle(currentPreviewSlide?.textAnimation)
                                  : getTextInitialStyle(currentPreviewSlide?.textAnimation)
                              }`} style={{ transitionDelay: '100ms' }}>
                                {currentPreviewSlide?.bannerSmallHeading || "Banner subtitle"}
                              </p>
                              <div className={`flex gap-3 ${
                                showTextAnimation 
                                  ? getTextAnimationStyle(currentPreviewSlide?.textAnimation)
                                  : getTextInitialStyle(currentPreviewSlide?.textAnimation)
                              }`} style={{ transitionDelay: '200ms' }}>
                                {currentPreviewSlide?.Button1?.title && (
                                  <a
                                    href={currentPreviewSlide.Button1.link || "#"}
                                    className="px-6 py-3 rounded-full font-semibold shadow-lg transition-transform hover:scale-105"
                                    style={{ 
                                      backgroundColor: currentPreviewSlide.Button1.color || "#10b981",
                                      color: currentPreviewSlide.Button1.textColor || getContrastingTextColor(currentPreviewSlide.Button1.color)
                                    }}
                                  >
                                    {currentPreviewSlide.Button1.title}
                                  </a>
                                )}
                                {currentPreviewSlide?.Button2?.title && (
                                  <a
                                    href={currentPreviewSlide.Button2.link || "#"}
                                    className="px-6 py-3 rounded-full font-semibold shadow-lg transition-transform hover:scale-105"
                                    style={{ 
                                      backgroundColor: currentPreviewSlide.Button2.color || "#ffffff",
                                      color: currentPreviewSlide.Button2.textColor || getContrastingTextColor(currentPreviewSlide.Button2.color)
                                    }}
                                  >
                                    {currentPreviewSlide.Button2.title}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          {heroSlides.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                              {heroSlides.map((_, idx) => (
                                <div key={idx} className={`h-2 rounded-full transition-all ${
                                  idx === previewSlideIndex ? 'w-8 bg-white' : 'w-2 bg-white/50'
                                }`} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="text-sm font-semibold text-slate-700">Edit Slide {index + 1}</div>
                        
                        <div className="space-y-2">
                          <Label>Image URL</Label>
                          <Input
                            placeholder="Enter image URL"
                            value={slide.imageURL || ""}
                            onChange={(e) => updateSlideField(index, 'imageURL', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Or Upload Image</Label>
                          <Input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleImageUpload(e, index)} 
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Text Animation</Label>
                          <Select 
                            value={slide.textAnimation || "fadeIn"} 
                            onValueChange={(value) => updateSlideField(index, 'textAnimation', value)}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {textAnimations.map(anim => (
                                <SelectItem key={anim.value} value={anim.value}>{anim.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Main Heading</Label>
                          <Input
                            placeholder="e.g., Natural & Powerful"
                            value={slide.bannerHeading || ""}
                            onChange={(e) => updateSlideField(index, 'bannerHeading', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Subtitle</Label>
                          <Textarea
                            placeholder="e.g., 100% plant-based ingredients"
                            value={slide.bannerSmallHeading || ""}
                            onChange={(e) => updateSlideField(index, 'bannerSmallHeading', e.target.value)}
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Button 1 Text</Label>
                          <Input
                            placeholder="e.g., Shop Now"
                            value={slide.Button1?.title || ""}
                            onChange={(e) => updateSlideField(index, 'Button1.title', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Button 1 Link</Label>
                          <Input
                            placeholder="e.g., /products"
                            value={slide.Button1?.link || ""}
                            onChange={(e) => updateSlideField(index, 'Button1.link', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Button 1 Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={slide.Button1?.color || "#10b981"}
                              onChange={(e) => updateSlideField(index, 'Button1.color', e.target.value)}
                              className="w-20 h-10"
                            />
                            <Input
                              placeholder="#10b981"
                              value={slide.Button1?.color || ""}
                              onChange={(e) => updateSlideField(index, 'Button1.color', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Button 2 Text</Label>
                          <Input
                            placeholder="e.g., Learn More"
                            value={slide.Button2?.title || ""}
                            onChange={(e) => updateSlideField(index, 'Button2.title', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Button 2 Link</Label>
                          <Input
                            placeholder="e.g., /about"
                            value={slide.Button2?.link || ""}
                            onChange={(e) => updateSlideField(index, 'Button2.link', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Button 2 Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={slide.Button2?.color || "#ffffff"}
                              onChange={(e) => updateSlideField(index, 'Button2.color', e.target.value)}
                              className="w-20 h-10"
                            />
                            <Input
                              placeholder="#ffffff"
                              value={slide.Button2?.color || ""}
                              onChange={(e) => updateSlideField(index, 'Button2.color', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Button 2 Text Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={slide.Button2?.textColor || "#000000"}
                              onChange={(e) => updateSlideField(index, 'Button2.textColor', e.target.value)}
                              className="w-20 h-10"
                            />
                            <Input
                              placeholder="#000000"
                              value={slide.Button2?.textColor || ""}
                              onChange={(e) => updateSlideField(index, 'Button2.textColor', e.target.value)}
                            />
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

      {/* STATIC PAGES - BANNER EDITOR */}
{!isCarouselPage() && (
  <Card style={{ backgroundColor: "#f0f4f8" }}>
    <CardHeader>
      <CardTitle>{activePage} Page - Banner Settings</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibol">
            <Eye className="w-4 h-4" />
            Live Preview
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

        <div className="space-y-4">
          <div className="text-sm font-semibold text-slate-700">
            Edit {activePage} Banner
          </div>

          <div className="space-y-2">
            <Label>Main Heading</Label>
            <Input
              placeholder={`e.g., ${activePage} Banner Title`}
              value={staticBanner.bannerHeading || ""}
              onChange={(e) => updateBannerField('bannerHeading', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Textarea
              placeholder={`e.g., ${activePage} page description...`}
              value={staticBanner.bannerSmallHeading || ""}
              onChange={(e) => updateBannerField('bannerSmallHeading', e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="gradient"
                checked={staticBanner.gradientEnabled || false}
                onChange={(e) => updateBannerField('gradientEnabled', e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="gradient">Enable Gradient</Label>
            </div>
          </div>

          {!staticBanner.gradientEnabled ? (
            <div className="space-y-2">
              <Label>Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={staticBanner.backgroundColor || "#10b981"}
                  onChange={(e) => updateBannerField('backgroundColor', e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  placeholder="#10b981"
                  value={staticBanner.backgroundColor || "#10b981"}
                  onChange={(e) => updateBannerField('backgroundColor', e.target.value)}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Gradient Color 1</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={staticBanner.gradientColor1 || "#10b981"}
                    onChange={(e) => updateBannerField('gradientColor1', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    placeholder="#10b981"
                    value={staticBanner.gradientColor1 || "#10b981"}
                    onChange={(e) => updateBannerField('gradientColor1', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Gradient Color 2</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={staticBanner.gradientColor2 || "#06b6d4"}
                    onChange={(e) => updateBannerField('gradientColor2', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    placeholder="#06b6d4"
                    value={staticBanner.gradientColor2 || "#06b6d4"}
                    onChange={(e) => updateBannerField('gradientColor2', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Gradient Direction</Label>
                <Select 
                  value={staticBanner.gradientDirection || "to right"} 
                  onValueChange={(value) => updateBannerField('gradientDirection', value)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {gradientDirections.map(dir => (
                      <SelectItem key={dir.value} value={dir.value}>{dir.label}</SelectItem>
                    ))}
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
    </div>
  );
}