import { useState } from "react";
import AppContext from "./AppContext";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";


const AppContextProvider = ({ children }) => {
  const [globalState, setGlobalState] = useState({AuthenticatedUser: {}, StoreConfig: {} , EnvironmentConfigs: {}});
  const firebaseConfig = {
    apiKey: "AIzaSyARbyFNMANytoxtYpKkBVm_VkBGsAMKBwM",
    authDomain: "plant-fresh.firebaseapp.com",
    projectId: "plant-fresh",
    storageBucket: "plant-fresh.firebasestorage.app",
    messagingSenderId: "650633366864",
    appId: "1:650633366864:web:ba360fc88b07bf4d21b055",
    measurementId: "G-9YXGWPESG4"
  };
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  return (
    <AppContext.Provider value={{ globalState, setGlobalState , db , analytics, storage , uploadBytes, ref, getDownloadURL}}>
      {children}
    </AppContext.Provider>
  );
};


export default AppContextProvider;



