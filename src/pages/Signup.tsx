import { useState, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  MailCheck,
  RefreshCw,
  CheckCircle2,
  ChevronLeft,
  ShieldCheck,
} from "lucide-react";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  reload,
} from "firebase/auth";
import AppContext from "../context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { tenantService } from "../services/firebase/tenantService";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Tenant {
  Id: string;
  Name: string;
  Domain?: string;
  LogoUrl?: string;
}

// ── Style helpers (same as Login) ─────────────────────────────────────────────
function buildButtonStyle(button: any) {
  const bg =
    button?.gradient && button?.colorTo
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
    borderColor:
      style?.cardBorder && style.cardBorder !== "transparent" ? style.cardBorder : "transparent",
    borderWidth:
      style?.cardBorder && style.cardBorder !== "transparent" ? "1px" : "0",
    borderStyle: "solid" as const,
    backdropFilter: style?.cardBlur ? `blur(${style.cardBlur}px)` : undefined,
    WebkitBackdropFilter: style?.cardBlur ? `blur(${style.cardBlur}px)` : undefined,
  };
}

// ── Animated background (identical to Login) ──────────────────────────────────
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

  const bgFor = (url: string) =>
    url
      ? {
          backgroundImage: `url(${url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: imageBlur > 0 ? `blur(${imageBlur}px)` : undefined,
        }
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

// ── Google Icon ───────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
    <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

// ── Step indicator ────────────────────────────────────────────────────────────
const Steps: React.FC<{ current: number; brandColor: string }> = ({ current, brandColor }) => (
  <div className="flex items-center gap-2 mb-6">
    {[1, 2, 3].map((n) => (
      <div key={n} className="flex items-center gap-2">
        <div
          className={`flex items-center justify-center rounded-full text-xs font-semibold transition-all w-6 h-6
            ${n > current ? "bg-gray-100 text-gray-400 border border-gray-200" : "text-white"}
          `}
          style={
            n < current
              ? { background: "#22c55e" }
              : n === current
              ? { background: brandColor }
              : {}
          }
        >
          {n < current ? "✓" : n}
        </div>
        {n < 3 && (
          <div
            className="h-px w-8 transition-all"
            style={{ background: n < current ? "#86efac" : "#e5e7eb" }}
          />
        )}
      </div>
    ))}
    <span className="ml-2 text-xs text-gray-400">Step {current} of 3</span>
  </div>
);

// ── Tenant card ───────────────────────────────────────────────────────────────
const TenantCard: React.FC<{
  tenant: Tenant;
  selected: boolean;
  onClick: () => void;
  brandColor: string;
}> = ({ tenant, selected, onClick, brandColor }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3"
    style={
      selected
        ? { borderColor: brandColor, backgroundColor: `${brandColor}10` }
        : { borderColor: "#e5e7eb", backgroundColor: "#fff" }
    }
  >
    {tenant.LogoUrl ? (
      <img
        src={tenant.LogoUrl}
        alt={tenant.Name}
        className="w-10 h-10 rounded-lg object-contain border border-gray-100"
      />
    ) : (
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 text-white"
        style={{ background: brandColor }}
      >
        {tenant.Name.charAt(0).toUpperCase()}
      </div>
    )}
    <div className="min-w-0">
      <p className="text-sm font-semibold text-gray-800 truncate">{tenant.Name}</p>
      {tenant.Domain && <p className="text-xs text-gray-400 truncate">{tenant.Domain}</p>}
    </div>
    {selected && (
      <CheckCircle2 className="w-5 h-5 ml-auto flex-shrink-0" style={{ color: brandColor }} />
    )}
  </button>
);

// ── Main Signup Component ─────────────────────────────────────────────────────
export default function Signup() {
  const auth = getAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setGlobalState, db } = useContext(AppContext);

  // ── Config (same as Login's Firestore config) ─────────────────────────────
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    if (!db) return;
    getDoc(doc(db, "StoreConfigs", "StoreConfig001"))
      .then((snap) => {
        if (snap.exists()) {
          const saved = snap.data()?.AuthCustomization?.adminLogin;
          if (saved) {
            setConfig(saved);
          } else {
            setConfig({
              images: [],
              background: { gradient: "linear-gradient(135deg,#1e1b4b,#312e81)" },
              branding: {
                showLogo: true,
                logoText: snap.data()?.GeneralSettings?.platformName || "Admin",
              },
              text: { titleColor: "#111827", subtitleColor: "#6b7280", titleSize: "text-2xl", titleWeight: "font-bold" },
              button: { color: "#4f46e5", textColor: "#ffffff", radius: "rounded-xl", shadow: "shadow-lg" },
              style: {
                overlayOpacity: 55, cardBlur: 8, cardBg: "#ffffff", cardBgOpacity: 95,
                cardBorder: "transparent", cardRadius: "rounded-2xl",
                inputBorderColor: "#e5e7eb", inputRadius: "rounded-xl",
              },
            });
          }
        }
      })
      .catch(() => {});
  }, [db]);

  // ── Form state ────────────────────────────────────────────────────────────
  const [step, setStep]               = useState(1);
  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resending, setResending]     = useState(false);
  const [verified, setVerified]       = useState(false); // tracks live polling result

  // ── Firebase user held across steps ──────────────────────────────────────
  // For email/password: we store credentials to re-sign-in at step 3
  // For Google: the user is already signed in
  const [firebaseUid, setFirebaseUid]       = useState<string>("");
  const [firebaseEmail, setFirebaseEmail]   = useState<string>("");
  const [isGoogleUser, setIsGoogleUser]     = useState(false);
  const pollingRef                          = useRef<any>(null);

  // ── Tenant state ──────────────────────────────────────────────────────────
  const [tenants, setTenants]               = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  // ── Load tenants when reaching step 3 ────────────────────────────────────
  useEffect(() => {
    if (step !== 3) return;
    setTenantsLoading(true);
    tenantService
      .getAllTenants()
      .then((all: Tenant[]) => setTenants(all))
      .catch(() =>
        toast({ title: "Could not load sites", description: "Try refreshing.", variant: "destructive" })
      )
      .finally(() => setTenantsLoading(false));
  }, [step]);

  // ── Poll Firebase every 3s on step 2 to auto-detect verification ──────────
  useEffect(() => {
    if (step !== 2 || isGoogleUser) return;

    pollingRef.current = setInterval(async () => {
      try {
        // Re-sign in silently to get a fresh token
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await reload(cred.user);
        if (cred.user.emailVerified) {
          setVerified(true);
          clearInterval(pollingRef.current);
          await signOut(auth); // sign out again; real login happens at step 3
        } else {
          await signOut(auth);
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => clearInterval(pollingRef.current);
  }, [step, isGoogleUser]);

  // ── Step 1: email/password account creation ───────────────────────────────
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter your full name.", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Weak password", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(credential.user);
      await signOut(auth);
      setFirebaseUid(credential.user.uid);
      setFirebaseEmail(credential.user.email!);
      setIsGoogleUser(false);
      setStep(2);
    } catch (err: any) {
      const msg =
        err.code === "auth/email-already-in-use"
          ? "An account with this email already exists."
          : err.code === "auth/invalid-email"
          ? "Please enter a valid email address."
          : err?.message || "Could not create account.";
      toast({ title: "Signup failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1: Google sign-up ────────────────────────────────────────────────
  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result   = await signInWithPopup(auth, provider);
      const user     = result.user;

      // Use display name from Google if no name typed yet
      const displayName = name.trim() || user.displayName || user.email!.split("@")[0];
      setName(displayName);
      setEmail(user.email!);
      setFirebaseUid(user.uid);
      setFirebaseEmail(user.email!);
      setIsGoogleUser(true);

      // Google accounts: email is always verified by Google, but we still
      // send a Firebase verification email per your requirement
      if (!user.emailVerified) {
        await sendEmailVerification(user);
        await signOut(auth);
        setStep(2);
      } else {
        // Already verified — skip the verification step, go to step 2 briefly
        // then auto-advance since verified=true
        setVerified(true);
        setStep(2);
      }
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        toast({ title: "Google sign-up failed", description: err?.message || "Try again.", variant: "destructive" });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Step 2: resend verification email ─────────────────────────────────────
  const handleResend = async () => {
    setResending(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(cred.user);
      await signOut(auth);
      toast({ title: "Email sent", description: "Check your inbox for the verification link." });
    } catch {
      toast({ title: "Failed to send", description: "Try again in a moment.", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  // ── Step 2 → 3: enforce verification ─────────────────────────────────────
  const handleContinueToStep3 = () => {
    if (!verified) {
      toast({
        title: "Email not verified",
        description: "Please click the verification link in your email first.",
        variant: "destructive",
      });
      return;
    }
    clearInterval(pollingRef.current);
    setStep(3);
  };

  // ── Step 3: write Firestore doc, sign in, navigate home ──────────────────
  const handleFinish = async () => {
    if (!selectedTenantId) {
      toast({ title: "Select a site", description: "Choose which site you will manage.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const selectedTenant = tenants.find((t) => t.Id === selectedTenantId);

      // Write user doc — new schema, no Role field
      await addDoc(collection(db, "Users"), {
        CreatedAt:   serverTimestamp(),
        Email:       firebaseEmail,
        IsAdmin:     true,
        IsSuperAdmin: false,
        Name:        name.trim(),
        TenantId:    selectedTenantId,
        TenantName:  selectedTenant?.Name || "",
        UserID:      firebaseUid,
      });

      // ── Auto-login after signup ───────────────────────────────────────────
      let signedInUser: any = null;

      if (isGoogleUser) {
        // Re-trigger Google sign-in to get a valid session
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        signedInUser = result.user;
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        signedInUser = cred.user;
      }

      // Set session
      const authUser = {
        uid:         firebaseUid,
        email:       firebaseEmail,
        isAdmin:     true,
        isSuperAdmin: false,
        tenantId:    selectedTenantId,
        tenantName:  selectedTenant?.Name || "",
        name:        name.trim(),
      };

      localStorage.setItem("IsAuthenticated", "true");
      localStorage.setItem("AuthenticatedUser", JSON.stringify(authUser));
      setGlobalState((prev: any) => ({ ...prev, AuthenticatedUser: authUser }));

      toast({ title: "Welcome!", description: `Account created for ${selectedTenant?.Name}.` });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not save your account.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!config) return null;

  // ── Derive styles from config (identical logic to Login) ──────────────────
  const btnStyle         = buildButtonStyle(config.button);
  const cardStyle        = buildCardStyle(config.style);
  const cardRadius       = config.style?.cardRadius       || "rounded-2xl";
  const btnRadius        = config.button?.radius          || "rounded-xl";
  const btnShadow        = config.button?.shadow          || "shadow-lg";
  const inputRadius      = config.style?.inputRadius      || "rounded-xl";
  const inputBorderColor = config.style?.inputBorderColor || "#e5e7eb";
  const titleColor       = config.text?.titleColor        || "#111827";
  const subtitleColor    = config.text?.subtitleColor     || "#6b7280";
  const brandColor       = config.button?.color           || "#4f46e5";

  const inputCls = `w-full px-4 py-3 border focus:ring-2 focus:border-transparent outline-none transition bg-white text-sm placeholder:text-gray-400 ${inputRadius}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBg config={config} />

      <div
        className={`relative z-10 w-full max-w-md p-6 sm:p-8 ${cardRadius}`}
        style={cardStyle}
      >
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

        {/* ── STEP 1: Credentials ─────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <Steps current={1} brandColor={brandColor} />
            <h2 className="text-2xl font-bold mb-1" style={{ color: titleColor }}>Create your account</h2>
            <p className="text-sm mb-6" style={{ color: subtitleColor }}>Set up your admin access</p>

            {/* Google signup */}
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={googleLoading || loading}
              className={`w-full h-11 font-medium text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-all flex items-center justify-center gap-3 mb-4 ${btnRadius} shadow-sm`}
            >
              <GoogleIcon />
              {googleLoading ? "Connecting…" : "Continue with Google"}
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full name</Label>
                <input
                  id="name"
                  type="text"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={inputCls}
                  style={{ borderColor: inputBorderColor }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputCls}
                  style={{ borderColor: inputBorderColor }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className={`${inputCls} pr-12`}
                    style={{ borderColor: inputBorderColor }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className={`w-full h-12 font-semibold text-base hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center mt-2 ${btnRadius} ${btnShadow}`}
                style={btnStyle}
              >
                {loading ? "Creating account…" : "Continue"}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-4">
              Already have an account?{" "}
              <a href="/login" className="font-medium hover:underline" style={{ color: brandColor }}>
                Sign in
              </a>
            </p>
          </>
        )}

        {/* ── STEP 2: Verify email ────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <Steps current={2} brandColor={brandColor} />
            <div className="text-center space-y-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ background: verified ? "#dcfce7" : "#fef3c7" }}
              >
                {verified
                  ? <ShieldCheck className="w-8 h-8 text-green-600" />
                  : <MailCheck className="w-8 h-8 text-amber-600" />
                }
              </div>

              <h2 className="text-2xl font-bold" style={{ color: titleColor }}>
                {verified ? "Email verified!" : "Check your inbox"}
              </h2>
              <p className="text-sm" style={{ color: subtitleColor }}>
                {verified
                  ? "Your email has been verified. You can now continue."
                  : (
                    <>
                      We sent a verification link to{" "}
                      <strong className="text-gray-800">{email || firebaseEmail}</strong>.
                      <br />
                      You <strong>must</strong> click the link before continuing.
                    </>
                  )
                }
              </p>

              {!verified && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-sm text-gray-600 space-y-1">
                  <p>✔ Check your spam/junk folder</p>
                  <p>✔ This page will update automatically once verified</p>
                </div>
              )}

              {/* Continue button — only enabled once verified */}
              <button
                type="button"
                onClick={handleContinueToStep3}
                disabled={!verified}
                className={`w-full h-12 font-semibold text-base hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center ${btnRadius} ${btnShadow}`}
                style={btnStyle}
              >
                Continue to site selection →
              </button>

              {!isGoogleUser && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || verified}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-all ${btnRadius}`}
                >
                  <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
                  {resending ? "Sending…" : "Resend verification email"}
                </button>
              )}

              <button
                type="button"
                onClick={() => { clearInterval(pollingRef.current); setStep(1); }}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mx-auto"
              >
                <ChevronLeft className="w-3 h-3" /> Back
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3: Tenant picker ───────────────────────────────────────── */}
        {step === 3 && (
          <>
            <Steps current={3} brandColor={brandColor} />
            <h2 className="text-2xl font-bold mb-1" style={{ color: titleColor }}>Choose your site</h2>
            <p className="text-sm mb-5" style={{ color: subtitleColor }}>
              Select the site you will be managing as an admin.
            </p>

            {tenantsLoading ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                Loading sites…
              </div>
            ) : tenants.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                No sites available. Contact a SuperAdmin.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 mb-5">
                {tenants.map((tenant) => (
                  <TenantCard
                    key={tenant.Id}
                    tenant={tenant}
                    selected={selectedTenantId === tenant.Id}
                    onClick={() => setSelectedTenantId(tenant.Id)}
                    brandColor={brandColor}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleFinish}
              disabled={loading || !selectedTenantId}
              className={`w-full h-12 font-semibold text-base hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center ${btnRadius} ${btnShadow}`}
              style={btnStyle}
            >
              {loading ? "Setting up…" : "Finish setup"}
            </button>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mx-auto mt-3"
            >
              <ChevronLeft className="w-3 h-3" /> Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}