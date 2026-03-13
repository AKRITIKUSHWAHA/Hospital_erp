import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const registerStyles = `
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

  .register-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 80px 16px;
    box-sizing: border-box;
    background: #f5f7fa;
  }

  .register-card {
    background: white;
    padding: 35px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    width: 100%;
    max-width: 420px;
    box-sizing: border-box;
  }

  .register-title {
    text-align: center;
    color: #333;
    margin: 0 0 8px 0;
    font-size: 22px;
    font-weight: 800;
  }

  .register-subtitle {
    text-align: center;
    color: #888;
    font-size: 13px;
    margin: 0 0 25px 0;
  }

  .reg-form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 18px;
  }

  .reg-label {
    font-weight: 700;
    color: #444;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .reg-input {
    padding: 14px;
    border-radius: 8px;
    border: 1px solid #ddd;
    font-size: 15px;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }

  .reg-input:focus {
    border-color: #4b0082;
    box-shadow: 0 0 0 3px rgba(75, 0, 130, 0.08);
  }

  .role-tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }

  .role-btn {
    flex: 1;
    padding: 12px 6px;
    border: 1px solid #ddd;
    cursor: pointer;
    border-radius: 6px;
    background: #f9f9f9;
    font-weight: 600;
    font-size: 13px;
    transition: 0.2s;
  }

  .role-btn.active {
    background: #4b0082;
    color: white;
    border-color: #4b0082;
  }

  .reg-submit-btn {
    width: 100%;
    padding: 14px;
    background: #800000;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    margin-top: 5px;
    transition: background 0.2s;
  }

  .reg-submit-btn:hover {
    background: #6b0000;
  }

  .reg-login-link {
    text-align: center;
    margin-top: 20px;
    font-size: 14px;
    color: #666;
  }

  .reg-login-link a {
    color: #4b0082;
    font-weight: bold;
    text-decoration: none;
  }

  .reg-login-link a:hover {
    text-decoration: underline;
  }

  /* 📱 Mobile */
  @media (max-width: 480px) {
    .register-card {
      padding: 24px 18px;
      border-radius: 10px;
    }
    .register-title { font-size: 19px; }
    .role-btn { font-size: 12px; padding: 10px 4px; }
    .reg-submit-btn { font-size: 15px; padding: 13px; }
    .reg-input { padding: 12px; font-size: 14px; }
  }
`;

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "", email: "", password: "", role: "patient",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Registration Successful (Frontend Only)");
    navigate("/");
  };

  return (
    <>
      <style>{registerStyles}</style>
      <Navbar />

      <div className="register-container">
        <div className="register-card">
          <h2 className="register-title">📋 Create Account</h2>
          <p className="register-subtitle">Join Steepray Appointment System</p>

          {/* Role Selector */}
          <div className="role-tabs">
            {["patient", "doctor"].map((r) => (
              <button
                key={r}
                type="button"
                className={`role-btn ${formData.role === r ? "active" : ""}`}
                onClick={() => setFormData({ ...formData, role: r })}
              >
                {r === "patient" ? "👤 PATIENT" : "👨‍⚕️ DOCTOR"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="reg-form-group">
              <label className="reg-label">Full Name</label>
              <input
                className="reg-input"
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="reg-form-group">
              <label className="reg-label">Email Address</label>
              <input
                className="reg-input"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="reg-form-group">
              <label className="reg-label">Password</label>
              <input
                className="reg-input"
                type="password"
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="reg-submit-btn">
              Register Now 🚀
            </button>
          </form>

          <div className="reg-login-link">
            Already have an account? <Link to="/">Login here</Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
