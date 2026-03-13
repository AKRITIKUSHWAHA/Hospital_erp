import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const loginStyles = `
  body, html {
    margin: 0;
    padding: 0;
    height: 100%;
    background: #f5f7fa;
    overflow-x: hidden;
  }
  nav {
    position: fixed !important;
    top: 0 !important;
    width: 100% !important;
    z-index: 2000 !important;
  }
  footer {
    position: fixed !important;
    bottom: 0 !important;
    width: 100% !important;
    z-index: 2000 !important;
  }

  .login-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 80px 16px;
    box-sizing: border-box;
  }

  .login-card {
    background: white;
    padding: 35px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    width: 100%;
    max-width: 400px;
    box-sizing: border-box;
  }

  .role-tabs { display: flex; gap: 10px; margin-bottom: 25px; }
  .role-btn {
    flex: 1;
    padding: 12px 6px;
    border: 1px solid #ddd;
    cursor: pointer;
    border-radius: 6px;
    background: #f9f9f9;
    font-weight: 600;
    font-size: 13px;
  }
  .role-btn.active {
    background: #4b0082;
    color: white;
    border-color: #4b0082;
  }

  .form-group { margin-bottom: 20px; }
  .form-group input {
    width: 100%;
    padding: 14px;
    border: 1px solid #ccc;
    border-radius: 6px;
    box-sizing: border-box;
    font-size: 15px;
  }

  .submit-btn {
    width: 100%;
    padding: 14px;
    background: #800000;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 17px;
    font-weight: bold;
  }

  .login-title {
    text-align: center;
    color: #333;
    margin-bottom: 25px;
    font-size: 22px;
  }

  /* 📱 Mobile */
  @media (max-width: 480px) {
    .login-card {
      padding: 24px 18px;
      border-radius: 10px;
    }
    .login-title { font-size: 19px; }
    .role-btn { font-size: 12px; padding: 10px 4px; }
    .submit-btn { font-size: 15px; padding: 13px; }
    .form-group input { padding: 12px; font-size: 14px; }
  }
`;

export default function LoginPage() {
  const [role, setRole] = useState("patient");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (role === "patient") {
      if (mobile.length !== 10) {
        toast.error("Please enter a valid 10-digit mobile number!");
        return;
      }
      try {
        const res = await axios.post("http://localhost:5000/api/patient-login", {
          name: username,
          mobile: mobile
        });
        if (res.data.success) {
          localStorage.setItem("patientName", username);
          localStorage.setItem("patientMobile", mobile);
          localStorage.setItem("userRole", "patient");
          localStorage.setItem("loginTime", Date.now().toString());
          localStorage.setItem("loginTimestamp", Date.now().toString());
          login({ role: "patient", name: username, mobile: mobile });
          toast.success(res.data.message || "Welcome Patient!");
          setTimeout(() => navigate("/patient"), 1000);
        }
      } catch (err) {
        console.error("SQL Storage Error:", err);
        toast.error("Failed to connect to Database!");
      }
    } else {
      try {
        const res = await axios.post("http://localhost:5000/api/login", { username, password, role });
        if (res.data.success) {
          localStorage.setItem("userRole", res.data.user.role);
          localStorage.setItem("loginTime", Date.now().toString());
          localStorage.setItem("loginTimestamp", Date.now().toString());
          login({ role: res.data.user.role, name: res.data.user.full_name });
          toast.success("Login Success!");
          const target = res.data.user.role === "admin" ? "/admin" : "/doctor";
          navigate(target);
        }
      } catch (err) {
        toast.error("Invalid Credentials!");
      }
    }
  };

  return (
    <>
      <style>{loginStyles}</style>
      <Navbar />

      <div className="login-container">
        <div className="login-card">
          <h2 className="login-title">🔐 Login</h2>

          <div className="role-tabs">
            {["patient", "doctor", "admin"].map((r) => (
              <button
                key={r}
                type="button"
                className={`role-btn ${role === r ? "active" : ""}`}
                onClick={() => setRole(r)}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <input
                type="text"
                placeholder="Your Name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            {role === "patient" ? (
              <div className="form-group">
                <input
                  type="tel"
                  placeholder="Mobile Number (10 Digits)"
                  value={mobile}
                  maxLength="10"
                  inputMode="numeric"
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setMobile(val);
                  }}
                  required
                />
              </div>
            ) : (
              <div className="form-group">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <button type="submit" className="submit-btn">Login</button>
          </form>
        </div>
      </div>

      <Footer />
      <ToastContainer position="top-center" />
    </>
  );
}
