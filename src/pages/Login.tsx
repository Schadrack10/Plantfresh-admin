import { useState, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import {
  getAuth, signInWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup,
} from "firebase/auth";
import AppContext from "../context/AppContext";
import { useToast } from "@/hooks/use-toast";

// ── Role normaliser (same as AppContextProvider) ──────────────────────────────
const normaliseRole = (data: any): string => {
  if (data?.IsSuperAdmin === true) return "SuperAdmin";
  if (data?.Role === "SuperAdmin")  return "SuperAdmin";
  if (data?.IsAdmin === true)       return "Admin";
  if (data?.Role === "Admin")       return "Admin";
  return "user";
};

// ── Style helpers ─────────────────────────────────────────────────────────────
function buildButtonStyle(button: any) {
  const bg = button?.gradient && button?.colorTo
    ? `linear-gradient(135deg, ${button.color}, ${button.colorTo})`
    : button?.color || "#4f46e5";
  return { background: bg, color: button?.textColor || "#ffffff", border: "none" };
}

function buildCardStyle(style: any) {
  const opacity = (style?.cardBgOpacity ?? 100) / 100;
  const hex = style?.cardBg || "#ffffff";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    backgroundColor: `rgba(${r},${g},${b},${opacity})`,
    borderColor:   style?.cardBorder && style.cardBorder !== "transparent" ? style.cardBorder : "transparent",
    borderWidth:   style?.cardBorder && style.cardBorder !== "transparent" ? "1px" : "0",
    borderStyle:   "solid" as const,
    backdropFilter:        style?.cardBlur ? `blur(${style.cardBlur}px)` : undefined,
    WebkitBackdropFilter:  style?.cardBlur ? `blur(${style.cardBlur}px)` : undefined,
  };
}

// ── Animated background ───────────────────────────────────────────────────────
const AnimatedBg: React.FC<{ config: any }> = ({ config }) => {
  const images: string[] = config.images?.filter(Boolean) || [];
  const overlayOpacity = (config.style?.overlayOpacity ?? 50) / 100;
  const imageBlur = config.style?.imageBlur ?? 0;
  const [idx, setIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (images.length <= 1) return;
    timerRef.current = setInterval(() => {
      setPrevIdx(idx);
      setIdx((p) => (p + 1) % images.length);
      setTimeout(() => setPrevIdx(null), 700);
    }, 4500);
    return () => clearInterval(timerRef.current);
  }, [images.length, idx]);

  const bgFor = (url: string) => url
    ? { backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center", filter: imageBlur > 0 ? `blur(${imageBlur}px)` : undefined }
    : { background: config.background?.gradient || "#1e293b" };

  const transClass = (active: boolean) => {
    const base = "absolute inset-0 transition-all duration-700 ease-in-out";
    return active ? `${base} opacity-100` : `${base} opacity-0`;
  };

  return (
    <>
      {prevIdx !== null && images[prevIdx] && (
        <div className={transClass(false)} style={bgFor(images[prevIdx])} />
      )}
      <div className={transClass(true)} style={bgFor(images[idx] || "")} />
      <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlayOpacity})` }} />
    </>
  );
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
    <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

// ── Default config (Sitecore Admin branding) ──────────────────────────────────
const DEFAULT_CONFIG = {
  images:     [],
  transition: "fade",
  background: { gradient: "linear-gradient(135deg,#1e1b4b,#312e81)" },
  branding:   { showLogo: true, logoText: "Sitecore Admin" },
  text: {
    title:          "Admin Login",
    subtitle:       "Sign in to your account",
    titleColor:     "#111827",
    subtitleColor:  "#6b7280",
    titleSize:      "text-2xl",
    titleWeight:    "font-bold",
  },
  button: {
    loginText:  "Sign In",
    color:      "#4f46e5",
    textColor:  "#ffffff",
    radius:     "rounded-xl",
    shadow:     "shadow-lg",
  },
  style: {
    overlayOpacity:   55,
    cardBlur:         8,
    cardBg:           "#ffffff",
    cardBgOpacity:    95,
    cardBorder:       "transparent",
    cardRadius:       "rounded-2xl",
    inputBorderColor: "#e5e7eb",
    inputRadius:      "rounded-xl",
  },
};

export default function Login() {
  const auth = getAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setGlobalState, db } = useContext(AppContext);

  const [email, setEmail]                   = useState("");
  const [password, setPassword]             = useState("");
  const [authLoading, setAuthLoading]       = useState(false);
  const [googleLoading, setGoogleLoading]   = useState(false);
  const [showPassword, setShowPassword]     = useState(false);
  const [config, setConfig]                 = useState<any>(DEFAULT_CONFIG);

  // ── Load login UI config ──────────────────────────────────────────────────
  useEffect(() => {
    if (!db) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "StoreConfigs", "StoreConfig001"));
        if (snap.exists()) {
          const saved = snap.data()?.AuthCustomization?.adminLogin;
          const platformName =
            snap.data()?.GeneralSettings?.platformName ||
            snap.data()?.GeneralSettings?.storeName    ||
            "Sitecore Admin";
          if (saved) {
            setConfig({
              ...saved,
              branding: {
                ...saved.branding,
                // Override logo text with platform name — never a store name
                logoText: saved.branding?.logoText || platformName,
              },
            });
          } else {
            setConfig({
              ...DEFAULT_CONFIG,
              branding: { ...DEFAULT_CONFIG.branding, logoText: platformName },
            });
          }
        }
      } catch {
        // Keep default config on error
      }
    };
    load();
  }, [db]);

  // ── User lookup + session creation ────────────────────────────────────────
  const getUserRecordFromCollection = async (user: any) => {
    try {
      let snapshot = await getDocs(
        query(collection(db, "Users"), where("Email", "==", user.email))
      );
      if (snapshot.empty) {
        snapshot = await getDocs(
          query(collection(db, "Users"), where("uid", "==", user.uid))
        );
      }
      if (snapshot.empty) {
        snapshot = await getDocs(
          query(collection(db, "Users"), where("UserID", "==", user.uid))
        );
      }

      if (snapshot.empty) {
        toast({ title: "Access denied", description: "No admin record found for this account.", variant: "destructive" });
        setAuthLoading(false);
        setGoogleLoading(false);
        return;
      }

      const userDoc  = snapshot.docs[0];
      const userData = userDoc.data() as any;

      // ── Normalise role immediately on login ───────────────────────────
      // This means isSuperAdmin is correct from the very first render —
      // no waiting for the onSnapshot listener to fire.
      const role     = normaliseRole(userData);
      const isAdmin  = role === "Admin" || role === "SuperAdmin";

      if (!isAdmin) {
        toast({ title: "Access denied", description: "You do not have admin privileges.", variant: "destructive" });
        setAuthLoading(false);
        setGoogleLoading(false);
        return;
      }

      const authUser = {
        uid:          user.uid,
        email:        user.email,
        // Include BOTH the string role AND the booleans so everything works
        // regardless of which field each component reads
        role,
        isAdmin:      isAdmin,
        isSuperAdmin: role === "SuperAdmin",
        IsSuperAdmin: userData.IsSuperAdmin || false,
        IsAdmin:      userData.IsAdmin      || false,
        tenantId:     userData.TenantId     || null,
        TenantId:     userData.TenantId     || null,
        tenantName:   userData.TenantName   || null,
        userId:       userDoc.id,
        name:         userData.Name         || user.email,
      };

      localStorage.setItem("IsAuthenticated",   "true");
      localStorage.setItem("AuthenticatedUser", JSON.stringify(authUser));
      setGlobalState((prev: any) => ({ ...prev, AuthenticatedUser: authUser }));

      navigate("/");
      toast({
        title:       "Welcome back!",
        description: role === "SuperAdmin" ? "Signed in as Super Admin" : "Signed in as Admin",
      });
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Unable to verify credentials.", variant: "destructive" });
    } finally {
      setAuthLoading(false);
      setGoogleLoading(false);
    }
  };

  // ── Email / password login ─────────────────────────────────────────────────
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Login failed", description: "Enter email and password.", variant: "destructive" });
      return;
    }
    setAuthLoading(true);
    signInWithEmailAndPassword(auth, email, password)
      .then(async (cred) => {
        if (!cred.user.emailVerified) {
          toast({ title: "Email not verified", description: "Please click the verification link in your email.", variant: "destructive" });
          setAuthLoading(false);
          return;
        }
        await getUserRecordFromCollection(cred.user);
      })
      .catch(() => {
        toast({ title: "Login failed", description: "Incorrect email or password.", variant: "destructive" });
        setAuthLoading(false);
      });
  };

  // ── Google login ──────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await getUserRecordFromCollection(result.user);
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        toast({ title: "Google sign-in failed", description: err?.message, variant: "destructive" });
      }
      setGoogleLoading(false);
    }
  };

  const btnStyle         = buildButtonStyle(config.button);
  const cardStyle        = buildCardStyle(config.style);
  const cardRadius       = config.style?.cardRadius       || "rounded-2xl";
  const btnRadius        = config.button?.radius          || "rounded-xl";
  const btnShadow        = config.button?.shadow          || "shadow-lg";
  const inputRadius      = config.style?.inputRadius      || "rounded-xl";
  const inputBorderColor = config.style?.inputBorderColor || "#e5e7eb";
  const titleColor       = config.text?.titleColor        || "#111827";
  const subtitleColor    = config.text?.subtitleColor     || "#6b7280";
  const titleSize        = config.text?.titleSize         || "text-2xl";
  const titleWeight      = config.text?.titleWeight       || "font-bold";
  const brandColor       = config.button?.color           || "#4f46e5";

  const inputCls = `w-full px-4 py-3 border focus:ring-2 focus:border-transparent outline-none transition bg-white text-sm placeholder:text-gray-400 ${inputRadius}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBg config={config} />

      <div className={`relative z-10 w-full max-w-md p-6 sm:p-8 ${cardRadius}`} style={cardStyle}>
        {/* Branding */}
        {config.branding?.showLogo && (
          <div className="flex items-center gap-2 mb-6">
            {config.branding?.logoUrl && (
              <img src={config.branding.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded-xl" />
            )}
            <div className="text-xl font-bold" style={{ color: brandColor }}>
              {config.branding?.logoText}
            </div>
          </div>
        )}

        <h2 className={`${titleSize} ${titleWeight} mb-1`} style={{ color: titleColor }}>
          {config.text?.title}
        </h2>
        <p className="text-sm mb-6" style={{ color: subtitleColor }}>
          {config.text?.subtitle}
        </p>

        {/* Google */}
        <button type="button" onClick={handleGoogleLogin} disabled={googleLoading || authLoading}
          className={`w-full h-11 font-medium text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-all flex items-center justify-center gap-3 mb-4 ${btnRadius} shadow-sm`}>
          <GoogleIcon />
          {googleLoading ? "Signing in…" : "Continue with Google"}
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
            <input id="email" type="email" placeholder="Your email address" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className={inputCls} style={{ borderColor: inputBorderColor }} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
            <div className="relative">
              <input id="password" type={showPassword ? "text" : "password"} placeholder="Your password"
                value={password} onChange={(e) => setPassword(e.target.value)} required
                className={`${inputCls} pr-12`} style={{ borderColor: inputBorderColor }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={authLoading || googleLoading}
            className={`w-full h-12 font-semibold text-base hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center ${btnRadius} ${btnShadow}`}
            style={btnStyle}>
            {authLoading ? "Signing in…" : config.button?.loginText || "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{" "}
          <a href="/signup" className="font-medium hover:underline" style={{ color: brandColor }}>
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}