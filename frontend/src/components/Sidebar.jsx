import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function Sidebar() {
  const { user } = useContext(AuthContext);

  return (
    <aside className="w-64 bg-white shadow-md p-4">
      <ul className="space-y-4">

        {user?.role === "patient" && (
          <>
            <li><Link to="/patient">Dashboard</Link></li>
            <li><Link to="/book">Book Appointment</Link></li>
          </>
        )}

        {user?.role === "doctor" && (
          <>
            <li><Link to="/doctor">Dashboard</Link></li>
          </>
        )}

        {user?.role === "admin" && (
          <>
            <li><Link to="/admin">Admin Dashboard</Link></li>
          </>
        )}

      </ul>
    </aside>
  );
}
