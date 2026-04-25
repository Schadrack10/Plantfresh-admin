import { useCallback, useEffect, useState, useContext, useRef } from "react";
import { Template } from "@/types";
import AppContext from "../context/AppContext";
import { templateService } from "@/services/firebase/templateService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Trash2, Pencil, Loader2, GripVertical, LayoutTemplate,
  Image as ImageIcon, Grid3X3, Home as HomeIcon, Star, Megaphone,
  Mail, Info, HelpCircle, Phone, Package, Check, X, Eye,
  ChevronDown, ChevronUp, ArrowUp, ArrowDown, Upload, Link as LinkIcon,
} from "lucide-react";
import { doc, deleteDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// ─── Section type definitions ─────────────────────────────────────────────────
const SECTION_TYPES = [
  {
    type: "Hero",
    label: "Hero Banner",
    icon: ImageIcon,
    color: "bg-rose-50 border-rose-200 text-rose-700",
    iconBg: "bg-rose-100",
    description: "Full-width banner with title, subtitle, CTA button and background image",
    defaultContent: {
      title: "Welcome to Our Store",
      subtitle: "Discover amazing products for your home",
      ctaText: "Shop Now",
      ctaLink: "/products",
      backgroundImage: "",
      overlayOpacity: 40,
    },
  },
  {
    type: "Features",
    label: "Features Grid",
    icon: Grid3X3,
    color: "bg-blue-50 border-blue-200 text-blue-700",
    iconBg: "bg-blue-100",
    description: "Icon grid showcasing key product features or benefits",
    defaultContent: {
      heading: "Why Choose Us",
      subheading: "Quality you can trust",
      items: [
        { icon: "Star", title: "Premium Quality", description: "Best materials used" },
        { icon: "Package", title: "Fast Delivery", description: "2–5 business days" },
        { icon: "Check", title: "Satisfaction Guaranteed", description: "30-day returns" },
        { icon: "Phone", title: "24/7 Support", description: "Always here to help" },
      ],
    },
  },
  {
    type: "ProductsGrid",
    label: "Products Grid",
    icon: Package,
    color: "bg-amber-50 border-amber-200 text-amber-700",
    iconBg: "bg-amber-100",
    description: "Showcase a grid of product cards from your catalog",
    defaultContent: {
      heading: "Featured Products",
      subheading: "Our bestsellers",
      columns: 3,
      showPrice: true,
      showAddToCart: true,
      limit: 6,
    },
  },
  {
    type: "Rooms",
    label: "Shop by Room",
    icon: HomeIcon,
    color: "bg-green-50 border-green-200 text-green-700",
    iconBg: "bg-green-100",
    description: "Category image cards that link shoppers to a room or category",
    defaultContent: {
      heading: "Shop by Room",
      rooms: [
        { name: "Living Room", categoryId: "living-room", imageUrl: "" },
        { name: "Bedroom", categoryId: "bedroom", imageUrl: "" },
        { name: "Kitchen", categoryId: "kitchen", imageUrl: "" },
      ],
    },
  },
  {
    type: "Testimonials",
    label: "Testimonials",
    icon: Star,
    color: "bg-purple-50 border-purple-200 text-purple-700",
    iconBg: "bg-purple-100",
    description: "Customer review cards to build social proof",
    defaultContent: {
      heading: "What Our Customers Say",
      reviews: [
        { name: "Sarah M.", rating: 5, text: "Absolutely love the products! Will definitely buy again.", avatar: "" },
        { name: "James T.", rating: 5, text: "Fast delivery and top-notch quality. Highly recommend.", avatar: "" },
        { name: "Aisha K.", rating: 4, text: "Great value for money. Very happy with my order.", avatar: "" },
      ],
    },
  },
  {
    type: "CTABanner",
    label: "CTA Banner",
    icon: Megaphone,
    color: "bg-orange-50 border-orange-200 text-orange-700",
    iconBg: "bg-orange-100",
    description: "Full-width call-to-action strip with headline and button",
    defaultContent: {
      heading: "Ready to transform your space?",
      subheading: "Shop our full range today and get free delivery on orders over R500.",
      ctaText: "Browse All Products",
      ctaLink: "/products",
      backgroundColor: "#1e293b",
      textColor: "#ffffff",
    },
  },
  {
    type: "Newsletter",
    label: "Newsletter",
    icon: Mail,
    color: "bg-cyan-50 border-cyan-200 text-cyan-700",
    iconBg: "bg-cyan-100",
    description: "Email signup section to grow your subscriber list",
    defaultContent: {
      heading: "Stay in the loop",
      subheading: "Get exclusive deals and updates delivered to your inbox.",
      placeholder: "Enter your email address",
      buttonText: "Subscribe",
    },
  },
  {
    type: "About",
    label: "About Snippet",
    icon: Info,
    color: "bg-teal-50 border-teal-200 text-teal-700",
    iconBg: "bg-teal-100",
    description: "Short company story section with image and text",
    defaultContent: {
      heading: "Our Story",
      paragraph: "We started with a simple mission: to bring quality products to every home at fair prices.",
      imageUrl: "",
      imagePosition: "right",
    },
  },
  {
    type: "FAQ",
    label: "FAQ",
    icon: HelpCircle,
    color: "border-indigo-200 text-indigo-700",
    iconBg: "",
    description: "Accordion-style frequently asked questions section",
    defaultContent: {
      heading: "Frequently Asked Questions",
      items: [
        { question: "What is your return policy?", answer: "We offer a 30-day return policy on all items." },
        { question: "How long does delivery take?", answer: "Standard delivery takes 2–5 business days." },
        { question: "Do you offer gift wrapping?", answer: "Yes! Select gift wrap at checkout." },
      ],
    },
  },
  {
    type: "ContactInfo",
    label: "Contact Info",
    icon: Phone,
    color: "bg-slate-50 border-slate-200 text-slate-700",
    iconBg: "bg-slate-100",
    description: "Contact details including phone, email, and address",
    defaultContent: {
      heading: "Get in Touch",
      phone: "+27 11 000 0000",
      email: "hello@yourstore.com",
      address: "123 Main Street, Johannesburg, 2000",
      mapUrl: "",
    },
  },
];

const getSectionDef = (type: string) => SECTION_TYPES.find(s => s.type === type);

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 9);

// ─── Image compression — identical to Features.tsx ────────────────────────────
const compressImage = (file: File, maxWidth: number, quality: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        blob => {
          URL.revokeObjectURL(objectUrl);
          blob ? resolve(blob) : reject(new Error("Compression failed"));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
    img.src = objectUrl;
  });
};

// ─── Image Upload Input — mirrors Features.tsx ImageUploadSlot exactly ─────────
const ImageUploadInput = ({
  value,
  onChange,
  storage,
  db,
}: {
  value: string;
  onChange: (url: string) => void;
  storage: any;
  db: any;
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const { toast } = useToast();

const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!storage) {
    toast({ title: "Firebase Storage not connected", variant: "destructive" });
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    toast({ title: "File too large", description: "Max 10 MB", variant: "destructive" });
    return;
  }

  setUploading(true);
  setProgress(10);

  try {
    const compressed = await compressImage(file, 800, 0.75);
    setProgress(30);

    const fileName = `${Date.now()}_${file.name}`;
    const storagePath = `template-previews/${fileName}`;

    // Convert to File with explicit MIME type
    const compressedFile = new File([compressed], fileName, { type: "image/jpeg" });

    const storageRef = ref(storage, storagePath);
    // Pass contentType in metadata
    const task = uploadBytesResumable(storageRef, compressedFile, {
      contentType: "image/jpeg",
    });

    await new Promise<void>((resolve, reject) => {
      task.on(
        "state_changed",
        snap => setProgress(30 + Math.round((snap.bytesTransferred / snap.totalBytes) * 60)),
        (err) => {
          console.error("Upload error:", err); // ← check console for the real error
          reject(err);
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          if (db) {
            try {
              await addDoc(collection(db, "Assets"), {
                URL: url,
                Type: "template-preview",
                FileName: fileName,
                StoragePath: storagePath,
                CreatedAt: serverTimestamp(),
              });
            } catch (assetErr) {
              console.warn("Asset save failed:", assetErr);
            }
          }
          onChange(url);
          resolve();
        }
      );
    });

    setProgress(100);
    toast({ title: "Image uploaded" });
  } catch (err: any) {
    console.error("Full upload error:", err);
    toast({ title: "❌ Upload failed", description: err?.message || err?.code, variant: "destructive" });
  } finally {
    setUploading(false);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  }
};

  return (
    <div className="space-y-2">
      <Label>Preview Image</Label>

      {/* Tab switcher */}
      <div className="flex rounded-lg border border-slate-200 overflow-hidden w-fit">
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === "upload" ? "text-white" : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
          style={tab === "upload" ? { backgroundColor: "var(--admin-btn-bg)", color: "var(--admin-btn-text)" } : {}}
        >
          <Upload className="w-3 h-3" /> Upload file
        </button>
        <button
          type="button"
          onClick={() => setTab("url")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === "url" ? "text-white" : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
          style={tab === "url" ? { backgroundColor: "var(--admin-btn-bg)", color: "var(--admin-btn-text)" } : {}}
        >
          <LinkIcon className="w-3 h-3" /> URL
        </button>
      </div>

      {tab === "upload" ? (
        <div>
          {/* Hidden input with ref — same as Features.tsx */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={handleFile}
          />

          {/* Clickable drop zone */}
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer
              ${uploading
                ? "cursor-not-allowed"
                : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
              }`}
              style={uploading ? { borderColor: "var(--admin-primary-30)", backgroundColor: "var(--admin-primary-20)" } : {}}
          >
          >
            {uploading ? (
              // Progress UI — same pattern as Features.tsx
              <div className="p-8 text-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: "var(--admin-primary)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--admin-primary)" }}>Uploading… {progress}%</p>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%`, backgroundColor: "var(--admin-primary)" }}
                  />
                </div>
              </div>
            ) : value ? (
              // Preview existing image
              <div className="relative w-full h-36 rounded-xl overflow-hidden">
                <img src={value} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-white text-xs font-medium">Click to change image</p>
                </div>
              </div>
            ) : (
              // Empty state
              <div className="p-8 text-center">
                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">Click to upload image</p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG, GIF, WebP up to 10MB</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
          {value && (
            <img
              src={value}
              alt="Preview"
              className="w-full h-36 object-cover rounded-xl border border-slate-200"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </div>
      )}
    </div>
  );
};

// ─── Section Picker ───────────────────────────────────────────────────────────
const SectionPicker = ({
  onAdd, onClose,
}: { onAdd: (type: string) => void; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
      <div className="flex items-center justify-between p-5 border-b">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Add a Section</h3>
          <p className="text-xs text-slate-500 mt-0.5">Choose a section type to add to this template</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SECTION_TYPES.map(({ type, label, icon: Icon, color, iconBg, description }) => (
          <button
            key={type}
            onClick={() => { onAdd(type); onClose(); }}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${color}`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs mt-0.5 opacity-80 leading-tight">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

// ─── Section Card ─────────────────────────────────────────────────────────────
const SectionCard = ({
  section, index, total,
  onMoveUp, onMoveDown, onRemove,
}: {
  section: any; index: number; total: number;
  onMoveUp: () => void; onMoveDown: () => void; onRemove: () => void;
}) => {
  // Handle both casings (new sections use Type, Firestore data may use type)
  const sectionType = section.Type || section.type;
  const def = getSectionDef(sectionType);
  const Icon = def?.icon || Grid3X3;

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border-2 bg-white ${def?.color || "border-slate-200"}`}>
      <div className="text-slate-300 cursor-grab flex-shrink-0">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${def?.iconBg || "bg-slate-100"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{def?.label || sectionType}</p>
        <p className="text-xs opacity-70 truncate mt-0.5">{def?.description || "Custom section"}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          disabled={index === 0}
          onClick={onMoveUp}
          className="p-1.5 rounded-lg hover:bg-black/10 disabled:opacity-30 transition"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          disabled={index === total - 1}
          onClick={onMoveDown}
          className="p-1.5 rounded-lg hover:bg-black/10 disabled:opacity-30 transition"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition ml-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// ─── Template Form ────────────────────────────────────────────────────────────
const TemplateForm = ({
  initial, onSave, onCancel, saving, storage, db,
}: {
  initial?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  saving: boolean;
  storage: any;
  db: any;
}) => {
  const [name, setName]               = useState(initial?.Name || "");
  const [description, setDescription] = useState(initial?.Description || "");
  const [previewImage, setPreviewImage] = useState(initial?.PreviewImage || "");
  const [sections, setSections]       = useState<any[]>(initial?.Pages?.[0]?.Sections || []);
  const [showPicker, setShowPicker]   = useState(false);

  const addSection = (type: string) => {
    const def = getSectionDef(type);
    setSections(prev => [
      ...prev,
      { Id: uid(), Type: type, Content: def?.defaultContent || {}, Order: prev.length + 1 },
    ]);
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    setSections(prev => {
      const a = [...prev]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a;
    });
  };

  const moveDown = (i: number) => {
    setSections(prev => {
      if (i >= prev.length - 1) return prev;
      const a = [...prev]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a;
    });
  };

  const removeSection = (i: number) =>
    setSections(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({
      Name: name.trim(),
      Description: description.trim(),
      PreviewImage: previewImage.trim(),
      Pages: [
        {
          Id: initial?.Pages?.[0]?.Id || uid(),
          Title: "Home",
          Slug: "home",
          Sections: sections.map((s, i) => ({ ...s, Order: i + 1 })),
        },
      ],
      Theme: initial?.Theme || {
        PrimaryColor: "#16a34a",
        SecondaryColor: "#10b981",
        FontFamily: "Inter, sans-serif",
        BackgroundColor: "#ffffff",
        TextColor: "#111827",
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Basic info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Template Name <span className="text-red-500">*</span></Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Clean Home Store"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Short description of this template"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <ImageUploadInput
            value={previewImage}
            onChange={setPreviewImage}
            storage={storage}
            db={db}
          />
        </div>
      </div>

      {/* Section builder */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">Page Sections</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Build the structure of the home page for this template.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowPicker(true)}
            className="gap-1.5 bg-emerald-500 hover:bg-emerald-600"
          >
            <Plus className="w-4 h-4" /> Add Section
          </Button>
        </div>

        {sections.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
            <LayoutTemplate className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">No sections yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "Add Section" to start building your template layout
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPicker(true)}
              className="mt-4 gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add your first section
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {sections.map((section, i) => (
              <SectionCard
                key={section.Id}
                section={section}
                index={i}
                total={sections.length}
                onMoveUp={() => moveUp(i)}
                onMoveDown={() => moveDown(i)}
                onRemove={() => removeSection(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={saving || !name.trim()}
          className="gap-1.5 min-w-[120px]"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : <><Check className="w-4 h-4" /> Save Template</>
          }
        </Button>
      </div>

      {showPicker && (
        <SectionPicker onAdd={addSection} onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
};

// ─── Template Card ────────────────────────────────────────────────────────────
const TemplateCard = ({
  template, onEdit, onDelete,
}: { template: any; onEdit: () => void; onDelete: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const sections = template.Pages?.[0]?.Sections || [];

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full">
      {/* Image area */}
      <div className="w-full h-44 overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center relative">
        {template.PreviewImage ? (
          <img
            src={template.PreviewImage}
            alt={template.Name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-slate-100 to-slate-200">
            <LayoutTemplate className="w-10 h-10 text-slate-300" />
            <p className="text-xs text-slate-400 mt-2">No preview image</p>
          </div>
        )}
      </div>

      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-base flex items-start justify-between gap-2">
          <span className="truncate">{template.Name}</span>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0 whitespace-nowrap">
            {sections.length} section{sections.length !== 1 ? "s" : ""}
          </span>
        </CardTitle>
        {template.Description && (
          <p className="text-xs text-slate-500 leading-snug mt-0.5 line-clamp-2">
            {template.Description}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pt-0 flex flex-col flex-1">
        {/* Collapsible section list */}
        {sections.length > 0 && (
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(p => !p)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> View sections
              </span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {expanded && (
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {sections.map((s: any, i: number) => {
                  const sectionType = s.Type || s.type;
                  const def = getSectionDef(sectionType);
                  const Icon = def?.icon || Grid3X3;
                  return (
                    <div key={s.Id || i} className="flex items-center gap-2.5 px-3 py-2.5 bg-slate-50">
                      <span className="text-[10px] font-mono text-slate-400 w-4 flex-shrink-0">{i + 1}</span>
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${def?.iconBg || "bg-slate-200"}`} style={def?.iconBg ? {} : { backgroundColor: "var(--admin-primary-20)" }}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <span className="text-xs text-slate-700 font-medium">{def?.label || sectionType}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onEdit} className="flex-1 gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Templates() {
  const { db, storage } = useContext(AppContext);
  const { toast } = useToast();

  const [templates, setTemplates]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [view, setView]               = useState<"list" | "create" | "edit">("list");
  const [editTarget, setEditTarget]   = useState<any | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const list = await templateService.getAllTemplates();
      setTemplates(list);
    } catch {
      toast({ title: "Failed to load templates", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleCreate = async (data: any) => {
    setSaving(true);
    try {
      await templateService.createTemplate(data);
      toast({ title: "Template created", description: `${data.Name} is ready to use.` });
      setView("list");
      loadTemplates();
    } catch (err: any) {
      toast({ title: "Create failed", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editTarget?.Id) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "Templates", editTarget.Id), {
        ...data,
        UpdatedAt: new Date(),
      });
      toast({ title: "Template updated" });
      setView("list");
      setEditTarget(null);
      loadTemplates();
    } catch (err: any) {
      toast({ title: "Update failed", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      await deleteDoc(doc(db, "Templates", id));
      toast({ title: "Template deleted" });
      setDeletingId(null);
      loadTemplates();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message, variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            {view === "list" ? "Templates" : view === "create" ? "Create Template" : "Edit Template"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {view === "list"
              ? "Build and manage starter templates that tenants use to launch their storefronts."
              : "Design the page structure by adding and arranging sections."}
          </p>
        </div>
        {view === "list" && (
          <Button
            onClick={() => setView("create")}
            className="gap-1.5 bg-emerald-500 hover:bg-emerald-600"
          >
            <Plus className="w-4 h-4" /> New Template
          </Button>
        )}
        {view !== "list" && (
          <Button
            variant="outline"
            onClick={() => { setView("list"); setEditTarget(null); }}
            className="gap-1.5"
          >
            <X className="w-4 h-4" /> Back to Templates
          </Button>
        )}
      </div>

      {/* Create / Edit form */}
      {(view === "create" || view === "edit") && (
        <Card>
          <CardContent className="pt-6">
            <TemplateForm
              initial={view === "edit" ? editTarget : undefined}
              onSave={view === "create" ? handleCreate : handleUpdate}
              onCancel={() => { setView("list"); setEditTarget(null); }}
              saving={saving}
              storage={storage}
              db={db}
            />
          </CardContent>
        </Card>
      )}

      {/* Template list */}
      {view === "list" && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <LayoutTemplate className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-600 mb-1">No templates yet</p>
                <p className="text-sm text-slate-400 mb-5">
                  Create your first template to let tenants launch quickly.
                </p>
                <Button
                  onClick={() => setView("create")}
                  className="gap-1.5 bg-emerald-500 hover:bg-emerald-600"
                >
                  <Plus className="w-4 h-4" /> Create first template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 items-stretch">
              {templates.map(template => (
                <TemplateCard
                  key={template.Id}
                  template={template}
                  onEdit={() => { setEditTarget(template); setView("edit"); }}
                  onDelete={() => setDeletingId(template.Id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete Template
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{" "}
            <strong>{templates.find(t => t.Id === deletingId)?.Name}</strong>?
            Tenants already using this template will not be affected, but it will no longer be
            available for new tenants.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={deleteLoading}
            >
              {deleteLoading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting…</>
                : "Delete permanently"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}