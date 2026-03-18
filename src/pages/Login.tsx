import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import AppContext from "../context/AppContext";
import { useToast } from "@/hooks/use-toast";
import UsefireFunctionsHook from "../utility/usefirebaseFuncHook";

// ── Default admin login config (mirrors AuthManager defaults) ─────────────────
const DEFAULT_ADMIN_CONFIG = {
  layout: 'center',
  background: { type: 'image', imageUrl: '/bg3.avif', gradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' },
  branding:   { logoUrl: '', logoText: '🌿 PlantFresh Admin', showLogo: true },
  text:       { title: 'Admin Login', subtitle: 'Enter your credentials to access the admin panel' },
  button:     { text: 'Sign In', color: '#16a34a' },
  options:    { showForgotPassword: false },
};

function buildBgStyle(bg: { type: string; imageUrl?: string; gradient?: string }) {
  if (bg.type === 'image' && bg.imageUrl) {
    return { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
  return { background: bg.gradient || 'linear-gradient(135deg, #1e293b, #0f172a)' };
}

export default function Login() {
  const auth = getAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { globalState, setGlobalState, db } = useContext(AppContext);
  const { getStoreConfig } = UsefireFunctionsHook();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Load admin login config from Firestore ────────────────────────────────
  const [config, setConfig] = useState(DEFAULT_ADMIN_CONFIG);

  useEffect(() => {
    if (!db) return;
    const loadConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'StoreConfigs', 'StoreConfig001'));
        if (snap.exists()) {
          const saved = snap.data()?.AuthCustomization?.adminLogin;
          if (saved) {
            setConfig(prev => ({ ...prev, ...saved }));
          }
        }
      } catch (err) {
        // Silent — defaults will be used
        console.warn('Could not load admin login config, using defaults.');
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
    setLoading(true);
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        getConfigRecordFromCollection("StoreConfig001");
        getUserRecordFromCollection(userCredential.user);
      })
      .catch(() => {
        toast({ title: "Login failed", description: "Please ensure your credentials are correct.", variant: "destructive" });
        setLoading(false);
      });
  };

  const getUserRecordFromCollection = async (user: Record<string, any>) => {
    try {
      const q = query(collection(db, "Users"), where("IsAdmin", "==", true));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        setLoading(false);
        toast({ title: "Access denied", description: "User does not have admin privileges.", variant: "destructive" });
        return;
      }
      let isAdmin = false;
      querySnapshot.forEach((doc) => {
        if (user.email === doc.data().UserID) isAdmin = true;
      });
      if (!isAdmin) {
        setLoading(false);
        toast({ title: "Access denied", description: "You do not have admin privileges.", variant: "destructive" });
        return;
      }
      localStorage.setItem("IsAuthenticated", "true");
      localStorage.setItem("AuthenticatedUser", JSON.stringify(user.providerData[0]));
      setGlobalState({ ...globalState, AuthenticatedUser: user });
      navigate("/");
      toast({ title: "Login successful", description: "Welcome to the PlantFresh Admin Panel!" });
      setLoading(false);
    } catch (error) {
      toast({ title: "Error", description: "Unable to verify admin credentials.", variant: "destructive" });
      setLoading(false);
    }
  };

  const getConfigRecordFromCollection = async (configId: string) => {
    try {
      const config = await getStoreConfig(configId);
      setGlobalState({ ...globalState, StoreConfig: config });
      localStorage.setItem("StoreConfig", JSON.stringify(config));
    } catch (error) {
      toast({ title: "Config fetch failed", description: "Please check your network connection.", variant: "destructive" });
      setLoading(false);
    }
  };

  const bgStyle = buildBgStyle(config.background);

  return (
    <div className="min-h-screen flex items-center justify-center relative" style={bgStyle}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      <Card className="relative z-10 w-full max-w-md backdrop-blur-sm bg-white/95 shadow-2xl border-0 rounded-2xl overflow-hidden">
        <CardHeader className="space-y-1 pb-4">
          {config.branding.showLogo && (
            <div className="flex items-center gap-2 mb-4">
              {config.branding.logoUrl
                ? <img src={config.branding.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded-xl" />
                : null
              }
              <div className="font-bold text-2xl" style={{ color: config.button.color }}>
                {config.branding.logoText}
              </div>
            </div>
          )}
          <CardTitle className="text-2xl font-bold text-gray-900">{config.text.title}</CardTitle>
          <CardDescription className="text-gray-500">{config.text.subtitle}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Your email address"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Your secure password"
                  value={password} onChange={e => setPassword(e.target.value)} required className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 font-semibold text-base rounded-xl" disabled={loading}
              style={{ background: config.button.color, border: 'none' }}>
              {loading ? "Processing..." : config.button.text}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}