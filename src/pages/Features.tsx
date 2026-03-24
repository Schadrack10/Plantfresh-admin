import { useState, useContext, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Trash2, Upload, Loader2, Eye, ChevronDown, ChevronUp,
  Leaf, Shield, Star, Heart, Sparkles, Zap, Globe,
  Sun, Moon, Wind, Droplets, Flame, Snowflake, Flower2,
  TreePine, Recycle, Package, Award, CheckCircle, Coffee,
  Home as HomeIcon, ShoppingBag, Truck, Lock, Phone, Mail,
  Navigation, Palette, Type, Layout, ShoppingCart, CreditCard,
  MessageSquare, Settings, Image as ImageIcon, Layers, RefreshCw,
} from "lucide-react";
import AppContext from "../context/AppContext";
import UsefireFunctionsHook from "../utility/usefirebaseFuncHook";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs } from "firebase/firestore";

// ─── Icon registry ────────────────────────────────────────────────────────────
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
  { value: 'Home', Icon: HomeIcon }, { value: 'ShoppingBag', Icon: ShoppingBag },
  { value: 'Truck', Icon: Truck }, { value: 'Lock', Icon: Lock },
  { value: 'Phone', Icon: Phone }, { value: 'Mail', Icon: Mail },
];
const getIcon = (name: string) => ICON_OPTIONS.find(o => o.value === name)?.Icon || Leaf;

// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULT_FEATURES = {
  heading: 'Clean Your Home, Love Your Planet',
  headingHighlight: 'Love Your Planet',
  subheading: 'Experience the perfect balance of powerful cleaning and environmental responsibility.',
  badgeText: 'Award-Winning Formula',
  backgroundColor: '#f9fafb', headingColor: '#0f172a', highlightColor: '#00e676',
  bodyColor: '#475569', badgeBg: '#dcfce7', badgeTextColor: '#16a34a',
  cardBg: '#ffffff', cardBorder: '#e5e7eb', cardRadius: 16, iconColor: '#00e676', paddingY: 80,
  items: [
    { id: '1', icon: 'Leaf', title: '100% Natural', description: 'Plant-based ingredients' },
    { id: '2', icon: 'Shield', title: 'Non-Toxic', description: 'Safe for kids & pets' },
    { id: '3', icon: 'Sparkles', title: 'Powerful Clean', description: 'Professional results' },
    { id: '4', icon: 'Heart', title: 'Cruelty Free', description: 'Never tested on animals' },
  ],
};

const DEFAULT_ROOMS = {
  heading: 'Shop by Room', headingColor: '#0f172a',
  backgroundColor: '#f3f4f6', cardRadius: 16, paddingY: 80,
  rooms: [] as any[],
};

const uid = () => Math.random().toString(36).slice(2, 9);

// ─── Shared UI helpers ────────────────────────────────────────────────────────
const ColorRow = ({ label, value, onChange }: any) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-slate-500">{label}</Label>
    <div className="flex gap-2">
      <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
        className="h-9 w-14 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0" />
      <Input value={value || ''} onChange={e => onChange(e.target.value)} className="flex-1 bg-gray-50 font-mono text-sm" />
    </div>
  </div>
);

const SliderRow = ({ label, value, min, max, onChange, unit = 'px' }: any) => (
  <div className="space-y-1.5">
    <div className="flex justify-between">
      <Label className="text-xs text-slate-500">{label}</Label>
      <span className="text-xs font-mono text-slate-600">{value}{unit}</span>
    </div>
    <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
      className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-emerald-500" />
  </div>
);

// Collapsible section wrapper
const Section = ({ title, icon: Icon, children, defaultOpen = false, preview }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean; preview?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card style={{ backgroundColor: '#f0f4f8' }}>
      <CardHeader className="flex flex-row items-center justify-between cursor-pointer select-none py-4"
        onClick={() => setOpen(p => !p)}>
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

// ─── Image compression helper ─────────────────────────────────────────────────
const compressImage = (file: File, maxWidth: number, quality: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error('Canvas context unavailable')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => { URL.revokeObjectURL(objectUrl); blob ? resolve(blob) : reject(new Error('Image compression failed')); }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')); };
    img.src = objectUrl;
  });
};

// ─── Image upload slot ────────────────────────────────────────────────────────
const ImageUploadSlot = ({ url, onUrlChange }: { url: string; onUrlChange: (v: string) => void }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const displayUrl = !url || url.startsWith('__img:') ? '' : url;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast({ title: 'File too large', description: 'Please upload an image under 10 MB.', variant: 'destructive' }); return; }
    setUploading(true); setProgress(10);
    try {
      const compressed = await compressImage(file, 500, 0.65);
      setProgress(60);
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(compressed);
      });
      const kb = (new Blob([base64]).size / 1024).toFixed(1);
      setProgress(100);
      onUrlChange(base64);
      toast({ title: '✅ Image ready', description: `${kb} KB — saved in separate document` });
    } catch (err: any) {
      toast({ title: '❌ Failed', description: err?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setUploading(false); setProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Input value={displayUrl} onChange={e => onUrlChange(e.target.value)} placeholder="Paste image URL or upload below" className="bg-gray-50 text-xs h-8" />
      <label className="block cursor-pointer">
        <div className={`border-2 border-dashed rounded-lg p-2.5 text-center transition-colors ${uploading ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50'}`}>
          {uploading ? (
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing… {progress}%</div>
              <div className="w-full bg-emerald-100 rounded-full h-1"><div className="bg-emerald-500 h-1 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs"><Upload className="w-3.5 h-3.5" /> Upload image</div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleFile} />
      </label>
      {displayUrl && <img src={displayUrl} alt="" className="w-full h-24 object-cover rounded-lg border border-gray-200" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
    </div>
  );
};

// ─── Previews ─────────────────────────────────────────────────────────────────
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
      {cfg.items.slice(0, 4).map(item => {
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
        {cfg.rooms.slice(0, 6).map(room => (
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

const NavbarPreview = ({ cfg, primaryColor }: any) => (
  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: cfg?.background || '#ffffff' }}>
      <div className="flex items-center gap-2">
        {cfg?.logoURL ? <img src={cfg.logoURL} alt="Logo" className="h-6 object-contain" /> : <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: primaryColor }}><Leaf className="w-3.5 h-3.5 text-white" /></div>}
        <span className="font-bold text-sm" style={{ color: primaryColor }}>PlantFresh</span>
      </div>
      <div className="hidden sm:flex items-center gap-4">
        {['Home','Products','About','Contact'].map(item => <span key={item} className="text-xs text-slate-500">{item}</span>)}
      </div>
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: primaryColor }}>Cart</div>
    </div>
    {cfg?.sticky && <div className="text-[10px] text-emerald-600 bg-emerald-50 px-4 py-1 border-t border-emerald-100">✓ Sticky navbar enabled</div>}
  </div>
);

const FooterPreview = ({ footerCfg, primaryColor }: any) => (
  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
    <div className="px-4 py-4" style={{ backgroundColor: footerCfg?.backgroundColor || '#1e293b' }}>
      <div className="flex justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: primaryColor }}><Leaf className="w-3 h-3 text-white" /></div>
            <span className="font-bold text-sm text-white">PlantFresh</span>
          </div>
          <p className="text-xs text-white/50 max-w-[160px]">Eco-friendly cleaning for a better planet.</p>
        </div>
        <div className="flex gap-5">
          {['Products','About','Contact'].map(l => (
            <div key={l}><p className="text-xs font-semibold text-white mb-1">{l}</p>{['Link 1','Link 2'].map(s => <p key={s} className="text-[10px] text-white/40">{s}</p>)}</div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 pt-2">
        <p className="text-[10px] text-white/40">{footerCfg?.copyrightText || '© 2024 PlantFresh. All rights reserved.'}</p>
      </div>
    </div>
  </div>
);

const ThemePreview = ({ themeCfg }: any) => {
  const primary = themeCfg?.buttons?.primaryBg || '#00e676';
  const secondary = themeCfg?.buttons?.secondaryBg || '#24abff';
  const heading = themeCfg?.text?.heading || '#0f172a';
  const body = themeCfg?.text?.body || '#475569';
  const highlight = themeCfg?.text?.highlight || '#00e676';
  const cardBg = themeCfg?.cards?.background || '#ffffff';
  const cardBorder = themeCfg?.cards?.border || '#e5e7eb';
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm p-4 space-y-3">
      <div><p className="text-[10px] text-slate-400 mb-1">Typography</p>
        <p className="text-base font-bold" style={{ color: heading }}>Heading Text Sample</p>
        <p className="text-xs" style={{ color: body }}>Body text sample — paragraphs look like this.</p>
        <p className="text-xs font-semibold" style={{ color: highlight }}>Highlighted / accent text</p>
      </div>
      <div><p className="text-[10px] text-slate-400 mb-1">Buttons</p>
        <div className="flex gap-2">
          <div className="px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{ background: primary }}>Primary</div>
          <div className="px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{ background: secondary }}>Secondary</div>
        </div>
      </div>
      <div><p className="text-[10px] text-slate-400 mb-1">Card</p>
        <div className="rounded-xl p-3 border text-xs" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
          <p className="font-semibold" style={{ color: heading }}>Card Title</p>
          <p style={{ color: body }}>Card body content goes here.</p>
        </div>
      </div>
    </div>
  );
};

const ProductCardPreview = ({ cfg, primaryColor }: any) => {
  const bg = cfg?.appearance?.cardBackground || '#ffffff';
  const border = cfg?.appearance?.cardBorder || '#e5e7eb';
  const radius = cfg?.appearance?.borderRadius || 16;
  const titleCol = cfg?.colors?.titleColor || '#0f172a';
  const descCol = cfg?.colors?.descriptionColor || '#475569';
  const tagBg = cfg?.colors?.tagBackground || '#00e676';
  const tagText = cfg?.colors?.tagTextColor || '#ffffff';
  const price = cfg?.colors?.priceColor || '#00e676';
  const btnBg = cfg?.colors?.addToCartBg || '#00e676';
  const btnText = cfg?.colors?.addToCartText || '#ffffff';
  const showTags = cfg?.display?.showTags !== false;
  const showDesc = cfg?.display?.showDescription !== false;
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm p-4">
      <div className="grid grid-cols-3 gap-3">
        {['Eco Spray','Floor Cleaner','Dish Soap'].map((name, i) => (
          <div key={i} className="border overflow-hidden" style={{ backgroundColor: bg, borderColor: border, borderRadius: `${radius}px` }}>
            <div className="h-24 bg-gradient-to-br from-slate-200 to-slate-300 relative">
              {showTags && <span className="absolute top-2 left-2 text-[8px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: tagBg, color: tagText }}>New</span>}
            </div>
            <div className="p-2">
              <p className="font-semibold text-[10px] truncate" style={{ color: titleCol }}>{name}</p>
              {showDesc && <p className="text-[9px] truncate" style={{ color: descCol }}>Plant-based formula</p>}
              <p className="font-bold text-[11px] mt-1" style={{ color: price }}>R{(89.99 + i * 20).toFixed(2)}</p>
              <div className="mt-1.5 text-[9px] font-semibold text-center py-1 rounded-lg" style={{ background: btnBg, color: btnText }}>Add to Cart</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AboutPreview = ({ cfg, primaryColor }: any) => (
  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm p-4 space-y-3">
    <div className="flex gap-3">
      {cfg?.content?.storyImageURL ? <img src={cfg.content.storyImageURL} alt="Story" className="w-20 h-20 object-cover rounded-lg flex-shrink-0" /> : <div className="w-20 h-20 bg-slate-200 rounded-lg flex-shrink-0 flex items-center justify-center"><ImageIcon className="w-6 h-6 text-slate-400" /></div>}
      <div className="min-w-0">
        <p className="font-bold text-sm truncate" style={{ color: primaryColor }}>{cfg?.content?.storyTitle || 'Our Story'}</p>
        <p className="text-xs text-slate-500 line-clamp-3 mt-1">{cfg?.content?.storyParagraph1 || 'Founded with a passion for eco-friendly cleaning...'}</p>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {[1,2,3].map(n => (
        <div key={n} className="bg-emerald-50 rounded-lg p-2 text-center">
          <p className="font-semibold text-[10px]" style={{ color: primaryColor }}>{(cfg?.content as any)?.[`value${n}Title`] || `Value ${n}`}</p>
          <p className="text-[9px] text-slate-500 line-clamp-2 mt-0.5">{(cfg?.content as any)?.[`value${n}Desc`] || 'Description here'}</p>
        </div>
      ))}
    </div>
  </div>
);

const CartPreview = ({ cfg, primaryColor }: any) => (
  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm p-4">
    <div className="space-y-2">
      {[['Eco Spray x1','R129.99'],['Floor Cleaner x2','R239.98']].map(([name, price]) => (
        <div key={name} className="flex justify-between text-xs py-1.5 border-slate-100">
          <span className="text-slate-700">{name}</span><span className="font-semibold">{price}</span>
        </div>
      ))}
      {cfg?.TaxAmount && <div className="flex justify-between text-xs text-slate-500"><span>Tax ({cfg.TaxAmount}%)</span><span>R{((129.99+239.98)*Number(cfg.TaxAmount)/100).toFixed(2)}</span></div>}
      <div className="flex justify-between font-bold text-sm pt-1"><span>Total</span><span style={{ color: primaryColor }}>R369.97</span></div>
      <div className="flex gap-2 pt-1 flex-wrap">
        {cfg?.allowGuestCheckout && <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">Guest checkout ✓</span>}
        {cfg?.allowPromotionCodes && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Promo codes ✓</span>}
      </div>
    </div>
  </div>
);

const CheckoutPreview = ({ cfg }: any) => (
  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm p-4">
    <p className="text-xs font-semibold text-slate-600 mb-3">Payment Methods</p>
    <div className="flex flex-wrap gap-2">
      {cfg?.EnablePaystack && <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-xs font-medium text-blue-700">Paystack</span></div>}
      {cfg?.EnablePaypal && <div className="flex items-center gap-1.5 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg"><div className="w-3 h-3 rounded-full bg-yellow-500" /><span className="text-xs font-medium text-yellow-700">PayPal</span></div>}
      {cfg?.EnableThirdPartyPayment && <div className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg"><div className="w-3 h-3 rounded-full bg-purple-500" /><span className="text-xs font-medium text-purple-700">Third Party</span></div>}
      {!cfg?.EnablePaystack && !cfg?.EnablePaypal && !cfg?.EnableThirdPartyPayment && <p className="text-xs text-slate-400">No payment methods enabled yet.</p>}
    </div>
  </div>
);

const ContactPreview = ({ cfg }: any) => (
  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm p-4 space-y-2">
    {cfg?.contactInfo?.phone && <div className="flex items-center gap-2 text-xs"><Phone className="w-3.5 h-3.5 text-emerald-500" /><span className="text-slate-700">{cfg.contactInfo.phone}</span></div>}
    {cfg?.contactInfo?.email && <div className="flex items-center gap-2 text-xs"><Mail className="w-3.5 h-3.5 text-emerald-500" /><span className="text-slate-700">{cfg.contactInfo.email}</span></div>}
    {cfg?.contactInfo?.Address && <div className="flex items-start gap-2 text-xs"><HomeIcon className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" /><span className="text-slate-700 whitespace-pre-line">{cfg.contactInfo.Address}</span></div>}
    {!cfg?.contactInfo?.phone && !cfg?.contactInfo?.email && !cfg?.contactInfo?.Address && <p className="text-xs text-slate-400">No contact info added yet.</p>}
  </div>
);

const GeneralPreview = ({ cfg }: any) => (
  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm p-4">
    <div className="flex flex-wrap gap-3">
      {cfg?.storeName && <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"><p className="text-[10px] text-slate-400">Store Name</p><p className="text-sm font-semibold text-slate-700">{cfg.storeName}</p></div>}
      {cfg?.currency && <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"><p className="text-[10px] text-slate-400">Currency</p><p className="text-sm font-semibold text-slate-700">{cfg.currency}</p></div>}
      {cfg?.configId && <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"><p className="text-[10px] text-slate-400">Config ID</p><p className="text-sm font-mono text-slate-700">{cfg.configId}</p></div>}
      {!cfg?.storeName && !cfg?.currency && !cfg?.configId && <p className="text-xs text-slate-400">No settings configured yet.</p>}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Features() {
  const { globalState, setGlobalState, db } = useContext(AppContext);
  const { updateStoreConfig } = UsefireFunctionsHook();
  const { toast } = useToast();

  const [config, setConfig] = useState(globalState.StoreConfig || {});
  const [featuresConfig, setFeaturesConfig] = useState<typeof DEFAULT_FEATURES>(DEFAULT_FEATURES);
  const [roomsConfig, setRoomsConfig] = useState<typeof DEFAULT_ROOMS>(DEFAULT_ROOMS);
  const [saving, setSaving] = useState(false);

  const [productCategories, setProductCategories] = useState<{ id: string; label: string; count: number }[]>([]);
  const [fetchingCategories, setFetchingCategories] = useState(false);

  const fetchProductCategories = async () => {
    if (!db) return;
    setFetchingCategories(true);
    try {
      const snapshot = await getDocs(collection(db, 'Products'));
      const countMap = new Map<string, number>();
      snapshot.docs.forEach(doc => {
        const raw = doc.data().Category || '';
        const cat = raw.toLowerCase().trim();
        if (cat) countMap.set(cat, (countMap.get(cat) || 0) + 1);
      });
      const derived = Array.from(countMap.entries())
        .map(([id, count]) => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1), count }))
        .sort((a, b) => a.label.localeCompare(b.label));
      setProductCategories(derived);
      return derived;
    } catch (err) {
      console.error('Failed to fetch product categories:', err);
      toast({ title: 'Could not fetch product categories', variant: 'destructive' });
      return [];
    } finally {
      setFetchingCategories(false);
    }
  };

  const autoPopulateRooms = async (cats: { id: string; label: string; count: number }[]) => {
    if (cats.length === 0) return;
    const populated = cats.map(cat => ({ id: uid(), name: cat.label, productCount: cat.count, categoryId: cat.id, imageUrl: '' }));
    setRoomsConfig(prev => ({ ...prev, rooms: populated }));
    toast({ title: `✅ Auto-populated ${populated.length} room cards from your products` });
  };

  useEffect(() => {
    const storedConfig = JSON.parse(localStorage.getItem("StoreConfig") || "{}");
    const authenticatedUser = JSON.parse(localStorage.getItem("AuthenticatedUser") || "{}");
    const merged = storedConfig || globalState.StoreConfig;

    if (merged || authenticatedUser) {
      setGlobalState(prev => ({
        ...prev,
        StoreConfig: merged || prev.StoreConfig,
        AuthenticatedUser: authenticatedUser || prev.AuthenticatedUser,
      }));
      setConfig(merged || globalState.StoreConfig);
      if (merged?.HomeCustomization?.featuresSection)
        setFeaturesConfig({ ...DEFAULT_FEATURES, ...merged.HomeCustomization.featuresSection });

      const savedRooms = merged?.HomeCustomization?.roomsSection;
      if (savedRooms && savedRooms.rooms?.length > 0) {
        const hasRefs = savedRooms.rooms.some((r: any) => r.imageUrl?.startsWith('__ref:'));
        if (hasRefs) {
          import('firebase/firestore').then(({ doc: fsDoc, getDoc: fsGetDoc }) => {
            fsGetDoc(fsDoc(db, 'StoreConfigs', 'StoreConfig001_images')).then(snap => {
              const imgData = snap.data() || {};
              const resolvedRooms = savedRooms.rooms.map((room: any) => {
                if (room.imageUrl?.startsWith('__ref:')) { const key = room.imageUrl.replace('__ref:', ''); return { ...room, imageUrl: imgData[key] || '' }; }
                if (room.imageUrl?.startsWith('__img:')) return { ...room, imageUrl: '' };
                return room;
              });
              setRoomsConfig({ ...DEFAULT_ROOMS, ...savedRooms, rooms: resolvedRooms });
            });
          });
        } else {
          const cleanRooms = savedRooms.rooms.map((room: any) => ({ ...room, imageUrl: room.imageUrl?.startsWith('__img:') ? '' : (room.imageUrl || '') }));
          setRoomsConfig({ ...DEFAULT_ROOMS, ...savedRooms, rooms: cleanRooms });
        }
        fetchProductCategories();
      } else {
        fetchProductCategories().then(cats => { if (cats && cats.length > 0) autoPopulateRooms(cats); });
      }
    }
  }, []);

  const handleChange = (path: string, value: any) => {
    setConfig(prev => {
      const updated = structuredClone(prev);
      const keys = path.split(".");
      let obj: any = updated;
      keys.slice(0, -1).forEach(key => { if (!obj[key]) obj[key] = {}; obj = obj[key]; });
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedRooms = roomsConfig.rooms.map(room => {
        const match = productCategories.find(c => c.id === room.categoryId);
        const imageUrl = room.imageUrl?.startsWith('__img:') ? '' : (room.imageUrl || '');
        return { ...(match ? { ...room, productCount: match.count } : room), imageUrl };
      });

      const imagesPayload: Record<string, string> = {};
      const roomsForMainDoc = updatedRooms.map(room => {
        if (room.imageUrl?.startsWith('data:')) {
          const key = `room_${room.id}`;
          imagesPayload[key] = room.imageUrl;
          return { ...room, imageUrl: `__ref:${key}` };
        }
        return room;
      });

      const merged = {
        ...config,
        HomeCustomization: {
          ...(config.HomeCustomization || {}),
          featuresSection: featuresConfig,
          roomsSection: { ...roomsConfig, rooms: roomsForMainDoc },
        },
      };

      setGlobalState({ ...globalState, StoreConfig: merged });
      localStorage.setItem('StoreConfig', JSON.stringify(merged));
      await updateStoreConfig('StoreConfig001', merged);

      if (Object.keys(imagesPayload).length > 0) {
        const { doc: fsDoc, setDoc: fsSetDoc, getDoc: fsGetDoc } = await import('firebase/firestore');
        const imgRef = fsDoc(db, 'StoreConfigs', 'StoreConfig001_images');
        const existing = (await fsGetDoc(imgRef)).data() || {};
        await fsSetDoc(imgRef, { ...existing, ...imagesPayload }, { merge: true });
      }

      toast({ title: '✅ Saved', description: 'Configuration updated successfully.' });
    } catch (err: any) {
      toast({ title: '❌ Save failed', description: err?.message || 'Check browser console.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 400, 0.8);
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(compressed);
      });
      handleChange('NavbarCustomization.logoURL', base64);
      toast({ title: '✅ Logo ready' });
    } catch (err: any) {
      toast({ title: '❌ Logo upload failed', description: err.message, variant: 'destructive' });
    }
  };

  const addFeatureItem = () => setFeaturesConfig(p => ({ ...p, items: [...p.items, { id: uid(), icon: 'Leaf', title: 'New Feature', description: 'Description here' }] }));
  const removeFeatureItem = (id: string) => setFeaturesConfig(p => ({ ...p, items: p.items.filter(i => i.id !== id) }));
  const updateFeatureItem = (id: string, key: string, val: string) =>
    setFeaturesConfig(p => ({ ...p, items: p.items.map(i => i.id === id ? { ...i, [key]: val } : i) }));

  const addRoom = () => setRoomsConfig(p => ({ ...p, rooms: [...p.rooms, { id: uid(), name: 'New Room', productCount: 0, categoryId: '', imageUrl: '' }] }));
  const removeRoom = (id: string) => setRoomsConfig(p => ({ ...p, rooms: p.rooms.filter(r => r.id !== id) }));
  const updateRoom = (id: string, key: string, val: any) =>
    setRoomsConfig(p => ({ ...p, rooms: p.rooms.map(r => r.id === id ? { ...r, [key]: val } : r) }));

  const handleRoomCategorySelect = (roomId: string, categoryId: string) => {
    const cat = productCategories.find(c => c.id === categoryId);
    setRoomsConfig(p => ({
      ...p,
      rooms: p.rooms.map(r => r.id === roomId ? { ...r, categoryId, name: cat ? cat.label : r.name, productCount: cat ? cat.count : r.productCount } : r),
    }));
  };

  const primaryColor = config.ThemeCustomization?.buttons?.primaryBg || config.ThemeCustomization?.primaryColor || '#00e676';

  return (
    <div className="space-y-4 pb-12">
      {/* Sticky header */}
      <div className="flex justify-between items-center sticky top-0 z-30 bg-white/95 backdrop-blur py-3 px-1 -mx-1 border-slate-100">
        <h1 className="text-2xl md:text-3xl font-bold">Features & Store Config</h1>
        <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save All Changes'}
        </Button>
      </div>

      {/* ── Features Section ─────────────────────────────────────────────── */}
      <Section title="Features Section" icon={Sparkles} preview={<FeaturesPreview cfg={featuresConfig} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label className="text-xs text-slate-500">Badge Text</Label><Input value={featuresConfig.badgeText} onChange={e => setFeaturesConfig(p => ({ ...p, badgeText: e.target.value }))} className="bg-white" /></div>
          <div className="space-y-1.5"><Label className="text-xs text-slate-500">Main Heading</Label><Input value={featuresConfig.heading} onChange={e => setFeaturesConfig(p => ({ ...p, heading: e.target.value }))} className="bg-white" /></div>
          <div className="space-y-1.5"><Label className="text-xs text-slate-500">Highlighted Part</Label><Input value={featuresConfig.headingHighlight} onChange={e => setFeaturesConfig(p => ({ ...p, headingHighlight: e.target.value }))} className="bg-white" /></div>
          <div className="space-y-1.5"><Label className="text-xs text-slate-500">Subheading</Label><Input value={featuresConfig.subheading} onChange={e => setFeaturesConfig(p => ({ ...p, subheading: e.target.value }))} className="bg-white" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t pt-4">
          <ColorRow label="Section Background" value={featuresConfig.backgroundColor} onChange={(v: string) => setFeaturesConfig(p => ({ ...p, backgroundColor: v }))} />
          <ColorRow label="Heading Color" value={featuresConfig.headingColor} onChange={(v: string) => setFeaturesConfig(p => ({ ...p, headingColor: v }))} />
          <ColorRow label="Highlight Color" value={featuresConfig.highlightColor} onChange={(v: string) => setFeaturesConfig(p => ({ ...p, highlightColor: v }))} />
          <ColorRow label="Body Text" value={featuresConfig.bodyColor} onChange={(v: string) => setFeaturesConfig(p => ({ ...p, bodyColor: v }))} />
          <ColorRow label="Badge Background" value={featuresConfig.badgeBg} onChange={(v: string) => setFeaturesConfig(p => ({ ...p, badgeBg: v }))} />
          <ColorRow label="Badge Text" value={featuresConfig.badgeTextColor} onChange={(v: string) => setFeaturesConfig(p => ({ ...p, badgeTextColor: v }))} />
          <ColorRow label="Card Background" value={featuresConfig.cardBg} onChange={(v: string) => setFeaturesConfig(p => ({ ...p, cardBg: v }))} />
          <ColorRow label="Card Border" value={featuresConfig.cardBorder} onChange={(v: string) => setFeaturesConfig(p => ({ ...p, cardBorder: v }))} />
          <ColorRow label="Icon Color" value={featuresConfig.iconColor} onChange={(v: string) => setFeaturesConfig(p => ({ ...p, iconColor: v }))} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t pt-4">
          <SliderRow label="Card Border Radius" value={featuresConfig.cardRadius} min={0} max={32} onChange={(v: number) => setFeaturesConfig(p => ({ ...p, cardRadius: v }))} />
          <SliderRow label="Section Padding" value={featuresConfig.paddingY} min={20} max={160} onChange={(v: number) => setFeaturesConfig(p => ({ ...p, paddingY: v }))} />
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
                <div className="space-y-1.5"><Label className="text-xs text-slate-500">Title</Label><Input value={item.title} onChange={e => updateFeatureItem(item.id, 'title', e.target.value)} className="bg-gray-50" /></div>
                <div className="space-y-1.5"><Label className="text-xs text-slate-500">Description</Label><Input value={item.description} onChange={e => updateFeatureItem(item.id, 'description', e.target.value)} className="bg-gray-50" /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Icon</Label>
                  <div className="grid grid-cols-6 gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-200 max-h-28 overflow-y-auto">
                    {ICON_OPTIONS.map(({ value, Icon: Ico }) => (
                      <button key={value} type="button" onClick={() => updateFeatureItem(item.id, 'icon', value)}
                        className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${item.icon === value ? 'bg-emerald-100 ring-2 ring-emerald-500' : 'hover:bg-gray-200'}`}>
                        <Ico className="w-4 h-4" style={{ color: item.icon === value ? featuresConfig.iconColor : '#64748b' }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Shop by Room ─────────────────────────────────────────────────── */}
      <Section title="Shop by Room / Category" icon={HomeIcon} preview={<RoomsPreview cfg={roomsConfig} />}>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Product Categories from Firestore</p>
              {productCategories.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {productCategories.map(cat => (
                    <span key={cat.id} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                      {cat.label} <span className="text-emerald-500">({cat.count})</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-600 mt-1">No categories found yet — click Sync to fetch from your products.</p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={() => fetchProductCategories()} disabled={fetchingCategories} className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                {fetchingCategories ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}Sync
              </Button>
              <Button size="sm" onClick={() => fetchProductCategories().then(cats => { if (cats && cats.length > 0) autoPopulateRooms(cats); })} disabled={fetchingCategories} className="gap-1.5 bg-emerald-500 hover:bg-emerald-600">
                <RefreshCw className="w-3.5 h-3.5" />Re-populate All
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label className="text-xs text-slate-500">Section Heading</Label><Input value={roomsConfig.heading} onChange={e => setRoomsConfig(p => ({ ...p, heading: e.target.value }))} className="bg-white" /></div>
          <ColorRow label="Heading Color" value={roomsConfig.headingColor} onChange={(v: string) => setRoomsConfig(p => ({ ...p, headingColor: v }))} />
          <ColorRow label="Section Background" value={roomsConfig.backgroundColor} onChange={(v: string) => setRoomsConfig(p => ({ ...p, backgroundColor: v }))} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <SliderRow label="Card Border Radius" value={roomsConfig.cardRadius} min={0} max={32} onChange={(v: number) => setRoomsConfig(p => ({ ...p, cardRadius: v }))} />
          <SliderRow label="Section Padding" value={roomsConfig.paddingY} min={20} max={160} onChange={(v: number) => setRoomsConfig(p => ({ ...p, paddingY: v }))} />
        </div>

        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold">Room / Category Cards</Label>
              <p className="text-xs text-slate-400 mt-0.5">Select a category from the dropdown or type a custom ID.</p>
            </div>
            <Button size="sm" variant="outline" onClick={addRoom} className="gap-1.5"><Plus className="w-4 h-4" />Add Room</Button>
          </div>
          {roomsConfig.rooms.map((room, idx) => (
            <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Room {idx + 1}</span>
                <button onClick={() => removeRoom(room.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Display Name</Label>
                  <Input value={room.name} onChange={e => updateRoom(room.id, 'name', e.target.value)} className="bg-gray-50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">
                    Category ID{productCategories.length > 0 && <span className="text-emerald-500 ml-1">— pick from products</span>}
                  </Label>
                  {productCategories.length > 0 ? (
                    <div className="space-y-1.5">
                      <select className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={room.categoryId} onChange={e => handleRoomCategorySelect(room.id, e.target.value)}>
                        <option value="">— Select category —</option>
                        {productCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.label} ({cat.count} products)</option>)}
                        <option value="__custom__">✏️ Type custom ID...</option>
                      </select>
                      {(room.categoryId === '__custom__' || (room.categoryId && !productCategories.find(c => c.id === room.categoryId))) && (
                        <Input value={room.categoryId === '__custom__' ? '' : room.categoryId}
                          onChange={e => updateRoom(room.id, 'categoryId', e.target.value.toLowerCase())}
                          placeholder="type custom slug..." className="bg-gray-50 font-mono text-sm" />
                      )}
                    </div>
                  ) : (
                    <Input value={room.categoryId} onChange={e => updateRoom(room.id, 'categoryId', e.target.value.toLowerCase())} placeholder="e.g. kitchen" className="bg-gray-50 font-mono text-sm" />
                  )}
                  <p className="text-[10px] text-slate-400">/products?category={room.categoryId}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">
                    Product Count{productCategories.find(c => c.id === room.categoryId) && <span className="text-emerald-500 ml-1">— auto from Firestore</span>}
                  </Label>
                  <Input type="number" value={room.productCount} onChange={e => updateRoom(room.id, 'productCount', Number(e.target.value))} className="bg-gray-50" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Room Image</Label>
                <ImageUploadSlot url={room.imageUrl} onUrlChange={(v: string) => updateRoom(room.id, 'imageUrl', v)} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <Section title="Navbar" icon={Navigation} preview={<NavbarPreview cfg={config.NavbarCustomization} primaryColor={primaryColor} />}>
        <div className="space-y-4">
          <div><Label>Logo URL</Label><Input value={config.NavbarCustomization?.logoURL || ""} onChange={e => handleChange("NavbarCustomization.logoURL", e.target.value)} /></div>
          <div><Label>Upload Logo</Label><Input type="file" accept="image/*" onChange={handleLogoUpload} />{config.NavbarCustomization?.logoURL && <img src={config.NavbarCustomization.logoURL} alt="Logo" className="mt-2 h-16 object-contain" />}</div>
          <ColorRow label="Background Color" value={config.NavbarCustomization?.background || "#ffffff"} onChange={(v: string) => handleChange("NavbarCustomization.background", v)} />
          <div className="flex items-center justify-between"><Label>Keep Navbar Sticky</Label><Checkbox checked={config.NavbarCustomization?.sticky || false} onCheckedChange={v => handleChange("NavbarCustomization.sticky", v)} /></div>
        </div>
      </Section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <Section title="Footer" icon={Layers} preview={<FooterPreview footerCfg={config.FooterCustomization} primaryColor={primaryColor} />}>
        <div className="space-y-4">
          <ColorRow label="Background Color" value={config.FooterCustomization?.backgroundColor || "#1e293b"} onChange={(v: string) => handleChange("FooterCustomization.backgroundColor", v)} />
          <div><Label>Copyright Text</Label><Textarea value={config.FooterCustomization?.copyrightText || ""} onChange={e => handleChange("FooterCustomization.copyrightText", e.target.value)} /></div>
          <ColorRow label="Main Color" value={config.ThemeCustomization?.primaryColor || "#000000"} onChange={(v: string) => handleChange("ThemeCustomization.primaryColor", v)} />
          <ColorRow label="Accent Color" value={config.ThemeCustomization?.secondaryColor || "#000000"} onChange={(v: string) => handleChange("ThemeCustomization.secondaryColor", v)} />
        </div>
      </Section>

      {/* ── Global Theme ─────────────────────────────────────────────────── */}
      <Section title="Global Theme" icon={Palette} preview={<ThemePreview themeCfg={config.ThemeCustomization} />}>
        <div className="space-y-4">
          <div><Label>Font</Label>
            <select className="border rounded p-2 w-full mt-1" value={config.ThemeCustomization?.fontFamily || ""} onChange={e => handleChange("ThemeCustomization.fontFamily", e.target.value)}>
              <option value="">Select font</option>
              {["Inter","Poppins","Roboto","Lato","Montserrat","Open Sans"].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <p className="font-semibold text-sm">Text Colors</p>
          <ColorRow label="Titles" value={config.ThemeCustomization?.text?.heading || "#000000"} onChange={(v: string) => handleChange("ThemeCustomization.text.heading", v)} />
          <ColorRow label="Body" value={config.ThemeCustomization?.text?.body || "#000000"} onChange={(v: string) => handleChange("ThemeCustomization.text.body", v)} />
          <ColorRow label="Highlights" value={config.ThemeCustomization?.text?.highlight || "#000000"} onChange={(v: string) => handleChange("ThemeCustomization.text.highlight", v)} />
          <p className="font-semibold text-sm pt-2">Buttons</p>
          <ColorRow label="Button Color" value={config.ThemeCustomization?.buttons?.primaryBg || "#000000"} onChange={(v: string) => handleChange("ThemeCustomization.buttons.primaryBg", v)} />
          <ColorRow label="Button Text Color" value={config.ThemeCustomization?.buttons?.primaryText || "#ffffff"} onChange={(v: string) => handleChange("ThemeCustomization.buttons.primaryText", v)} />
          <p className="font-semibold text-sm pt-2">Cards</p>
          <ColorRow label="Card Color" value={config.ThemeCustomization?.cards?.background || "#ffffff"} onChange={(v: string) => handleChange("ThemeCustomization.cards.background", v)} />
          <ColorRow label="Card Border" value={config.ThemeCustomization?.cards?.border || "#e5e7eb"} onChange={(v: string) => handleChange("ThemeCustomization.cards.border", v)} />
          <p className="font-semibold text-sm pt-2">CTA Section</p>
          <ColorRow label="Background" value={config.ThemeCustomization?.cta?.backgroundColor || "#000000"} onChange={(v: string) => handleChange("ThemeCustomization.cta.backgroundColor", v)} />
          <ColorRow label="Title Color" value={config.ThemeCustomization?.cta?.headingText || "#ffffff"} onChange={(v: string) => handleChange("ThemeCustomization.cta.headingText", v)} />
          <ColorRow label="Body Color" value={config.ThemeCustomization?.cta?.bodyText || "#e5e7eb"} onChange={(v: string) => handleChange("ThemeCustomization.cta.bodyText", v)} />
          <ColorRow label="CTA Button Color" value={config.ThemeCustomization?.buttons?.secondaryBg || "#000000"} onChange={(v: string) => handleChange("ThemeCustomization.buttons.secondaryBg", v)} />
          <ColorRow label="CTA Button Text" value={config.ThemeCustomization?.buttons?.secondaryText || "#ffffff"} onChange={(v: string) => handleChange("ThemeCustomization.buttons.secondaryText", v)} />
        </div>
      </Section>

      {/* ── Product Card ─────────────────────────────────────────────────── */}
      <Section title="Product Card" icon={Package} preview={<ProductCardPreview cfg={config.ProductCardCustomization} primaryColor={primaryColor} />}>
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="font-semibold">Appearance</p>
            <ColorRow label="Card Background" value={config.ProductCardCustomization?.appearance?.cardBackground || "#ffffff"} onChange={(v: string) => handleChange("ProductCardCustomization.appearance.cardBackground", v)} />
            <ColorRow label="Card Border" value={config.ProductCardCustomization?.appearance?.cardBorder || "#e5e7eb"} onChange={(v: string) => handleChange("ProductCardCustomization.appearance.cardBorder", v)} />
            <div><Label>Corner Radius: {config.ProductCardCustomization?.appearance?.borderRadius || "16"}px</Label><Input type="range" min="0" max="32" step="2" value={config.ProductCardCustomization?.appearance?.borderRadius || "16"} onChange={e => handleChange("ProductCardCustomization.appearance.borderRadius", e.target.value)} /></div>
            <div><Label>Hover Effect</Label>
              <select className="border rounded p-2 w-full mt-1" value={config.ProductCardCustomization?.appearance?.hoverEffect || "lift"} onChange={e => handleChange("ProductCardCustomization.appearance.hoverEffect", e.target.value)}>
                <option value="lift">Lift</option><option value="zoom">Zoom Image</option><option value="shadow">Shadow</option><option value="none">None</option>
              </select>
            </div>
          </div>
          <div className="space-y-3 border-t pt-4">
            <p className="font-semibold">Display Options</p>
            <div className="flex items-center justify-between"><Label>Show Product Tags</Label><Checkbox checked={config.ProductCardCustomization?.display?.showTags !== false} onCheckedChange={v => handleChange("ProductCardCustomization.display.showTags", v)} /></div>
            <div className="flex items-center justify-between"><Label>Show Description</Label><Checkbox checked={config.ProductCardCustomization?.display?.showDescription !== false} onCheckedChange={v => handleChange("ProductCardCustomization.display.showDescription", v)} /></div>
            <div className="flex items-center justify-between"><Label>Show Wishlist Button</Label><Checkbox checked={config.ProductCardCustomization?.display?.showWishlist !== false} onCheckedChange={v => handleChange("ProductCardCustomization.display.showWishlist", v)} /></div>
          </div>
          <div className="space-y-3 border-t pt-4">
            <p className="font-semibold">Colors</p>
            <ColorRow label="Title" value={config.ProductCardCustomization?.colors?.titleColor || "#0f172a"} onChange={(v: string) => handleChange("ProductCardCustomization.colors.titleColor", v)} />
            <ColorRow label="Description" value={config.ProductCardCustomization?.colors?.descriptionColor || "#475569"} onChange={(v: string) => handleChange("ProductCardCustomization.colors.descriptionColor", v)} />
            <ColorRow label="Tag Background" value={config.ProductCardCustomization?.colors?.tagBackground || "#00e676"} onChange={(v: string) => handleChange("ProductCardCustomization.colors.tagBackground", v)} />
            <ColorRow label="Tag Text" value={config.ProductCardCustomization?.colors?.tagTextColor || "#ffffff"} onChange={(v: string) => handleChange("ProductCardCustomization.colors.tagTextColor", v)} />
            <ColorRow label="Price Color" value={config.ProductCardCustomization?.colors?.priceColor || "#00e676"} onChange={(v: string) => handleChange("ProductCardCustomization.colors.priceColor", v)} />
            <ColorRow label="Button Background" value={config.ProductCardCustomization?.colors?.addToCartBg || "#00e676"} onChange={(v: string) => handleChange("ProductCardCustomization.colors.addToCartBg", v)} />
            <ColorRow label="Button Text" value={config.ProductCardCustomization?.colors?.addToCartText || "#ffffff"} onChange={(v: string) => handleChange("ProductCardCustomization.colors.addToCartText", v)} />
          </div>
        </div>
      </Section>

      {/* ── About ────────────────────────────────────────────────────────── */}
      <Section title="About Page" icon={Type} preview={<AboutPreview cfg={config.AboutCustomization} primaryColor={primaryColor} />}>
        <div className="space-y-4">
          <div><Label>Story Image URL</Label><Input value={config.AboutCustomization?.content?.storyImageURL || ""} onChange={e => handleChange("AboutCustomization.content.storyImageURL", e.target.value)} placeholder="https://..." /></div>
          <div><Label>Story Title</Label><Input value={config.AboutCustomization?.content?.storyTitle || ""} onChange={e => handleChange("AboutCustomization.content.storyTitle", e.target.value)} /></div>
          <div><Label>Story Paragraph 1</Label><Textarea rows={3} value={config.AboutCustomization?.content?.storyParagraph1 || ""} onChange={e => handleChange("AboutCustomization.content.storyParagraph1", e.target.value)} /></div>
          <div><Label>Story Paragraph 2</Label><Textarea rows={3} value={config.AboutCustomization?.content?.storyParagraph2 || ""} onChange={e => handleChange("AboutCustomization.content.storyParagraph2", e.target.value)} /></div>
          <div><Label>Values Section Title</Label><Input value={config.AboutCustomization?.content?.valuesTitle || ""} onChange={e => handleChange("AboutCustomization.content.valuesTitle", e.target.value)} /></div>
          {[1,2,3].map(n => (
            <div key={n} className="bg-white/70 p-4 rounded-lg space-y-2 border border-gray-100">
              <p className="font-medium text-sm">Value {n}</p>
              <Input placeholder="Title" value={(config.AboutCustomization?.content as any)?.[`value${n}Title`] || ""} onChange={e => handleChange(`AboutCustomization.content.value${n}Title`, e.target.value)} />
              <Textarea rows={2} placeholder="Description" value={(config.AboutCustomization?.content as any)?.[`value${n}Desc`] || ""} onChange={e => handleChange(`AboutCustomization.content.value${n}Desc`, e.target.value)} />
            </div>
          ))}
        </div>
      </Section>

      {/* ── Cart ─────────────────────────────────────────────────────────── */}
      <Section title="Cart" icon={ShoppingCart} preview={<CartPreview cfg={config.CartCustomization} primaryColor={primaryColor} />}>
        <div className="space-y-4">
          <div><Label>Tax (%)</Label><Input value={config.CartCustomization?.TaxAmount || ""} onChange={e => handleChange("CartCustomization.TaxAmount", e.target.value)} /></div>
          <div className="flex items-center justify-between"><Label>Allow Guest Checkout</Label><Checkbox checked={config.CartCustomization?.allowGuestCheckout || false} onCheckedChange={v => handleChange("CartCustomization.allowGuestCheckout", v)} /></div>
          <div className="flex items-center justify-between"><Label>Allow Promotion Codes</Label><Checkbox checked={config.CartCustomization?.allowPromotionCodes || false} onCheckedChange={v => handleChange("CartCustomization.allowPromotionCodes", v)} /></div>
        </div>
      </Section>

      {/* ── Checkout ─────────────────────────────────────────────────────── */}
      <Section title="Checkout" icon={CreditCard} preview={<CheckoutPreview cfg={config.CheckoutCustomization} />}>
        <div className="space-y-4">
          <div className="flex items-center justify-between"><Label>Enable Paystack</Label><Checkbox checked={config.CheckoutCustomization?.EnablePaystack || false} onCheckedChange={v => handleChange("CheckoutCustomization.EnablePaystack", v)} /></div>
          <div className="flex items-center justify-between"><Label>Enable PayPal</Label><Checkbox checked={config.CheckoutCustomization?.EnablePaypal || false} onCheckedChange={v => handleChange("CheckoutCustomization.EnablePaypal", v)} /></div>
          <div className="flex items-center justify-between"><Label>Enable Third Party Payment</Label><Checkbox checked={config.CheckoutCustomization?.EnableThirdPartyPayment || false} onCheckedChange={v => handleChange("CheckoutCustomization.EnableThirdPartyPayment", v)} /></div>
        </div>
      </Section>

      {/* ── Contact ──────────────────────────────────────────────────────── */}
      <Section title="Contact" icon={MessageSquare} preview={<ContactPreview cfg={config.ContactCustomization} />}>
        <div className="space-y-4">
          <div><Label>Phone</Label><Input value={config.ContactCustomization?.contactInfo?.phone || ""} onChange={e => handleChange("ContactCustomization.contactInfo.phone", e.target.value)} /></div>
          <div><Label>Email</Label><Input value={config.ContactCustomization?.contactInfo?.email || ""} onChange={e => handleChange("ContactCustomization.contactInfo.email", e.target.value)} /></div>
          <div><Label>Address</Label><Textarea value={config.ContactCustomization?.contactInfo?.Address || ""} onChange={e => handleChange("ContactCustomization.contactInfo.Address", e.target.value)} /></div>
        </div>
      </Section>

      {/* ── General Settings ─────────────────────────────────────────────── */}
      <Section title="General Settings" icon={Settings} preview={<GeneralPreview cfg={config.GeneralSettings} />}>
        <div className="space-y-4">
          <div><Label>Store Name</Label><Input value={config.GeneralSettings?.storeName || ""} onChange={e => handleChange("GeneralSettings.storeName", e.target.value)} /></div>
          <div><Label>Currency</Label>
            <select className="border rounded p-2 w-full mt-1" value={config.GeneralSettings?.currency || ""} onChange={e => handleChange("GeneralSettings.currency", e.target.value)}>
              <option value="">Select currency</option>
              <option value="ZAR">South African Rand (ZAR)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="GBP">British Pound (GBP)</option>
              <option value="NGN">Nigerian Naira (NGN)</option>
              <option value="KES">Kenyan Shilling (KES)</option>
              <option value="JPY">Japanese Yen (JPY)</option>
              <option value="CNY">Chinese Yuan (CNY)</option>
              <option value="INR">Indian Rupee (INR)</option>
              <option value="CAD">Canadian Dollar (CAD)</option>
              <option value="AUD">Australian Dollar (AUD)</option>
            </select>
          </div>
          <div><Label>Config ID</Label><Input disabled value={config.GeneralSettings?.configId || ""} /></div>
        </div>
      </Section>
    </div>
  );
}