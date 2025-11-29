import React from 'react'
import { useState, useContext } from "react";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import AppContext from '../context/AppContext';

const UsefireFunctionsHook = () => {

  const { globalState,setGlobalState, db} = useContext(AppContext);
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
      
      console.log(`✅ Store config updated successfully for: ${configID}`);
      return { success: true, configID };
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

  return {
    saveStoreConfig,
    updateStoreConfig,
    getStoreConfig,
    initializeStore,
    updateStoreSection,
    exampleInitializeStore,
    exampleUpdateNavbar,
    exampleGetConfig,
    exampleBulkUpdate
  }
}

export default UsefireFunctionsHook
