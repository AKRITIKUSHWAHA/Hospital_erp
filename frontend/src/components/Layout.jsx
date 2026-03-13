import Navbar from "./Navbar";
import Footer from "./Footer";

export default function Layout({ children }) {
  return (
    <div style={gridLayout}>
      <header style={headerArea}>
        <Navbar />
      </header>

      <main style={mainArea}>
        {children}
      </main>

      <footer style={footerArea}>
        <Footer />
      </footer>

      {/* 🔥 Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .layout-main {
            padding: 12px 10px !important;
          }
        }
        @media (max-width: 420px) {
          .layout-main {
            padding: 10px 8px !important;
          }
        }
      `}</style>
    </div>
  );
}

const gridLayout = {
  display: "grid",
  gridTemplateRows: "65px 1fr 55px",
  height: "100vh",
  width: "100vw",
  overflow: "hidden",
  background: "#f5f7fa",
};

const headerArea = {
  gridRow: "1",
  zIndex: 1000,
  width: "100%",
};

const mainArea = {
  gridRow: "2",
  overflowY: "auto",
  padding: "20px 40px",
  boxSizing: "border-box",
  width: "100%",
  display: "flex",
  flexDirection: "column",
};

const footerArea = {
  gridRow: "3",
  zIndex: 1000,
  width: "100%",
};
