import { useState } from "react";
import AppContext from "./AppContext";
import { db, storage } from "../lib/firebase";

const AppContextProvider = ({ children }) => {
  const [globalState, setGlobalState] = useState({ AuthenticatedUser: null, StoreConfig: {}, EnvironmentConfigs: {} });

  return (
    <AppContext.Provider value={{ globalState, setGlobalState, db, storage }}>
      {children}
    </AppContext.Provider>
  );
};


export default AppContextProvider;



