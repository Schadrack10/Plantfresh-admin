import { useState, useContext, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2 } from "lucide-react";
import AppContext from "../context/AppContext";
import UsefireFunctionsHook from "../utility/usefirebaseFuncHook";
import { useToast } from "@/hooks/use-toast";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
  const { globalState } = useContext(AppContext);
  const { createBlogPost, updateBlogPost, deleteBlogPost, fetchAllBlogs } = UsefireFunctionsHook();
  const { toast } = useToast();
  const storage = getStorage();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState<Partial<BlogPost>>({});
  const [isLoading, setIsLoading] = useState(true);

  // FETCH BLOG POSTS ON MOUNT
  useEffect(() => {
    loadBlogPosts();
  }, []);

  const loadBlogPosts = async () => {
    try {
      setIsLoading(true);
      const blogPosts = await fetchAllBlogs();
      setPosts(blogPosts || []);
    } catch (error) {
      console.error("Error loading blog posts:", error);
      toast({
        title: "Error",
        description: "Failed to load blog posts.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!currentPost.title || !currentPost.content) {
        toast({
          title: "Validation Error",
          description: "Title and content are required.",
          variant: "destructive",
        });
        return;
      }

      if (currentPost.id) {
        // UPDATE EXISTING POST
        await updateBlogPost(currentPost.id, currentPost as BlogPost);
        setPosts(posts.map((p) => (p.id === currentPost.id ? currentPost as BlogPost : p)));
        toast({
          title: "Post Updated",
          description: "Blog post has been updated successfully.",
        });
      } else {
        // CREATE NEW POST
        const newPost = {
          ...currentPost,
          id: Date.now().toString(),
          date: new Date().toISOString(),
        } as BlogPost;
        
        await createBlogPost(newPost);
        setPosts([...posts, newPost]);
        toast({
          title: "Post Created",
          description: "New blog post has been created successfully.",
        });
      }

      setCurrentPost({});
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving post:", error);
      toast({
        title: "Error",
        description: "Failed to save blog post.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (post: BlogPost) => {
    setCurrentPost(post);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      await deleteBlogPost(id);
      setPosts(posts.filter((p) => p.id !== id));
      toast({
        title: "Post Deleted",
        description: "Blog post has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: "Error",
        description: "Failed to delete blog post.",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const uid = globalState?.AuthenticatedUser?.uid || "defaultAdmin";
      const fileRef = ref(storage, `store/${uid}/blog/image_${Date.now()}`);

      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);

      setCurrentPost({ ...currentPost, imageUrl: downloadURL });
      toast({
        title: "Image Uploaded",
        description: "Blog image has been uploaded successfully.",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg">Loading blog posts...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Blog Posts Management</h1>
        <Button onClick={() => setIsEditing(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Post
        </Button>
      </div>

      {isEditing ? (
        <Card className="mb-6" style={{ backgroundColor: "#f0f4f8" }}>
          <CardHeader>
            <CardTitle>{currentPost.id ? "Edit Post" : "New Post"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={currentPost.title || ""}
                onChange={(e) => setCurrentPost({ ...currentPost, title: e.target.value })}
                placeholder="Enter blog post title"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={currentPost.category || ""}
                onChange={(e) => setCurrentPost({ ...currentPost, category: e.target.value })}
                placeholder="e.g., Sustainability, Tips, News"
              />
            </div>

            <div>
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={currentPost.author || ""}
                onChange={(e) => setCurrentPost({ ...currentPost, author: e.target.value })}
                placeholder="Author name"
              />
            </div>

            <div>
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={currentPost.excerpt || ""}
                onChange={(e) => setCurrentPost({ ...currentPost, excerpt: e.target.value })}
                placeholder="Brief summary of the post"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                rows={8}
                value={currentPost.content || ""}
                onChange={(e) => setCurrentPost({ ...currentPost, content: e.target.value })}
                placeholder="Full blog post content"
              />
            </div>

            <div>
              <Label htmlFor="imageUrl">Featured Image URL</Label>
              <Input
                id="imageUrl"
                value={currentPost.imageUrl || ""}
                onChange={(e) => setCurrentPost({ ...currentPost, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <Label>Upload Featured Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
              {currentPost.imageUrl && (
                <img
                  src={currentPost.imageUrl}
                  alt="Preview"
                  className="mt-2 h-32 w-full object-cover rounded-lg"
                />
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave}>Save Post</Button>
              <Button 
                variant="outline" 
                onClick={() => { 
                  setIsEditing(false); 
                  setCurrentPost({}); 
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No blog posts yet. Create your first post!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id} style={{ backgroundColor: "#f0f4f8" }}>
              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
              )}
              <CardHeader>
                <CardTitle className="text-lg">{post.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-1">
                  {post.category} • {new Date(post.date).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground mb-1">By {post.author}</p>
                <p className="text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(post)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(post.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}