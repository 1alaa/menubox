import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Pages
import LandingPage from "./pages/LandingPage";
import CustomerMenuPage from "./pages/CustomerMenuPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

// Owner
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import CreateRestaurantPage from "./pages/owner/CreateRestaurantPage";
import BrandingSettingsPage from "./pages/owner/BrandingSettingsPage";
import MenuManagePage from "./pages/owner/MenuManagePage";
import QRCodePage from "./pages/owner/QRCodePage";

// Super Admin
import SuperAdminDashboard from "./pages/sa/SuperAdminDashboard";
import ManageRestaurantPage from "./pages/sa/ManageRestaurantPage";
import SuperAdminMenuManagePage from "./pages/sa/SuperAdminMenuManagePage";

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center text-stone-500">
      Page not found
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/r/:slug" element={<CustomerMenuPage />} />

          {/* Auth */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/verify" element={<VerifyEmailPage />} />
          <Route path="/admin/forgot" element={<ForgotPasswordPage />} />

          {/* Owner */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/create"
            element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <CreateRestaurantPage />
              </ProtectedRoute>
            }
          />

          {/* ✅ FIX: alias للمسار اللي الزر عم يروح عليه */}
          <Route
            path="/admin/restaurant"
            element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <CreateRestaurantPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/branding"
            element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <BrandingSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/menu"
            element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <MenuManagePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/qr"
            element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <QRCodePage />
              </ProtectedRoute>
            }
          />

          {/* Super Admin */}
          <Route
            path="/sa"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sa/restaurants/:id"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <ManageRestaurantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sa/restaurants/:id/menu"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <SuperAdminMenuManagePage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}