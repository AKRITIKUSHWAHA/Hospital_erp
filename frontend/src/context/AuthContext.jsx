import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    const name = localStorage.getItem("userName");
    const mobile = localStorage.getItem("patientMobile");

    if (role && name) {
      setUser({ role, name, mobile });
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("userRole", userData.role);
    localStorage.setItem("userName", userData.name);
    localStorage.setItem("loginTimestamp", new Date().getTime()); // App.js ki session logic ke liye
    
    const mobileNum = userData.mobile || userData.patient_mobile;
    if (mobileNum) {
      localStorage.setItem("patientMobile", mobileNum);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};