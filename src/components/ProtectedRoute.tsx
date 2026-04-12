import { useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AppContext from "../context/AppContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { globalState } = useContext(AppContext);
  const navigate  = useNavigate();
  const location  = useLocation();

  const user         = (globalState as any)?.AuthenticatedUser;
  const isAuthed     = !!user && (user.isAdmin || user.isSuperAdmin || user.IsAdmin || user.IsSuperAdmin || user.role === "Admin" || user.role === "SuperAdmin");
  const isSuperAdmin = user?.role === "SuperAdmin" || user?.isSuperAdmin === true || user?.IsSuperAdmin === true;
  const tenantId     = user?.tenantId || user?.TenantId;

  useEffect(() => {
    if (!user) {
      // Not logged in — send to login, preserve intended destination
      navigate("/login", { replace: true, state: { from: location.pathname } });
      return;
    }

    if (!isAuthed) {
      navigate("/login", { replace: true });
      return;
    }

    // Tenant admins (non-SuperAdmin) always land in their builder
    if (!isSuperAdmin && tenantId) {
      const alreadyInBuilder = location.pathname.startsWith("/builder/");
      if (!alreadyInBuilder) {
        navigate(`/builder/${tenantId}`, { replace: true });
      }
    }
  }, [user, isAuthed, isSuperAdmin, tenantId, location.pathname]);

  // While we have a user, render children (redirect happens via useEffect)
  if (!user) return null;

  return <>{children}</>;
}