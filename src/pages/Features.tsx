import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export default function Features() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentFeature, setCurrentFeature] = useState<Partial<Feature>>({});

  const handleSave = () => {
    if (currentFeature.id) {
      setFeatures(features.map((f) => (f.id === currentFeature.id ? currentFeature as Feature : f)));
    } else {
      setFeatures([...features, { ...currentFeature, id: Date.now().toString() } as Feature]);
    }
    setCurrentFeature({});
    setIsEditing(false);
  };

  const handleEdit = (feature: Feature) => {
    setCurrentFeature(feature);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    setFeatures(features.filter((f) => f.id !== id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Features Management</h1>
        <Button onClick={() => setIsEditing(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Feature
        </Button>
      </div>

      {isEditing ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{currentFeature.id ? "Edit Feature" : "New Feature"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={currentFeature.title || ""}
                onChange={(e) => setCurrentFeature({ ...currentFeature, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={currentFeature.description || ""}
                onChange={(e) => setCurrentFeature({ ...currentFeature, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="icon">Icon Name (Lucide)</Label>
              <Input
                id="icon"
                placeholder="e.g., Truck, Shield, Leaf"
                value={currentFeature.icon || ""}
                onChange={(e) => setCurrentFeature({ ...currentFeature, icon: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={() => { setIsEditing(false); setCurrentFeature({}); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.id}>
            <CardHeader>
              <CardTitle className="text-lg">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{feature.description}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(feature)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(feature.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
