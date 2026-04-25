import { useState, useContext, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Upload, Loader2, AlertCircle } from "lucide-react";
import AppContext from "../context/AppContext";
import { useToast } from "@/hooks/use-toast";
import {
  doc, getDoc, setDoc, addDoc, collection, serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

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

export default function Blog() {
  const { globalState, db, storage } = useContext(AppContext);
  const { toast } = useToast();

  const activeTenant = (globalState as any)?.activeTenant;
  const tenantId = activeTenant?.Id;

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState<Partial<BlogPost>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState("");
  const prevTenantId = useRef<string | undefined>(undefined);

  // Confirmation dialog state
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // ── Load from Sites/{tenantId} when tenant changes ────────────────────────
  useEffect(() => {
    if (!db || !tenantId) { setIsLoading(false); return; }
    if (prevTenantId.current === tenantId) return;
    prevTenantId.current = tenantId;
    loadBlogPosts();
  }, [db, tenantId]);

  const loadBlogPosts = async () => {
    if (!db || !tenantId) return;
    setIsLoading(true);
    try {
      const snap = await getDoc(doc(db, "Sites", tenantId));
      const loaded: BlogPost[] = snap.exists()
        ? (snap.data()?.BlogCustomization?.posts || [])
        : [];
      const sorted = [...loaded].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setPosts(sorted);
    } catch (err) {
      console.error("Blog load error:", err);
      toast({ title: "Failed to load posts", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Image upload → Firebase Storage + Assets collection ──────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10 MB", variant: "destructive" });
      return;
    }

    if (!storage) {
      // Fallback: base64 preview only (no Storage connection)
      toast({ title: "Storage not connected — using local preview", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const storagePath = `assets/${tenantId}/blog/${fileName}`;
      const storageRef = ref(storage, storagePath);
      const task = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            // Save to Assets collection
            await addDoc(collection(db, "Assets"), {
              TenantId: tenantId,
              URL: url,
              Type: "blog-image",
              FileName: fileName,
              StoragePath: storagePath,
              CreatedAt: serverTimestamp(),
            });
            setCurrentPost((prev) => ({ ...prev, imageUrl: url }));
            setImagePreview(url);
            resolve();
          }
        );
      });
      toast({ title: "Image uploaded" });
    } catch (err: any) {
      console.error("Blog image upload error:", err);
      toast({ title: "Upload failed", description: err?.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // ── Save post to Sites/{tenantId}/BlogCustomization.posts ─────────────────
  const handleSave = async () => {
    if (isUploading) {
      toast({ title: "Please wait", description: "Image is still uploading.", variant: "destructive" });
      return;
    }
    if (!currentPost.title?.trim() || !currentPost.content?.trim()) {
      toast({ title: "Validation Error", description: "Title and content are required.", variant: "destructive" });
      return;
    }
    if (!db || !tenantId) {
      toast({ title: "No active tenant", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      let updatedPosts: BlogPost[];

      if (currentPost.id) {
        // UPDATE
        const updatedPost: BlogPost = {
          ...currentPost,
          date: currentPost.date || new Date().toISOString(),
        } as BlogPost;
        updatedPosts = posts.map((p) => p.id === currentPost.id ? updatedPost : p);
        toast({ title: " Post Updated" });
      } else {
        // CREATE
        const newPost: BlogPost = {
          id: `post_${Date.now()}`,
          title: currentPost.title!,
          excerpt: currentPost.excerpt || "",
          content: currentPost.content!,
          author: currentPost.author || "Admin",
          date: new Date().toISOString(),
          imageUrl: currentPost.imageUrl || "",
          category: currentPost.category || "Uncategorized",
        };
        updatedPosts = [newPost, ...posts];
        toast({ title: " Post Created" });
      }

      // Write to Sites/{tenantId} — merge so other fields are preserved
      await setDoc(doc(db, "Sites", tenantId), {
        BlogCustomization: { posts: updatedPosts },
        TenantId: tenantId,
        UpdatedAt: new Date(),
      }, { merge: true });

      setPosts(updatedPosts);
      setCurrentPost({});
      setIsEditing(false);
      setImagePreview("");
    } catch (err) {
      console.error("Blog save error:", err);
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete post ───────────────────────────────────────────────────────────
  const handleOpenDeleteConfirm = (id: string) => {
    setDeleteTarget(id);
    setOpenDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !db || !tenantId) return;
    try {
      const updatedPosts = posts.filter((p) => p.id !== deleteTarget);
      await setDoc(doc(db, "Sites", tenantId), {
        BlogCustomization: { posts: updatedPosts },
        TenantId: tenantId,
        UpdatedAt: new Date(),
      }, { merge: true });
      setPosts(updatedPosts);
      toast({ title: " Post Deleted" });
      setOpenDeleteConfirm(false);
      setDeleteTarget(null);
    } catch (err) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleEdit = (post: BlogPost) => {
    setCurrentPost(post);
    setImagePreview(post.imageUrl || "");
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!tenantId) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <p className="font-semibold text-slate-700">No tenant selected</p>
          <p className="text-sm text-slate-500">Select a tenant from the sidebar to manage blog posts.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-3" />
          <p className="text-slate-500">Loading posts for {activeTenant?.Name}…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Blog Posts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeTenant?.Name} · <span className="font-mono">Sites/{tenantId}/BlogCustomization</span>
          </p>
        </div>
        {!isEditing && (
          <Button onClick={() => { setCurrentPost({}); setIsEditing(true); }}
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600">
            <Plus className="mr-2 h-4 w-4" /> Add Post
          </Button>
        )}
      </div>

      {/* Editor */}
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

            {/* Image URL */}
            <div className="space-y-2">
              <Label>Featured Image URL</Label>
              <Input value={currentPost.imageUrl || ""}
                onChange={(e) => { setCurrentPost({ ...currentPost, imageUrl: e.target.value }); setImagePreview(e.target.value); }}
                placeholder="https://... or upload below" />
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <Label>Upload Image <span className="text-xs text-slate-400">(saved to Firebase Storage → Assets/{tenantId})</span></Label>
              <label className="block cursor-pointer">
                <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors
                  ${isUploading ? "border-emerald-300 bg-emerald-50" : "border-slate-300 hover:border-emerald-400 hover:bg-emerald-50"}`}>
                  {isUploading ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" /> Uploading… {uploadProgress}%
                      </div>
                      <div className="w-full bg-emerald-100 rounded-full h-1">
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
                <img src={imagePreview || currentPost.imageUrl} alt="Preview"
                  className="mt-2 w-full h-48 object-cover object-center rounded-lg border"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600">
                {isSaving
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                  : currentPost.id ? "Update Post" : "Save Post"}
              </Button>
              <Button variant="outline" onClick={() => { setIsEditing(false); setCurrentPost({}); setImagePreview(""); }}
                className="w-full sm:w-auto">
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
            <p className="text-slate-400 text-lg mb-4">No blog posts yet for {activeTenant?.Name}.</p>
            <Button onClick={() => { setCurrentPost({}); setIsEditing(true); }} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="mr-2 h-4 w-4" /> Create your first post
            </Button>
          </CardContent>
        </Card>
      ) : !isEditing ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id} className="flex flex-col bg-[#f0f4f8] overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="w-full h-48 bg-gradient-to-br from-slate-200 to-slate-300 flex-shrink-0 overflow-hidden">
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt={post.title || "Blog image"}
                    className="w-full h-full object-cover object-center"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                    {post.category || "Uncategorized"}
                  </span>
                </div>
                <CardTitle className="text-lg line-clamp-2 min-h-[3.5rem]">{post.title || "Untitled"}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 pt-0">
                <p className="text-xs text-slate-400 mb-2">
                  By {post.author || "Unknown"} · {post.date ? new Date(post.date).toLocaleDateString() : "No date"}
                </p>
                <p className="text-sm text-slate-600 mb-4 line-clamp-3 flex-1">{post.excerpt || "No excerpt."}</p>
                <div className="mt-auto flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(post)} className="flex-1">
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleOpenDeleteConfirm(post.id)} className="flex-1">
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Delete Post Confirmation Modal */}
      <Dialog open={openDeleteConfirm} onOpenChange={setOpenDeleteConfirm}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-red-700">🗑️ Delete Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                Are you sure you want to delete this blog post? This action cannot be undone.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => setOpenDeleteConfirm(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleDelete} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white">
              Delete Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}