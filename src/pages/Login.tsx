import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Eye, EyeOff } from "lucide-react";

import { collection, query, where, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

import AppContext from "../context/AppContext";
import { useToast } from "@/hooks/use-toast";
import UsefireFunctionsHook from "../utility/usefirebaseFuncHook";

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Login failed",
        description: "Please enter valid credentials",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;

        getConfigRecordFromCollection("StoreConfig001");
        getUserRecordFromCollection(user);
      })
      .catch((error) => {
        console.error("Login error:", error);

        toast({
          title: "Login failed",
          description:
            "Please ensure your credentials are correct and try again.",
          variant: "destructive",
        });

        setLoading(false);
      });
  };

  const getUserRecordFromCollection = async (user: Record<string, any>) => {
    try {
      const q = query(collection(db, "Users"), where("IsAdmin", "==", true));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setLoading(false);
        toast({
          title: "Access denied",
          description: "User does not have admin privileges.",
          variant: "destructive",
        });
        return;
      }

      let isAdmin = false;

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        if (user.email === data.UserID) {
          isAdmin = true;
        }
      });

      if (!isAdmin) {
        setLoading(false);
        toast({
          title: "Access denied",
          description: "You do not have admin privileges.",
          variant: "destructive",
        });
        return;
      }

      localStorage.setItem("IsAuthenticated", "true");
      localStorage.setItem(
        "AuthenticatedUser",
        JSON.stringify(user.providerData[0])
      );

      setGlobalState({
        ...globalState,
        AuthenticatedUser: user,
      });

      navigate("/");

      toast({
        title: "Login successful",
        description: "Welcome to the PlantFresh Admin Panel!",
      });

      setLoading(false);
    } catch (error) {
      console.error("Error checking admin access:", error);

      toast({
        title: "Error",
        description: "Unable to verify admin credentials.",
        variant: "destructive",
      });

      setLoading(false);
    }
  };

  const getConfigRecordFromCollection = async (configId: string) => {
    try {
      const config = await getStoreConfig(configId);

      setGlobalState({
        ...globalState,
        StoreConfig: config,
      });

      localStorage.setItem("StoreConfig", JSON.stringify(config));
    } catch (error) {
      console.error("Error fetching store config:", error);

      toast({
        title: "Config fetch failed",
        description: "Please check your network connection and try again.",
        variant: "destructive",
      });

      setLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundImage: "url('/bg3.avif')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5"
    >
      <Card className="w-full max-w-md backdrop-blur-sm bg-white/95 shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-primary text-2xl font-bold">
              🌿 PlantFresh
            </div>
          </div>

          <CardTitle className="text-2xl">Admin Login</CardTitle>

          <CardDescription>
            Enter your credentials to access the admin panel
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">

            {/* EMAIL */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>

              <Input
                id="email"
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* PASSWORD */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>

              <div className="relative">

                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Your secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>

              </div>
            </div>

            {/* LOGIN BUTTON */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Processing..." : "Sign In"}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}