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
  }, []);

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
          <CardTitle>Navbar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* LOGO Link */}
          <div>
            <Label>Logo Link</Label>
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
              <Label htmlFor="sticky-navbar">Keep Navbar Sticky</Label>
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

        <CardHeader>
          <CardTitle>Footer</CardTitle>
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
          {/* PRIMARY COLOR */}
          <div>
            <Label>
              Main Color: {config.ThemeCustomization?.primaryColor}
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
              Accent Color: {config.ThemeCustomization?.secondaryColor}
            </Label>
            <Input
              type="color"
              value={config.ThemeCustomization?.secondaryColor || "#000000"}
              onChange={(e) =>
                handleChange("ThemeCustomization.secondaryColor", e.target.value)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------- PRODUCT CARD ---------------- */}
      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardHeader>
          <CardTitle>Product Card</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* APPEARANCE SECTION */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Appearance</h3>
            
            {/* CARD BACKGROUND COLOR */}
            <div>
              <Label>
                Card Background: {config.ProductCardCustomization?.appearance?.cardBackground}
              </Label>
              <Input
                type="color"
                value={config.ProductCardCustomization?.appearance?.cardBackground || "#ffffff"}
                onChange={(e) =>
                  handleChange(
                    "ProductCardCustomization.appearance.cardBackground",
                    e.target.value
                  )
                }
              />
            </div>

            {/* CARD BORDER COLOR */}
            <div>
              <Label>
                Card Border: {config.ProductCardCustomization?.appearance?.cardBorder}
              </Label>
              <Input
                type="color"
                value={config.ProductCardCustomization?.appearance?.cardBorder || "#e5e7eb"}
                onChange={(e) =>
                  handleChange(
                    "ProductCardCustomization.appearance.cardBorder",
                    e.target.value
                  )
                }
              />
            </div>

            {/* CARD CORNER RADIUS */}
            <div>
              <Label>
                Corner Radius: {config.ProductCardCustomization?.appearance?.borderRadius || "16"}px
              </Label>
              <Input
                type="range"
                min="0"
                max="32"
                step="2"
                value={config.ProductCardCustomization?.appearance?.borderRadius || "16"}
                onChange={(e) =>
                  handleChange(
                    "ProductCardCustomization.appearance.borderRadius",
                    e.target.value
                  )
                }
              />
            </div>

            {/* HOVER EFFECT */}
            <div>
              <Label>Hover Effect</Label>
              <select
                className="border rounded p-2 w-full mt-1"
                value={config.ProductCardCustomization?.appearance?.hoverEffect || "lift"}
                onChange={(e) =>
                  handleChange("ProductCardCustomization.appearance.hoverEffect", e.target.value)
                }
              >
                <option value="lift">Lift (Default)</option>
                <option value="zoom">Zoom Image</option>
                <option value="shadow">Shadow</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>

          {/* DISPLAY OPTIONS SECTION */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Display Options</h3>

            {/* SHOW TAGS CHECKBOX */}
            <div className="flex items-center justify-between">
              <Label htmlFor="show-tags">Show Product Tags</Label>
              <Checkbox
                id="show-tags"
                checked={config.ProductCardCustomization?.display?.showTags !== false}
                onCheckedChange={(checked) =>
                  handleChange("ProductCardCustomization.display.showTags", checked)
                }
              />
            </div>

            {/* SHOW DESCRIPTION CHECKBOX */}
            <div className="flex items-center justify-between">
              <Label htmlFor="show-description">Show Product Description</Label>
              <Checkbox
                id="show-description"
                checked={config.ProductCardCustomization?.display?.showDescription !== false}
                onCheckedChange={(checked) =>
                  handleChange("ProductCardCustomization.display.showDescription", checked)
                }
              />
            </div>

            {/* SHOW WISHLIST BUTTON CHECKBOX */}
            <div className="flex items-center justify-between">
              <Label htmlFor="show-wishlist">Show Wishlist Button</Label>
              <Checkbox
                id="show-wishlist"
                checked={config.ProductCardCustomization?.display?.showWishlist !== false}
                onCheckedChange={(checked) =>
                  handleChange("ProductCardCustomization.display.showWishlist", checked)
                }
              />
            </div>
          </div>

          {/* COLORS SECTION */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Colors</h3>

            {/* TEXT COLORS */}
            <div className="space-y-3 pb-4 border-b">
              <h4 className="font-medium text-sm">Text Colors</h4>
              
              {/* PRODUCT TITLE COLOR */}
              <div>
                <Label>
                  Product Title: {config.ProductCardCustomization?.colors?.titleColor}
                </Label>
                <Input
                  type="color"
                  value={config.ProductCardCustomization?.colors?.titleColor || "#0f172a"}
                  onChange={(e) =>
                    handleChange(
                      "ProductCardCustomization.colors.titleColor",
                      e.target.value
                    )
                  }
                />
              </div>

              {/* PRODUCT DESCRIPTION COLOR */}
              <div>
                <Label>
                  Product Description: {config.ProductCardCustomization?.colors?.descriptionColor}
                </Label>
                <Input
                  type="color"
                  value={config.ProductCardCustomization?.colors?.descriptionColor || "#475569"}
                  onChange={(e) =>
                    handleChange(
                      "ProductCardCustomization.colors.descriptionColor",
                      e.target.value
                    )
                  }
                />
              </div>
            </div>

            {/* TAG COLORS */}
            <div className="space-y-3 pb-4 border-b">
              <h4 className="font-medium text-sm">Tag Colors</h4>
              
              {/* TAG BACKGROUND COLOR */}
              <div>
                <Label>
                  Tag Background: {config.ProductCardCustomization?.colors?.tagBackground}
                </Label>
                <Input
                  type="color"
                  value={config.ProductCardCustomization?.colors?.tagBackground || "#00e676"}
                  onChange={(e) =>
                    handleChange(
                      "ProductCardCustomization.colors.tagBackground",
                      e.target.value
                    )
                  }
                />
              </div>

              {/* TAG TEXT COLOR */}
              <div>
                <Label>
                  Tag Text: {config.ProductCardCustomization?.colors?.tagTextColor}
                </Label>
                <Input
                  type="color"
                  value={config.ProductCardCustomization?.colors?.tagTextColor || "#ffffff"}
                  onChange={(e) =>
                    handleChange(
                      "ProductCardCustomization.colors.tagTextColor",
                      e.target.value
                    )
                  }
                />
              </div>
            </div>

            {/* PRICE COLOR */}
            <div className="pb-4 border-b">
              <h4 className="font-medium text-sm mb-3">Price</h4>
              <div>
                <Label>
                  Price Color: {config.ProductCardCustomization?.colors?.priceColor}
                </Label>
                <Input
                  type="color"
                  value={config.ProductCardCustomization?.colors?.priceColor || "#00e676"}
                  onChange={(e) =>
                    handleChange(
                      "ProductCardCustomization.colors.priceColor",
                      e.target.value
                    )
                  }
                />
              </div>
            </div>

            {/* BUTTON COLORS */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Add to Cart Button</h4>
              
              {/* ADD TO CART BUTTON COLOR */}
              <div>
                <Label>
                  Button Background: {config.ProductCardCustomization?.colors?.addToCartBg}
                </Label>
                <Input
                  type="color"
                  value={config.ProductCardCustomization?.colors?.addToCartBg || "#00e676"}
                  onChange={(e) =>
                    handleChange(
                      "ProductCardCustomization.colors.addToCartBg",
                      e.target.value
                    )
                  }
                />
              </div>

              {/* ADD TO CART BUTTON TEXT COLOR */}
              <div>
                <Label>
                  Button Text: {config.ProductCardCustomization?.colors?.addToCartText}
                </Label>
                <Input
                  type="color"
                  value={config.ProductCardCustomization?.colors?.addToCartText || "#ffffff"}
                  onChange={(e) =>
                    handleChange(
                      "ProductCardCustomization.colors.addToCartText",
                      e.target.value
                    )
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------------- THEME CUSTOMIZATION ---------------- */}
      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardHeader>
          <CardTitle>GLOBAL THEME</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* FONT FAMILY */}
          <div>
            <Label>Font</Label>
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

          {/* TEXT COLORS */}
          <div className="space-y-4">
            <h3 className="font-semibold">TEXT COLORS</h3>

            <div>
              <Label>
                Titles: {config.ThemeCustomization?.text?.heading}
              </Label>
              <Input
                type="color"
                value={config.ThemeCustomization?.text?.heading || "#000000"}
                onChange={(e) =>
                  handleChange(
                    "ThemeCustomization.text.heading",
                    e.target.value
                  )
                }
              />
            </div>

            <div>
              <Label>
                Body: {config.ThemeCustomization?.text?.body}
              </Label>
              <Input
                type="color"
                value={config.ThemeCustomization?.text?.body || "#000000"}
                onChange={(e) =>
                  handleChange(
                    "ThemeCustomization.text.body",
                    e.target.value
                  )
                }
              />
            </div>

            <div>
              <Label>
                Highlights: {config.ThemeCustomization?.text?.highlight}
              </Label>
              <Input
                type="color"
                value={config.ThemeCustomization?.text?.highlight || "#000000"}
                onChange={(e) =>
                  handleChange(
                    "ThemeCustomization.text.highlight",
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          {/* BUTTON COLORS */}
          <div className="space-y-4">
            <h3 className="font-semibold">BUTTONS</h3>

            <div>
              <Label>Button Color</Label>
              <Input
                type="color"
                value={config.ThemeCustomization?.buttons?.primaryBg || "#000000"}
                onChange={(e) =>
                  handleChange(
                    "ThemeCustomization.buttons.primaryBg",
                    e.target.value
                  )
                }
              />
            </div>

            <div>
              <Label>Button Text Color</Label>
              <Input
                type="color"
                value={config.ThemeCustomization?.buttons?.primaryText || "#ffffff"}
                onChange={(e) =>
                  handleChange(
                    "ThemeCustomization.buttons.primaryText",
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          {/* CARD COLORS */}
          <div className="space-y-4">
            <h2 className="font-semibold">CARDS</h2>

            <div>
              <Label>Card Color</Label>
              <Input
                type="color"
                value={config.ThemeCustomization?.cards?.background || "#ffffff"}
                onChange={(e) =>
                  handleChange(
                    "ThemeCustomization.cards.background",
                    e.target.value
                  )
                }
              />
            </div>

            <div>
              <Label>Card Border Color</Label>
              <Input
                type="color"
                value={config.ThemeCustomization?.cards?.border || "#e5e7eb"}
                onChange={(e) =>
                  handleChange(
                    "ThemeCustomization.cards.border",
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          {/* CTA COLORS */}
          <div className="space-y-4">
            <h2 className="font-semibold">READY TO GO GREEN HOME SECTION</h2>

            <div>
              <Label>Background Color</Label>
              <Input
                type="color"
                value={config.ThemeCustomization?.cta?.backgroundColor || "#000000"}
                onChange={(e) =>
                  handleChange(
                    "ThemeCustomization.cta.backgroundColor",
                    e.target.value
                  )
                }
              />
            </div>

            <div>
              <Label>Title</Label>
              <Input
                type="color"
                value={config.ThemeCustomization?.cta?.headingText || "#ffffff"}
                onChange={(e) =>
                  handleChange(
                    "ThemeCustomization.cta.headingText",
                    e.target.value
                  )
                }
              />
            </div>

            <div>
              <Label>Text Color</Label>
              <Input
                type="color"
                value={config.ThemeCustomization?.cta?.bodyText || "#e5e7eb"}
                onChange={(e) =>
                  handleChange(
                    "ThemeCustomization.cta.bodyText",
                    e.target.value
                  )
                }
              />
            </div>

            <div>
              <Label>Button Color</Label>
              <Input
                type="color"
                value={config.ThemeCustomization?.buttons?.secondaryBg || "#000000"}
                onChange={(e) =>
                  handleChange(
                    "ThemeCustomization.buttons.secondaryBg",
                    e.target.value
                  )
                }
              />
            </div>

            <div>
              <Label>Button Text Color</Label>
              <Input
                type="color"
                value={config.ThemeCustomization?.buttons?.secondaryText || "#ffffff"}
                onChange={(e) =>
                  handleChange(
                    "ThemeCustomization.buttons.secondaryText",
                    e.target.value
                  )
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

{/* ---------------- ABOUT CUSTOMIZATION ---------------- */}
      <Card style={{ backgroundColor: "#f0f4f8" }}>
        <CardHeader>
          <CardTitle>About Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Our Story Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Our Story Section</h3>
            
            {/* Story Image */}
            <div>
              <Label>Story Image URL</Label>
              <Input
                value={config.AboutCustomization?.content?.storyImageURL || ""}
                onChange={(e) =>
                  handleChange(
                    "AboutCustomization.content.storyImageURL",
                    e.target.value
                  )
                }
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* Story Image Upload */}
            <div>
              <Label>Upload Story Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const uid = globalState?.AuthenticatedUser?.uid || "defaultAdmin";
                  const fileRef = ref(storage, `store/${uid}/about/story_${Date.now()}`);

                  await uploadBytes(fileRef, file);
                  const downloadURL = await getDownloadURL(fileRef);

                  handleChange("AboutCustomization.content.storyImageURL", downloadURL);
                  toast({
                    title: "Image Uploaded",
                    description: "Story image has been uploaded successfully.",
                  });
                }}
              />

              {config.AboutCustomization?.content?.storyImageURL && (
                <img
                  src={config.AboutCustomization.content.storyImageURL}
                  alt="Story Preview"
                  className="mt-2 h-32 w-full object-cover rounded-lg"
                />
              )}
            </div>

            <div>
              <Label>Story Title</Label>
              <Input
                value={config.AboutCustomization?.content?.storyTitle || ""}
                onChange={(e) =>
                  handleChange(
                    "AboutCustomization.content.storyTitle",
                    e.target.value
                  )
                }
                placeholder="Our Story"
              />
            </div>

            <div>
              <Label>Story Paragraph 1</Label>
              <Textarea
                value={config.AboutCustomization?.content?.storyParagraph1 || ""}
                onChange={(e) =>
                  handleChange(
                    "AboutCustomization.content.storyParagraph1",
                    e.target.value
                  )
                }
                placeholder="Founded in 2020, PlantFresh was born from a simple idea..."
                rows={3}
              />
            </div>

            <div>
              <Label>Story Paragraph 2</Label>
              <Textarea
                value={config.AboutCustomization?.content?.storyParagraph2 || ""}
                onChange={(e) =>
                  handleChange(
                    "AboutCustomization.content.storyParagraph2",
                    e.target.value
                  )
                }
                placeholder="Our team of scientists and eco-enthusiasts work tirelessly..."
                rows={3}
              />
            </div>
          </div>

          {/* Our Values Section */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-semibold text-lg">Our Values Section</h3>
            
            <div>
              <Label>Values Section Title</Label>
              <Input
                value={config.AboutCustomization?.content?.valuesTitle || ""}
                onChange={(e) =>
                  handleChange(
                    "AboutCustomization.content.valuesTitle",
                    e.target.value
                  )
                }
                placeholder="Our Values"
              />
            </div>

            {/* Value 1 */}
            <div className="space-y-3 bg-white/50 p-4 rounded-lg">
              <h4 className="font-medium text-sm">Value 1 (Sustainability)</h4>
              <div>
                <Label>Title</Label>
                <Input
                  value={config.AboutCustomization?.content?.value1Title || ""}
                  onChange={(e) =>
                    handleChange(
                      "AboutCustomization.content.value1Title",
                      e.target.value
                    )
                  }
                  placeholder="Sustainability"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={config.AboutCustomization?.content?.value1Desc || ""}
                  onChange={(e) =>
                    handleChange(
                      "AboutCustomization.content.value1Desc",
                      e.target.value
                    )
                  }
                  placeholder="100% recyclable packaging and biodegradable formulas"
                  rows={2}
                />
              </div>
            </div>

            {/* Value 2 */}
            <div className="space-y-3 bg-white/50 p-4 rounded-lg">
              <h4 className="font-medium text-sm">Value 2 (Safety First)</h4>
              <div>
                <Label>Title</Label>
                <Input
                  value={config.AboutCustomization?.content?.value2Title || ""}
                  onChange={(e) =>
                    handleChange(
                      "AboutCustomization.content.value2Title",
                      e.target.value
                    )
                  }
                  placeholder="Safety First"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={config.AboutCustomization?.content?.value2Desc || ""}
                  onChange={(e) =>
                    handleChange(
                      "AboutCustomization.content.value2Desc",
                      e.target.value
                    )
                  }
                  placeholder="Non-toxic ingredients safe for kids, pets, and you"
                  rows={2}
                />
              </div>
            </div>

            {/* Value 3 */}
            <div className="space-y-3 bg-white/50 p-4 rounded-lg">
              <h4 className="font-medium text-sm">Value 3 (Planet Positive)</h4>
              <div>
                <Label>Title</Label>
                <Input
                  value={config.AboutCustomization?.content?.value3Title || ""}
                  onChange={(e) =>
                    handleChange(
                      "AboutCustomization.content.value3Title",
                      e.target.value
                    )
                  }
                  placeholder="Planet Positive"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={config.AboutCustomization?.content?.value3Desc || ""}
                  onChange={(e) =>
                    handleChange(
                      "AboutCustomization.content.value3Desc",
                      e.target.value
                    )
                  }
                  placeholder="Carbon-neutral operations and ethical sourcing"
                  rows={2}
                />
              </div>
            </div>
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