import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const [role, setRole] = useState(user?.role || localStorage.getItem("userRole"));
  const [menuOpen, setMenuOpen] = useState(false); // 🔥 Hamburger state

  useEffect(() => {
    const currentRole = user?.role || localStorage.getItem("userRole");
    setRole(currentRole);
  }, [location, user]);

  // 🔥 Route change pe menu band karo
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
  };

  const linkActiveStyle = (path) => ({
    ...linkStyle,
    color: location.pathname === path ? "#00e5ff" : "#ffffff",
    borderBottom: location.pathname === path ? "3px solid #00e5ff" : "none",
    paddingBottom: "5px",
  });

  // Mobile link style (vertical menu ke liye)
  const mobileLinkStyle = (path) => ({
    display: "block",
    padding: "12px 20px",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "15px",
    color: location.pathname === path ? "#00e5ff" : "#ffffff",
    borderLeft: location.pathname === path ? "3px solid #00e5ff" : "3px solid transparent",
    background: location.pathname === path ? "rgba(0, 229, 255, 0.08)" : "transparent",
    transition: "0.2s",
  });

  return (
    <>
      <style>{`
        .hamburger-btn {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 5px;
          flex-direction: column;
          gap: 5px;
          flex-shrink: 0;
        }
        .hamburger-btn span {
          display: block;
          width: 24px;
          height: 2px;
          background: #ffffff;
          border-radius: 2px;
          transition: 0.3s;
        }
        .nav-logo {
          font-size: 14px;
          font-weight: bold;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 1;
          min-width: 0;
          line-height: 1.3;
        }
        .nav-desktop-links {
          display: flex;
          gap: 25px;
          flex: 1;
          justify-content: center;
        }
        .nav-right {
          display: flex;
          align-items: center;
          gap: 15px;
          flex-shrink: 0;
        }
        .mobile-menu {
          display: none;
        }
        @media (max-width: 768px) {
          .hamburger-btn { display: flex !important; }
          .nav-desktop-links { display: none !important; }
          .nav-right { display: none !important; }
          .nav-logo { font-size: 11px; }
          .mobile-menu {
            display: block;
            position: fixed;
            top: 65px;
            left: 0;
            right: 0;
            background: linear-gradient(180deg, #00008b 0%, #4b0082 100%);
            z-index: 999;
            box-shadow: 0 8px 20px rgba(0,0,0,0.3);
            padding: 10px 0;
            animation: slideDown 0.25s ease;
          }
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .mobile-menu-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 20px;
            border-top: 1px solid rgba(255,255,255,0.15);
            margin-top: 6px;
          }
        }
      `}</style>

      <nav style={navStyle}>
        {/* Logo */}
        <div className="nav-logo">
          <span>🏥</span> Steepray Online Appointment Booking System
        </div>

        {/* Desktop Links */}
        <div className="nav-desktop-links">
          {role === "admin" && (
            <Link to="/admin" style={linkActiveStyle("/admin")}>📊 Admin Dashboard</Link>
          )}
          {role === "doctor" && (
            <Link to="/doctor" style={linkActiveStyle("/doctor")}>🩺 Doctor Dashboard</Link>
          )}
          {role === "patient" && (
            <>
              <Link to="/patient" style={linkActiveStyle("/patient")}>🏠 Dashboard</Link>
              <Link to="/book-appointment" style={linkActiveStyle("/book-appointment")}>📅 Book</Link>
              <Link to="/my-appointments" style={linkActiveStyle("/my-appointments")}>📑 Appointments</Link>
              <Link to="/payment-history" style={linkActiveStyle("/payment-history")}>💸 Payments</Link>
            </>
          )}
        </div>

        {/* Desktop Right */}
        <div className="nav-right">
          {location.pathname !== "/" && (
            <>
              {role && (
                <span style={roleBadge}>
                  {role === 'doctor' ? '👨‍⚕️' : role === 'admin' ? '⚙️' : '👤'} {role.toUpperCase()}
                </span>
              )}
              <button onClick={handleLogout} style={logoutBtn}>Logout</button>
            </>
          )}
        </div>

        {/* 🔥 Hamburger Button (mobile only) */}
        {location.pathname !== "/" && (
          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span style={{ transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }}></span>
            <span style={{ opacity: menuOpen ? 0 : 1 }}></span>
            <span style={{ transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }}></span>
          </button>
        )}
      </nav>

      {/* 🔥 Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="mobile-menu">
          {role === "admin" && (
            <Link to="/admin" style={mobileLinkStyle("/admin")}>📊 Admin Dashboard</Link>
          )}
          {role === "doctor" && (
            <Link to="/doctor" style={mobileLinkStyle("/doctor")}>🩺 Doctor Dashboard</Link>
          )}
          {role === "patient" && (
            <>
              <Link to="/patient" style={mobileLinkStyle("/patient")}>🏠 Dashboard</Link>
              <Link to="/book-appointment" style={mobileLinkStyle("/book-appointment")}>📅 Book Appointment</Link>
              <Link to="/my-appointments" style={mobileLinkStyle("/my-appointments")}>📑 My Appointments</Link>
              <Link to="/payment-history" style={mobileLinkStyle("/payment-history")}>💸 Payment History</Link>
            </>
          )}

          {/* Role badge + Logout at bottom */}
          <div className="mobile-menu-footer">
            {role && (
              <span style={{ ...roleBadge, fontSize: "12px" }}>
                {role === 'doctor' ? '👨‍⚕️' : role === 'admin' ? '⚙️' : '👤'} {role.toUpperCase()}
              </span>
            )}
            <button onClick={handleLogout} style={{ ...logoutBtn, marginLeft: 'auto' }}>
              🚪 Logout
            </button>
          </div>
        </div>
      )}

      {/* 🔥 Backdrop — tap bahar karo toh menu band ho */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, top: '65px', zIndex: 998, background: 'rgba(0,0,0,0.3)' }}
        />
      )}
    </>
  );
};

const navStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 15px",
  minHeight: "65px",
  height: "auto",
  background: "linear-gradient(90deg, #00008b 0%, #4b0082 35%, #800000 100%)",
  boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
  position: "fixed",
  width: "100%",
  boxSizing: "border-box",
  top: 0,
  zIndex: 1000,
  color: "#fff",
  flexWrap: "nowrap",
  gap: "10px",
};

const linkStyle = {
  textDecoration: "none",
  fontWeight: "600",
  fontSize: "15px",
  transition: "0.3s ease",
  color: "#ffffff",
};

const roleBadge = {
  fontSize: "11px",
  fontWeight: "bold",
  background: "rgba(255, 255, 255, 0.2)",
  color: "#ffffff",
  padding: "5px 12px",
  borderRadius: "4px",
  border: "1px solid rgba(255,255,255,0.3)",
  textTransform: "uppercase",
};

const logoutBtn = {
  background: "#34495e",
  color: "white",
  border: "1px solid rgba(255,255,255,0.2)",
  padding: "6px 15px",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "13px",
};

export default Navbar;
