export default function Header({ title }) {
  return (
    <div style={headerStyle}>
      <h1>{title}</h1>
    </div>
  );
}

const headerStyle = {
  background: "#f0f4f8",
  padding: 20,
  borderRadius: 10,
  marginBottom: 20,
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};
