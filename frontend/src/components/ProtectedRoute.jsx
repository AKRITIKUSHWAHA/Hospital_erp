import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useContext(AuthContext);
  
  // Backup check localStorage se
  const storedRole = localStorage.getItem("userRole");

  if (loading) return <div style={{padding: '20px', textAlign: 'center'}}>Loading...</div>;

  // Agar na context mein user hai na localStorage mein role, tabhi login bhejो
  if (!user && !storedRole) {
    return <Navigate to="/" replace />;
  }

  // Final role check
  const currentUserRole = user?.role || storedRole;
  if (role && currentUserRole !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;