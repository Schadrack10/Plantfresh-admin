import { useState, useEffect, useRef } from "react";
import AppContext from "./AppContext";
import { db, storage } from "../lib/firebase";
import { tenantService } from "../services/firebase/tenantService";
import {
  doc, getDoc, onSnapshot, collection, query, where, getDocs,
} from "firebase/firestore";
import {
  getAuth, createUserWithEmailAndPassword,
  sendEmailVerification, signInWithEmailAndPassword,
} from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import { getAuth as getSecondaryAuth } from "firebase/auth";

let _secondaryApp: any = null;
const getSecondaryApp = () => {
  if (_secondaryApp) return _secondaryApp;
  const primaryApp = getApps()[0];
  if (!primaryApp) return null;
  const config = primaryApp.options;
  _secondaryApp = getApps().find((a) => a.name === "secondary") ||
    initializeApp(config, "secondary");
  return _secondaryApp;
};

export const createTenantAdminAccount = async (
  email: string,
  password: string
): Promise<{ uid: string; email: string }> => {
  const secondaryApp = getSecondaryApp();
  if (!secondaryApp) throw new Error("Firebase not initialised");

  const secondaryAuth = getSecondaryAuth(secondaryApp);
  const credential = await createUserWithEmailAndPassword(
    secondaryAuth, email, password
  );
  await sendEmailVerification(credential.user);

  await secondaryAuth.signOut();

  return { uid: credential.user.uid, email: credential.user.email! };
};

const normaliseRole = (data: any): string => {
  if (data?.IsSuperAdmin === true) return "SuperAdmin";
  if (data?.Role === "SuperAdmin")  return "SuperAdmin";
  if (data?.IsAdmin === true)       return "Admin";
  if (data?.Role === "Admin")       return "Admin";
  return "user";
};

const AppContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [globalState, setGlobalState] = useState<any>(() => {
    let user: any = null;
    let storeConfig: any = {};
    try {
      const raw = localStorage.getItem("AuthenticatedUser");
      if (raw) {
        user = JSON.parse(raw);
        if (user && !user.role) {
          user.role = user.isSuperAdmin || user.IsSuperAdmin
            ? "SuperAdmin"
            : user.isAdmin || user.IsAdmin
            ? "Admin"
            : "user";
        }
      }
      storeConfig = JSON.parse(localStorage.getItem("StoreConfig") || "{}");
    } catch { }

    return {
      AuthenticatedUser: user,
      StoreConfig: storeConfig,
      EnvironmentConfigs: {},
      activeTenant: null,
      tenants: [],
      platformName: "Sitecore Admin",
    };
  });

  const globalStateRef = useRef(globalState);
  useEffect(() => { globalStateRef.current = globalState; }, [globalState]);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "StoreConfigs", "StoreConfig001"));
        if (snap.exists()) {
          const name =
            snap.data()?.GeneralSettings?.platformName ||
            snap.data()?.GeneralSettings?.storeName    ||
            "Sitecore Admin";
          setGlobalState((prev: any) => ({ ...prev, platformName: name }));
        }
      } catch { }
    };
    load();
  }, []);

  useEffect(() => {
    const user = globalState.AuthenticatedUser;
    if (!user?.uid && !user?.email) return;

    let unsubUser = () => {};

    const attachListener = async () => {
      try {
        let userDocRef: any = null;

        if (user.uid) {
          const q    = query(collection(db, "Users"), where("uid", "==", user.uid));
          const snap = await getDocs(q);
          if (!snap.empty) userDocRef = snap.docs[0].ref;
        }
        if (!userDocRef && user.email) {
          const q    = query(collection(db, "Users"), where("Email", "==", user.email));
          const snap = await getDocs(q);
          if (!snap.empty) userDocRef = snap.docs[0].ref;
        }
        if (!userDocRef) return;

        unsubUser = onSnapshot(userDocRef, async (docSnap) => {
          if (!docSnap.exists()) return;

          const data    = docSnap.data();
          const newRole = normaliseRole(data);
          const prev    = globalStateRef.current;
          const prevRole = prev.AuthenticatedUser?.role;

          const updatedUser = {
            ...prev.AuthenticatedUser,
            role:         newRole,
            IsSuperAdmin: data.IsSuperAdmin || false,
            isAdmin:      data.IsAdmin      || false,
            isSuperAdmin: data.IsSuperAdmin || false,
            tenantId:     data.TenantId     || prev.AuthenticatedUser?.tenantId,
            TenantId:     data.TenantId     || prev.AuthenticatedUser?.TenantId,
          };

          try {
            localStorage.setItem("AuthenticatedUser", JSON.stringify(updatedUser));
          } catch { }

          const isSuperAdmin = newRole === "SuperAdmin";

          let tenants      = prev.tenants;
          let activeTenant = prev.activeTenant;

          if (newRole !== prevRole || tenants.length === 0) {
            try {
              const all     = await tenantService.getAllTenants();
              const visible = isSuperAdmin
                ? all
                : all.filter((t: any) =>
                    t.OwnerId === updatedUser.uid   ||
                    t.OwnerId === updatedUser.email ||
                    t.Id      === updatedUser.tenantId
                  );

              const storedId = localStorage.getItem("activeTenantId");
              activeTenant   = isSuperAdmin
                ? (visible.find((t: any) => t.Id === storedId) || visible[0] || null)
                : (visible[0] || null);

              tenants = visible;
            } catch (err) {
              console.error("Tenant reload failed:", err);
            }
          }

          setGlobalState((prev: any) => ({
            ...prev,
            AuthenticatedUser: updatedUser,
            tenants,
            activeTenant,
          }));
        });
      } catch (err) {
        console.error("User listener setup failed:", err);
      }
    };

    attachListener();
    return () => unsubUser();
  }, [globalState.AuthenticatedUser?.uid, globalState.AuthenticatedUser?.email]);

  return (
    <AppContext.Provider value={{ globalState, setGlobalState, db, storage }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;