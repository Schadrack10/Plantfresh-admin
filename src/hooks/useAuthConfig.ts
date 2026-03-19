// hooks/useAuthConfig.ts
// User-facing site only — do NOT copy to admin site.
// Admin site (Login.tsx) has its helpers inlined and loads config directly.

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── Defaults (user site only) ─────────────────────────────────────────────────
const DEFAULTS = {
  userLogin: {
    layout: 'split',
    transition: 'fade',
    images: [
      'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1200',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200',
    ],
    background: { type: 'image', imageUrl: '', gradient: 'linear-gradient(135deg,#16a34a,#0d9488)' },
    branding:   { logoUrl: '', logoText: 'PlantFresh', showLogo: true },
    text:       { title: 'Welcome Back!', subtitle: 'Sign in to continue your eco journey', registerTitle: 'Join Our Green Family', registerSubtitle: 'Create your account today', titleColor: '#111827', subtitleColor: '#6b7280', titleSize: 'text-3xl', titleWeight: 'font-bold' },
    button:     { loginText: 'Sign In', registerText: 'Create Account', color: '#16a34a', colorTo: '', gradient: false, radius: 'rounded-xl', textColor: '#ffffff', shadow: 'shadow-lg' },
    options:    { showRegister: true, showGoogle: true, showAffiliateLink: true },
    style:      { overlayOpacity: 30, imageBlur: 0, cardBlur: 4, cardBg: '#ffffff', cardBgOpacity: 95, cardBorder: 'transparent', cardRadius: 'rounded-2xl', inputBorderColor: '#e5e7eb', inputRadius: 'rounded-xl', leftPanelGlass: false },
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
    text:       { title: 'Earn While You Clean Up The Planet', subtitle: 'Join our affiliate program and start earning today', step2Title: 'Bank Details', step2Subtitle: 'Enter your payment information to receive commissions', titleColor: '#111827', subtitleColor: '#6b7280', titleSize: 'text-3xl', titleWeight: 'font-bold' },
    button:     { loginText: 'Create Affiliate Account', registerText: '', color: '#16a34a', colorTo: '', gradient: false, radius: 'rounded-xl', textColor: '#ffffff', shadow: 'shadow-lg' },
    options:    { showBenefits: true, showBankStep: true },
    style:      { overlayOpacity: 30, imageBlur: 0, cardBlur: 0, cardBg: '#ffffff', cardBgOpacity: 100, cardBorder: 'transparent', cardRadius: 'rounded-3xl', inputBorderColor: '#e5e7eb', inputRadius: 'rounded-xl', leftPanelGlass: false },
  },
  adminLogin: {
    layout: 'center',
    transition: 'zoom',
    images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200'],
    background: { type: 'image', imageUrl: '/bg3.avif', gradient: 'linear-gradient(135deg,#1e293b,#0f172a)' },
    branding:   { logoUrl: '', logoText: '🌿 PlantFresh Admin', showLogo: true },
    text:       { title: 'Admin Login', subtitle: 'Enter your credentials to access the admin panel', titleColor: '#111827', subtitleColor: '#6b7280', titleSize: 'text-2xl', titleWeight: 'font-bold' },
    button:     { loginText: 'Sign In', registerText: '', color: '#16a34a', colorTo: '', gradient: false, radius: 'rounded-xl', textColor: '#ffffff', shadow: 'shadow-lg' },
    options:    { showForgotPassword: false },
    style:      { overlayOpacity: 50, imageBlur: 0, cardBlur: 8, cardBg: '#ffffff', cardBgOpacity: 95, cardBorder: 'transparent', cardRadius: 'rounded-2xl', inputBorderColor: '#e5e7eb', inputRadius: 'rounded-xl', leftPanelGlass: false },
  },
};

// In-memory cache — avoids repeated Firestore reads in the same session
let _cache: Record<string, any> | null = null;

export function useAuthConfig(screenKey: 'userLogin' | 'affiliateLogin' | 'adminLogin') {
  // Null until Firestore responds — nothing renders with defaults
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (_cache) {
          const saved = _cache[screenKey];
          setConfig(deepMerge(DEFAULTS[screenKey], saved || {}));
          setLoading(false);
          return;
        }

        const snap = await getDoc(doc(db, 'StoreConfigs', 'StoreConfig001'));
        if (snap.exists()) {
          const authCustomization = snap.data()?.AuthCustomization || {};
          _cache = authCustomization;
          const saved = authCustomization[screenKey];
          setConfig(deepMerge(DEFAULTS[screenKey], saved || {}));
        } else {
          _cache = {};
          setConfig(DEFAULTS[screenKey]);
        }
      } catch (err) {
        console.warn('useAuthConfig: could not load config, using defaults.', err);
        setConfig(DEFAULTS[screenKey]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [screenKey]);

  return { config, loading };
}

// Deep merge — saved values override defaults, nested objects merged not replaced
function deepMerge(base: any, override: any): any {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (
      override[key] !== null &&
      typeof override[key] === 'object' &&
      !Array.isArray(override[key]) &&
      typeof base[key] === 'object' &&
      base[key] !== null &&
      !Array.isArray(base[key])
    ) {
      result[key] = deepMerge(base[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

// ── Exported style helpers (used by Auth.tsx and AffiliateAuth.tsx) ───────────
export function buildBgStyle(bg: { type: string; imageUrl?: string; gradient?: string }) {
  if (bg?.type === 'image' && bg.imageUrl)
    return { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  return { background: bg?.gradient || 'linear-gradient(135deg,#16a34a,#0d9488)' };
}

export function buildButtonStyle(button: any) {
  const bg = button?.gradient && button?.colorTo
    ? `linear-gradient(135deg, ${button.color}, ${button.colorTo})`
    : button?.color || '#16a34a';
  return { background: bg, color: button?.textColor || '#ffffff', border: 'none' };
}

export function buildCardStyle(style: any) {
  const opacity = (style?.cardBgOpacity ?? 100) / 100;
  const hex = style?.cardBg || '#ffffff';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    backgroundColor: `rgba(${r},${g},${b},${opacity})`,
    borderColor: style?.cardBorder && style.cardBorder !== 'transparent' ? style.cardBorder : 'transparent',
    borderWidth: style?.cardBorder && style.cardBorder !== 'transparent' ? '1px' : '0',
    borderStyle: 'solid' as const,
    backdropFilter: style?.cardBlur ? `blur(${style.cardBlur}px)` : undefined,
    WebkitBackdropFilter: style?.cardBlur ? `blur(${style.cardBlur}px)` : undefined,
  };
}