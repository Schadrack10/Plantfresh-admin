import React from 'react';
const AppContext = React.createContext({
  globalState: {
    AuthenticatedUser: null,
    StoreConfig: {},
    EnvironmentConfigs: {},
  },
  setGlobalState: () => {},
  db: null,
  storage: null,
});

export default AppContext;
