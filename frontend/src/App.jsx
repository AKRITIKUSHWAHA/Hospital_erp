import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext"; 
import ProtectedRoute from "./components/ProtectedRoute";
import { useEffect } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import BookAppointment from "./pages/BookAppointment";
import MyAppointments from "./pages/MyAppointments";
import PaymentHistory from "./pages/PaymentHistory"; 
import MedicalRecords from "./pages/MedicalRecords";

function App() {
  useEffect(() => {
    const loginTime = localStorage.getItem("loginTimestamp");
    if (loginTime) {
      const currentTime = new Date().getTime();
      const twelveHours = 12 * 60 * 60 * 1000;
      if (currentTime - loginTime > twelveHours) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/";
      }
    }
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Patient Routes */}
          <Route path="/patient" element={<ProtectedRoute role="patient"><PatientDashboard /></ProtectedRoute>} />
          <Route path="/book-appointment" element={<ProtectedRoute role="patient"><BookAppointment /></ProtectedRoute>} />
          <Route path="/my-appointments" element={<ProtectedRoute role="patient"><MyAppointments /></ProtectedRoute>} />
          <Route path="/payment-history" element={<ProtectedRoute role="patient"><PaymentHistory /></ProtectedRoute>} />
          <Route path="/medical-records" element={<ProtectedRoute role="patient"><MedicalRecords /></ProtectedRoute>} />

          {/* Doctor & Admin */}
          <Route path="/doctor" element={<ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;