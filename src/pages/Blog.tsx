import { useState, useContext, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Upload, Loader2 } from "lucide-react";
import AppContext from "../context/AppContext";
import UsefireFunctionsHook from "../utility/usefirebaseFuncHook";
import { useToast } from "@/hooks/use-toast";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  imageUrl: string;
  category: string;
}

const compressImage = (file: File, maxWidth: number, quality: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          blob ? resolve(blob) : reject(new Error("Image compression failed"));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    img.src = objectUrl;
  });
};

export default function Blog() {
  // ── storage comes from context (not getStorage()) ────────────────────────
  const { globalState } = useContext(AppContext);
  const { fetchStoreConfig, updateStoreConfig } = UsefireFunctionsHook();
  const { toast } = useToast();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState<Partial<BlogPost>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState<string>("");
  // ── correct document ID to match your Firestore ──────────────────────────
  const STORE_CONFIG_ID = "StoreConfig001";

  useEffect(() => {
    loadBlogPosts();
  }, []);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadBlogPosts = async () => {
    try {
      setIsLoading(true);
      // fetchStoreConfig now hits "StoreConfigs" collection (plural) ✅
      const storeConfig = await fetchStoreConfig(STORE_CONFIG_ID);
      const loadedPosts: BlogPost[] = storeConfig?.BlogCustomization?.posts || [];
      const sorted = [...loadedPosts].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setPosts(sorted);
      console.log(`✅ Loaded ${sorted.length} blog posts from StoreConfigs`);
    } catch (error) {
      console.error("❌ Error loading blog posts:", error);
      toast({ title: "Error", description: "Failed to load blog posts.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Save (create or update) ───────────────────────────────────────────────
  const handleSave = async () => {
      if (isUploading) {
    toast({ title: "Please wait", description: "Image is still uploading.", variant: "destructive" });
    return;
  }
    if (!currentPost.title?.trim() || !currentPost.content?.trim()) {
      toast({ title: "Validation Error", description: "Title and content are required.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      let updatedPosts: BlogPost[];

      if (currentPost.id) {
        // UPDATE
        const updatedPost: BlogPost = { ...currentPost, date: currentPost.date || new Date().toISOString() } as BlogPost;
        updatedPosts = posts.map((p) => (p.id === currentPost.id ? updatedPost : p));
        toast({ title: "✅ Post Updated", description: "Blog post updated successfully." });
      } else {
        // CREATE
        const newPost: BlogPost = {
          id: `post_${Date.now()}`,
          title: currentPost.title,
          excerpt: currentPost.excerpt || "",
          content: currentPost.content,
          author: currentPost.author || "Admin",
          date: new Date().toISOString(),
          imageUrl: currentPost.imageUrl || "",
          category: currentPost.category || "Uncategorized",
        };
        updatedPosts = [newPost, ...posts];
        toast({ title: "✅ Post Created", description: "New blog post created successfully." });
      }

      // Write back to StoreConfigs/StoreConfig001 → BlogCustomization.posts
      await updateStoreConfig(STORE_CONFIG_ID, {
        "BlogCustomization.posts": updatedPosts,
      });

      setPosts(updatedPosts);
      setCurrentPost({});
      setIsEditing(false);
      setImagePreview("");
    } catch (error) {
      console.error("❌ Error saving post:", error);
      toast({ title: "Error", description: "Failed to save blog post.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const updatedPosts = posts.filter((p) => p.id !== id);
      await updateStoreConfig(STORE_CONFIG_ID, {
        "BlogCustomization.posts": updatedPosts,
      });
      setPosts(updatedPosts);
      toast({ title: "✅ Post Deleted", description: "Blog post deleted successfully." });
    } catch (error) {
      console.error("❌ Error deleting post:", error);
      toast({ title: "Error", description: "Failed to delete blog post.", variant: "destructive" });
    }
  };

  const handleEdit = (post: BlogPost) => {
    setCurrentPost(post);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    toast({ title: "File too large", description: "Please upload an image under 2MB.", variant: "destructive" });
    return;
  }

  setIsUploading(true);

  try {
    const compressed = await compressImage(file, 800, 0.7);

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(compressed); // ✅ This produces a proper base64 data URL
    });

    // ✅ Save base64 string, NOT a blob URL
    setCurrentPost((prev) => ({ ...prev, imageUrl: base64 }));
    setImagePreview(base64); // ← ADD THIS so preview works too
    toast({ title: "✅ Image Ready", description: "Image loaded successfully." });

  } catch (error) {
    console.error("❌ Image error:", error);
    toast({ title: "Error", description: "Failed to process image.", variant: "destructive" });
  } finally {
    setIsUploading(false);
  }
};

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-3" />
          <p className="text-slate-500">Loading blog posts...</p>
        </div>
      </div>
    );
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Blog Posts Management</h1>
        {!isEditing && (
          <Button onClick={() => { setCurrentPost({}); setIsEditing(true); }} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600">
            <Plus className="mr-2 h-4 w-4" /> Add Post
          </Button>
        )}
      </div>

      {/* Editor form */}
      {isEditing && (
        <Card style={{ backgroundColor: "#f0f4f8" }}>
          <CardHeader>
            <CardTitle>{currentPost.id ? "Edit Post" : "New Post"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={currentPost.title || ""}
                  onChange={(e) => setCurrentPost({ ...currentPost, title: e.target.value })}
                  placeholder="Enter blog post title" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={currentPost.category || ""}
                  onChange={(e) => setCurrentPost({ ...currentPost, category: e.target.value })}
                  placeholder="e.g., Sustainability, Tips, News" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input id="author" value={currentPost.author || ""}
                onChange={(e) => setCurrentPost({ ...currentPost, author: e.target.value })}
                placeholder="Author name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea id="excerpt" value={currentPost.excerpt || ""}
                onChange={(e) => setCurrentPost({ ...currentPost, excerpt: e.target.value })}
                placeholder="Brief summary shown in blog listing" rows={2} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea id="content" rows={10} value={currentPost.content || ""}
                onChange={(e) => setCurrentPost({ ...currentPost, content: e.target.value })}
                placeholder="Full blog post content" />
            </div>

            {/* Image */}
            <div className="space-y-2">
              <Label>Featured Image</Label>
              <Input value={currentPost.imageUrl || ""}
                onChange={(e) => setCurrentPost({ ...currentPost, imageUrl: e.target.value })}
                placeholder="https://... or upload below" />
            </div>

            <div className="space-y-2">
              <Label>Upload Image <span className="text-xs text-slate-400">(saved to Firebase Storage)</span></Label>
              <label className="block cursor-pointer">
                <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  isUploading ? "border-emerald-300 bg-emerald-50" : "border-slate-300 hover:border-emerald-400 hover:bg-emerald-50"
                }`}>
                  {isUploading ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading... {uploadProgress}%
                      <div className="w-full bg-emerald-100 rounded-full h-1 mt-1">
                        <div className="bg-emerald-500 h-1 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                      <Upload className="w-4 h-4" /> Click to upload image
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={handleImageUpload} />
              </label>
{(imagePreview || currentPost.imageUrl) && (
  <img
    src={imagePreview || currentPost.imageUrl}
    alt="Preview"
        className="mt-2 w-full h-48 object-cover object-center rounded-lg border"

  />
)}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600">
                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : currentPost.id ? "Update Post" : "Save Post"}
              </Button>
              <Button variant="outline" onClick={() => { setIsEditing(false); setCurrentPost({}); setImagePreview(""); }} className="w-full sm:w-auto">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts grid */}
      {!isEditing && posts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-slate-400 text-lg mb-4">No blog posts yet.</p>
            <Button onClick={() => { setCurrentPost({}); setIsEditing(true); }} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="mr-2 h-4 w-4" /> Create your first post
            </Button>
          </CardContent>
        </Card>
      ) : !isEditing ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id} className="flex flex-col bg-[#f0f4f8] overflow-hidden transition-all duration-300 hover:shadow-xl">
              {/* Image */}
              {/* <div className="w-full h-48 bg-gradient-to-br from-slate-200 to-slate-300 flex-shrink-0 flex items-center justify-center overflow-hidden"> */}
              <div className="w-full h-48 bg-gradient-to-br from-slate-200 to-slate-300 flex-shrink-0 overflow-hidden">
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt={post.title || "Blog image"}
                    className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="text-slate-400 text-center px-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">No Image</p>
                  </div>
                )}
              </div>

              {/* Header */}
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                    {post.category || "Uncategorized"}
                  </span>
                </div>
                <CardTitle className="text-lg line-clamp-2 min-h-[3.5rem]">
                  {post.title || "Untitled Post"}
                </CardTitle>
              </CardHeader>

              {/* Content */}
              <CardContent className="flex flex-col flex-1 pt-0">
                <p className="text-xs text-slate-400 mb-2">
                  By {post.author || "Unknown"} · {post.date ? new Date(post.date).toLocaleDateString() : "No date"}
                </p>
                <p className="text-sm text-slate-600 mb-4 line-clamp-3 flex-1">
                  {post.excerpt || "No excerpt available."}
                </p>

                {/* Actions */}
                <div className="mt-auto flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(post)} className="flex-1">
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(post.id)} className="flex-1">
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ): null}
    </div>
  );
}