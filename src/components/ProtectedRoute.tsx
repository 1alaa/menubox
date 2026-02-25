import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, userDoc, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // If role isn't known yet, block (safer than letting anyone through)
  if (allowedRoles && !role) {
    return <Navigate to="/admin" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Owner trying to reach /sa
    if (role === "owner" && location.pathname.startsWith("/sa")) {
      return <Navigate to="/admin" replace />;
    }
    // Superadmin trying to reach /admin (except login)
    if (role === "superadmin" && location.pathname.startsWith("/admin") && location.pathname !== "/admin/login") {
      return <Navigate to="/sa" replace />;
    }

    return <Navigate to="/admin" replace />;
  }


  // Owners must verify with 6-digit code before accessing protected pages
  if (role === "owner" && userDoc && userDoc.isVerified !== true) {
    // allow access only to verify/forgot/login routes
    if (!location.pathname.startsWith("/admin/verify") && !location.pathname.startsWith("/admin/forgot") && location.pathname !== "/admin/login") {
      return <Navigate to="/admin/verify" replace />;
    }
  }

  return <>{children}</>;
};
