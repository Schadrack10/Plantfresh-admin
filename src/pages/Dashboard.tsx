import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Image, Star, FileText } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import AppContext from "../context/AppContext";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const { globalState, db, setGlobalState } = useContext(AppContext);

  const [dau, setDau] = useState(0);
  const [mau, setMau] = useState(0);
  const [stats, setStats] = useState([]);
  const [blogCount, setBlogCount] = useState(0);
  const [activeUsers, setActiveUsers] = useState([]); // daily active users chart

  /* ----------------------------------
     Restore StoreConfig if missing
  ---------------------------------- */
  useEffect(() => {
    if (!globalState?.StoreConfig?.createdAt) {
      const storedConfig = JSON.parse(localStorage.getItem("StoreConfig") || "{}");
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

  /* ----------------------------------
     Track auth activity (DAU/MAU)
  ---------------------------------- */
  useEffect(() => {
    const trackActivity = async () => {
      if (!globalState?.AuthenticatedUser?.uid || !db) return;

      const uid = globalState.AuthenticatedUser.uid;
      const today = new Date().toISOString().split("T")[0];

      await setDoc(
        doc(db, "auth_activity", `${uid}_${today}`),
        {
          uid,
          date: today,
          lastActiveAt: serverTimestamp(),
        },
        { merge: true }
      );
    };

    trackActivity();
  }, [globalState?.AuthenticatedUser?.uid, db]);

  /* ----------------------------------
     Fetch DAU / MAU
  ---------------------------------- */
  useEffect(() => {
    const fetchAuthStats = async () => {
      if (!db) return;

      const today = new Date().toISOString().split("T")[0];
      const month = today.slice(0, 7);

      // DAU
      const dauQuery = query(
        collection(db, "auth_activity"),
        where("date", "==", today)
      );
      const dauSnap = await getDocs(dauQuery);
      setDau(dauSnap.size);

      // MAU
      const mauQuery = query(
        collection(db, "auth_activity"),
        where("date", ">=", `${month}-01`),
        where("date", "<=", `${month}-31`)
      );
      const mauSnap = await getDocs(mauQuery);
      const uniqueUsers = new Set(mauSnap.docs.map(d => d.data().uid));
      setMau(uniqueUsers.size);
    };

    fetchAuthStats();
  }, [db]);

  /* ----------------------------------
     Fetch total number of blogs
  ---------------------------------- */
  useEffect(() => {
    const fetchBlogCount = async () => {
      if (!db) return;

      const blogsCollection = collection(db, "Blogs");
      const snapshot = await getDocs(blogsCollection);
      setBlogCount(snapshot.size);
    };

    fetchBlogCount();
  }, [db]);

  /* ----------------------------------
     Build stats from StoreConfig
  ---------------------------------- */
  useEffect(() => {
    const sc = globalState?.StoreConfig || {};

    setStats([
      {
        title: "Products",
        value: sc?.ProductsCustomization?.FeaturedProductIDs?.length || 0,
        icon: Package,
      },
      {
        title: "Hero Slides",
        value: sc?.HomeCustomization?.carouselSliders?.length || 0,
        icon: Image,
      },
      {
        title: "Features",
        value: 8, // fixed value
        icon: Star,
      },
      {
        title: "Blog Posts",
        value: blogCount, // dynamic blog count
        icon: FileText,
      },
    ]);
  }, [globalState?.StoreConfig, blogCount]);

  /* ----------------------------------
     Build daily active users chart
  ---------------------------------- */
  useEffect(() => {
    const fetchActiveUsers = async () => {
      if (!db) return;

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const authCol = collection(db, "auth_activity");
      const snapshot = await getDocs(authCol);

      const dailyMap: Record<string, Set<string>> = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const date = data.date; // YYYY-MM-DD
        const uid = data.uid;
        if (!dailyMap[date]) dailyMap[date] = new Set();
        dailyMap[date].add(uid);
      });

      const chartData = [];
      const dayCount = endOfMonth.getDate();
      for (let i = 1; i <= dayCount; i++) {
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
        chartData.push({ date: dateStr, activeUsers: dailyMap[dateStr]?.size || 0 });
      }

      setActiveUsers(chartData);
    };

    fetchActiveUsers();
  }, [db]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* MAIN STATS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map(stat => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* USER ACTIVITY STATS */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4">User Activity</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Daily Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dau}</div>
              <p className="text-xs text-muted-foreground">Active today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{mau}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* ACTIVE USERS LINE CHART */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold mb-4">Daily Active Users Chart</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={activeUsers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="activeUsers" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
