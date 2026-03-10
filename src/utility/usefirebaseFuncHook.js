import React from "react";
import { useContext } from "react";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  addDoc,
} from "firebase/firestore";
import AppContext from "../context/AppContext";
import { useToast } from "@/hooks/use-toast";

const UsefireFunctionsHook = () => {
  const { globalState, setGlobalState, db } = useContext(AppContext);
  const { toast } = useToast();

  const storeConfigsTemplate = {
    NavbarCustomization: {
      logoURL: "",
      sticky: false,
      Links: [],
    },
    HomeCustomization: {
      Banners: [
        {
          imageURL: "",
          title: "",
          description: "",
          ButtonLeft: { color: "", title: "" },
          ButtonRight: { color: "", title: "" },
        },
      ],
      NominationAdverts: {
        Title: "",
        Description: "",
        NominationAdvertsCards: [
          {
            displayedIcon: "",
            heading: "",
            smallHeading: "",
            color: "",
          },
        ],
      },
      ShopAdverts: {
        Title: "",
        carouselSliders: [
          {
            bannerHeading: "",
            bannerSmallHeading: "",
            imageURL: "",
            Button: { color: "", title: "" },
          },
        ],
      },
      BestSellersAdverts: {
        SectionTitle: "",
        SectionDescription: "",
        cards: [
          {
            cardImg: "",
            cardTitle: "",
            cardDescription: "",
            cardPrice: "",
          },
        ],
      },
      CustomersCountAdverts: {
        SectionTitle: "",
        SectionDescription: "",
        ButtonLeft: {
          title: "",
          titleColor: "",
          backgroundColor: "",
        },
        ButtonRight: {
          title: "",
          titleColor: "",
          backgroundColor: "",
        },
      },
    },
    AboutUsCustomization: {
      aboutBanner: {
        SectionTitle: "",
        SectionDescription: "",
        BackgroundColor: "",
      },
      Statistics: [{ title: "", description: "" }],
      Mission: {
        MissionDescription: "",
        Reasons: [{ Subtopic: "" }],
      },
      coreValues: {
        description: "",
        Features: [{ icon: "", title: "", description: "" }],
      },
      customerReviews: {
        Title: "",
        Cards: [
          {
            profilePic: "",
            rating: "",
            description: "",
            customerName: "",
            customerOccupation: "",
          },
        ],
      },
      ExperienceDifferenceBanner: {
        title: "",
        Description: "",
        Button: {
          title: "",
          titleColor: "",
          backgroundColor: "",
        },
      },
    },
    ProductsCustomization: {
      showRelatedProducts: true,
      showReviews: true,
      imageGalleryStyle: "",
    },
    BlogCustomization: {
      enableComments: true,
      postsPerPage: 10,
      posts: [], // Added posts array for blog posts
    },
    ContactCustomization: {
      connectionInfo: {
        number: "",
        Email: "",
        VisitAddress: "",
        Subtopic: "",
      },
      BusinessHours: {
        MonFri: "",
        Sat: "",
        Sun: "",
      },
      contactInfo: {
        Address: "",
        phone: "",
        email: "",
      },
      SupportInfo: [{ url: "", icon: "", color: "" }],
      Socials: [{ url: "", icon: "", color: "" }],
    },
    FooterCustomization: {
      backgroundColor: "",
      columns: [{ title: "", links: [] }],
      socialLinks: [],
      copyrightText: "",
    },
    ShopCustomization: {
      layout: "",
      itemsPerPage: 12,
      filters: {
        categories: [],
        priceRange: { min: 0, max: 0 },
      },
    },
    CartCustomization: {
      allowGuestCheckout: true,
      showCrossSells: true,
    },
    CheckoutCustomization: {
      steps: [],
      paymentMethods: [],
      shippingOptions: [],
    },
    ThemeCustomization: {
      primaryColor: "",
      secondaryColor: "",
      fontFamily: "",
      borderRadius: "",
    },
    GeneralSettings: {
      storeName: "",
      storeDescription: "",
      currency: "",
      timezone: "",
      language: "",
    },
  };

  // =========================
  // STORE CONFIG FUNCTIONS
  // =========================

  const saveStoreConfig = async (configID, configData) => {
    const storeRef = doc(db, "StoreConfigs", configID);
    await setDoc(storeRef, {
      ...configData,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    return { success: true, configID };
  };

  const fetchStoreConfig = async (configID) => {
    const storeRef = doc(db, "StoreConfigs", configID);
    const docSnap = await getDoc(storeRef);
    return docSnap.exists() ? docSnap.data() : null;
  };

  const updateStoreConfig = async (configID, updates) => {
    const storeRef = doc(db, "StoreConfigs", configID);
    await updateDoc(storeRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    toast({
      title: "Configuration Saved",
      description: "Store config updated successfully",
    });
  };

  const getStoreConfig = async (configID) => {
    const storeRef = doc(db, "StoreConfigs", configID);
    const docSnap = await getDoc(storeRef);
    return docSnap.exists() ? docSnap.data() : null;
  };

  const initializeStore = async (configID, initialData = {}) => {
    const storeRef = doc(db, "StoreConfigs", configID);
    const data = {
      ...storeConfigsTemplate,
      ...initialData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(storeRef, data);
    return data;
  };

  const updateStoreSection = async (configID, section, sectionData) => {
    const storeRef = doc(db, "StoreConfigs", configID);
    await updateDoc(storeRef, {
      [section]: sectionData,
      updatedAt: new Date().toISOString(),
    });
  };

  // =========================
  // BLOG FUNCTIONS (AUTO IDs)
  // =========================

  const createBlogPost = async (blogPost) => {
    const blogsCollection = collection(db, "Blogs");

    const docRef = await addDoc(blogsCollection, {
      ...blogPost,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { id: docRef.id, ...blogPost };
  };

  const updateBlogPost = async (postId, updatedData) => {
    const docRef = doc(db, "Blogs", postId);
    await updateDoc(docRef, {
      ...updatedData,
      updatedAt: new Date().toISOString(),
    });
  };

  const deleteBlogPost = async (postId) => {
    const docRef = doc(db, "Blogs", postId);
    await deleteDoc(docRef);
  };

  const fetchAllBlogs = async () => {
    const blogsCollection = collection(db, "Blogs");
    const snapshot = await getDocs(blogsCollection);

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const fetchBlogById = async (postId) => {
    const docRef = doc(db, "Blogs", postId);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  };

  const fetchBlogsByCategory = async (category) => {
    const blogsCollection = collection(db, "Blogs");
    const snapshot = await getDocs(blogsCollection);

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((blog) => blog.category === category)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  return {
    saveStoreConfig,
    fetchStoreConfig, // NEW: Added for fetching store config
    updateStoreConfig,
    getStoreConfig,
    initializeStore,
    updateStoreSection,

    createBlogPost,
    updateBlogPost,
    deleteBlogPost,
    fetchAllBlogs,
    fetchBlogById,
    fetchBlogsByCategory,
  };
};

export default UsefireFunctionsHook;