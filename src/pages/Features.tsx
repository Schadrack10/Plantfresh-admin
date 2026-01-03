import { useState, useContext, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AppContext from "../context/AppContext";
import UsefireFunctionsHook from "../utility/usefirebaseFuncHook";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function Features() {
  const { globalState, setGlobalState } = useContext(AppContext);
  const { updateStoreConfig } = UsefireFunctionsHook();
  const { toast } = useToast();
  const storage = getStorage();

  // LOCAL CONFIG STATE
  const [config, setConfig] = useState(globalState.StoreConfig);

  // LOAD CONFIG IMMEDIATELY ON PAGE RELOAD
  useEffect(() => {
    const storedConfig = JSON.parse(localStorage.getItem("StoreConfig"));
    const authenticatedUser = JSON.parse(
      localStorage.getItem("AuthenticatedUser")
    );

    if (storedConfig || authenticatedUser) {
      setGlobalState((prev) => ({
        ...prev,
        StoreConfig: storedConfig || prev.StoreConfig,
        AuthenticatedUser: authenticatedUser || prev.AuthenticatedUser,
      }));

      setConfig(storedConfig || globalState.StoreConfig);
    }
  }, []); // runs only on first mount

  // ⛏ UPDATE NESTED CONFIG PATH
  const handleChange = (path: string, value: any) => {
    setConfig((prev) => {
      const updated = structuredClone(prev);
      const keys = path.split(".");
      let obj: any = updated;

      keys.slice(0, -1).forEach((key) => {
        if (!obj[key]) obj[key] = {};
        obj = obj[key];
      });

      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  // SAVE TO GLOBAL + FIREBASE
  const handleSave = () => {
    setGlobalState({
      ...globalState,
      StoreConfig: config,
    });

    console.log("Saved config ++ ", config);
    localStorage.setItem("StoreConfig", JSON.stringify(config));

    updateStoreConfig("StoreConfig001", config);
    toast({
      title: "Configuration Saved",
      description: "Your store configuration has been updated successfully.",
    });
  };

  // LOGO UPLOAD HANDLER
  const handleLogoUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const uid = globalState?.AuthenticatedUser?.uid || "defaultAdmin";
    const fileRef = ref(storage, `store/${uid}/navbar/logo_${Date.now()}`);

    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);

    handleChange("NavbarCustomization.logoURL", downloadURL);
    alert("Logo uploaded successfully!");
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Features</h1>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>

      {/* ---------------- NAVBAR CUSTOMIZATION ---------------- */}
      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardHeader>
          <CardTitle>Navbar Customization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* LOGO URL */}
          <div>
            <Label>Logo URL</Label>
            <Input
              value={config.NavbarCustomization?.logoURL || ""}
              onChange={(e) =>
                handleChange("NavbarCustomization.logoURL", e.target.value)
              }
            />
          </div>

          {/* LOGO UPLOAD */}
          <div>
            <Label>Upload Logo</Label>
            <Input
              disabled
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
            />

            {config.NavbarCustomization?.logoURL && (
              <img
                src={config.NavbarCustomization.logoURL}
                alt="Logo Preview"
                className="mt-2 h-16 object-contain"
              />
            )}
          </div>

          {/* BACKGROUND COLOR */}
          <div>
            <Label>
              Background Color: {config.NavbarCustomization?.background}
            </Label>
            <Input
              type="color"
              value={config.NavbarCustomization?.background || ""}
              onChange={(e) =>
                handleChange("NavbarCustomization.background", e.target.value)
              }
            />
          </div>

          {/* STICKY NAVBAR CHECKBOX */}
          <div className="flex items-start justify-between flex-col">
            <div>
              <Label htmlFor="sticky-navbar">Sticky Navbar</Label>
            </div>
            <Checkbox
              id="sticky-navbar"
              checked={config.NavbarCustomization?.sticky || false}
              onCheckedChange={(checked) =>
                handleChange("NavbarCustomization.sticky", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------- THEME CUSTOMIZATION ---------------- */}
      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardHeader>
          <CardTitle>Theme Customization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* PRIMARY COLOR */}
          <div>
            <Label>
              Primary Color: {config.ThemeCustomization?.primaryColor}
            </Label>
            <Input
              type="color"
              value={config.ThemeCustomization?.primaryColor || "#000000"}
              onChange={(e) =>
                handleChange("ThemeCustomization.primaryColor", e.target.value)
              }
            />
          </div>

          {/* SECONDARY COLOR */}
          <div>
            <Label>
              Secondary Color: {config.ThemeCustomization?.secondaryColor}
            </Label>
            <Input
              type="color"
              value={config.ThemeCustomization?.secondaryColor || "#000000"}
              onChange={(e) =>
                handleChange("ThemeCustomization.secondaryColor", e.target.value)
              }
            />
          </div>

          {/* FONT FAMILY */}
          <div>
            <Label>Font Family</Label>
            <select
              className="border rounded p-2 w-full mt-1"
              value={config.ThemeCustomization?.fontFamily || ""}
              onChange={(e) =>
                handleChange("ThemeCustomization.fontFamily", e.target.value)
              }
            >
              <option value="">Select font family</option>
              <option value="Inter">Inter</option>
              <option value="Poppins">Poppins</option>
              <option value="Roboto">Roboto</option>
              <option value="Lato">Lato</option>
              <option value="Montserrat">Montserrat</option>
              <option value="Open Sans">Open Sans</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* ---------------- CART CUSTOMIZATION ---------------- */}
      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardHeader>
          <CardTitle>Cart Customization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tax</Label>
            <Input
              value={config.CartCustomization?.TaxAmount || ""}
              onChange={(e) =>
                handleChange(
                  "CartCustomization.TaxAmount",
                  e.target.value
                )
              }
            />
          </div>

          {/* Allow Guest Checkout CHECKBOX */}
          <div className="flex items-start justify-between flex-col">
            <div>
              <Label htmlFor="sticky-navbar">Allow Guest Checkout</Label>
            </div>
            <Checkbox
              id="sticky-navbar"
              checked={config.CartCustomization?.allowGuestCheckout || false}
              onCheckedChange={(checked) =>
                handleChange("CartCustomization.allowGuestCheckout", checked)
              }
            />
          </div>

          {/* Allow Promotion Codes CHECKBOX */}
          <div className="flex items-start justify-between flex-col">
            <div>
              <Label htmlFor="sticky-navbar">Allow Promotion Codes</Label>
            </div>
            <Checkbox
              id="sticky-navbar"
              checked={config.CartCustomization?.allowPromotionCodes || false}
              onCheckedChange={(checked) =>
                handleChange("CartCustomization.allowPromotionCodes", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------- CHECKOUT CUSTOMIZATION ---------------- */}
      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardHeader>
          <CardTitle>Checkout Customization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable Paystack CHECKBOX */}
          <div className="flex items-start justify-between flex-col">
            <div>
              <Label htmlFor="sticky-navbar">Enable Paystack Payment</Label>
            </div>
            <Checkbox
              id="sticky-navbar"
              checked={config.CheckoutCustomization?.EnablePaystack || false}
              onCheckedChange={(checked) =>
                handleChange("CheckoutCustomization.EnablePaystack", checked)
              }
            />
          </div>
          {/* Enable Paypal CHECKBOX */}
          <div className="flex items-start justify-between flex-col">
            <div>
              <Label htmlFor="sticky-navbar">Enable Paypal Payment</Label>
            </div>
            <Checkbox
              id="sticky-navbar"
              checked={config.CheckoutCustomization?.EnablePaypal || false}
              onCheckedChange={(checked) =>
                handleChange("CheckoutCustomization.EnablePaypal", checked)
              }
            />
          </div>
          {/* Enable Thirdparty payment CHECKBOX */}
          <div className="flex items-start justify-between flex-col">
            <div>
              <Label htmlFor="sticky-navbar">Enable Third Party Payment</Label>
            </div>
            <Checkbox
              id="sticky-navbar"
              checked={
                config.CheckoutCustomization?.EnableThirdPartyPayment || false
              }
              onCheckedChange={(checked) =>
                handleChange(
                  "CheckoutCustomization.EnableThirdPartyPayment",
                  checked
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------- CONTACT CUSTOMIZATION ---------------- */}
      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardHeader>
          <CardTitle>Contact Customization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Phone</Label>
            <Input
              value={config.ContactCustomization?.contactInfo?.phone || ""}
              onChange={(e) =>
                handleChange(
                  "ContactCustomization.contactInfo.phone",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              value={config.ContactCustomization?.contactInfo?.email || ""}
              onChange={(e) =>
                handleChange(
                  "ContactCustomization.contactInfo.email",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <Label>Address</Label>
            <Textarea
              value={config.ContactCustomization?.contactInfo?.Address || ""}
              onChange={(e) =>
                handleChange(
                  "ContactCustomization.contactInfo.Address",
                  e.target.value
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------- FOOTER CUSTOMIZATION ---------------- */}
      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardHeader>
          <CardTitle>Footer Customization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>
              Background Color: {config.FooterCustomization?.backgroundColor}
            </Label>
            <Input
              type="color"
              value={config.FooterCustomization?.backgroundColor || ""}
              onChange={(e) =>
                handleChange(
                  "FooterCustomization.backgroundColor",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <Label>Copyright Text</Label>
            <Textarea
              value={config.FooterCustomization?.copyrightText || ""}
              onChange={(e) =>
                handleChange(
                  "FooterCustomization.copyrightText",
                  e.target.value
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------- GENERAL SETTINGS ---------------- */}
      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Store Name</Label>
            <Input
              value={config.GeneralSettings?.storeName || ""}
              onChange={(e) =>
                handleChange("GeneralSettings.storeName", e.target.value)
              }
            />
          </div>

          {/* CURRENCY DROPDOWN */}
          <div>
            <Label>Currency</Label>
            <select
              className="border rounded p-2 w-full mt-1"
              value={config.GeneralSettings?.currency || ""}
              onChange={(e) =>
                handleChange("GeneralSettings.currency", e.target.value)
              }
            >
              <option value="">Select currency</option>
              <option value="ZAR">South African Rand (ZAR)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="GBP">British Pound (GBP)</option>
              <option value="NGN">Nigerian Naira (NGN)</option>
              <option value="KES">Kenyan Shilling (KES)</option>
              <option value="JPY">Japanese Yen (JPY)</option>
              <option value="CNY">Chinese Yuan (CNY)</option>
              <option value="INR">Indian Rupee (INR)</option>
              <option value="CAD">Canadian Dollar (CAD)</option>
              <option value="AUD">Australian Dollar (AUD)</option>
            </select>
          </div>

          {/* STOREID */}
          <div>
            <Label>Config ID</Label>
            <Input
              disabled
              value={config.GeneralSettings?.configId || ""}
              onChange={(e) =>
                handleChange("GeneralSettings.storeName", e.target.value)
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
