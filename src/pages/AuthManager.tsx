import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  ChevronLeft, LayoutDashboard, Pencil, Eye,
  User, Users, Shield, Type,
  Image as ImageIcon, Palette, Layout,
  ToggleRight, Layers, SkipBack, SkipForward, Play, Pause,
  Upload, Loader2, Trash2, Plus,
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import AppContext from '../context/AppContext';
import { useToast } from '@/hooks/use-toast';

// ─── Transitions ──────────────────────────────────────────────────────────────
const TRANSITIONS = [
  { value: 'fade',    label: 'Fade'     },
  { value: 'slide',   label: 'Slide'    },
  { value: 'slideUp', label: 'Slide Up' },
  { value: 'zoom',    label: 'Zoom'     },
  { value: 'flip',    label: 'Flip'     },
];

// ─── Default Config ───────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  userLogin: {
    layout: 'split',
    transition: 'fade',
    images: [
      'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1200',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200',
    ],
    background: { type: 'image', imageUrl: '', gradient: 'linear-gradient(135deg,#16a34a,#0d9488)' },
    branding:   { logoUrl: '', logoText: 'PlantFresh', showLogo: true },
    text:       { title: 'Welcome Back!', subtitle: 'Sign in to continue your eco journey', registerTitle: 'Join Our Green Family', registerSubtitle: 'Create your account today' },
    button:     { loginText: 'Sign In', registerText: 'Create Account', color: '#16a34a' },
    options:    { showRegister: true, showGoogle: true, showAffiliateLink: true },
  },
  affiliateLogin: {
    layout: 'split',
    transition: 'slide',
    images: [
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200',
      'https://images.unsplash.com/photo-1446941611757-91d2c3bd3d45?w=1200',
    ],
    background: { type: 'gradient', imageUrl: '', gradient: 'linear-gradient(135deg,#16a34a,#0d9488,#0284c7)' },
    branding:   { logoUrl: '', logoText: 'PlantFresh Affiliates', showLogo: true },
    text:       { title: 'Earn While You Clean Up The Planet', subtitle: 'Join our affiliate program and start earning today', step2Title: 'Bank Details', step2Subtitle: 'Enter your payment information to receive commissions' },
    button:     { loginText: 'Create Affiliate Account', registerText: '', color: '#16a34a' },
    options:    { showBenefits: true, showBankStep: true },
  },
  adminLogin: {
    layout: 'center',
    transition: 'zoom',
    images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200'],
    background: { type: 'image', imageUrl: '/bg3.avif', gradient: 'linear-gradient(135deg,#1e293b,#0f172a)' },
    branding:   { logoUrl: '', logoText: '🌿 PlantFresh Admin', showLogo: true },
    text:       { title: 'Admin Login', subtitle: 'Enter your credentials to access the admin panel' },
    button:     { loginText: 'Sign In', registerText: '', color: '#16a34a' },
    options:    { showForgotPassword: false },
  },
};

const SCREENS = [
  { key: 'userLogin',      label: 'User Login',      icon: User},
  { key: 'affiliateLogin', label: 'Affiliate Signup', icon: Users},
  { key: 'adminLogin',     label: 'Admin Login',      icon: Shield},
];

const OPTION_LABELS = {
  showRegister:       'Show Register / Sign Up',
  showGoogle:         'Show Google Sign-In',
  showAffiliateLink:  '"Become an Affiliate" Link',
  showBenefits:       'Show Benefits Panel',
  showBankStep:       'Show Bank Details Step',
  showForgotPassword: 'Show Forgot Password Link',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getBgStyle = (bg) => {
  if (bg?.type === 'image' && bg.imageUrl) {
    return { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
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

// ─── Mini Form Preview ────────────────────────────────────────────────────────
const MiniForm = ({ cfg, isOverview = false }) => {
  const color   = cfg.button?.color || '#16a34a';
  const btnText = cfg.button?.loginText || 'Sign In';
  const showGoogle = cfg.options?.showGoogle;
  const scale   = isOverview ? 'text-[10px]' : 'text-xs';
  const inputH  = isOverview ? 'h-5' : 'h-7';
  const gap     = isOverview ? 'space-y-1.5' : 'space-y-2';

  return (
    <div className={gap}>
      {showGoogle && (
        <div className={`${inputH} border border-gray-200 rounded flex items-center justify-center gap-1 bg-white`}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className={isOverview ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
          <span className={`${scale} text-gray-600 font-medium`}>Continue with Google</span>
        </div>
      )}
      {showGoogle && (
        <div className="flex items-center gap-1">
          <div className="flex-1 h-px bg-gray-200" /><span className={`${scale} text-gray-400`}>or</span><div className="flex-1 h-px bg-gray-200" />
        </div>
      )}
      <div>
        <p className={`${scale} text-gray-500 mb-0.5`}>Email</p>
        <div className={`${inputH} border border-gray-200 rounded bg-gray-50 px-2 flex items-center`}>
          <span className={`${scale} text-gray-400`}>you@example.com</span>
        </div>
      </div>
      <div>
        <p className={`${scale} text-gray-500 mb-0.5`}>Password</p>
        <div className={`${inputH} border border-gray-200 rounded bg-gray-50 px-2 flex items-center`}>
          <span className={`${scale} text-gray-400`}>••••••••</span>
        </div>
      </div>
      <div className={`${inputH} rounded flex items-center justify-center font-semibold text-white ${scale}`}
           style={{ background: color }}>
        {btnText}
      </div>
    </div>
  );
};

// ─── Animated Image Panel ─────────────────────────────────────────────────────
const ImagePanel = ({ images, transition, bgStyle, children, className }) => {
  const [idx, setIdx]         = useState(0);
  const [prevIdx, setPrevIdx] = useState(null);

  useEffect(() => {
    const imgs = (images || []).filter(Boolean);
    if (imgs.length <= 1) return;
    const t = setInterval(() => {
      setPrevIdx(idx);
      setIdx((p) => (p + 1) % imgs.length);
      setTimeout(() => setPrevIdx(null), 700);
    }, 4000);
    return () => clearInterval(t);
  }, [images, idx]);

  const imgs = (images || []).filter(Boolean);
  const bgFor = (url) =>
    url ? { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : bgStyle;

  return (
    <div className={`relative overflow-hidden ${className || ''}`}>
      {prevIdx !== null && <div className={getTransClass(transition, false)} style={bgFor(imgs[prevIdx])} />}
      <div className={getTransClass(transition, true)} style={bgFor(imgs[idx] || '')} />
      <div className="absolute inset-0 bg-black/30" />
      {imgs.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {imgs.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`} />
          ))}
        </div>
      )}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};

// ─── Overview Card ────────────────────────────────────────────────────────────
const OverviewCard = ({ screen, config, onEdit }) => {
  const cfg     = config || DEFAULT_CONFIG[screen.key];
  const bgStyle = getBgStyle(cfg.background);
  const isCenter = cfg.layout === 'center';
  const images  = (cfg.images || []).filter(Boolean);
  const Icon    = screen.icon;

  return (
    <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200">
      <div className="relative w-full h-56">
        {isCenter ? (
          <ImagePanel images={images} transition={cfg.transition || 'fade'} bgStyle={bgStyle} className="w-full h-full">
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl p-4 w-56">
                {cfg.branding.showLogo && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: cfg.button.color }}>
                      <span className="text-white text-[9px] font-bold">P</span>
                    </div>
                    <span className="font-bold text-[11px] text-gray-800 truncate">{cfg.branding.logoText}</span>
                  </div>
                )}
                <p className="font-bold text-xs text-gray-800 truncate mb-0.5">{cfg.text.title}</p>
                <p className="text-[10px] text-gray-400 mb-2 truncate">{cfg.text.subtitle}</p>
                <MiniForm cfg={cfg} isOverview={true} />
              </div>
            </div>
          </ImagePanel>
        ) : (
          <div className="w-full h-full flex">
            <ImagePanel images={images} transition={cfg.transition || 'fade'} bgStyle={bgStyle} className="w-1/2 h-full">
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
                  <p className="text-xs font-semibold leading-tight line-clamp-3">{cfg.text.title}</p>
                  <p className="text-[10px] opacity-75 mt-1 line-clamp-2">{cfg.text.subtitle}</p>
                </div>
              </div>
            </ImagePanel>
            <div className="w-1/2 bg-white flex items-center justify-center p-4">
              <div className="w-full">
                <p className="font-bold text-xs text-gray-800 truncate mb-0.5">{cfg.text.title}</p>
                <p className="text-[10px] text-gray-400 mb-2 truncate">{cfg.text.subtitle}</p>
                <MiniForm cfg={cfg} isOverview={true} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-100">
        <div>
          <p className="font-semibold text-sm text-slate-800">{screen.label}</p>
          <p className="text-xs text-slate-500">
            {cfg.layout} layout · {cfg.transition} transition
          </p>
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
  const [imgIdx, setImgIdx]   = useState(0);
  const [prevIdx, setPrevIdx] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const autoRef = useRef(null);

  const images   = (config.images || []).filter(Boolean);
  const bgStyle  = getBgStyle(config.background);
  const isCenter = config.layout === 'center';
  const transition = config.transition || 'fade';
  const color    = config.button?.color || '#16a34a';

  const goTo = (next) => {
    setPrevIdx(imgIdx);
    setImgIdx(next);
    setTimeout(() => setPrevIdx(null), 700);
  };

  useEffect(() => {
    clearInterval(autoRef.current);
    if (isPlaying && images.length > 1) {
      autoRef.current = setInterval(() => goTo((imgIdx + 1) % images.length), 4000);
    }
    return () => clearInterval(autoRef.current);
  }, [isPlaying, imgIdx, images.length]);

  const bgFor = (url) =>
    url ? { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : bgStyle;

  const BgLayers = () => (
    <>
      {prevIdx !== null && <div className={getTransClass(transition, false)} style={bgFor(images[prevIdx] || '')} />}
      <div className={getTransClass(transition, true)} style={bgFor(images[imgIdx] || '')} />
      <div className="absolute inset-0 bg-black/30" />
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, i) => (
            <div key={i} onClick={() => goTo(i)}
              className={`h-2 rounded-full cursor-pointer transition-all ${i === imgIdx ? 'w-8 bg-white' : 'w-2 bg-white/50'}`} />
          ))}
        </div>
      )}
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
            <Button size="sm" variant="outline" onClick={() => goTo((imgIdx - 1 + images.length) % images.length)} className="h-8 w-8 p-0">
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsPlaying(!isPlaying)} className="h-8 w-8 p-0">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={() => goTo((imgIdx + 1) % images.length)} className="h-8 w-8 p-0">
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="relative w-full h-[420px] rounded-lg overflow-hidden shadow-lg border-2 border-slate-200 bg-slate-800">
        {isCenter ? (
          <>
            <BgLayers />
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-7 w-80">
                {config.branding.showLogo && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color }}>
                      <span className="text-white font-bold text-sm">P</span>
                    </div>
                    <span className="font-bold text-gray-800">{config.branding.logoText}</span>
                  </div>
                )}
                <h2 className="text-lg font-bold text-gray-800 mb-0.5">{config.text.title}</h2>
                <p className="text-xs text-gray-500 mb-4">{config.text.subtitle}</p>
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
            <div className="w-1/2 bg-white flex items-center justify-center p-8">
              <div className="w-full">
                <h2 className="text-lg font-bold text-gray-800 mb-0.5">{config.text.title}</h2>
                <p className="text-xs text-gray-500 mb-4">{config.text.subtitle}</p>
                <MiniForm cfg={config} isOverview={false} />
                {config.options?.showRegister && config.button.registerText && (
                  <div className="mt-2 h-7 rounded border-2 flex items-center justify-center text-xs font-semibold"
                       style={{ borderColor: color, color }}>{config.button.registerText}</div>
                )}
                {config.options?.showAffiliateLink && (
                  <p className="mt-3 text-center text-xs font-medium" style={{ color }}>Become an Affiliate Partner →</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Toggle ───────────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, label }) => (
  <div className="flex items-center justify-between py-2.5">
    <span className="text-sm text-gray-600">{label}</span>
    <button onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

// ─── Image Slot — URL input + upload button + thumbnail + remove ──────────────
// Mirrors HeroBanner's upload zone exactly (dashed border, progress, Firebase Storage)
const ImageSlot = ({ index, url, onUrlChange, onRemove, storage, screenKey }) => {
  const [uploading, setUploading]   = useState(false);
  const [progress, setProgress]     = useState(0);
  const fileRef = useRef(null);
  const { toast } = useToast();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!storage) {
      // Fallback: base64 preview (no Storage available)
      const reader = new FileReader();
      reader.onload = (ev) => onUrlChange(ev.target.result);
      reader.readAsDataURL(file);
      toast({ title: '⚠️ Firebase Storage not connected — using local preview', variant: 'destructive' });
      return;
    }

    try {
      setUploading(true);
      setProgress(0);
      const storageRef = ref(storage, `auth-backgrounds/${screenKey}_${index}_${Date.now()}_${file.name}`);
      const task = uploadBytesResumable(storageRef, file);

      await new Promise((resolve, reject) => {
        task.on(
          'state_changed',
          (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => {
            const downloadUrl = await getDownloadURL(task.snapshot.ref);
            onUrlChange(downloadUrl);
            resolve();
          }
        );
      });

      toast({ title: '✅ Image uploaded to Firebase Storage' });
    } catch (err) {
      console.error('Upload error:', err);
      toast({ title: '❌ Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-white space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">Image {index + 1}</span>
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* URL input */}
      <Input
        value={url || ''}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder="Paste image URL or upload below"
        className="bg-gray-50 text-xs h-8"
      />

      {/* Upload zone — identical style to HeroBanner */}
      <label className="block cursor-pointer">
        <div className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
          uploading ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50'
        }`}>
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading... {progress}%
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
              <Upload className="w-4 h-4" />
              Click to upload from computer
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={handleFileChange}
        />
      </label>

      {/* Thumbnail */}
      {url && !url.startsWith('data:') && (
        <div className="w-full h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
          <img src={url} alt={`Slide ${index + 1}`} className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      )}
      {url && url.startsWith('data:') && (
        <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          ⚠️ Local preview only — save to upload to Firebase Storage
        </p>
      )}
    </div>
  );
};

// ─── Image List Editor — uses ImageSlot for each entry ───────────────────────
const ImageListEditor = ({ images, onChange, storage, screenKey }) => {
  const addImage    = () => onChange([...images, '']);
  const removeImage = (i) => onChange(images.filter((_, idx) => idx !== i));
  const updateImage = (i, val) => {
    const updated = [...images];
    updated[i] = val;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {images.map((url, i) => (
        <ImageSlot
          key={i}
          index={i}
          url={url}
          onUrlChange={(val) => updateImage(i, val)}
          onRemove={() => removeImage(i)}
          storage={storage}
          screenKey={screenKey}
        />
      ))}
      <Button size="sm" variant="outline" onClick={addImage}
        className="w-full h-9 border-dashed gap-1.5">
        <Plus className="w-4 h-4" /> Add Image
      </Button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AuthManager() {
  const { db, storage } = useContext(AppContext);
  const { toast } = useToast();

  const [viewMode, setViewMode]         = useState('overview');
  const [activeScreen, setActiveScreen] = useState('userLogin');
  const [configs, setConfigs]           = useState(DEFAULT_CONFIG);
  const [saving, setSaving]             = useState(false);
  const [loading, setLoading]           = useState(true);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!db) return;
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'StoreConfigs', 'StoreConfig001'));
        if (snap.exists()) {
          const saved = snap.data()?.AuthCustomization;
          if (saved) {
            setConfigs((prev) => ({
              userLogin:      { ...prev.userLogin,      ...(saved.userLogin      || {}) },
              affiliateLogin: { ...prev.affiliateLogin, ...(saved.affiliateLogin || {}) },
              adminLogin:     { ...prev.adminLogin,     ...(saved.adminLogin     || {}) },
            }));
          }
        }
      } catch (e) {
        console.error('Load error:', e);
        toast({ title: 'Could not load config', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [db]);

  // ── Save ──────────────────────────────────────────────────────────────────
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

  // ── Mutation ──────────────────────────────────────────────────────────────
  const set = (path, value) => {
    setConfigs((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = [activeScreen, ...path.split('.')];
      let ref = updated;
      keys.slice(0, -1).forEach((k) => { if (!ref[k]) ref[k] = {}; ref = ref[k]; });
      ref[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const cfg = configs[activeScreen];

  if (loading || !configs) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading auth configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {viewMode === 'editor' && (
            <Button variant="outline" size="sm" onClick={() => setViewMode('overview')} className="gap-1.5">
              <ChevronLeft className="w-4 h-4" /> All Screens
            </Button>
          )}
          <h1 className="text-2xl md:text-3xl font-bold">
            {viewMode === 'overview'
              ? 'Auth Screen Manager'
              : `Editing: ${SCREENS.find(s => s.key === activeScreen)?.label}`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex border rounded-lg overflow-hidden">
            {['overview', 'editor'].map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 capitalize transition-colors ${
                  viewMode === m ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}>
                {m === 'overview' ? <LayoutDashboard className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                {m}
              </button>
            ))}
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-400 hover:bg-emerald-600 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
      {viewMode === 'overview' && (
        <div className="space-y-4">
          <p className="text-slate-500 text-sm">
            Previews show your actual Firestore config. Click <strong>Edit</strong> to customise each login screen.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {SCREENS.map(screen => (
              <OverviewCard key={screen.key} screen={screen} config={configs[screen.key]}
                onEdit={() => { setActiveScreen(screen.key); setViewMode('editor'); }} />
            ))}
          </div>
        </div>
      )}

      {/* ── EDITOR ───────────────────────────────────────────────────────── */}
      {viewMode === 'editor' && (
        <>
          {/* Screen selector */}
          <Card style={{ backgroundColor: '#f0f4f8' }}>
            <CardHeader><CardTitle className="text-lg">Select Screen</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SCREENS.map(screen => {
                  const Icon = screen.icon;
                  return (
                    <Button key={screen.key}
                      variant={activeScreen === screen.key ? 'default' : 'outline'}
                      onClick={() => setActiveScreen(screen.key)}
                      className={`gap-2 justify-start ${activeScreen === screen.key ? 'bg-emerald-400 hover:bg-emerald-700' : ''}`}>
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

          {/* Full preview */}
          <Card style={{ backgroundColor: '#f0f4f8' }}>
            <CardContent className="pt-5">
              <FullPreview config={cfg} />
            </CardContent>
          </Card>

          {/* Two-column settings */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* LEFT — Content */}
            <div className="border rounded-xl p-5 bg-white space-y-5">
              <div className="text-sm font-semibold text-slate-700 pb-2 border-b">Content</div>

              {/* Layout */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Layout className="w-3.5 h-3.5 text-indigo-500" />Layout
                </Label>
                <div className="flex gap-3">
                  {['split', 'center'].map(opt => (
                    <button key={opt} onClick={() => set('layout', opt)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
                        cfg.layout === opt ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {opt === 'split' ? '⬛⬜ Split' : '⬜ Center'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background images */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
                  Background Images
                  <span className="text-xs text-slate-400 font-normal">(cycle with transition)</span>
                </Label>
                <p className="text-xs text-slate-500">
                  Upload from your computer or paste a URL. Saved to Firebase Storage.
                </p>
                <ImageListEditor
                  images={cfg.images || []}
                  onChange={(imgs) => set('images', imgs)}
                  storage={storage}
                  screenKey={activeScreen}
                />
              </div>

              {/* Text content */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Type className="w-3.5 h-3.5 text-violet-500" />Text
                </Label>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Login Title</Label>
                  <Input value={cfg.text.title} onChange={e => set('text.title', e.target.value)} className="bg-gray-50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Login Subtitle</Label>
                  <Textarea value={cfg.text.subtitle} onChange={e => set('text.subtitle', e.target.value)}
                    rows={2} className="bg-gray-50 resize-none" />
                </div>
                {activeScreen === 'userLogin' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Register Title</Label>
                      <Input value={cfg.text.registerTitle || ''} onChange={e => set('text.registerTitle', e.target.value)} className="bg-gray-50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Register Subtitle</Label>
                      <Textarea value={cfg.text.registerSubtitle || ''} onChange={e => set('text.registerSubtitle', e.target.value)}
                        rows={2} className="bg-gray-50 resize-none" />
                    </div>
                  </>
                )}
                {activeScreen === 'affiliateLogin' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Step 2 Title (Bank Details)</Label>
                      <Input value={cfg.text.step2Title || ''} onChange={e => set('text.step2Title', e.target.value)} className="bg-gray-50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Step 2 Subtitle</Label>
                      <Textarea value={cfg.text.step2Subtitle || ''} onChange={e => set('text.step2Subtitle', e.target.value)}
                        rows={2} className="bg-gray-50 resize-none" />
                    </div>
                  </>
                )}
              </div>

              {/* Branding */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Layers className="w-3.5 h-3.5 text-amber-500" />Branding
                </Label>
                <Toggle checked={cfg.branding.showLogo} onChange={v => set('branding.showLogo', v)} label="Show Logo / Brand Name" />
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Brand Name</Label>
                  <Input value={cfg.branding.logoText} onChange={e => set('branding.logoText', e.target.value)} className="bg-gray-50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Logo Image URL <span className="text-slate-400">(optional)</span></Label>
                  <Input value={cfg.branding.logoUrl} onChange={e => set('branding.logoUrl', e.target.value)}
                    placeholder="https://..." className="bg-gray-50" />
                </div>
              </div>
            </div>

            {/* RIGHT — Buttons + Options */}
            <div className="border rounded-xl p-5 bg-white space-y-5">
              <div className="text-sm font-semibold text-slate-700 pb-2 border-b">Buttons</div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Palette className="w-3.5 h-3.5 text-green-500" />Primary Color
                </Label>
                <div className="flex gap-2">
                  <input type="color" value={cfg.button.color} onChange={e => set('button.color', e.target.value)}
                    className="h-9 w-14 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                  <Input value={cfg.button.color} onChange={e => set('button.color', e.target.value)}
                    className="flex-1 bg-gray-50 font-mono" />
                </div>
              </div>

              <div className="border rounded-lg p-3 bg-slate-50 space-y-3">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  {activeScreen === 'affiliateLogin' ? 'Submit Button' : 'Login Button'}
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Button Text</Label>
                  <Input value={cfg.button.loginText} onChange={e => set('button.loginText', e.target.value)} />
                </div>
                <div className="h-9 rounded-lg flex items-center justify-center text-sm font-semibold text-white"
                     style={{ background: cfg.button.color }}>{cfg.button.loginText}</div>
              </div>

              {activeScreen === 'userLogin' && (
                <div className="border rounded-lg p-3 bg-slate-50 space-y-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Register Button</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Button Text</Label>
                    <Input value={cfg.button.registerText || 'Create Account'}
                      onChange={e => set('button.registerText', e.target.value)} />
                  </div>
                  <div className="h-9 rounded-lg border-2 flex items-center justify-center text-sm font-semibold"
                       style={{ borderColor: cfg.button.color, color: cfg.button.color }}>
                    {cfg.button.registerText || 'Create Account'}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-sm font-medium mb-2">
                  <ToggleRight className="w-3.5 h-3.5 text-teal-500" />Options
                </Label>
                <div className="divide-y divide-gray-100">
                  {Object.entries(cfg.options).map(([key, val]) => (
                    <Toggle key={key} checked={!!val} onChange={v => set(`options.${key}`, v)}
                      label={OPTION_LABELS[key] || key} />
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-600 mb-1">📍 Firestore Location</p>
                <code className="text-xs text-blue-800 font-mono break-all">
                  StoreConfigs/StoreConfig001/AuthCustomization/{activeScreen}
                </code>
                <p className="text-xs text-blue-500 mt-2">Changes apply on next page refresh.</p>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}