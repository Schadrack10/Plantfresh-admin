import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Image, Star, MessageSquare, FileText } from "lucide-react";
import {useContext, useEffect} from "react";
import AppContext from "../context/AppContext";
import { doc, setDoc } from "firebase/firestore"; 

const stats = [
  { title: "Products", value: "0", icon: Package },
  { title: "Hero Slides", value: "0", icon: Image },
  { title: "Features", value: "0", icon: Star },
  { title: "Testimonials", value: "0", icon: MessageSquare },
  { title: "Blog Posts", value: "0", icon: FileText },
];

export default function Dashboard() {

  const { globalState, db , setGlobalState } = useContext(AppContext);


  useEffect(() => {
    console.log("Global state storeConfig updated:", globalState);

    if (!globalState.StoreConfig.createdAt || !globalState.AuthenticatedUser.uid) {
      const storedConfig = JSON.parse(localStorage.getItem("StoreConfig"));
      const authenticatedUser = JSON.parse(localStorage.getItem("AuthenticatedUser"));

      setGlobalState({
        ...globalState,
        StoreConfig: storedConfig || {},
        AuthenticatedUser: authenticatedUser || {}
      });
    }
  }, [globalState.StoreConfig]);


  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
