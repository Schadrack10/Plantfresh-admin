import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
  avatarUrl: string;
}

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState<Partial<Testimonial>>({ rating: 5 });

  const handleSave = () => {
    if (currentTestimonial.id) {
      setTestimonials(testimonials.map((t) => (t.id === currentTestimonial.id ? currentTestimonial as Testimonial : t)));
    } else {
      setTestimonials([...testimonials, { ...currentTestimonial, id: Date.now().toString() } as Testimonial]);
    }
    setCurrentTestimonial({ rating: 5 });
    setIsEditing(false);
  };

  const handleEdit = (testimonial: Testimonial) => {
    setCurrentTestimonial(testimonial);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    setTestimonials(testimonials.filter((t) => t.id !== id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Testimonials Management</h1>
        <Button onClick={() => setIsEditing(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Testimonial
        </Button>
      </div>

      {isEditing ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{currentTestimonial.id ? "Edit Testimonial" : "New Testimonial"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={currentTestimonial.name || ""}
                onChange={(e) => setCurrentTestimonial({ ...currentTestimonial, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="role">Role/Location</Label>
              <Input
                id="role"
                value={currentTestimonial.role || ""}
                onChange={(e) => setCurrentTestimonial({ ...currentTestimonial, role: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="content">Testimonial Content</Label>
              <Textarea
                id="content"
                value={currentTestimonial.content || ""}
                onChange={(e) => setCurrentTestimonial({ ...currentTestimonial, content: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="rating">Rating (1-5)</Label>
              <Input
                id="rating"
                type="number"
                min="1"
                max="5"
                value={currentTestimonial.rating || 5}
                onChange={(e) => setCurrentTestimonial({ ...currentTestimonial, rating: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input
                id="avatarUrl"
                value={currentTestimonial.avatarUrl || ""}
                onChange={(e) => setCurrentTestimonial({ ...currentTestimonial, avatarUrl: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={() => { setIsEditing(false); setCurrentTestimonial({ rating: 5 }); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.id}>
            <CardHeader>
              <CardTitle className="text-lg">{testimonial.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">{testimonial.role}</p>
              <p className="text-sm mb-4 line-clamp-2">{testimonial.content}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(testimonial)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(testimonial.id)}>
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
