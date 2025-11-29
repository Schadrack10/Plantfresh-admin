import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  buttonLink: string;
}

export default function HeroBanner() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSlide, setCurrentSlide] = useState<Partial<HeroSlide>>({});

  const handleSave = () => {
    if (currentSlide.id) {
      setSlides(slides.map((s) => (s.id === currentSlide.id ? currentSlide as HeroSlide : s)));
    } else {
      setSlides([...slides, { ...currentSlide, id: Date.now().toString() } as HeroSlide]);
    }
    setCurrentSlide({});
    setIsEditing(false);
  };

  const handleEdit = (slide: HeroSlide) => {
    setCurrentSlide(slide);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    setSlides(slides.filter((s) => s.id !== id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Hero Banner Management</h1>
        <Button onClick={() => setIsEditing(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Slide
        </Button>
      </div>

      {isEditing ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{currentSlide.id ? "Edit Slide" : "New Slide"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={currentSlide.title || ""}
                onChange={(e) => setCurrentSlide({ ...currentSlide, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="subtitle">Subtitle</Label>
              <Textarea
                id="subtitle"
                value={currentSlide.subtitle || ""}
                onChange={(e) => setCurrentSlide({ ...currentSlide, subtitle: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={currentSlide.imageUrl || ""}
                onChange={(e) => setCurrentSlide({ ...currentSlide, imageUrl: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="buttonText">Button Text</Label>
              <Input
                id="buttonText"
                value={currentSlide.buttonText || ""}
                onChange={(e) => setCurrentSlide({ ...currentSlide, buttonText: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="buttonLink">Button Link</Label>
              <Input
                id="buttonLink"
                value={currentSlide.buttonLink || ""}
                onChange={(e) => setCurrentSlide({ ...currentSlide, buttonLink: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={() => { setIsEditing(false); setCurrentSlide({}); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {slides.map((slide) => (
          <Card key={slide.id}>
            <CardHeader>
              <CardTitle className="text-lg">{slide.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{slide.subtitle}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(slide)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(slide.id)}>
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
