import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminLayout } from "./components/AdminLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Products from "./pages/Products";
import Blog from "./pages/Blog";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Affiliation from "./pages/Affiliation";
import AppContextProvider from "./context/AppContextProvider";
import Tenants from "./pages/Tenants";
import Templates from "./pages/Templates";
import Builder from "./pages/Builder";
import Signup from "./pages/Signup";
import AdminTheme from "./pages/AdminTheme";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppContextProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tenants" element={<Tenants />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/builder/:tenantId" element={<Builder />} />
            <Route path="/users" element={<Users />} />
            <Route path="/products" element={<Products />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/affiliation" element={<Affiliation />} />
            <Route path="/admin-theme" element={<AdminTheme />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </AppContextProvider>
  </QueryClientProvider>
);

export default App;
