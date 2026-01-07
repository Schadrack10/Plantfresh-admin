import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Image, Star, FileText } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import AppContext from "../context/AppContext";
import { collection, getDocs } from "firebase/firestore";

export default function Dashboard() {
  const { globalState, db, setGlobalState } = useContext(AppContext);

  const [stats, setStats] = useState([]);
  const [blogCount, setBlogCount] = useState(0);

  /* Restore StoreConfig if missing */
  useEffect(() => {
    if (!globalState?.StoreConfig?.createdAt) {
      const storedConfig = JSON.parse(
        localStorage.getItem("StoreConfig") || "{}"
      );
      const authenticatedUser = JSON.parse(
        localStorage.getItem("AuthenticatedUser") || "{}"
      );

      setGlobalState({
        ...globalState,
        StoreConfig: storedConfig,
        AuthenticatedUser: authenticatedUser,
      });
    }
  }, []);

  /* Fetch blog count */
  useEffect(() => {
    const fetchBlogCount = async () => {
      if (!db) return;

      const snapshot = await getDocs(collection(db, "Blogs"));
      setBlogCount(snapshot.size);
    };

    fetchBlogCount();
  }, [db]);

  /* Build stats cards */
  useEffect(() => {
    const sc = globalState?.StoreConfig || {};

    setStats([
      {
        title: "Products",
        value:
          sc?.ProductsCustomization?.FeaturedProductIDs?.length || 0,
        icon: Package,
        color: "text-blue-600",
      },
      {
        title: "Hero Slides",
        value:
          sc?.HomeCustomization?.carouselSliders?.length || 0,
        icon: Image,
        color: "text-purple-600",
      },
      {
        title: "Features",
        value: 8,
        icon: Star,
        color: "text-yellow-600",
      },
      {
        title: "Blog Posts",
        value: blogCount,
        icon: FileText,
        color: "text-green-600",
      },
    ]);
  }, [globalState?.StoreConfig, blogCount]);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
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
