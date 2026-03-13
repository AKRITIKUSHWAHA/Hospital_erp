export default function Footer() {
  return (
    <>
      <style>{`
        .footer-text {
          font-size: 14px;
        }
        @media (max-width: 768px) {
          .footer-text {
            font-size: 11px;
          }
        }
        @media (max-width: 420px) {
          .footer-text {
            font-size: 10px;
          }
        }
      `}</style>
      <footer style={footerStyle}>
        <span className="footer-text">
          &copy; {new Date().getFullYear()} Steepray Information Services Pvt. Ltd. All rights reserved.
        </span>
      </footer>
    </>
  );
}

const footerStyle = {
  textAlign: "center",
  padding: "0 15px",
  height: "55px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(90deg, #00008b 0%, #4b0082 35%, #800000 100%)",
  color: "#fff",
  borderTop: "2px solid #00e5ff",
  fontWeight: "500",
  position: "fixed",
  bottom: 0,
  left: 0,
  width: "100%",
  zIndex: 2000,
  boxSizing: "border-box",
};
