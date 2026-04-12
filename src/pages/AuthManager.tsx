import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  ChevronLeft, LayoutDashboard, Pencil, Eye,
  User, Users, Shield, Type, Image as ImageIcon,
  Palette, Layout, ToggleRight, Layers,
  SkipBack, SkipForward, Play, Pause,
  Upload, Loader2, Trash2, Plus, Sliders, AlertCircle,
} from 'lucide-react';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppContext from '../context/AppContext';
import { useToast } from '@/hooks/use-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const TRANSITIONS = [
  { value: 'fade', label: 'Fade' }, { value: 'slide', label: 'Slide' },
  { value: 'slideUp', label: 'Slide Up' }, { value: 'zoom', label: 'Zoom' },
];
const RADIUS_OPTIONS = [
  { value: 'rounded-none', label: 'Square' }, { value: 'rounded-lg', label: 'Rounded' },
  { value: 'rounded-xl', label: 'Large' }, { value: 'rounded-2xl', label: 'XL' },
  { value: 'rounded-full', label: 'Pill' },
];
const SHADOW_OPTIONS = [
  { value: '', label: 'None' }, { value: 'shadow-sm', label: 'Small' },
  { value: 'shadow-md', label: 'Medium' }, { value: 'shadow-lg', label: 'Large' },
  { value: 'shadow-xl', label: 'XL' }, { value: 'shadow-2xl', label: '2XL' },
];
const FONT_SIZE_OPTIONS = [
  { value: 'text-lg', label: 'Small' }, { value: 'text-xl', label: 'Medium' },
  { value: 'text-2xl', label: 'Large' }, { value: 'text-3xl', label: 'XL' },
  { value: 'text-4xl', label: '2XL' },
];
const FONT_WEIGHT_OPTIONS = [
  { value: 'font-normal', label: 'Normal' }, { value: 'font-medium', label: 'Medium' },
  { value: 'font-semibold', label: 'Semibold' }, { value: 'font-bold', label: 'Bold' },
  { value: 'font-extrabold', label: 'Extra Bold' },
];

const DEFAULT_CONFIG = {
  userLogin: {
    layout: 'split', transition: 'fade',
    images: ['https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1200'],
    background: { type: 'image', imageUrl: '', gradient: 'linear-gradient(135deg,#16a34a,#0d9488)' },
    branding: { logoUrl: '', logoText: 'Store', showLogo: true },
    text: { title: 'Welcome Back!', subtitle: 'Sign in to continue', registerTitle: 'Join Us', registerSubtitle: 'Create your account today', titleColor: '#111827', subtitleColor: '#6b7280', titleSize: 'text-3xl', titleWeight: 'font-bold' },
    button: { loginText: 'Sign In', registerText: 'Create Account', color: '#16a34a', colorTo: '', gradient: false, radius: 'rounded-xl', textColor: '#ffffff', shadow: 'shadow-lg' },
    options: { showRegister: true, showGoogle: true, showAffiliateLink: true },
    style: { overlayOpacity: 30, imageBlur: 0, cardBlur: 4, cardBg: '#ffffff', cardBgOpacity: 95, cardBorder: 'transparent', cardRadius: 'rounded-2xl', inputBorderColor: '#e5e7eb', inputRadius: 'rounded-xl', leftPanelGlass: false },
  },
  affiliateLogin: {
    layout: 'split', transition: 'slide',
    images: ['https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200'],
    background: { type: 'gradient', imageUrl: '', gradient: 'linear-gradient(135deg,#16a34a,#0d9488,#0284c7)' },
    branding: { logoUrl: '', logoText: 'Affiliates', showLogo: true },
    text: { title: 'Earn While You Help', subtitle: 'Join our affiliate program', step2Title: 'Bank Details', step2Subtitle: 'Enter your payment information', titleColor: '#111827', subtitleColor: '#6b7280', titleSize: 'text-3xl', titleWeight: 'font-bold' },
    button: { loginText: 'Create Account', registerText: '', color: '#16a34a', colorTo: '', gradient: false, radius: 'rounded-xl', textColor: '#ffffff', shadow: 'shadow-lg' },
    options: { showBenefits: true, showBankStep: true },
    style: { overlayOpacity: 30, imageBlur: 0, cardBlur: 0, cardBg: '#ffffff', cardBgOpacity: 100, cardBorder: 'transparent', cardRadius: 'rounded-3xl', inputBorderColor: '#e5e7eb', inputRadius: 'rounded-xl', leftPanelGlass: false },
  },
  adminLogin: {
    layout: 'center', transition: 'zoom',
    images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200'],
    background: { type: 'image', imageUrl: '', gradient: 'linear-gradient(135deg,#1e293b,#0f172a)' },
    branding: { logoUrl: '', logoText: 'Admin', showLogo: true },
    text: { title: 'Admin Login', subtitle: 'Access the admin panel', titleColor: '#111827', subtitleColor: '#6b7280', titleSize: 'text-2xl', titleWeight: 'font-bold' },
    button: { loginText: 'Sign In', registerText: '', color: '#16a34a', colorTo: '', gradient: false, radius: 'rounded-xl', textColor: '#ffffff', shadow: 'shadow-lg' },
    options: { showForgotPassword: false },
    style: { overlayOpacity: 50, imageBlur: 0, cardBlur: 8, cardBg: '#ffffff', cardBgOpacity: 95, cardBorder: 'transparent', cardRadius: 'rounded-2xl', inputBorderColor: '#e5e7eb', inputRadius: 'rounded-xl', leftPanelGlass: false },
  },
};

const SCREENS = [
  { key: 'userLogin', label: 'User Login', icon: User },
  { key: 'affiliateLogin', label: 'Affiliate Signup', icon: Users },
  { key: 'adminLogin', label: 'Admin Login', icon: Shield },
];

const OPTION_LABELS: Record<string, string> = {
  showRegister: 'Show Register / Sign Up',
  showGoogle: 'Show Google Sign-In',
  showAffiliateLink: '"Become an Affiliate" Link',
  showBenefits: 'Show Benefits Panel',
  showBankStep: 'Show Bank Details Step',
  showForgotPassword: 'Show Forgot Password Link',
};

const EDITOR_TABS = [
  { key: 'content', label: 'Content', icon: Type },
  { key: 'buttons', label: 'Buttons', icon: Palette },
  { key: 'styling', label: 'Styling', icon: Sliders },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getBgStyle = (bg: any) => {
  if (bg?.type === 'image' && bg.imageUrl)
    return { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  return { background: bg?.gradient || 'linear-gradient(135deg,#16a34a,#0d9488)' };
};

const getTransClass = (transition: string, active: boolean) => {
  const base = 'absolute inset-0 transition-all duration-700 ease-in-out';
  if (active) {
    if (transition === 'slide') return `${base} opacity-100 translate-x-0`;
    if (transition === 'slideUp') return `${base} opacity-100 translate-y-0`;
    if (transition === 'zoom') return `${base} opacity-100 scale-100`;
    return `${base} opacity-100`;
  }
  if (transition === 'slide') return `${base} opacity-0 -translate-x-full`;
  if (transition === 'slideUp') return `${base} opacity-0 translate-y-full`;
  if (transition === 'zoom') return `${base} opacity-0 scale-110`;
  return `${base} opacity-0`;
};

const hexToRgba = (hex: string, opacity: number) => {
  const r = parseInt((hex || '#ffffff').slice(1, 3), 16);
  const g = parseInt((hex || '#ffffff').slice(3, 5), 16);
  const b = parseInt((hex || '#ffffff').slice(5, 7), 16);
  return `rgba(${r},${g},${b},${(opacity ?? 100) / 100})`;
};

const buildBtnStyle = (button: any) => ({
  background: button?.gradient && button?.colorTo
    ? `linear-gradient(135deg, ${button.color}, ${button.colorTo})`
    : button?.color || '#16a34a',
  color: button?.textColor || '#ffffff',
  border: 'none',
});

const buildCardStyle = (style: any) => ({
  backgroundColor: hexToRgba(style?.cardBg || '#ffffff', style?.cardBgOpacity ?? 100),
  borderColor: style?.cardBorder !== 'transparent' ? style?.cardBorder : 'transparent',
  borderWidth: style?.cardBorder && style.cardBorder !== 'transparent' ? '1px' : '0',
  borderStyle: 'solid' as const,
  backdropFilter: style?.cardBlur ? `blur(${style.cardBlur}px)` : undefined,
});

// ─── Sub-components ───────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, label }: any) => (
  <div className="flex items-center justify-between py-2.5">
    <span className="text-sm text-gray-600">{label}</span>
    <button onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

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

const SliderRow = ({ label, value, min, max, onChange, unit = '' }: any) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <Label className="text-xs text-slate-500">{label}</Label>
      <span className="text-xs font-mono text-slate-600">{value}{unit}</span>
    </div>
    <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
      className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-emerald-500" />
  </div>
);

// ─── Image Slot — uploads to Firebase Storage + Assets collection ─────────────
const ImageSlot = ({ index, url, onUrlChange, onRemove, storage, db, tenantId, screenKey }: any) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage || !tenantId) {
      toast({ title: 'Storage not available', variant: 'destructive' });
      return;
    }
    try {
      setUploading(true);
      const fileName = `${Date.now()}_${file.name}`;
      const storagePath = `assets/${tenantId}/auth/${screenKey}_${index}_${fileName}`;
      const storageRef = ref(storage, storagePath);
      const task = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        task.on('state_changed',
          snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => {
            const downloadURL = await getDownloadURL(task.snapshot.ref);
            // Save to Assets collection
            await addDoc(collection(db, 'Assets'), {
              TenantId: tenantId,
              URL: downloadURL,
              Type: 'auth-background',
              FileName: fileName,
              StoragePath: storagePath,
              Screen: screenKey,
              CreatedAt: serverTimestamp(),
            });
            onUrlChange(downloadURL);
            resolve();
          }
        );
      });
      toast({ title: 'Image uploaded' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false); setProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-white space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">Image {index + 1}</span>
        <button onClick={onRemove} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      <Input value={url || ''} onChange={e => onUrlChange(e.target.value)} placeholder="Paste URL or upload" className="bg-gray-50 text-xs h-8" />
      <label className="block cursor-pointer">
        <div className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors
          ${uploading ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50'}`}>
          {uploading
            ? <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs"><Loader2 className="w-4 h-4 animate-spin" />Uploading… {progress}%</div>
            : <div className="flex items-center justify-center gap-2 text-slate-500 text-xs"><Upload className="w-4 h-4" />Click to upload</div>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleFileChange} />
      </label>
      {url && !url.startsWith('data:') && (
        <div className="w-full h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
          <img src={url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
    </div>
  );
};

const ImageListEditor = ({ images, onChange, storage, db, tenantId, screenKey }: any) => {
  const updateImage = (i: number, val: string) => { const u = [...images]; u[i] = val; onChange(u); };
  return (
    <div className="space-y-3">
      {images.map((url: string, i: number) => (
        <ImageSlot key={i} index={i} url={url} onUrlChange={(val: string) => updateImage(i, val)}
          onRemove={() => onChange(images.filter((_: any, idx: number) => idx !== i))}
          storage={storage} db={db} tenantId={tenantId} screenKey={screenKey} />
      ))}
      <Button size="sm" variant="outline" onClick={() => onChange([...images, ''])} className="w-full h-9 border-dashed gap-1.5">
        <Plus className="w-4 h-4" /> Add Image
      </Button>
    </div>
  );
};

// ─── Animated Image Panel ─────────────────────────────────────────────────────
const ImagePanel = ({ images, transition, bgStyle, children, className, overlayOpacity = 30 }: any) => {
  const [idx, setIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  useEffect(() => {
    const imgs = (images || []).filter(Boolean);
    if (imgs.length <= 1) return;
    const t = setInterval(() => { setPrevIdx(idx); setIdx(p => (p + 1) % imgs.length); setTimeout(() => setPrevIdx(null), 700); }, 4000);
    return () => clearInterval(t);
  }, [images, idx]);
  const imgs = (images || []).filter(Boolean);
  const bgFor = (url: string) => url ? { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : bgStyle;
  return (
    <div className={`relative overflow-hidden ${className || ''}`}>
      {prevIdx !== null && <div className={getTransClass(transition, false)} style={bgFor(imgs[prevIdx])} />}
      <div className={getTransClass(transition, true)} style={bgFor(imgs[idx] || '')} />
      <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlayOpacity / 100})` }} />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};

// ─── Mini Form Preview ────────────────────────────────────────────────────────
const MiniForm = ({ cfg, isOverview = false }: any) => {
  const btnStyle = buildBtnStyle(cfg.button);
  const scale = isOverview ? 'text-[10px]' : 'text-xs';
  const inputH = isOverview ? 'h-5' : 'h-7';
  const gap = isOverview ? 'space-y-1.5' : 'space-y-2';
  return (
    <div className={gap}>
      {cfg.options?.showGoogle && (
        <div className={`${inputH} border border-gray-200 rounded flex items-center justify-center gap-1 bg-white`}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className={isOverview ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
          <span className={`${scale} text-gray-600 font-medium`}>Continue with Google</span>
        </div>
      )}
      <div>
        <p className={`${scale} text-gray-500 mb-0.5`}>Email</p>
        <div className={`${inputH} border rounded bg-gray-50 px-2 flex items-center`} style={{ borderColor: cfg.style?.inputBorderColor || '#e5e7eb' }}>
          <span className={`${scale} text-gray-400`}>you@example.com</span>
        </div>
      </div>
      <div>
        <p className={`${scale} text-gray-500 mb-0.5`}>Password</p>
        <div className={`${inputH} border rounded bg-gray-50 px-2 flex items-center`} style={{ borderColor: cfg.style?.inputBorderColor || '#e5e7eb' }}>
          <span className={`${scale} text-gray-400`}>••••••••</span>
        </div>
      </div>
      <div className={`${inputH} ${cfg.button?.radius || 'rounded-xl'} ${cfg.button?.shadow || ''} flex items-center justify-center font-semibold ${scale}`} style={btnStyle}>
        {cfg.button?.loginText || 'Sign In'}
      </div>
    </div>
  );
};

// ─── Overview Card ────────────────────────────────────────────────────────────
const OverviewCard = ({ screen, config, onEdit }: any) => {
  const cfg = config || DEFAULT_CONFIG[screen.key as keyof typeof DEFAULT_CONFIG];
  const bgStyle = getBgStyle(cfg.background);
  const isCenter = cfg.layout === 'center';
  const images = (cfg.images || []).filter(Boolean);
  const Icon = screen.icon;
  const cardStyle = buildCardStyle(cfg.style);

  return (
    <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200">
      <div className="relative w-full h-56">
        {isCenter ? (
          <ImagePanel images={images} transition={cfg.transition || 'fade'} bgStyle={bgStyle} className="w-full h-full"
            overlayOpacity={cfg.style?.overlayOpacity ?? 30}>
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className={`${cfg.style?.cardRadius || 'rounded-xl'} shadow-xl p-4 w-56`} style={cardStyle}>
                {cfg.branding.showLogo && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: cfg.button.color }}>
                      <span className="text-white text-[9px] font-bold">S</span>
                    </div>
                    <span className="font-bold text-[11px] text-gray-800 truncate">{cfg.branding.logoText}</span>
                  </div>
                )}
                <p className="font-bold text-xs truncate mb-0.5" style={{ color: cfg.text?.titleColor || '#111827' }}>{cfg.text.title}</p>
                <MiniForm cfg={cfg} isOverview={true} />
              </div>
            </div>
          </ImagePanel>
        ) : (
          <div className="w-full h-full flex">
            <ImagePanel images={images} transition={cfg.transition || 'fade'} bgStyle={bgStyle} className="w-1/2 h-full"
              overlayOpacity={cfg.style?.overlayOpacity ?? 30}>
              <div className="w-full h-full flex items-center justify-center px-4">
                <div className="text-center text-white">
                  {cfg.branding.showLogo && (
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                        <Icon className="w-3 h-3 text-white" />
                      </div>
                      <span className="font-bold text-xs">{cfg.branding.logoText}</span>
                    </div>
                  )}
                  <p className="text-xs font-semibold leading-tight">{cfg.text.title}</p>
                </div>
              </div>
            </ImagePanel>
            <div className="w-1/2 flex items-center justify-center p-4" style={cardStyle}>
              <div className="w-full">
                <p className="font-bold text-xs truncate mb-2" style={{ color: cfg.text?.titleColor || '#111827' }}>{cfg.text.title}</p>
                <MiniForm cfg={cfg} isOverview={true} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-100">
        <div>
          <p className="font-semibold text-sm text-slate-800">{screen.label}</p>
          <p className="text-xs text-slate-500">{cfg.layout} · {cfg.transition}</p>
        </div>
        <Button size="sm" onClick={onEdit} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5">
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Button>
      </div>
    </div>
  );
};

// ─── Full Preview ─────────────────────────────────────────────────────────────
const FullPreview = ({ config }: any) => {
  const [imgIdx, setImgIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const autoRef = useRef<any>(null);
  const images = (config.images || []).filter(Boolean);
  const bgStyle = getBgStyle(config.background);
  const isCenter = config.layout === 'center';
  const cardStyle = buildCardStyle(config.style);
  const btnStyle = buildBtnStyle(config.button);

  const goTo = (next: number) => setImgIdx(next);

  useEffect(() => {
    clearInterval(autoRef.current);
    if (isPlaying && images.length > 1)
      autoRef.current = setInterval(() => goTo((imgIdx + 1) % images.length), 4000);
    return () => clearInterval(autoRef.current);
  }, [isPlaying, imgIdx, images.length]);

  const bgFor = (url: string) => url
    ? { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : bgStyle;

  const BgLayers = () => (
    <>
      <div className={getTransClass(config.transition || 'fade', true)} style={bgFor(images[imgIdx] || '')} />
      <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${(config.style?.overlayOpacity ?? 30) / 100})` }} />
    </>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Eye className="w-4 h-4" /> Live Preview
        </div>
        {images.length > 1 && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => goTo((imgIdx - 1 + images.length) % images.length)} className="h-8 w-8 p-0"><SkipBack className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => setIsPlaying(!isPlaying)} className="h-8 w-8 p-0">{isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
            <Button size="sm" variant="outline" onClick={() => goTo((imgIdx + 1) % images.length)} className="h-8 w-8 p-0"><SkipForward className="h-4 w-4" /></Button>
          </div>
        )}
      </div>
      <div className="relative w-full h-[380px] rounded-lg overflow-hidden shadow-lg border-2 border-slate-200 bg-slate-800">
        {isCenter ? (
          <>
            <BgLayers />
            <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
              <div className={`${config.style?.cardRadius || 'rounded-2xl'} shadow-2xl p-6 w-full max-w-sm`} style={cardStyle}>
                {config.branding.showLogo && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: config.button.color }}>
                      <span style={{ color: config.button.textColor || '#fff' }} className="font-bold text-xs">S</span>
                    </div>
                    <span className="font-bold text-gray-800">{config.branding.logoText}</span>
                  </div>
                )}
                <h2 className={`${config.text?.titleSize || 'text-xl'} ${config.text?.titleWeight || 'font-bold'} mb-0.5`} style={{ color: config.text?.titleColor || '#111827' }}>{config.text.title}</h2>
                <p className="text-xs mb-3" style={{ color: config.text?.subtitleColor || '#6b7280' }}>{config.text.subtitle}</p>
                <MiniForm cfg={config} isOverview={false} />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex">
            <div className="w-1/2 h-full relative overflow-hidden">
              <BgLayers />
              <div className="absolute inset-0 flex items-center justify-center z-10 p-8">
                <div className="text-white">
                  {config.branding.showLogo && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="font-bold text-sm">S</span>
                      </div>
                      <span className="font-bold">{config.branding.logoText}</span>
                    </div>
                  )}
                  <h1 className="text-lg font-bold mb-2 leading-tight">{config.text.title}</h1>
                  <p className="text-sm opacity-80">{config.text.subtitle}</p>
                </div>
              </div>
            </div>
            <div className="w-1/2 flex items-center justify-center p-6" style={cardStyle}>
              <div className="w-full">
                <h2 className={`${config.text?.titleSize || 'text-lg'} ${config.text?.titleWeight || 'font-bold'} mb-0.5`} style={{ color: config.text?.titleColor || '#111827' }}>{config.text.title}</h2>
                <p className="text-xs mb-3" style={{ color: config.text?.subtitleColor || '#6b7280' }}>{config.text.subtitle}</p>
                <MiniForm cfg={config} isOverview={false} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AuthManager() {
  const { db, storage, globalState } = useContext(AppContext);
  const { toast } = useToast();

  const activeTenant = (globalState as any)?.activeTenant;
  const tenantId = activeTenant?.Id;

  const [viewMode, setViewMode] = useState('overview');
  const [activeScreen, setActiveScreen] = useState('userLogin');
  const [activeTab, setActiveTab] = useState('content');
  const [configs, setConfigs] = useState(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Load from Sites/{tenantId} — AuthCustomization field ─────────────────
  useEffect(() => {
    if (!db || !tenantId) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'Sites', tenantId));
        if (snap.exists()) {
          const saved = snap.data()?.AuthCustomization;
          if (saved) {
            setConfigs(prev => ({
              userLogin:      { ...prev.userLogin,      ...(saved.userLogin      || {}), style: { ...prev.userLogin.style,      ...(saved.userLogin?.style      || {}) }, button: { ...prev.userLogin.button,      ...(saved.userLogin?.button      || {}) }, text: { ...prev.userLogin.text,      ...(saved.userLogin?.text      || {}) } },
              affiliateLogin: { ...prev.affiliateLogin, ...(saved.affiliateLogin || {}), style: { ...prev.affiliateLogin.style, ...(saved.affiliateLogin?.style || {}) }, button: { ...prev.affiliateLogin.button, ...(saved.affiliateLogin?.button || {}) }, text: { ...prev.affiliateLogin.text, ...(saved.affiliateLogin?.text || {}) } },
              adminLogin:     { ...prev.adminLogin,     ...(saved.adminLogin     || {}), style: { ...prev.adminLogin.style,     ...(saved.adminLogin?.style     || {}) }, button: { ...prev.adminLogin.button,     ...(saved.adminLogin?.button     || {}) }, text: { ...prev.adminLogin.text,     ...(saved.adminLogin?.text     || {}) } },
            }));
          }
        }
      } catch (e) {
        toast({ title: 'Could not load auth config', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, tenantId]);

  // ── Save to Sites/{tenantId} — merge AuthCustomization field ─────────────
  const handleSave = async () => {
    if (!db || !tenantId) {
      toast({ title: 'No active tenant', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, 'Sites', tenantId), {
        AuthCustomization: configs,
        TenantId: tenantId,
        UpdatedAt: new Date(),
      }, { merge: true });
      toast({ title: 'Saved', description: `Auth config updated for ${activeTenant?.Name}.` });
    } catch (e) {
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const set = (path: string, value: any) => {
    setConfigs(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = [activeScreen, ...path.split('.')];
      let node: any = updated;
      keys.slice(0, -1).forEach(k => { if (!node[k]) node[k] = {}; node = node[k]; });
      node[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const cfg = configs[activeScreen as keyof typeof configs];

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!tenantId) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <p className="font-semibold text-slate-700">No tenant selected</p>
          <p className="text-sm text-slate-500">Select a tenant to configure auth screens.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading auth config…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {viewMode === 'editor' && (
            <Button variant="outline" size="sm" onClick={() => setViewMode('overview')} className="gap-1.5">
              <ChevronLeft className="w-4 h-4" /> All Screens
            </Button>
          )}
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {viewMode === 'overview' ? 'Auth Screens' : `Editing: ${SCREENS.find(s => s.key === activeScreen)?.label}`}
            </h2>
            <p className="text-xs text-slate-500">
              {activeTenant?.Name} · <span className="font-mono">Sites/{tenantId}/AuthCustomization</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex border rounded-lg overflow-hidden">
            {['overview', 'editor'].map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 capitalize transition-colors
                  ${viewMode === m ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                {m === 'overview' ? <LayoutDashboard className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}{m}
              </button>
            ))}
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
            {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving…</> : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Overview */}
      {viewMode === 'overview' && (
        <div className="space-y-4">
          <p className="text-slate-500 text-sm">Click <strong>Edit</strong> to customise each login screen.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {SCREENS.map(screen => (
              <OverviewCard key={screen.key} screen={screen} config={configs[screen.key as keyof typeof configs]}
                onEdit={() => { setActiveScreen(screen.key); setViewMode('editor'); setActiveTab('content'); }} />
            ))}
          </div>
        </div>
      )}

      {/* Editor */}
      {viewMode === 'editor' && (
        <div className="space-y-5">
          {/* Screen selector */}
          <Card style={{ backgroundColor: '#f0f4f8' }}>
            <CardHeader><CardTitle className="text-lg">Select Screen</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SCREENS.map(screen => {
                  const Icon = screen.icon;
                  return (
                    <Button key={screen.key} variant={activeScreen === screen.key ? 'default' : 'outline'}
                      onClick={() => setActiveScreen(screen.key)}
                      className={`gap-2 justify-start ${activeScreen === screen.key ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                      <Icon className="w-4 h-4" />{screen.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Transition */}
          <Card style={{ backgroundColor: '#f0f4f8' }}>
            <CardHeader><CardTitle className="text-lg">Image Transition</CardTitle></CardHeader>
            <CardContent>
              <div className="max-w-xs">
                <Select value={cfg.transition || 'fade'} onValueChange={v => set('transition', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSITIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card style={{ backgroundColor: '#f0f4f8' }}>
            <CardContent className="pt-5"><FullPreview config={cfg} /></CardContent>
          </Card>

          {/* Tabbed editor */}
          <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="flex border-b bg-slate-50">
              {EDITOR_TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2
                      ${activeTab === tab.key ? 'border-emerald-500 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <Icon className="w-4 h-4" /><span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-5">
              {/* CONTENT TAB */}
              {activeTab === 'content' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-medium"><Layout className="w-3.5 h-3.5 text-indigo-500" />Layout</Label>
                    <div className="flex gap-3">
                      {['split', 'center'].map(opt => (
                        <button key={opt} onClick={() => set('layout', opt)}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all
                            ${cfg.layout === opt ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                          {opt === 'split' ? '⬛⬜ Split' : '⬜ Center'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-medium"><ImageIcon className="w-3.5 h-3.5 text-rose-500" />Background Images</Label>
                    <ImageListEditor images={cfg.images || []} onChange={(imgs: string[]) => set('images', imgs)}
                      storage={storage} db={db} tenantId={tenantId} screenKey={activeScreen} />
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-1.5 text-sm font-medium"><Type className="w-3.5 h-3.5 text-violet-500" />Text</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label className="text-xs text-slate-500">Login Title</Label>
                        <Input value={cfg.text.title} onChange={e => set('text.title', e.target.value)} className="bg-gray-50" /></div>
                      <div className="space-y-1.5"><Label className="text-xs text-slate-500">Login Subtitle</Label>
                        <Input value={cfg.text.subtitle} onChange={e => set('text.subtitle', e.target.value)} className="bg-gray-50" /></div>
                    </div>
                    {activeScreen === 'userLogin' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label className="text-xs text-slate-500">Register Title</Label>
                          <Input value={(cfg.text as any).registerTitle || ''} onChange={e => set('text.registerTitle', e.target.value)} className="bg-gray-50" /></div>
                        <div className="space-y-1.5"><Label className="text-xs text-slate-500">Register Subtitle</Label>
                          <Input value={(cfg.text as any).registerSubtitle || ''} onChange={e => set('text.registerSubtitle', e.target.value)} className="bg-gray-50" /></div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-1.5 text-sm font-medium"><Layers className="w-3.5 h-3.5 text-amber-500" />Branding</Label>
                    <Toggle checked={cfg.branding.showLogo} onChange={(v: boolean) => set('branding.showLogo', v)} label="Show Logo / Brand Name" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label className="text-xs text-slate-500">Brand Name</Label>
                        <Input value={cfg.branding.logoText} onChange={e => set('branding.logoText', e.target.value)} className="bg-gray-50" /></div>
                      <div className="space-y-1.5"><Label className="text-xs text-slate-500">Logo URL</Label>
                        <Input value={cfg.branding.logoUrl} onChange={e => set('branding.logoUrl', e.target.value)} placeholder="https://..." className="bg-gray-50" /></div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="flex items-center gap-1.5 text-sm font-medium mb-2"><ToggleRight className="w-3.5 h-3.5 text-teal-500" />Options</Label>
                    <div className="divide-y divide-gray-100">
                      {Object.entries(cfg.options).map(([key, val]) => (
                        <Toggle key={key} checked={!!val} onChange={(v: boolean) => set(`options.${key}`, v)} label={OPTION_LABELS[key] || key} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* BUTTONS TAB */}
              {activeTab === 'buttons' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="flex items-center gap-1.5 text-sm font-medium"><Palette className="w-3.5 h-3.5 text-green-500" />Button Color</Label>
                    <Toggle checked={!!cfg.button.gradient} onChange={(v: boolean) => set('button.gradient', v)} label="Use gradient (2 colors)" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ColorRow label={cfg.button.gradient ? 'Color From' : 'Button Color'} value={cfg.button.color} onChange={(v: string) => set('button.color', v)} />
                      {cfg.button.gradient && (
                        <ColorRow label="Color To" value={cfg.button.colorTo || '#0d9488'} onChange={(v: string) => set('button.colorTo', v)} />
                      )}
                    </div>
                    <div className={`h-10 ${cfg.button.radius || 'rounded-xl'} ${cfg.button.shadow || 'shadow-lg'} flex items-center justify-center text-sm font-semibold`}
                      style={buildBtnStyle(cfg.button)}>
                      {cfg.button.loginText || 'Preview'}
                    </div>
                  </div>
                  <ColorRow label="Button Text Color" value={cfg.button.textColor || '#ffffff'} onChange={(v: string) => set('button.textColor', v)} />
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Button Shape</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {RADIUS_OPTIONS.map(r => (
                        <button key={r.value} onClick={() => set('button.radius', r.value)}
                          className={`py-2 text-xs font-medium border-2 transition-all ${r.value}
                            ${cfg.button.radius === r.value ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500'}`}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3 border-t pt-4">
                    <Label className="text-sm font-medium text-slate-700">Button Labels</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label className="text-xs text-slate-500">Login Button</Label>
                        <Input value={cfg.button.loginText} onChange={e => set('button.loginText', e.target.value)} /></div>
                      {activeScreen === 'userLogin' && (
                        <div className="space-y-1.5"><Label className="text-xs text-slate-500">Register Button</Label>
                          <Input value={cfg.button.registerText || ''} onChange={e => set('button.registerText', e.target.value)} /></div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STYLING TAB */}
              {activeTab === 'styling' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="flex items-center gap-1.5 text-sm font-medium"><Type className="w-3.5 h-3.5 text-violet-500" />Text Styling</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ColorRow label="Title Color" value={cfg.text?.titleColor || '#111827'} onChange={(v: string) => set('text.titleColor', v)} />
                      <ColorRow label="Subtitle Color" value={cfg.text?.subtitleColor || '#6b7280'} onChange={(v: string) => set('text.subtitleColor', v)} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label className="text-xs text-slate-500">Title Size</Label>
                        <Select value={cfg.text?.titleSize || 'text-3xl'} onValueChange={v => set('text.titleSize', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{FONT_SIZE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5"><Label className="text-xs text-slate-500">Title Weight</Label>
                        <Select value={cfg.text?.titleWeight || 'font-bold'} onValueChange={v => set('text.titleWeight', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{FONT_WEIGHT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <Label className="flex items-center gap-1.5 text-sm font-medium">Background Effects</Label>
                    <SliderRow label="Overlay Opacity" value={cfg.style?.overlayOpacity ?? 30} min={0} max={90} onChange={(v: number) => set('style.overlayOpacity', v)} unit="%" />
                    <SliderRow label="Image Blur" value={cfg.style?.imageBlur ?? 0} min={0} max={20} onChange={(v: number) => set('style.imageBlur', v)} unit="px" />
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <Label className="flex items-center gap-1.5 text-sm font-medium">Form Card</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ColorRow label="Card Background" value={cfg.style?.cardBg || '#ffffff'} onChange={(v: string) => set('style.cardBg', v)} />
                      <ColorRow label="Card Border" value={cfg.style?.cardBorder === 'transparent' ? '#ffffff' : (cfg.style?.cardBorder || '#ffffff')} onChange={(v: string) => set('style.cardBorder', v)} />
                    </div>
                    <SliderRow label="Background Opacity" value={cfg.style?.cardBgOpacity ?? 100} min={10} max={100} onChange={(v: number) => set('style.cardBgOpacity', v)} unit="%" />
                    <SliderRow label="Backdrop Blur" value={cfg.style?.cardBlur ?? 0} min={0} max={24} onChange={(v: number) => set('style.cardBlur', v)} unit="px" />
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Card Radius</Label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {RADIUS_OPTIONS.map(r => (
                          <button key={r.value} onClick={() => set('style.cardRadius', r.value)}
                            className={`py-2 text-xs font-medium border-2 transition-all ${r.value}
                              ${cfg.style?.cardRadius === r.value ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500'}`}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <Label className="flex items-center gap-1.5 text-sm font-medium">Input Fields</Label>
                    <ColorRow label="Border Color" value={cfg.style?.inputBorderColor || '#e5e7eb'} onChange={(v: string) => set('style.inputBorderColor', v)} />
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mt-4">
                    <p className="text-xs font-semibold text-blue-600 mb-1">📍 Firestore path</p>
                    <code className="text-xs text-blue-800 font-mono break-all">
                      Sites/{tenantId}/AuthCustomization/{activeScreen}
                    </code>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}