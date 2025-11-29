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
import { getFirestore } from "firebase/firestore";
import AppContext from "../context/AppContext";
import { useToast } from "@/hooks/use-toast";

import { collection, query, where, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import UsefireFunctionsHook from "../utility/usefirebaseFuncHook"


export default function Login() {
  const auth = getAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const { globalState, setGlobalState, db } = useContext(AppContext);
  const { getStoreConfig } = UsefireFunctionsHook();

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (email && password) {
      setLoading(true);
      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          // Signed in
          const user = userCredential.user;

          getConfigRecordFromCollection("StoreConfig001");
          getUserRecordFromCollection(user);
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          console.error("Login error:", errorCode, errorMessage);
          setLoading(false);
          toast({
            title: "Login failed ",
            description: "Please ensure your credentials are correct and try again.",
            variant: "destructive",
          });
        });
    } else {
      toast({
        title: "Login failed",
        description: "Please enter valid credentials",
        variant: "destructive",
      });
    }
  };
  const getUserRecordFromCollection = async (user: Record<string,any>) => {
    const q = query(collection(db, "Users"), where("IsAdmin", "==", true));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
      console.log(doc.id, " => ", doc.data());

      // find the user with matching email
      if (user.email === doc.data().Email) {
        localStorage.setItem("IsAuthenticated", "true");
        localStorage.setItem("AuthenticatedUser", JSON.stringify(user.providerData[0]));

        console.log("Logged in user:", user);
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
      }
    });
  };
  const getConfigRecordFromCollection = async (configId: string) => {
    try {
      const config = await getStoreConfig(configId);
  
      console.log("Store config fetched:", config);
  
      setGlobalState({
        ...globalState,
        StoreConfig: config
      });
  
      localStorage.setItem("StoreConfig", JSON.stringify(config));
    } catch (error) {
      console.error("Error fetching store config:", error);
      setLoading(false);
      toast({
        title: "Config fetch failed",
        description: "Please check your network connection and try again.",
        variant: "destructive",
      });
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
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-primary text-2xl font-bold">🌿 PlantFresh</div>
          </div>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Your secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              {loading ? "Processing..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
