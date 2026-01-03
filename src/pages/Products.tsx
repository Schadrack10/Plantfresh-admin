import React, { useState, useContext } from "react";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import * as XLSX from "xlsx";

import { Input } from "@/components/ui/input";
import AppContext from "../context/AppContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import UsefireFunctionsHook from "../utility/usefirebaseFuncHook";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { query, where, getDocs } from "firebase/firestore";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { set } from "date-fns";

export default function Products() {
  const [config, setConfig] = useState({
    enableEditing: false,
    enableDeletion: false,
    enableBulkUpload: false,
  });

  const [searchId, setSearchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [bulkData, setBulkData] = useState([]);
  const {
    globalState,
    setGlobalState,
    db,
    storage,
    uploadBytes,
    ref,
    getDownloadURL,
  } = useContext(AppContext);
  const { toast } = useToast();
  const { updateStoreConfig } = UsefireFunctionsHook();

  // Search product
  const searchProduct = async () => {
    try {
      setLoading(true);

      const q = query(
        collection(db, "Products"),
        where("ProductID", "==", searchId)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // No product found
        alert("No product found with that ProductID");
        setProduct(null);
        setLoading(false);
        return;
      }

      // Found → extract the first matched document
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      console.log("Product found>>>>>>>>>>>, ", data)
      setProduct({
        id: docSnap.id,
        ...data,
      });

      setLoading(false);
    } catch (err) {
      console.error("Error searching product:", err);
      setLoading(false);
      alert("An error occurred while searching.");
    }
  };

  // Update product
  const updateProduct = async () => {
    if (!product) return;
    await updateDoc(doc(db, "Products", product.ProductID), product);
    alert("Product updated");
  };

  // Delete product
  const deleteProductAction = async () => {
    if (!product) return;
    await deleteDoc(doc(db, "Products", product.ProductID));
    setProduct(null);
    alert("Product deleted");
  };

  // Bulk upload handler
  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    /*
      Required spreadsheet columns:
      - ProductID
      -ProductTitle
      - Description
      - Gross
      - Net
      - Discount
      - ImgBigUrl
      -ImgSmallUrl
      - Status
      - Stock
    */

    setBulkData(json);
  };

  // Upload bulk to Firestore
 
const uploadBulkToFirebase = async () => {
  const Ref = collection(db, "Products");

  for (const item of bulkData) {
    await addDoc(Ref, {
      Description: item.Description,
      Gross: Number(item.Gross),
      ProductTitle: item.ProductTitle,
      Net: Number(item.Net),
      Discount: Number(item.Discount),
      ImgBigUrl: item.ImgBigUrl,
      ImgSmallUrl: item.ImgSmallUrl,
      Status: item.Status,
      Stock: item.Stock,
      Category: item.Category,
      ProductID: item.ProductID,
      Tags: item.Tags,
      createdAt: new Date(),
    });
  }

  alert("Bulk upload successful");
};

  // Handle product image upload
  const handleProductImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileRef = ref(storage, `products/${product.id}-${file.name}`);
      await uploadBytes(fileRef, file);

      const downloadURL = await getDownloadURL(fileRef);

      // Update live preview and product state
      setProduct((prev) => ({
        ...prev,
        ImgBigUrl: downloadURL,
      }));

      alert("Image uploaded successfully!");
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Failed to upload image.");
    }
  };

  // Save featured products
  const saveFeaturedProducts = async () => {
    try {
      const featuredIDs =
        globalState.StoreConfig?.ProductsCustomization?.FeaturedProductIDs || [
          "", "", "", ""
        ];
  
      const updatedConfig = {
        ...globalState.StoreConfig,
        ProductsCustomization: {
          ...globalState.StoreConfig.ProductsCustomization,
          FeaturedProductIDs: featuredIDs,
        },
      };
  
      setGlobalState((prev) => ({
        ...prev,
        StoreConfig: updatedConfig,
      }));
  
 
      // localStorage.setItem("StoreConfig", JSON.stringify(updatedConfig));
  
      // 4️⃣ Save to Firestore (same convention you used in handleSave)
      // await updateStoreConfig("StoreConfig001", updatedConfig);
  
      console.log("Saved Featured Product IDs:", featuredIDs);
      console.log("Updated StoreConfig after saving FeaturedProds:", updatedConfig);
  
    } catch (error) {
      console.error("Error saving featured products:", error);
  
      toast({
        title: "Error",
        description: "Failed to save featured product IDs.",
        variant: "destructive",
      });
    }
  };
  

  return (
    <div className="space-y-6 p-4">
      {/* -------------------------------- */}
      {/*        SEARCH PRODUCT            */}
      {/* -------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Search Product</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search Bar */}
          <Input
            placeholder="Enter ProductId"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
          <Button disabled={searchId.length < 3} onClick={searchProduct}>
            Search
          </Button>

          {/* PRODUCT FOUND */}
          {!loading && product && (
            <div className="space-y-4 mt-4">
              {/* IMAGE PREVIEW BOX */}
              <div className="w-40 h-40 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                {product.ImgBigUrl ? (
                  <img
                    src={product.ImgBigUrl}
                    alt={product.Description}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-gray-500 text-sm">No Image</span>
                )}
              </div>

              {/* MANUAL BIG IMAGE URL INPUT */}
              <div className="space-y-1">
                <Label>Big Image URL</Label>
                <Input
                  value={product.ImgBigUrl}
                  onChange={(e) =>
                    setProduct({ ...product, ImgBigUrl: e.target.value })
                  }
                />
              </div>

              {/* MANUAL SMALL IMAGE URL INPUT */}
              <div className="space-y-1">
                <Label>Small Image URL</Label>
                <Input
                  value={product.ImgSmallUrl}
                  onChange={(e) =>
                    setProduct({ ...product, ImgSmallUrl: e.target.value })
                  }
                />
              </div>

              {/* UPLOAD NEW PRODUCT IMAGE */}
              <div className="space-y-1">
                <Label>Upload New Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleProductImageUpload}
                />
              </div>
              {/* PRODUCT TITLE */}
              <div>
                <Label>Product Title</Label>
                <Input
                  value={product.ProductTitle}
                  onChange={(e) =>
                    setProduct({ ...product, ProductTitle: e.target.value })
                  }
                />
              </div>

                    {/* CATEGORY */}
              <div>
                <Label>Category</Label>
                <Input
                  value={product.Category}
                  onChange={(e) =>
                    setProduct({ ...product, Category: e.target.value })
                  }
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <Label>Description</Label>
                <Input
                  value={product.Description}
                  onChange={(e) =>
                    setProduct({ ...product, Description: e.target.value })
                  }
                />
              </div>

                {/* DISCOUNT */}
              <div>
                <Label>Discount</Label>
                <Input
                  type="number"
                  value={product.Discount}
                  onChange={(e) =>
                    setProduct({ ...product, Discount: Number(e.target.value) })
                  }
                />
              </div>

              {/* GROSS */}
              <div>
                <Label>Gross</Label>
                <Input
                  type="number"
                  value={product.Gross}
                  onChange={(e) =>
                    setProduct({ ...product, Gross: Number(e.target.value) })
                  }
                />
              </div>

              {/* NET */}
              <div>
                <Label>Net</Label>
                <Input
                  type="number"
                  value={product.Net}
                  onChange={(e) =>
                    setProduct({ ...product, Net: Number(e.target.value) })
                  }
                />
              </div>

                  {/* STOCK */}
              <div>
                <Label>Stock</Label>
                <Input
                  type="number"
                  value={product.Stock}
                  onChange={(e) =>
                    setProduct({ ...product, Stock: Numbet(e.target.value) })
                  }
                />
              </div>

              {/* Status */}
              <div>
                <Label>Status</Label>
                <Input
                  value={product.Status}
                  onChange={(e) =>
                    setProduct({ ...product, Status: e.target.value })
                  }
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex space-x-4">
                <Button onClick={updateProduct}>Save Changes</Button>
                <Button variant="destructive" onClick={deleteProductAction}>
                  Delete Product
                </Button>
              </div>
            </div>
          )}

          {loading && <div>Searching ...</div>}
        </CardContent>
      </Card>

      {/* -------------------------------- */}
      {/*        BULK UPLOAD              */}
      {/* -------------------------------- */}

      <Card>
        <CardHeader>
          <CardTitle>Bulk Product Upload</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input type="file" accept=".xlsx,.csv" onChange={handleBulkUpload} />

          {bulkData.length > 0 && (
            <Button onClick={uploadBulkToFirebase}>
              Upload {bulkData.length} Products to Firebase
            </Button>
          )}
        </CardContent>
      </Card>

      {/* -------------------------------- */}
      {/*        PRODUCT AD CARD           */}
      {/* -------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Featured Best Seller Products</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Map through 4 indexes */}
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <Label>Product ID #{index + 1}</Label>
              <Input
                placeholder={`Enter ProductID for slot ${index + 1}`}
                value={
                  globalState.StoreConfig?.ProductsCustomization
                    ?.FeaturedProductIDs?.[index] || ""
                }
                onChange={(e) => {
                  const newIDs = [
                    ...(globalState.StoreConfig?.ProductsCustomization
                      ?.FeaturedProductIDs || ["", "", "", ""]),
                  ];
                  newIDs[index] = e.target.value;

                  setGlobalState((prev) => ({
                    ...prev,
                    StoreConfig: {
                      ...prev.StoreConfig,
                      ProductsCustomization: {
                        ...prev.StoreConfig.ProductsCustomization,
                        FeaturedProductIDs: newIDs,
                      },
                    },
                  }));
                }}
              />
            </div>
          ))}

          <Button onClick={saveFeaturedProducts}>
            Save Featured Product IDs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
