import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  ChevronLeft, LayoutDashboard, Pencil, Eye,
  User, Users, Shield, Type, Image as ImageIcon,
  Palette, Layout, ToggleRight, Layers, SkipBack,
  SkipForward, Play, Pause, Upload, Loader2, Trash2, Plus,
  Sliders,
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppContext from '../context/AppContext';
import { useToast } from '@/hooks/use-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const TRANSITIONS = [
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide' },
  { value: 'slideUp', label: 'Slide Up' },
  { value: 'zoom', label: 'Zoom' },
];

const RADIUS_OPTIONS = [
  { value: 'rounded-none', label: 'Square' },
  { value: 'rounded-lg', label: 'Rounded' },
  { value: 'rounded-xl', label: 'Large' },
  { value: 'rounded-2xl', label: 'XL' },
  { value: 'rounded-full', label: 'Pill' },
];

const SHADOW_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'shadow-sm', label: 'Small' },
  { value: 'shadow-md', label: 'Medium' },
  { value: 'shadow-lg', label: 'Large' },
  { value: 'shadow-xl', label: 'XL' },
  { value: 'shadow-2xl', label: '2XL' },
];

const FONT_SIZE_OPTIONS = [
  { value: 'text-lg', label: 'Small' },
  { value: 'text-xl', label: 'Medium' },
  { value: 'text-2xl', label: 'Large' },
  { value: 'text-3xl', label: 'XL' },
  { value: 'text-4xl', label: '2XL' },
];

const FONT_WEIGHT_OPTIONS = [
  { value: 'font-normal', label: 'Normal' },
  { value: 'font-medium', label: 'Medium' },
  { value: 'font-semibold', label: 'Semibold' },
  { value: 'font-bold', label: 'Bold' },
  { value: 'font-extrabold', label: 'Extra Bold' },
];

const DEFAULT_CONFIG = {
  userLogin: {
    layout: 'split', transition: 'fade',
    images: ['https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1200', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200'],
    background: { type: 'image', imageUrl: '', gradient: 'linear-gradient(135deg,#16a34a,#0d9488)' },
    branding: { logoUrl: '', logoText: 'PlantFresh', showLogo: true },
    text: { title: 'Welcome Back!', subtitle: 'Sign in to continue your eco journey', registerTitle: 'Join Our Green Family', registerSubtitle: 'Create your account today', titleColor: '#111827', subtitleColor: '#6b7280', titleSize: 'text-3xl', titleWeight: 'font-bold' },
    button: { loginText: 'Sign In', registerText: 'Create Account', color: '#16a34a', colorTo: '', gradient: false, radius: 'rounded-xl', textColor: '#ffffff', shadow: 'shadow-lg' },
    options: { showRegister: true, showGoogle: true, showAffiliateLink: true },
    style: { overlayOpacity: 30, imageBlur: 0, cardBlur: 4, cardBg: '#ffffff', cardBgOpacity: 95, cardBorder: 'transparent', cardRadius: 'rounded-2xl', inputBorderColor: '#e5e7eb', inputRadius: 'rounded-xl', leftPanelGlass: false },
  },
  affiliateLogin: {
    layout: 'split', transition: 'slide',
    images: ['https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200', 'https://images.unsplash.com/photo-1446941611757-91d2c3bd3d45?w=1200'],
    background: { type: 'gradient', imageUrl: '', gradient: 'linear-gradient(135deg,#16a34a,#0d9488,#0284c7)' },
    branding: { logoUrl: '', logoText: 'PlantFresh Affiliates', showLogo: true },
    text: { title: 'Earn While You Clean Up The Planet', subtitle: 'Join our affiliate program and start earning today', step2Title: 'Bank Details', step2Subtitle: 'Enter your payment information to receive commissions', titleColor: '#111827', subtitleColor: '#6b7280', titleSize: 'text-3xl', titleWeight: 'font-bold' },
    button: { loginText: 'Create Affiliate Account', registerText: '', color: '#16a34a', colorTo: '', gradient: false, radius: 'rounded-xl', textColor: '#ffffff', shadow: 'shadow-lg' },
    options: { showBenefits: true, showBankStep: true },
    style: { overlayOpacity: 30, imageBlur: 0, cardBlur: 0, cardBg: '#ffffff', cardBgOpacity: 100, cardBorder: 'transparent', cardRadius: 'rounded-3xl', inputBorderColor: '#e5e7eb', inputRadius: 'rounded-xl', leftPanelGlass: false },
  },
  adminLogin: {
    layout: 'center', transition: 'zoom',
    images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200'],
    background: { type: 'image', imageUrl: '/bg3.avif', gradient: 'linear-gradient(135deg,#1e293b,#0f172a)' },
    branding: { logoUrl: '', logoText: '🌿 PlantFresh Admin', showLogo: true },
    text: { title: 'Admin Login', subtitle: 'Enter your credentials to access the admin panel', titleColor: '#111827', subtitleColor: '#6b7280', titleSize: 'text-2xl', titleWeight: 'font-bold' },
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

const OPTION_LABELS = {
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
const getBgStyle = (bg) => {
  if (bg?.type === 'image' && bg.imageUrl)
    return { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  return { background: bg?.gradient || 'linear-gradient(135deg,#16a34a,#0d9488)' };
};

const getTransClass = (transition, active) => {
  const base = 'absolute inset-0 transition-all duration-700 ease-in-out';
  if (active) {
    switch (transition) {
      case 'slide':   return `${base} opacity-100 translate-x-0`;
      case 'slideUp': return `${base} opacity-100 translate-y-0`;
      case 'zoom':    return `${base} opacity-100 scale-100`;
      default:        return `${base} opacity-100`;
    }
  }
  switch (transition) {
    case 'slide':   return `${base} opacity-0 -translate-x-full`;
    case 'slideUp': return `${base} opacity-0 translate-y-full`;
    case 'zoom':    return `${base} opacity-0 scale-110`;
    default:        return `${base} opacity-0`;
  }
};

const hexToRgba = (hex, opacity) => {
  const r = parseInt((hex || '#ffffff').slice(1, 3), 16);
  const g = parseInt((hex || '#ffffff').slice(3, 5), 16);
  const b = parseInt((hex || '#ffffff').slice(5, 7), 16);
  return `rgba(${r},${g},${b},${(opacity ?? 100) / 100})`;
};

const buildBtnStyle = (button) => ({
  background: button?.gradient && button?.colorTo
    ? `linear-gradient(135deg, ${button.color}, ${button.colorTo})`
    : button?.color || '#16a34a',
  color: button?.textColor || '#ffffff',
  border: 'none',
});

const buildCardStyle = (style) => ({
  backgroundColor: hexToRgba(style?.cardBg || '#ffffff', style?.cardBgOpacity ?? 100),
  borderColor: style?.cardBorder !== 'transparent' ? style?.cardBorder : 'transparent',
  borderWidth: style?.cardBorder && style.cardBorder !== 'transparent' ? '1px' : '0',
  borderStyle: 'solid',
  backdropFilter: style?.cardBlur ? `blur(${style.cardBlur}px)` : undefined,
  WebkitBackdropFilter: style?.cardBlur ? `blur(${style.cardBlur}px)` : undefined,
});

// ─── Shared sub-components ────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, label }) => (
  <div className="flex items-center justify-between py-2.5">
    <span className="text-sm text-gray-600">{label}</span>
    <button onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

const ColorRow = ({ label, value, onChange }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-slate-500">{label}</Label>
    <div className="flex gap-2">
      <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
        className="h-9 w-14 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0" />
      <Input value={value || ''} onChange={e => onChange(e.target.value)} className="flex-1 bg-gray-50 font-mono text-sm" />
    </div>
  </div>
);

const SliderRow = ({ label, value, min, max, step = 1, onChange, unit = '' }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <Label className="text-xs text-slate-500">{label}</Label>
      <span className="text-xs font-mono text-slate-600">{value}{unit}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-emerald-500" />
  </div>
);

// ─── Image Slot ───────────────────────────────────────────────────────────────
const ImageSlot = ({ index, url, onUrlChange, onRemove, storage, screenKey }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef(null);
  const { toast } = useToast();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!storage) {
      const reader = new FileReader();
      reader.onload = (ev) => onUrlChange(ev.target.result);
      reader.readAsDataURL(file);
      toast({ title: '⚠️ Firebase Storage not connected', variant: 'destructive' });
      return;
    }
    try {
      setUploading(true);
      const storageRef = ref(storage, `auth-backgrounds/${screenKey}_${index}_${Date.now()}_${file.name}`);
      const task = uploadBytesResumable(storageRef, file);
      await new Promise((resolve, reject) => {
        task.on('state_changed',
          (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => { onUrlChange(await getDownloadURL(task.snapshot.ref)); resolve(undefined); }
        );
      });
      toast({ title: '✅ Image uploaded' });
    } catch (err) {
      toast({ title: '❌ Upload failed', description: err.message, variant: 'destructive' });
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
        <div className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${uploading ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50'}`}>
          {uploading
            ? <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs"><Loader2 className="w-4 h-4 animate-spin" />Uploading... {progress}%</div>
            : <div className="flex items-center justify-center gap-2 text-slate-500 text-xs"><Upload className="w-4 h-4" />Click to upload</div>
          }
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

const ImageListEditor = ({ images, onChange, storage, screenKey }) => {
  const updateImage = (i, val) => { const u = [...images]; u[i] = val; onChange(u); };
  return (
    <div className="space-y-3">
      {images.map((url, i) => (
        <ImageSlot key={i} index={i} url={url} onUrlChange={val => updateImage(i, val)}
          onRemove={() => onChange(images.filter((_, idx) => idx !== i))} storage={storage} screenKey={screenKey} />
      ))}
      <Button size="sm" variant="outline" onClick={() => onChange([...images, ''])} className="w-full h-9 border-dashed gap-1.5">
        <Plus className="w-4 h-4" /> Add Image
      </Button>
    </div>
  );
};

// ─── Animated Image Panel ─────────────────────────────────────────────────────
const ImagePanel = ({ images, transition, bgStyle, children, className, overlayOpacity = 30, imageBlur = 0 }) => {
  const [idx, setIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(null);
  useEffect(() => {
    const imgs = (images || []).filter(Boolean);
    if (imgs.length <= 1) return;
    const t = setInterval(() => {
      setPrevIdx(idx);
      setIdx(p => (p + 1) % imgs.length);
      setTimeout(() => setPrevIdx(null), 700);
    }, 4000);
    return () => clearInterval(t);
  }, [images, idx]);
  const imgs = (images || []).filter(Boolean);
  const bgFor = (url) => url
    ? { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: imageBlur > 0 ? `blur(${imageBlur}px)` : undefined }
    : bgStyle;
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
const MiniForm = ({ cfg, isOverview = false }) => {
  const btnStyle = buildBtnStyle(cfg.button);
  const btnText = cfg.button?.loginText || 'Sign In';
  const showGoogle = cfg.options?.showGoogle;
  const scale = isOverview ? 'text-[10px]' : 'text-xs';
  const inputH = isOverview ? 'h-5' : 'h-7';
  const gap = isOverview ? 'space-y-1.5' : 'space-y-2';
  const cardStyle = buildCardStyle(cfg.style);
  const inputStyle = { borderColor: cfg.style?.inputBorderColor || '#e5e7eb', borderRadius: undefined };

  return (
    <div className={gap}>
      {showGoogle && (
        <div className={`${inputH} border border-gray-200 rounded flex items-center justify-center gap-1 bg-white`}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className={isOverview ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
          <span className={`${scale} text-gray-600 font-medium`}>Continue with Google</span>
        </div>
      )}
      {showGoogle && <div className="flex items-center gap-1"><div className="flex-1 h-px bg-gray-200" /><span className={`${scale} text-gray-400`}>or</span><div className="flex-1 h-px bg-gray-200" /></div>}
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
        {btnText}
      </div>
    </div>
  );
};

// ─── Overview Card ────────────────────────────────────────────────────────────
const OverviewCard = ({ screen, config, onEdit }) => {
  const cfg = config || DEFAULT_CONFIG[screen.key];
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
            overlayOpacity={cfg.style?.overlayOpacity ?? 30} imageBlur={cfg.style?.imageBlur ?? 0}>
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className={`${cfg.style?.cardRadius || 'rounded-xl'} shadow-xl p-4 w-56`} style={cardStyle}>
                {cfg.branding.showLogo && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: cfg.button.color }}>
                      <span className="text-white text-[9px] font-bold">P</span>
                    </div>
                    <span className="font-bold text-[11px] text-gray-800 truncate">{cfg.branding.logoText}</span>
                  </div>
                )}
                <p className={`font-bold text-xs truncate mb-0.5`} style={{ color: cfg.text?.titleColor || '#111827' }}>{cfg.text.title}</p>
                <p className="text-[10px] mb-2 truncate" style={{ color: cfg.text?.subtitleColor || '#6b7280' }}>{cfg.text.subtitle}</p>
                <MiniForm cfg={cfg} isOverview={true} />
              </div>
            </div>
          </ImagePanel>
        ) : (
          <div className="w-full h-full flex">
            <ImagePanel images={images} transition={cfg.transition || 'fade'} bgStyle={bgStyle} className="w-1/2 h-full"
              overlayOpacity={cfg.style?.overlayOpacity ?? 30} imageBlur={cfg.style?.imageBlur ?? 0}>
              <div className="w-full h-full flex items-center justify-center px-4">
                <div className={`text-center text-white ${cfg.style?.leftPanelGlass ? 'bg-white/10 backdrop-blur-sm rounded-xl p-3' : ''}`}>
                  {cfg.branding.showLogo && (
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                        <Icon className="w-3 h-3 text-white" />
                      </div>
                      <span className="font-bold text-xs">{cfg.branding.logoText}</span>
                    </div>
                  )}
                  <p className="text-xs font-semibold leading-tight line-clamp-3">{cfg.text.title}</p>
                  <p className="text-[10px] opacity-75 mt-1 line-clamp-2">{cfg.text.subtitle}</p>
                </div>
              </div>
            </ImagePanel>
            <div className="w-1/2 flex items-center justify-center p-4" style={cardStyle}>
              <div className="w-full">
                <p className={`font-bold text-xs truncate mb-0.5`} style={{ color: cfg.text?.titleColor || '#111827' }}>{cfg.text.title}</p>
                <p className="text-[10px] mb-2 truncate" style={{ color: cfg.text?.subtitleColor || '#6b7280' }}>{cfg.text.subtitle}</p>
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
const FullPreview = ({ config }) => {
  const [imgIdx, setImgIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const autoRef = useRef(null);

  const images = (config.images || []).filter(Boolean);
  const bgStyle = getBgStyle(config.background);
  const isCenter = config.layout === 'center';
  const transition = config.transition || 'fade';
  const cardStyle = buildCardStyle(config.style);
  const btnStyle = buildBtnStyle(config.button);
  const overlayOpacity = config.style?.overlayOpacity ?? 30;
  const imageBlur = config.style?.imageBlur ?? 0;

  const goTo = (next) => { setPrevIdx(imgIdx); setImgIdx(next); setTimeout(() => setPrevIdx(null), 700); };

  useEffect(() => {
    clearInterval(autoRef.current);
    if (isPlaying && images.length > 1)
      autoRef.current = setInterval(() => goTo((imgIdx + 1) % images.length), 4000);
    return () => clearInterval(autoRef.current);
  }, [isPlaying, imgIdx, images.length]);

  const bgFor = (url) => url
    ? { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: imageBlur > 0 ? `blur(${imageBlur}px)` : undefined }
    : bgStyle;

  const BgLayers = () => (
    <>
      {prevIdx !== null && <div className={getTransClass(transition, false)} style={bgFor(images[prevIdx] || '')} />}
      <div className={getTransClass(transition, true)} style={bgFor(images[imgIdx] || '')} />
      <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlayOpacity / 100})` }} />
    </>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
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

      <div className="relative w-full h-[420px] rounded-lg overflow-hidden shadow-lg border-2 border-slate-200 bg-slate-800">
        {isCenter ? (
          <>
            <BgLayers />
            <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
              <div className={`${config.style?.cardRadius || 'rounded-2xl'} shadow-2xl p-7 w-full max-w-sm`} style={cardStyle}>
                {config.branding.showLogo && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: config.button.color }}>
                      <span style={{ color: config.button.textColor || '#fff' }} className="font-bold text-sm">P</span>
                    </div>
                    <span className="font-bold text-gray-800">{config.branding.logoText}</span>
                  </div>
                )}
                <h2 className={`${config.text?.titleSize || 'text-lg'} ${config.text?.titleWeight || 'font-bold'} mb-0.5`} style={{ color: config.text?.titleColor || '#111827' }}>{config.text.title}</h2>
                <p className="text-xs mb-4" style={{ color: config.text?.subtitleColor || '#6b7280' }}>{config.text.subtitle}</p>
                <MiniForm cfg={config} isOverview={false} />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex">
            <div className="w-1/2 h-full relative overflow-hidden">
              <BgLayers />
              <div className="absolute inset-0 flex items-center justify-center z-10 p-8">
                <div className={config.style?.leftPanelGlass ? 'bg-white/10 backdrop-blur-md rounded-2xl p-6' : ''}>
                  <div className="text-white">
                    {config.branding.showLogo && (
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                          <span className="font-bold text-sm">P</span>
                        </div>
                        <span className="font-bold">{config.branding.logoText}</span>
                      </div>
                    )}
                    <h1 className="text-xl font-bold mb-2 leading-tight">{config.text.title}</h1>
                    <p className="text-sm opacity-80">{config.text.subtitle}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-1/2 flex items-center justify-center p-8" style={cardStyle}>
              <div className="w-full">
                <h2 className={`${config.text?.titleSize || 'text-lg'} ${config.text?.titleWeight || 'font-bold'} mb-0.5`} style={{ color: config.text?.titleColor || '#111827' }}>{config.text.title}</h2>
                <p className="text-xs mb-4" style={{ color: config.text?.subtitleColor || '#6b7280' }}>{config.text.subtitle}</p>
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
  const { db, storage } = useContext(AppContext);
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState('overview');
  const [activeScreen, setActiveScreen] = useState('userLogin');
  const [activeTab, setActiveTab] = useState('content');
  const [configs, setConfigs] = useState(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'StoreConfigs', 'StoreConfig001'));
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
        toast({ title: 'Could not load config', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [db]);

  const handleSave = async () => {
    if (!db) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'StoreConfigs', 'StoreConfig001'), { AuthCustomization: configs }, { merge: true });
      toast({ title: '✅ Saved', description: 'Auth screen configuration updated.' });
    } catch (e) {
      toast({ title: '❌ Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const set = (path, value) => {
    setConfigs(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = [activeScreen, ...path.split('.')];
      let node = updated;
      keys.slice(0, -1).forEach(k => { if (!node[k]) node[k] = {}; node = node[k]; });
      node[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const cfg = configs[activeScreen];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
        <p className="text-gray-600">Loading auth configuration...</p>
      </div>
    </div>
  );

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
          <h1 className="text-2xl md:text-3xl font-bold">
            {viewMode === 'overview' ? 'Auth Screen Manager' : `Editing: ${SCREENS.find(s => s.key === activeScreen)?.label}`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex border rounded-lg overflow-hidden">
            {['overview', 'editor'].map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 capitalize transition-colors ${viewMode === m ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                {m === 'overview' ? <LayoutDashboard className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}{m}
              </button>
            ))}
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </div>

      {/* Overview */}
      {viewMode === 'overview' && (
        <div className="space-y-4">
          <p className="text-slate-500 text-sm">Click <strong>Edit</strong> to customise each login screen.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {SCREENS.map(screen => (
              <OverviewCard key={screen.key} screen={screen} config={configs[screen.key]}
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
            <CardHeader><CardTitle className="text-lg">Image Transition Effect</CardTitle></CardHeader>
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
            {/* Tab bar */}
            <div className="flex border-b bg-slate-50">
              {EDITOR_TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.key ? 'border-emerald-500 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <Icon className="w-4 h-4" /><span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-5">
              {/* ── CONTENT TAB ── */}
              {activeTab === 'content' && (
                <div className="space-y-6">
                  {/* Layout */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-medium"><Layout className="w-3.5 h-3.5 text-indigo-500" />Layout</Label>
                    <div className="flex gap-3">
                      {['split', 'center'].map(opt => (
                        <button key={opt} onClick={() => set('layout', opt)}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${cfg.layout === opt ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                          {opt === 'split' ? '⬛⬜ Split' : '⬜ Center'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Images */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-medium"><ImageIcon className="w-3.5 h-3.5 text-rose-500" />Background Images</Label>
                    <p className="text-xs text-slate-500">Upload or paste a URL. Saved to Firebase Storage.</p>
                    <ImageListEditor images={cfg.images || []} onChange={imgs => set('images', imgs)} storage={storage} screenKey={activeScreen} />
                  </div>

                  {/* Text */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-1.5 text-sm font-medium"><Type className="w-3.5 h-3.5 text-violet-500" />Text</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Login Title</Label>
                        <Input value={cfg.text.title} onChange={e => set('text.title', e.target.value)} className="bg-gray-50" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Login Subtitle</Label>
                        <Input value={cfg.text.subtitle} onChange={e => set('text.subtitle', e.target.value)} className="bg-gray-50" />
                      </div>
                    </div>
                    {activeScreen === 'userLogin' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">Register Title</Label>
                          <Input value={cfg.text.registerTitle || ''} onChange={e => set('text.registerTitle', e.target.value)} className="bg-gray-50" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">Register Subtitle</Label>
                          <Input value={cfg.text.registerSubtitle || ''} onChange={e => set('text.registerSubtitle', e.target.value)} className="bg-gray-50" />
                        </div>
                      </div>
                    )}
                    {activeScreen === 'affiliateLogin' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">Step 2 Title</Label>
                          <Input value={cfg.text.step2Title || ''} onChange={e => set('text.step2Title', e.target.value)} className="bg-gray-50" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">Step 2 Subtitle</Label>
                          <Input value={cfg.text.step2Subtitle || ''} onChange={e => set('text.step2Subtitle', e.target.value)} className="bg-gray-50" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Branding */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-1.5 text-sm font-medium"><Layers className="w-3.5 h-3.5 text-amber-500" />Branding</Label>
                    <Toggle checked={cfg.branding.showLogo} onChange={v => set('branding.showLogo', v)} label="Show Logo / Brand Name" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Brand Name</Label>
                        <Input value={cfg.branding.logoText} onChange={e => set('branding.logoText', e.target.value)} className="bg-gray-50" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Logo Image URL</Label>
                        <Input value={cfg.branding.logoUrl} onChange={e => set('branding.logoUrl', e.target.value)} placeholder="https://..." className="bg-gray-50" />
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1.5 text-sm font-medium mb-2"><ToggleRight className="w-3.5 h-3.5 text-teal-500" />Options</Label>
                    <div className="divide-y divide-gray-100">
                      {Object.entries(cfg.options).map(([key, val]) => (
                        <Toggle key={key} checked={!!val} onChange={v => set(`options.${key}`, v)} label={OPTION_LABELS[key] || key} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── BUTTONS TAB ── */}
              {activeTab === 'buttons' && (
                <div className="space-y-6">
                  {/* Primary color / gradient */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-1.5 text-sm font-medium"><Palette className="w-3.5 h-3.5 text-green-500" />Button Color</Label>
                    <Toggle checked={!!cfg.button.gradient} onChange={v => set('button.gradient', v)} label="Use gradient (2 colors)" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ColorRow label={cfg.button.gradient ? 'Color From' : 'Button Color'} value={cfg.button.color} onChange={v => set('button.color', v)} />
                      {cfg.button.gradient && (
                        <ColorRow label="Color To" value={cfg.button.colorTo || '#0d9488'} onChange={v => set('button.colorTo', v)} />
                      )}
                    </div>
                    {/* Live preview */}
                    <div className={`h-11 ${cfg.button.radius || 'rounded-xl'} ${cfg.button.shadow || 'shadow-lg'} flex items-center justify-center text-sm font-semibold`}
                      style={buildBtnStyle(cfg.button)}>
                      {cfg.button.loginText || 'Button Preview'}
                    </div>
                  </div>

                  {/* Text color */}
                  <ColorRow label="Button Text Color" value={cfg.button.textColor || '#ffffff'} onChange={v => set('button.textColor', v)} />

                  {/* Radius */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Button Shape</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {RADIUS_OPTIONS.map(r => (
                        <button key={r.value} onClick={() => set('button.radius', r.value)}
                          className={`py-2 text-xs font-medium border-2 transition-all ${r.value} ${cfg.button.radius === r.value ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shadow */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Shadow Intensity</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {SHADOW_OPTIONS.map(s => (
                        <button key={s.value} onClick={() => set('button.shadow', s.value)}
                          className={`py-2 text-xs font-medium border-2 rounded-lg transition-all ${cfg.button.shadow === s.value ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Button texts */}
                  <div className="space-y-3 border-t pt-4">
                    <Label className="text-sm font-medium text-slate-700">Button Labels</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">{activeScreen === 'affiliateLogin' ? 'Submit Button' : 'Login Button'}</Label>
                        <Input value={cfg.button.loginText} onChange={e => set('button.loginText', e.target.value)} />
                      </div>
                      {activeScreen === 'userLogin' && (
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">Register Button</Label>
                          <Input value={cfg.button.registerText || ''} onChange={e => set('button.registerText', e.target.value)} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STYLING TAB ── */}
              {activeTab === 'styling' && (
                <div className="space-y-6">
                  {/* Text styling */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-1.5 text-sm font-medium"><Type className="w-3.5 h-3.5 text-violet-500" />Text Styling</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ColorRow label="Title Color" value={cfg.text?.titleColor || '#111827'} onChange={v => set('text.titleColor', v)} />
                      <ColorRow label="Subtitle Color" value={cfg.text?.subtitleColor || '#6b7280'} onChange={v => set('text.subtitleColor', v)} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Title Size</Label>
                        <Select value={cfg.text?.titleSize || 'text-3xl'} onValueChange={v => set('text.titleSize', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{FONT_SIZE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Title Weight</Label>
                        <Select value={cfg.text?.titleWeight || 'font-bold'} onValueChange={v => set('text.titleWeight', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{FONT_WEIGHT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Background effects */}
                  <div className="space-y-3 border-t pt-4">
                    <Label className="flex items-center gap-1.5 text-sm font-medium"><ImageIcon className="w-3.5 h-3.5 text-rose-500" />Background Effects</Label>
                    <SliderRow label="Overlay Opacity" value={cfg.style?.overlayOpacity ?? 30} min={0} max={90} onChange={v => set('style.overlayOpacity', v)} unit="%" />
                    <SliderRow label="Image Blur" value={cfg.style?.imageBlur ?? 0} min={0} max={20} onChange={v => set('style.imageBlur', v)} unit="px" />
                  </div>

                  {/* Form card */}
                  <div className="space-y-3 border-t pt-4">
                    <Label className="flex items-center gap-1.5 text-sm font-medium"><Layout className="w-3.5 h-3.5 text-indigo-500" />Form Card</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ColorRow label="Card Background" value={cfg.style?.cardBg || '#ffffff'} onChange={v => set('style.cardBg', v)} />
                      <ColorRow label="Card Border Color" value={cfg.style?.cardBorder === 'transparent' ? '#ffffff' : (cfg.style?.cardBorder || '#ffffff')} onChange={v => set('style.cardBorder', v)} />
                    </div>
                    <SliderRow label="Card Background Opacity" value={cfg.style?.cardBgOpacity ?? 100} min={10} max={100} onChange={v => set('style.cardBgOpacity', v)} unit="%" />
                    <SliderRow label="Card Backdrop Blur" value={cfg.style?.cardBlur ?? 0} min={0} max={24} onChange={v => set('style.cardBlur', v)} unit="px" />
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Card Border Radius</Label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {RADIUS_OPTIONS.map(r => (
                          <button key={r.value} onClick={() => set('style.cardRadius', r.value)}
                            className={`py-2 text-xs font-medium border-2 transition-all ${r.value} ${cfg.style?.cardRadius === r.value ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Input fields */}
                  <div className="space-y-3 border-t pt-4">
                    <Label className="flex items-center gap-1.5 text-sm font-medium">Input Fields</Label>
                    <ColorRow label="Input Border Color" value={cfg.style?.inputBorderColor || '#e5e7eb'} onChange={v => set('style.inputBorderColor', v)} />
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Input Border Radius</Label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {RADIUS_OPTIONS.map(r => (
                          <button key={r.value} onClick={() => set('style.inputRadius', r.value)}
                            className={`py-2 text-xs font-medium border-2 transition-all ${r.value} ${cfg.style?.inputRadius === r.value ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Left panel */}
                  {cfg.layout === 'split' && (
                    <div className="space-y-3 border-t pt-4">
                      <Label className="flex items-center gap-1.5 text-sm font-medium">Left Panel</Label>
                      <Toggle checked={!!cfg.style?.leftPanelGlass} onChange={v => set('style.leftPanelGlass', v)} label="Glass effect on left panel content" />
                    </div>
                  )}

                  {/* Firestore path */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-600 mb-1">📍 Firestore Location</p>
                    <code className="text-xs text-blue-800 font-mono break-all">StoreConfigs/StoreConfig001/AuthCustomization/{activeScreen}</code>
                    <p className="text-xs text-blue-500 mt-2">Changes apply on next page refresh.</p>
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