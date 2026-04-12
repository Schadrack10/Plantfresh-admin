import { useContext } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Image, KeyRound, Sparkles } from "lucide-react";
import AppContext from "../context/AppContext";
import Features from "./Features";
import HeroBanner from "./HeroBanner";
import AuthManager from "./AuthManager";

export default function SiteSettings() {
  const { globalState } = useContext(AppContext);
  const currentUser = (globalState as any)?.AuthenticatedUser;
  const isSuperAdmin =
    currentUser?.role === "SuperAdmin" || currentUser?.IsSuperAdmin === true;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Site Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure your storefront — features, banners, and auth screens all in one place.
        </p>
      </div>

      <Tabs defaultValue="features">
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="features" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Sparkles className="w-4 h-4" /> Features & Config
          </TabsTrigger>
          <TabsTrigger value="banner" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Image className="w-4 h-4" /> Banners
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="auth" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <KeyRound className="w-4 h-4" /> Auth Screens
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="features" className="mt-6">
          <Features />
        </TabsContent>

        <TabsContent value="banner" className="mt-6">
          <HeroBanner />
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="auth" className="mt-6">
            <AuthManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}