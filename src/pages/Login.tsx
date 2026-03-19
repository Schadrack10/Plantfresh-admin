import { useState, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import AppContext from "../context/AppContext";
import { useToast } from "@/hooks/use-toast";
import UsefireFunctionsHook from "../utility/usefirebaseFuncHook";

// ── Inlined style helpers — no defaults, no external hook needed ──────────────
function buildButtonStyle(button: any) {
  const bg = button?.gradient && button?.colorTo
    ? `linear-gradient(135deg, ${button.color}, ${button.colorTo})`
    : button?.color || '#16a34a';
  return { background: bg, color: button?.textColor || '#ffffff', border: 'none' };
}

function buildCardStyle(style: any) {
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

// ── Animated background ───────────────────────────────────────────────────────
const AnimatedBg: React.FC<{ config: any }> = ({ config }) => {
  const images: string[] = config.images?.filter(Boolean) || [];
  const transition = config.transition || 'fade';
  const overlayOpacity = (config.style?.overlayOpacity ?? 50) / 100;
  const imageBlur = config.style?.imageBlur ?? 0;
  const [idx, setIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (images.length <= 1) return;
    timerRef.current = setInterval(() => {
      setPrevIdx(idx);
      setIdx(p => (p + 1) % images.length);
      setTimeout(() => setPrevIdx(null), 700);
    }, 4500);
    return () => clearInterval(timerRef.current);
  }, [images.length, idx]);

  const bgFor = (url: string) => url
    ? { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: imageBlur > 0 ? `blur(${imageBlur}px)` : undefined }
    : { background: config.background?.gradient || '#1e293b' };

  const transClass = (active: boolean) => {
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

  return (
    <>
      {prevIdx !== null && images[prevIdx] && (
        <div className={transClass(false)} style={bgFor(images[prevIdx])} />
      )}
      <div className={transClass(true)} style={bgFor(images[idx] || '')} />
      <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlayOpacity})` }} />
    </>
  );
};

// ── Main Login Component ──────────────────────────────────────────────────────
export default function Login() {
  const auth = getAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { globalState, setGlobalState, db } = useContext(AppContext);
  const { getStoreConfig } = UsefireFunctionsHook();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Null until Firestore responds — no defaults, no flash
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    if (!db) return;
    const loadConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'StoreConfigs', 'StoreConfig001'));
        if (snap.exists()) {
          const saved = snap.data()?.AuthCustomization?.adminLogin;
          if (saved) setConfig(saved);
        }
      } catch (err) {
        console.warn('Could not load admin login config.');
      }
    };
    loadConfig();
  }, [db]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Login failed", description: "Please enter valid credentials", variant: "destructive" });
      return;
    }
    setAuthLoading(true);
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        getConfigRecordFromCollection("StoreConfig001");
        getUserRecordFromCollection(userCredential.user);
      })
      .catch(() => {
        toast({ title: "Login failed", description: "Please ensure your credentials are correct.", variant: "destructive" });
        setAuthLoading(false);
      });
  };

  const getUserRecordFromCollection = async (user: Record<string, any>) => {
    try {
      const q = query(collection(db, "Users"), where("IsAdmin", "==", true));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        setAuthLoading(false);
        toast({ title: "Access denied", description: "User does not have admin privileges.", variant: "destructive" });
        return;
      }
      let isAdmin = false;
      querySnapshot.forEach((doc) => { if (user.email === doc.data().UserID) isAdmin = true; });
      if (!isAdmin) {
        setAuthLoading(false);
        toast({ title: "Access denied", description: "You do not have admin privileges.", variant: "destructive" });
        return;
      }
      localStorage.setItem("IsAuthenticated", "true");
      localStorage.setItem("AuthenticatedUser", JSON.stringify(user.providerData[0]));
      setGlobalState({ ...globalState, AuthenticatedUser: user });
      navigate("/");
      toast({ title: "Login successful", description: "Welcome to the PlantFresh Admin Panel!" });
      setAuthLoading(false);
    } catch (error) {
      toast({ title: "Error", description: "Unable to verify admin credentials.", variant: "destructive" });
      setAuthLoading(false);
    }
  };

  const getConfigRecordFromCollection = async (configId: string) => {
    try {
      const cfg = await getStoreConfig(configId);
      setGlobalState({ ...globalState, StoreConfig: cfg });
      localStorage.setItem("StoreConfig", JSON.stringify(cfg));
    } catch (error) {
      toast({ title: "Config fetch failed", description: "Please check your network connection.", variant: "destructive" });
      setAuthLoading(false);
    }
  };

  // Nothing renders until Firestore config is loaded — zero defaults, zero flash
  if (!config) return null;

  const btnStyle = buildButtonStyle(config.button);
  const cardStyle = buildCardStyle(config.style);
  const cardRadius = config.style?.cardRadius || 'rounded-2xl';
  const btnRadius = config.button?.radius || 'rounded-xl';
  const btnShadow = config.button?.shadow || 'shadow-lg';
  const inputRadius = config.style?.inputRadius || 'rounded-xl';
  const inputBorderColor = config.style?.inputBorderColor || '#e5e7eb';
  const titleColor = config.text?.titleColor || '#111827';
  const subtitleColor = config.text?.subtitleColor || '#6b7280';
  const titleSize = config.text?.titleSize || 'text-2xl';
  const titleWeight = config.text?.titleWeight || 'font-bold';

  const inputCls = `w-full px-4 py-3 border focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition bg-white text-sm placeholder:text-gray-400 ${inputRadius}`;
  const inputStyleObj = { borderColor: inputBorderColor };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBg config={config} />

      <div className={`relative z-10 w-full max-w-md p-6 sm:p-8 ${cardRadius}`} style={cardStyle}>
        {config.branding?.showLogo && (
          <div className="flex items-center gap-2 mb-6">
            {config.branding.logoUrl && (
              <img src={config.branding.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded-xl" />
            )}
            <div className="text-2xl font-bold" style={{ color: config.button?.color }}>
              {config.branding.logoText}
            </div>
          </div>
        )}

        <h2 className={`${titleSize} ${titleWeight} mb-1`} style={{ color: titleColor }}>
          {config.text?.title}
        </h2>
        <p className="text-sm mb-6" style={{ color: subtitleColor }}>
          {config.text?.subtitle}
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
            <input id="email" type="email" placeholder="Your email address"
              value={email} onChange={e => setEmail(e.target.value)}
              required className={inputCls} style={inputStyleObj} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
            <div className="relative">
              <input id="password" type={showPassword ? "text" : "password"}
                placeholder="Your secure password"
                value={password} onChange={e => setPassword(e.target.value)}
                required className={`${inputCls} pr-12`} style={inputStyleObj} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={authLoading}
            className={`w-full h-12 font-semibold text-base hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center ${btnRadius} ${btnShadow}`}
            style={btnStyle}>
            {authLoading ? "Processing..." : config.button?.loginText}
          </button>
        </form>
      </div>
    </div>
  );
}