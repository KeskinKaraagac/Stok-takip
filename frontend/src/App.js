import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CompanyProvider } from "./context/CompanyContext";
import { LanguageProvider } from "./context/LanguageContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import MySettings from "./pages/MySettings";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Production from "./pages/Production";
import Customers from "./pages/Customers";
import Sales from "./pages/Sales";
import Stock from "./pages/Stock";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import "./App.css";

function App() {
  return (
    <LanguageProvider>
      <CompanyProvider>
        <AuthProvider>
          <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route
              path="/production"
              element={
                <ProtectedRoute allow={["admin", "personel"]}>
                  <Production />
                </ProtectedRoute>
              }
            />
            <Route path="/customers" element={<Customers />} />
            <Route
              path="/sales"
              element={
                <ProtectedRoute allow={["admin", "personel"]}>
                  <Sales />
                </ProtectedRoute>
              }
            />
            <Route path="/stock" element={<Stock />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/my-settings" element={<MySettings />} />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allow={["admin"]}>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
        </AuthProvider>
      </CompanyProvider>
    </LanguageProvider>
  );
}

export default App;
