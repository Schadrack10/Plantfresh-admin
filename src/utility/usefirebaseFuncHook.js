import React from 'react'
import { useState, useContext } from "react";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import AppContext from '../context/AppContext';
import { useToast } from "@/hooks/use-toast";

const UsefireFunctionsHook = () => {

  const { globalState, setGlobalState, db } = useContext(AppContext);
  const { toast } = useToast();
  
  const storeConfigsTemplate = {
    NavbarCustomization: {
      logoURL: '',
      sticky: false,
      Links: []
    },
    HomeCustomization: {
      Banners: [
        {
          imageURL: '',
          title: '',
          description: '',
          ButtonLeft: { color: '', title: '' },
          ButtonRight: { color: '', title: '' }
        }
      ],
      NominationAdverts: {
        Title: '',
        Description: '',
        NominationAdvertsCards: [
          {
            displayedIcon: '',
            heading: '',
            smallHeading: '',
            color: ''
          }
        ]
      },
      ShopAdverts: {
        Title: '',
        carouselSliders: [
          {
            bannerHeading: '',
            bannerSmallHeading: '',
            imageURL: '',
            Button: { color: '', title: '' }
          }
        ]
      },
      BestSellersAdverts: {
        SectionTitle: '',
        SectionDescription: '',
        cards: [
          {
            cardImg: '',
            cardTitle: '',
            cardDescription: '',
            cardPrice: ''
          }
        ]
      },
      CustomersCountAdverts: {
        SectionTitle: '',
        SectionDescription: '',
        ButtonLeft: {
          title: '',
          titleColor: '',
          backgroundColor: ''
        },
        ButtonRight: {
          title: '',
          titleColor: '',
          backgroundColor: ''
        }
      }
    },
    AboutUsCustomization: {
      aboutBanner: {
        SectionTitle: '',
        SectionDescription: '',
        BackgroundColor: ''
      },
      Statistics: [{ title: '', description: '' }],
      Mission: {
        MissionDescription: '',
        Reasons: [{ Subtopic: '' }]
      },
      coreValues: {
        description: '',
        Features: [{ icon: '', title: '', description: '' }]
      },
      customerReviews: {
        Title: '',
        Cards: [
          {
            profilePic: '',
            rating: '',
            description: '',
            customerName: '',
            customerOccupation: ''
          }
        ]
      },
      ExperienceDifferenceBanner: {
        title: '',
        Description: '',
        Button: {
          title: '',
          titleColor: '',
          backgroundColor: ''
        }
      }
    },
    ProductsCustomization: {
      showRelatedProducts: true,
      showReviews: true,
      imageGalleryStyle: ''
    },
    BlogCustomization: {
      enableComments: true,
      postsPerPage: 10
    },
    ContactCustomization: {
      connectionInfo: {
        number: '',
        Email: '',
        VisitAddress: '',
        Subtopic: ''
      },
      BusinessHours: {
        MonFri: '',
        Sat: '',
        Sun: ''
      },
      contactInfo: {
        Address: '',
        phone: '',
        email: ''
      },
      SupportInfo: [{ url: '', icon: '', color: '' }],
      Socials: [{ url: '', icon: '', color: '' }]
    },
    FooterCustomization: {
      backgroundColor: '',
      columns: [{ title: '', links: [] }],
      socialLinks: [],
      copyrightText: ''
    },
    ShopCustomization: {
      layout: '',
      itemsPerPage: 12,
      filters: {
        categories: [],
        priceRange: { min: 0, max: 0 }
      }
    },
    CartCustomization: {
      allowGuestCheckout: true,
      showCrossSells: true
    },
    CheckoutCustomization: {
      steps: [],
      paymentMethods: [],
      shippingOptions: []
    },
    ThemeCustomization: {
      primaryColor: '',
      secondaryColor: '',
      fontFamily: '',
      borderRadius: ''
    },
    GeneralSettings: {
      storeName: '',
      storeDescription: '',
      currency: '',
      timezone: '',
      language: ''
    }
  };

  // =========================
  // STORE CONFIG FUNCTIONS
  // =========================

  /**
   * Create or update complete store configuration
   * @param {string} configID - Unique store identifier (e.g., "kwELHDh70dy4Gu0SePuo")
   * @param {object} configData - Store configuration object
   */
  const saveStoreConfig = async (configID, configData) => {
    try {
      const storeRef = doc(db, "StoreConfigs", configID);
      
      await setDoc(storeRef, {
        ...configData,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      
      console.log(`✅ Store config saved successfully for: ${configID}`);
      return { success: true, configID };
    } catch (error) {
      console.error("❌ Error saving store config:", error);
      throw error;
    }
  };
  
  /**
   * Update existing store configuration (merge with existing data)
   * @param {string} configID - Unique store identifier (e.g., "kwELHDh70dy4Gu0SePuo")
   * @param {object} updates - Partial configuration updates
   */
  const updateStoreConfig = async (configID, updates) => {
    try {
      const storeRef = doc(db, "StoreConfigs", configID);
      
      await updateDoc(storeRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });

      toast({
        title: "Configuration Saved",
        description: `✅ Store config updated successfully`,
      });

    } catch (error) {
      console.error("❌ Error updating store config:", error);
      throw error;
    }
  };
  
  /**
   * Get store configuration by ID
   * @param {string} configID - Unique store identifier (e.g., "kwELHDh70dy4Gu0SePuo")
   */
  const getStoreConfig = async (configID) => {
    try {
      const storeRef = doc(db, "StoreConfigs", configID);
      const docSnap = await getDoc(storeRef);
      
      if (docSnap.exists()) {
        console.log(`✅ Store config retrieved for: ${configID}`);
        return docSnap.data();
      } else {
        console.log("⚠️ No store config found");
        return null;
      }
    } catch (error) {
      console.error("❌ Error getting store config:", error);
      throw error;
    }
  };
  
  /**
   * Initialize a new store with default configuration
   * @param {string} configID - Unique store identifier (e.g., "kwELHDh70dy4Gu0SePuo")
   * @param {object} initialData - Optional initial data to override defaults
   */
  const initializeStore = async (configID, initialData = {}) => {
    try {
      const defaultConfig = {
        ...initialData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const storeRef = doc(db, "StoreConfigs", configID);
      await setDoc(storeRef, defaultConfig);
      
      console.log(`✅ Store initialized successfully: ${configID}`);
      return { success: true, configID, config: defaultConfig };
    } catch (error) {
      console.error("❌ Error initializing store:", error);
      throw error;
    }
  };
  
  /**
   * Update a specific section of the store config
   * @param {string} configID - Unique store identifier (e.g., "kwELHDh70dy4Gu0SePuo")
   * @param {string} section - Section name (e.g., 'NavbarCustomization')
   * @param {object} sectionData - Section data to update
   */
  const updateStoreSection = async (configID, section, sectionData) => {
    try {
      const storeRef = doc(db, "StoreConfigs", configID);
      
      await updateDoc(storeRef, {
        [section]: sectionData,
        updatedAt: new Date().toISOString()
      });
      
      console.log(`✅ ${section} updated successfully for: ${configID}`);
      return { success: true, configID, section };
    } catch (error) {
      console.error(`❌ Error updating ${section}:`, error);
      throw error;
    }
  };

  // =========================
  // BLOG FUNCTIONS
  // =========================

  /**
   * Create a new blog post
   * @param {object} blogPost - Blog post object with id, title, content, etc.
   */
  const createBlogPost = async (blogPost) => {
    try {
      const docRef = doc(db, "Blogs", blogPost.id);
      await setDoc(docRef, {
        ...blogPost,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log("✅ Blog post created successfully:", blogPost.id);
      return blogPost;
    } catch (error) {
      console.error("❌ Error creating blog post:", error);
      throw error;
    }
  };

  /**
   * Update an existing blog post
   * @param {string} postId - Blog post ID
   * @param {object} updatedData - Updated blog post data
   */
  const updateBlogPost = async (postId, updatedData) => {
    try {
      const docRef = doc(db, "Blogs", postId);
      await updateDoc(docRef, {
        ...updatedData,
        updatedAt: new Date().toISOString()
      });
      console.log("✅ Blog post updated successfully:", postId);
      return updatedData;
    } catch (error) {
      console.error("❌ Error updating blog post:", error);
      throw error;
    }
  };

  /**
   * Delete a blog post
   * @param {string} postId - Blog post ID to delete
   */
  const deleteBlogPost = async (postId) => {
    try {
      const docRef = doc(db, "Blogs", postId);
      await deleteDoc(docRef);
      console.log("✅ Blog post deleted successfully:", postId);
    } catch (error) {
      console.error("❌ Error deleting blog post:", error);
      throw error;
    }
  };

  /**
   * Fetch all blog posts
   * @returns {Array} Array of blog post objects
   */
  const fetchAllBlogs = async () => {
    try {
      const blogsCollection = collection(db, "Blogs");
      const blogsSnapshot = await getDocs(blogsCollection);
      const blogsList = blogsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by date (newest first)
      blogsList.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      console.log(`✅ Fetched ${blogsList.length} blog posts`);
      return blogsList;
    } catch (error) {
      console.error("❌ Error fetching blogs:", error);
      throw error;
    }
  };

  /**
   * Fetch a single blog post by ID
   * @param {string} postId - Blog post ID
   * @returns {object} Blog post object
   */
  const fetchBlogById = async (postId) => {
    try {
      const docRef = doc(db, "Blogs", postId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log(`✅ Blog post retrieved: ${postId}`);
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        console.log("⚠️ No blog post found with ID:", postId);
        return null;
      }
    } catch (error) {
      console.error("❌ Error fetching blog post:", error);
      throw error;
    }
  };

  /**
   * Fetch blog posts by category
   * @param {string} category - Category name
   * @returns {Array} Array of blog post objects
   */
  const fetchBlogsByCategory = async (category) => {
    try {
      const blogsCollection = collection(db, "Blogs");
      const blogsSnapshot = await getDocs(blogsCollection);
      const blogsList = blogsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(blog => blog.category === category);
      
      blogsList.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      console.log(`✅ Fetched ${blogsList.length} blog posts in category: ${category}`);
      return blogsList;
    } catch (error) {
      console.error("❌ Error fetching blogs by category:", error);
      throw error;
    }
  };

  // =========================
  // USAGE EXAMPLES
  // =========================
  
  // Example 1: Initialize your existing store with default config
  const exampleInitializeStore = async () => {
    await initializeStore("kwELHDh70dy4Gu0SePuo", {
      GeneralSettings: {
        storeName: "My Awesome Store",
        storeDescription: "Best products online",
        currency: "USD",
        timezone: "America/New_York",
        language: "en"
      }
    });
  };
  
  // Example 2: Update navbar customization for your store
  const exampleUpdateNavbar = async () => {
    await updateStoreSection("kwELHDh70dy4Gu0SePuo", "NavbarCustomization", {
      logoURL: "https://example.com/logo.png",
      sticky: true,
      Links: [
        { label: "Home", url: "/" },
        { label: "Shop", url: "/shop" },
        { label: "About", url: "/about" }
      ]
    });
  };
  
  // Example 3: Get current store config
  const exampleGetConfig = async () => {
    const config = await getStoreConfig("kwELHDh70dy4Gu0SePuo");
    console.log("Current config:", config);
  };
  
  // Example 4: Update multiple sections at once
  const exampleBulkUpdate = async () => {
    await updateStoreConfig("kwELHDh70dy4Gu0SePuo", {
      ThemeCustomization: {
        primaryColor: "#007bff",
        secondaryColor: "#6c757d",
        fontFamily: "Inter, sans-serif",
        borderRadius: "8px"
      },
      ShopCustomization: {
        layout: "grid",
        itemsPerPage: 24,
        filters: {
          categories: ["Electronics", "Clothing", "Home"],
          priceRange: { min: 0, max: 1000 }
        }
      }
    });
  };

  // Example 5: Create a blog post
  const exampleCreateBlog = async () => {
    await createBlogPost({
      id: "blog_" + Date.now(),
      title: "Getting Started with Our Products",
      excerpt: "Learn how to make the most of our eco-friendly products",
      content: "Full blog post content here...",
      author: "John Doe",
      category: "Sustainability",
      imageUrl: "https://example.com/blog-image.jpg",
      date: new Date().toISOString()
    });
  };

  return {
    // Store Config Functions
    saveStoreConfig,
    updateStoreConfig,
    getStoreConfig,
    initializeStore,
    updateStoreSection,
    
    // Blog Functions
    createBlogPost,
    updateBlogPost,
    deleteBlogPost,
    fetchAllBlogs,
    fetchBlogById,
    fetchBlogsByCategory,
    
    // Examples
    exampleInitializeStore,
    exampleUpdateNavbar,
    exampleGetConfig,
    exampleBulkUpdate,
    exampleCreateBlog
  }
}

export default UsefireFunctionsHook