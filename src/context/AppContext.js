import React from 'react';

const AppContext = React.createContext({
  globalState: {
    AuthenticatedUser: null,  
    StoreConfig: {},
    EnvironmentConfigs: {},
    activeTenant: null,       
    tenants: [],     
    platformName: 'Sitecore Admin', 
  },
  setGlobalState: () => {},
  db: null,
  storage: null,
});

export default AppContext;