import { useState, useContext } from "react";
import {
  collection, doc, setDoc, addDoc, updateDoc,
  deleteDoc, query, where, getDocs, serverTimestamp,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import AppContext from "../context/AppContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { AlertCircle, Loader2, Upload } from "lucide-react";

export default function Products() {
  const { globalState, setGlobalState, db, storage } = useContext(AppContext);
  const { toast } = useToast();

  const activeTenant = (globalState as any)?.activeTenant;
  const tenantId = activeTenant?.Id;

  const [searchId, setSearchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [bulkData, setBulkData] = useState<any[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);

  // Confirmation dialog state
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);

  // ── Search product scoped to tenant ──────────────────────────────────────
  const searchProduct = async () => {
    if (!db || !tenantId) return;
    try {
      setLoading(true);
      setProduct(null);
      // Scope search to this tenant AND by ProductID
      const q = query(
        collection(db, "Products"),
        where("ProductID", "==", searchId),
        where("TenantId", "==", tenantId)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        toast({ title: "No product found", description: `No product with ID "${searchId}" in ${activeTenant?.Name}`, variant: "destructive" });
        return;
      }
      const docSnap = snap.docs[0];
      setProduct({ id: docSnap.id, ...docSnap.data() });
    } catch (err) {
      console.error("Search error:", err);
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Update product ────────────────────────────────────────────────────────
  const updateProduct = async () => {
    if (!product || !db) return;
    try {
      await updateDoc(doc(db, "Products", product.id), {
        ...product,
        TenantId: tenantId, // always ensure TenantId is set
        UpdatedAt: new Date(),
      });
      toast({ title: "Product updated" });
    } catch (err) {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  // ── Delete product ────────────────────────────────────────────────────────
  const handleOpenDeleteConfirm = () => {
    setOpenDeleteConfirm(true);
  };

  const deleteProductAction = async () => {
    if (!product || !db) return;
    try {
      await deleteDoc(doc(db, "Products", product.id));
      setProduct(null);
      toast({ title: "Product deleted" });
      setOpenDeleteConfirm(false);
    } catch (err) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  // ── Bulk upload from Excel/CSV ────────────────────────────────────────────
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);
    setBulkData(json as any[]);
    toast({ title: `📋 ${json.length} products ready to upload` });
  };

  const uploadBulkToFirebase = async () => {
    if (!db || !tenantId) return;
    setBulkUploading(true);
    try {
      const ref = collection(db, "Products");
      for (const item of bulkData as any[]) {
        await addDoc(ref, {
          Description:  item.Description  || "",
          Gross:        Number(item.Gross) || 0,
          ProductTitle: item.ProductTitle  || "",
          Net:          Number(item.Net)   || 0,
          Discount:     Number(item.Discount) || 0,
          ImgBigUrl:    item.ImgBigUrl    || "",
          ImgSmallUrl:  item.ImgSmallUrl  || "",
          Status:       item.Status       || "active",
          Stock:        item.Stock        || 0,
          Category:     item.Category     || "",
          ProductID:    item.ProductID    || "",
          Tags:         item.Tags         || "",
          // ── Tenant identifier ──────────────────────────────────────────
          TenantId:     tenantId,
          TenantName:   activeTenant?.Name || "",
          CreatedAt:    serverTimestamp(),
        });
      }
      setBulkData([]);
      toast({ title: `${bulkData.length} products uploaded to ${activeTenant?.Name}` });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Bulk upload failed", description: err?.message, variant: "destructive" });
    } finally {
      setBulkUploading(false);
    }
  };

  // ── Product image upload → Firebase Storage + Assets collection ───────────
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage || !tenantId) return;
    setImgUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const storagePath = `assets/${tenantId}/products/${fileName}`;
      const storageRef = ref(storage, storagePath);
      const task = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        task.on("state_changed", () => {}, reject, async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          // Save to Assets collection
          await addDoc(collection(db, "Assets"), {
            TenantId:    tenantId,
            URL:         url,
            Type:        "product-image",
            FileName:    fileName,
            StoragePath: storagePath,
            ProductId:   product?.id || "",
            CreatedAt:   serverTimestamp(),
          });
          setProduct((prev: any) => ({ ...prev, ImgBigUrl: url }));
          resolve();
        });
      });
      toast({ title: "Image uploaded" });
    } catch (err: any) {
      toast({ title: "Image upload failed", description: err?.message, variant: "destructive" });
    } finally {
      setImgUploading(false);
    }
  };

  // ── Save featured products to Sites/{tenantId} ────────────────────────────
  const saveFeaturedProducts = async () => {
    if (!db || !tenantId) {
      toast({ title: "No active tenant", variant: "destructive" });
      return;
    }
    try {
      const featuredIDs =
        (globalState as any)?.StoreConfig?.ProductsCustomization?.FeaturedProductIDs || ["", "", "", ""];

      // Write to Sites/{tenantId} instead of StoreConfig001
      await setDoc(doc(db, "Sites", tenantId), {
        ProductsCustomization: { FeaturedProductIDs: featuredIDs },
        TenantId: tenantId,
        UpdatedAt: new Date(),
      }, { merge: true });

      toast({ title: "Featured products saved", description: `Saved to ${activeTenant?.Name}` });
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message, variant: "destructive" });
    }
  };

  // ── No tenant guard ───────────────────────────────────────────────────────
  if (!tenantId) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <p className="font-semibold text-slate-700">No tenant selected</p>
          <p className="text-sm text-slate-500">Select a tenant from the sidebar to manage products.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Tenant context header */}
      <div>
        <h1 className="text-2xl font-bold">Products</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {activeTenant?.Name} · <span className="font-mono">TenantId: {tenantId}</span>
        </p>
      </div>

      {/* ── Search Product ── */}
      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardHeader><CardTitle>Search Product</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Enter ProductID" value={searchId} onChange={(e) => setSearchId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchId.length >= 3 && searchProduct()} />
            <Button disabled={searchId.length < 3 || loading} onClick={searchProduct} className="whitespace-nowrap">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching…</> : "Search"}
            </Button>
          </div>

          {!loading && product && (
            <div className="space-y-4 mt-4">
              {/* Image preview */}
              <div className="w-40 h-40 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                {product.ImgBigUrl
                  ? <img src={product.ImgBigUrl} alt={product.ProductTitle} className="w-full h-full object-contain" />
                  : <span className="text-gray-500 text-sm">No Image</span>}
              </div>

              <div className="space-y-1">
                <Label>Big Image URL</Label>
                <Input value={product.ImgBigUrl || ""} onChange={(e) => setProduct({ ...product, ImgBigUrl: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Small Image URL</Label>
                <Input value={product.ImgSmallUrl || ""} onChange={(e) => setProduct({ ...product, ImgSmallUrl: e.target.value })} />
              </div>

              {/* Image upload */}
              <div className="space-y-1">
                <Label>Upload New Image <span className="text-xs text-slate-400">(saved to Firebase Storage)</span></Label>
                <label className="block cursor-pointer">
                  <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors
                    ${imgUploading ? "border-emerald-300 bg-emerald-50" : "border-slate-300 hover:border-emerald-400 hover:bg-emerald-50"}`}>
                    {imgUploading
                      ? <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm"><Loader2 className="w-4 h-4 animate-spin" />Uploading…</div>
                      : <div className="flex items-center justify-center gap-2 text-slate-500 text-sm"><Upload className="w-4 h-4" />Click to upload</div>}
                  </div>
                  <input type="file" accept="image/*" className="hidden" disabled={imgUploading} onChange={handleProductImageUpload} />
                </label>
              </div>

              <div><Label>Product Title</Label>
                <Input value={product.ProductTitle || ""} onChange={(e) => setProduct({ ...product, ProductTitle: e.target.value })} /></div>
              <div><Label>Category</Label>
                <Input value={product.Category || ""} onChange={(e) => setProduct({ ...product, Category: e.target.value })} /></div>
              <div><Label>Description</Label>
                <Input value={product.Description || ""} onChange={(e) => setProduct({ ...product, Description: e.target.value })} /></div>
              <div><Label>Discount</Label>
                <Input type="number" value={product.Discount || 0} onChange={(e) => setProduct({ ...product, Discount: Number(e.target.value) })} /></div>
              <div><Label>Gross</Label>
                <Input type="number" value={product.Gross || 0} onChange={(e) => setProduct({ ...product, Gross: Number(e.target.value) })} /></div>
              <div><Label>Net</Label>
                <Input type="number" value={product.Net || 0} onChange={(e) => setProduct({ ...product, Net: Number(e.target.value) })} /></div>
              <div><Label>Stock</Label>
                {/* Fixed original typo: Numbet → Number */}
                <Input type="number" value={product.Stock || 0} onChange={(e) => setProduct({ ...product, Stock: Number(e.target.value) })} /></div>
              <div><Label>Status</Label>
                <Input value={product.Status || ""} onChange={(e) => setProduct({ ...product, Status: e.target.value })} /></div>

              {/* Tenant info (read-only) */}
              <div className="p-2 rounded text-xs" style={{ backgroundColor: "var(--admin-primary-10)", borderColor: "var(--admin-primary-20)", borderWidth: "1px", borderStyle: "solid", color: "var(--admin-primary)" }}>
                <span className="font-semibold">Tenant: </span>{product.TenantName || activeTenant?.Name}
                <span className="ml-2 font-mono opacity-60">{product.TenantId}</span>
              </div>

              <div className="flex gap-3">
                <Button onClick={updateProduct}>Save Changes</Button>
                <Button variant="destructive" onClick={handleOpenDeleteConfirm}>Delete Product</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Bulk Upload ── */}
      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardHeader><CardTitle>Bulk Product Upload</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500">
            Products will be tagged with <span className="font-semibold">{activeTenant?.Name}</span> (TenantId: <span className="font-mono">{tenantId}</span>).
            Required columns: ProductID, ProductTitle, Description, Gross, Net, Discount, ImgBigUrl, ImgSmallUrl, Status, Stock, Category.
          </p>
          <Input type="file" accept=".xlsx,.csv" onChange={handleBulkUpload} />
          {bulkData.length > 0 && (
            <Button onClick={uploadBulkToFirebase} disabled={bulkUploading} className="bg-emerald-500 hover:bg-emerald-600">
              {bulkUploading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading…</>
                : `Upload ${bulkData.length} Products to ${activeTenant?.Name}`}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── Featured Products ── */}
      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardHeader><CardTitle>Featured Best Seller Products</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500">
            These IDs are saved to <span className="font-mono">Sites/{tenantId}/ProductsCustomization/FeaturedProductIDs</span>.
          </p>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <Label>Product ID #{index + 1}</Label>
              <Input
                placeholder={`Enter ProductID for slot ${index + 1}`}
                value={(globalState as any)?.StoreConfig?.ProductsCustomization?.FeaturedProductIDs?.[index] || ""}
                onChange={(e) => {
                  const newIDs = [
                    ...((globalState as any)?.StoreConfig?.ProductsCustomization?.FeaturedProductIDs || ["", "", "", ""]),
                  ];
                  newIDs[index] = e.target.value;
                  setGlobalState((prev: any) => ({
                    ...prev,
                    StoreConfig: {
                      ...prev.StoreConfig,
                      ProductsCustomization: {
                        ...prev.StoreConfig?.ProductsCustomization,
                        FeaturedProductIDs: newIDs,
                      },
                    },
                  }));
                }}
              />
            </div>
          ))}
          <Button onClick={saveFeaturedProducts} className="bg-emerald-500 hover:bg-emerald-600">
            Save Featured Product IDs
          </Button>
        </CardContent>
      </Card>

      {/* Delete Product Confirmation Modal */}
      <Dialog open={openDeleteConfirm} onOpenChange={setOpenDeleteConfirm}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-red-700">🗑️ Delete Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                Are you sure you want to delete <strong>{product?.ProductTitle || product?.ProductID}</strong>?
                This action cannot be undone.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => setOpenDeleteConfirm(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={deleteProductAction} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white">
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}