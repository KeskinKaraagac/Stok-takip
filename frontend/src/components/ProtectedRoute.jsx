import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allow }) {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="auth-loading">
        <div className="text-slate-500 text-sm">Yükleniyor...</div>
      </div>
    );
  }
  if (user === false) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(user.role)) {
    return (
      <div className="p-10" data-testid="forbidden">
        <h2 className="text-2xl font-semibold text-slate-900">Yetkisiz Erişim</h2>
        <p className="text-slate-500 mt-2">Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    );
  }
  return children;
}
