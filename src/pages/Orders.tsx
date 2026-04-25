import React, { useState, useEffect, useRef, useMemo, useContext } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  collection, getDocs, query, where,
  type Firestore,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import AppContext from "../context/AppContext";
import { AlertCircle, Package, Eye } from "lucide-react";
import { Order } from "@/types";

type OrderCategory = "all" | "pending" | "shipped" | "delivered" | "cancelled";

type AppContextType = {
  db: Firestore | null;
  globalState: {
    activeTenant?: { Id?: string; Name?: string } | null;
    [key: string]: unknown;
  };
};

const formatDate = (val: unknown): string => {
  if (!val) return "-";
  const maybeTimestamp = val as { toDate?: () => Date; seconds?: number };
  if (maybeTimestamp.toDate) return maybeTimestamp.toDate().toLocaleString();
  if (typeof maybeTimestamp.seconds === "number") return new Date(maybeTimestamp.seconds * 1000).toLocaleString();
  if (typeof val === "string" || typeof val === "number")
    return new Date(val).toLocaleString();
  return "-";
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount);
};

export default function Orders() {
  const { db, globalState } = useContext(AppContext as React.Context<AppContextType>);
  const { toast } = useToast();

  const activeTenant = globalState?.activeTenant;
  const tenantId = activeTenant?.Id;

  // Cache key is per-tenant so switching tenants always loads fresh data
  const CACHE_KEY = `OrdersList_${tenantId}`;
  const CACHE_TS_KEY = `OrdersListFetchedAt_${tenantId}`;
  const CACHE_TTL_MS = 5 * 60 * 1000;

  const hasFetched = useRef(false);
  const prevTenantId = useRef<string | undefined>(undefined);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<OrderCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [openView, setOpenView] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // ── Re-fetch when tenant switches ────────────────────────────────────────
  useEffect(() => {
    if (!tenantId || !db) return;
    // Reset if tenant changed
    if (prevTenantId.current !== tenantId) {
      hasFetched.current = false;
      setOrders([]);
      prevTenantId.current = tenantId;
    }
    if (hasFetched.current) return;
    hasFetched.current = true;

    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        setOrders(JSON.parse(cached) as Order[]);
      } catch {
        // Ignore invalid cached data
      }
    }
    const fetchedAt = localStorage.getItem(CACHE_TS_KEY);
    const isStale = !fetchedAt || Date.now() - parseInt(fetchedAt, 10) > CACHE_TTL_MS;
    if (!cached || isStale) fetchOrders({ silent: !!cached });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, db]);

  // ── Fetch orders scoped to tenantId ───────────────────────────────────────
  const fetchOrders = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!db || !tenantId) return;
    if (!silent) setLoading(true);
    try {
      // Scope to this tenant only
      const q = query(collection(db, "Orders"), where("TenantId", "==", tenantId));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[];
      localStorage.setItem(CACHE_KEY, JSON.stringify(list));
      localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      setOrders(list);
      if (!silent)
        toast({ title: "Orders refreshed", description: `Loaded ${list.length} orders for ${activeTenant?.Name}` });
    } catch (err) {
      if (!silent) toast({ title: "Error loading orders", variant: "destructive" });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const sortedOrders = useMemo(() =>
    [...orders].sort((a, b) => {
      const dateA = a.CreatedAt || a.PurchaseDate;
      const dateB = b.CreatedAt || b.PurchaseDate;
      const timeA = typeof dateA === 'string' ? new Date(dateA).getTime() : 0;
      const timeB = typeof dateB === 'string' ? new Date(dateB).getTime() : 0;
      return timeB - timeA; // Most recent first
    }), [orders]);

  const categoryFiltered = useMemo(() => {
    switch (activeCategory) {
      case "pending":   return sortedOrders.filter((o) => !o.Status || o.Status === "pending");
      case "shipped":   return sortedOrders.filter((o) => o.Status === "shipped");
      case "delivered": return sortedOrders.filter((o) => o.Status === "delivered");
      case "cancelled": return sortedOrders.filter((o) => o.Status === "cancelled");
      default:          return sortedOrders;
    }
  }, [sortedOrders, activeCategory]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categoryFiltered;
    return categoryFiltered.filter((o) =>
      [o.UserID, o.OrderID, o.id]
        .some((field) => field && String(field).toLowerCase().includes(q))
    );
  }, [categoryFiltered, searchQuery]);

  const counts = {
    all:        sortedOrders.length,
    pending:    sortedOrders.filter((o) => !o.Status || o.Status === "pending").length,
    shipped:    sortedOrders.filter((o) => o.Status === "shipped").length,
    delivered:  sortedOrders.filter((o) => o.Status === "delivered").length,
    cancelled:  sortedOrders.filter((o) => o.Status === "cancelled").length,
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setOpenView(true);
  };

  const getItems = (order: Order): any[] => {
    return order.Items || order.Products || [];
  };

  const getTotal = (order: Order): number => {
    return typeof order.Total === 'string' ? parseFloat(order.Total) : (order.Total || 0);
  };

  const getOrderDate = (order: Order): string => {
    return order.PurchaseDate || formatDate(order.CreatedAt);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Orders</h1>
          <p className="text-slate-600 mt-1">
            Manage and view all orders for {activeTenant?.Name}
          </p>
        </div>
        <Button onClick={() => fetchOrders()} disabled={loading} className="w-full sm:w-auto">
          {loading ? "Loading..." : "Refresh Orders"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "All Orders", count: counts.all, color: "", style: { backgroundColor: "var(--admin-primary)" } },
          { label: "Pending", count: counts.pending, color: "bg-yellow-500" },
          { label: "Shipped", count: counts.shipped, color: "bg-purple-500" },
          { label: "Delivered", count: counts.delivered, color: "", style: { backgroundColor: "var(--admin-accent)" } },
          { label: "Cancelled", count: counts.cancelled, color: "bg-red-500" },
        ].map(({ label, count, color, style }) => (
          <Card key={label} className="cursor-pointer transition-all hover:shadow-md"
            style={activeCategory === label.toLowerCase().replace(" ", "") ? { boxShadow: "0 0 0 2px var(--admin-primary)" } : {}}
            onClick={() => setActiveCategory(label.toLowerCase().replace(" ", "") as OrderCategory)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">{label}</p>
                  <p className="text-2xl font-bold text-slate-800">{count}</p>
                </div>
                <Package className={`w-8 h-8 ${color} text-white p-1.5 rounded`} style={style} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Orders</Label>
              <Input
                id="search"
                placeholder="Search by Order ID, User ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {activeCategory === "all" ? "All Orders" : activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Orders
            <span className="text-sm font-normal text-slate-500">({filteredOrders.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && orders.length === 0 ? (
            // Skeleton loading
            <div className="p-4">
              <div className="animate-pulse space-y-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="flex items-center space-x-4">
                    <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500 text-lg mb-2">No orders found</p>
              <p className="text-slate-400">
                {searchQuery ? `No orders found matching "${searchQuery}".` : `No ${activeCategory} orders found for ${activeTenant?.Name}.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-semibold text-slate-700">Order ID</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Customer</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Date</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Status</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Total</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Items</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const items = getItems(order);
                    const total = getTotal(order);
                    const orderDate = getOrderDate(order);

                    return (
                      <tr key={order.id || order.OrderID} className="border-b hover:bg-slate-50">
                        <td className="p-4 font-mono text-sm">
                          {order.OrderID || order.id?.slice(0, 8) || "N/A"}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-800">{order.UserID}</div>
                        </td>
                        <td className="p-4 text-slate-600">{orderDate}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            !order.Status || order.Status === "pending" ? "bg-yellow-100 text-yellow-800" :
                            order.Status === "shipped" ? "bg-purple-100 text-purple-800" :
                            order.Status === "delivered" ? "bg-green-100 text-green-800" :
                            order.Status === "cancelled" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {order.Status || "pending"}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-800">
                          {formatCurrency(total)}
                        </td>
                        <td className="p-4 text-slate-600">
                          {items.length} item{items.length !== 1 ? "s" : ""}
                        </td>
                        <td className="p-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewOrder(order)}
                            className="gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Order Modal */}
      <Dialog open={openView} onOpenChange={setOpenView}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label className="font-semibold">Order ID</Label>
                  <p className="font-mono text-sm">{selectedOrder.OrderID || selectedOrder.id}</p>
                </div>
                <div>
                  <Label className="font-semibold">Customer</Label>
                  <p>{selectedOrder.UserID}</p>
                </div>
                <div>
                  <Label className="font-semibold">Date</Label>
                  <p>{getOrderDate(selectedOrder)}</p>
                </div>
                <div>
                  <Label className="font-semibold">Status</Label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    !selectedOrder.Status || selectedOrder.Status === "pending" ? "bg-yellow-100 text-yellow-800" :
                    selectedOrder.Status === "shipped" ? "bg-purple-100 text-purple-800" :
                    selectedOrder.Status === "delivered" ? "bg-green-100 text-green-800" :
                    selectedOrder.Status === "cancelled" ? "bg-red-100 text-red-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {selectedOrder.Status || "pending"}
                  </span>
                </div>
                <div>
                  <Label className="font-semibold">Total</Label>
                  <p className="font-bold text-lg">{formatCurrency(getTotal(selectedOrder))}</p>
                </div>
                <div>
                  <Label className="font-semibold">Tenant</Label>
                  <p>{activeTenant?.Name}</p>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <Label className="font-semibold text-lg mb-3 block">Order Items</Label>
                <div className="space-y-3">
                  {getItems(selectedOrder).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 border rounded-lg">
                      {item.Image || item.image ? (
                        <img
                          src={item.Image || item.image}
                          alt={item.ProductName || item.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center">
                          <Package className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.ProductName || item.name || "Unknown Product"}</p>
                        <p className="text-sm text-slate-600">
                          Quantity: {item.Quantity || item.quantity || 1} × {formatCurrency(item.Price || item.price || 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency((item.Price || item.price || 0) * (item.Quantity || item.quantity || 1))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping & Payment Info */}
              {(selectedOrder.ShippingAddress || selectedOrder.PaymentMethod) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedOrder.ShippingAddress && (
                    <div>
                      <Label className="font-semibold">Shipping Address</Label>
                      <p className="text-sm whitespace-pre-line">{selectedOrder.ShippingAddress}</p>
                    </div>
                  )}
                  {selectedOrder.PaymentMethod && (
                    <div>
                      <Label className="font-semibold">Payment Method</Label>
                      <p className="text-sm">{selectedOrder.PaymentMethod}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpenView(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}