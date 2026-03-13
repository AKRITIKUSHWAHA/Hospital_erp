import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket", "polling"]
});

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalDocs: 0, totalAppts: 0, onlineEarnings: 0, offlineEarnings: 0, totalEarnings: 0, todayAppts: 0 });
  const [appointments, setAppointments] = useState([]);
  const [newDoctor, setNewDoctor] = useState({ name: "", speciality: "", mobile: "", password: "" });
  const [doctorsList, setDoctorsList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [adminMsg, setAdminMsg] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const chatEndRef = useRef(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadMobiles, setUnreadMobiles] = useState([]);
  const [statsDate, setStatsDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showChatList, setShowChatList] = useState(true);
  const navigate = useNavigate();

  // 🔥 Detect screen size
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (appointments.length > 0) {
      const uniqueMobiles = [...new Set(appointments.map(a => a.patient_mobile))];
      uniqueMobiles.forEach(mobile => socket.emit("join_room", String(mobile)));
    }
  }, [appointments.length]);

  useEffect(() => {
    const handleReceive = (data) => {
      if (data.author === "Admin") return;
      const incomingRoom = String(data.room);
      const currentRoom = selectedChat ? String(selectedChat.mobile) : null;
      if (isChatOpen && currentRoom && incomingRoom === currentRoom) {
        setChatMessages((prev) => [...prev, data]);
      } else {
        setUnreadMobiles((prev) => {
          if (prev.includes(incomingRoom)) return prev;
          return [...prev, incomingRoom];
        });
        toast.info(`New message from ${data.author || 'Patient'}`, {
          position: "bottom-right", autoClose: 3000, theme: darkMode ? "dark" : "light"
        });
      }
    };
    socket.on("receive_message", handleReceive);
    return () => socket.off("receive_message", handleReceive);
  }, [selectedChat, darkMode, isChatOpen]);

  const openChat = async (patient) => {
    setSelectedChat(patient);
    setShowChatList(false); // On mobile, hide list when chat opens
    setUnreadMobiles((prev) => prev.filter(m => String(m) !== String(patient.mobile)));
    socket.emit("join_room", String(patient.mobile));
    try {
      const res = await axios.get(`http://localhost:5000/api/messages/${patient.mobile}`);
      setChatMessages(res.data);
    } catch (err) { console.error("Chat Load Error", err); }
  };

  const sendAdminReply = () => {
    if (adminMsg.trim() !== "" && selectedChat) {
      const messageData = {
        room: String(selectedChat.mobile),
        author: "Admin",
        message: adminMsg,
        timestamp: new Date().toISOString()
      };
      socket.emit("send_message", messageData);
      setChatMessages((prev) => [...prev, messageData]);
      setAdminMsg("");
    }
  };

  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    const loginTime = localStorage.getItem("loginTimestamp");
    const currentTime = new Date().getTime();
    const twelveHours = 12 * 60 * 60 * 1000;
    if (!userRole || userRole !== "admin") { navigate("/"); return; }
    if (loginTime && (currentTime - parseInt(loginTime) > twelveHours)) {
      localStorage.clear(); sessionStorage.clear(); window.location.href = "/";
    }
  }, [navigate]);

  const fetchData = async () => {
    try {
      const resAppts = await axios.get("http://localhost:5000/api/appointments");
      const resDocs = await axios.get("http://localhost:5000/api/doctors");
      const onlinePayments = resAppts.data.filter(a => a.payment_mode === "Online");
      const offlinePayments = resAppts.data.filter(a => a.payment_mode === "Pay at Clinic");
      const selectedCount = resAppts.data.filter(a => {
        const d = a.appointment_date ? new Date(a.appointment_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : "";
        return d === statsDate;
      }).length;
      setStats({
        totalDocs: resDocs.data.length, totalAppts: resAppts.data.length,
        onlineEarnings: onlinePayments.length * 1, offlineEarnings: offlinePayments.length * 1,
        totalEarnings: (onlinePayments.length + offlinePayments.length) * 1, todayAppts: selectedCount
      });
      const sortedAppts = resAppts.data.sort((a, b) => {
        const dateA = new Date(`${a.appointment_date} ${a.appointment_time || '00:00'}`);
        const dateB = new Date(`${b.appointment_date} ${b.appointment_time || '00:00'}`);
        return dateB - dateA;
      });
      setAppointments(sortedAppts);
      setDoctorsList(resDocs.data);
    } catch (err) { console.error("Fetch Error:", err); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [statsDate]);

  const doctorRevenue = doctorsList.map(doc => {
    const online = appointments.filter(a => a.doctor_name === doc.name && a.payment_mode === "Online");
    const offline = appointments.filter(a => a.doctor_name === doc.name && a.payment_mode === "Pay at Clinic");
    return { name: doc.name, speciality: doc.speciality, onlineCount: online.length, offlineCount: offline.length, revenue: (online.length + offline.length) * 1 };
  });

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/doctors", newDoctor);
      toast.success("Doctor Registered!");
      setNewDoctor({ name: "", speciality: "", mobile: "", password: "" });
      fetchData();
    } catch (err) { toast.error("Error adding doctor"); }
  };

  const deleteDoctor = async (id) => {
    if (window.confirm("Remove this doctor?")) {
      try {
        await axios.delete(`http://localhost:5000/api/doctors/${id}`);
        toast.warn("Doctor Removed!");
        fetchData();
      } catch (err) { toast.error("Failed to delete"); }
    }
  };

  const filteredAppointments = appointments.filter(a => {
    const patientName = a.patient_name ? a.patient_name.toLowerCase() : "";
    const matchesSearch = patientName.includes(searchTerm.toLowerCase());
    const apptDate = a.appointment_date ? new Date(a.appointment_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : "";
    const matchesCalendarDate = statsDate === "" ? true : apptDate === statsDate;
    return matchesSearch && matchesCalendarDate;
  });

  const formatIndiaDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  };

  const theme = {
    bg: darkMode ? "#0f172a" : "#f4f7f6",
    card: darkMode ? "#1e293b" : "#ffffff",
    text: darkMode ? "#f8fafc" : "#334155",
    border: darkMode ? "#334155" : "#e2e8f0"
  };

  const themeBtnStyle = {
    background: '#333', color: '#fff', border: 'none',
    padding: isMobile ? '6px 12px' : '8px 15px',
    borderRadius: '10px', cursor: 'pointer',
    fontSize: isMobile ? '11px' : '12px'
  };

  return (
    <Layout>
      {/* 🔥 Responsive Styles injected via <style> tag */}
      <style>{`
        .admin-wrapper { padding: 20px; }
        @media (max-width: 768px) {
          .admin-wrapper { padding: 12px 10px; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
          .admin-header { flex-direction: column; align-items: flex-start !important; gap: 10px; }
          .doctors-grid { grid-template-columns: 1fr !important; }
          .activity-header { flex-direction: column; gap: 10px; }
          .search-input { width: 100% !important; box-sizing: border-box; }
          .earnings-scroll { gap: 10px !important; }
          .earnings-card { min-width: 160px !important; padding: 12px !important; }
          .chat-modal { width: 95vw !important; height: 90vh !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; border-radius: 15px !important; }
          .chat-left-panel { width: 100% !important; }
          .chat-right-panel { width: 100% !important; }
          .table-container table { display: block; }
          .table-container thead { display: none; }
          .table-container tbody { display: block; }
          .table-container tr {
            display: block;
            margin-bottom: 12px;
            border-radius: 10px;
            padding: 10px;
            border: 1px solid #e2e8f0;
          }
          .table-container td {
            display: flex;
            justify-content: space-between;
            padding: 6px 4px !important;
            font-size: 13px !important;
            border: none !important;
          }
          .table-container td::before {
            content: attr(data-label);
            font-weight: 700;
            color: #888;
            font-size: 11px;
            text-transform: uppercase;
            margin-right: 8px;
          }
          .card-value { font-size: 24px !important; }
          .chat-btn { width: 52px !important; height: 52px !important; bottom: 70px !important; right: 15px !important; }
        }
        @media (max-width: 420px) {
          .stats-grid { grid-template-columns: 1fr !important; }
          .admin-wrapper { padding: 10px 8px; }
        }
      `}</style>

      <div className="admin-wrapper" style={{ background: theme.bg, minHeight: "100vh", transition: '0.3s', position: 'relative' }}>

        {/* Header */}
        <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: darkMode ? "#38bdf8" : "#1e90ff", margin: 0, fontWeight: '800', fontSize: isMobile ? '18px' : '24px' }}>💎 Admin Dashboard</h2>
          <button onClick={() => setDarkMode(!darkMode)} style={themeBtnStyle}>
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "25px" }}>
          <div style={{ ...newCardStyle, background: theme.card, borderBottom: '4px solid #1e90ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <p style={cardLabel}>Staff Doctors</p>
                <h2 className="card-value" style={{ ...cardValue, color: theme.text }}>{stats.totalDocs}</h2>
              </div>
              <div style={{ ...iconCircle, background: 'rgba(30, 144, 255, 0.1)', color: '#1e90ff' }}>👨‍⚕️</div>
            </div>
          </div>

          <div style={{ ...newCardStyle, background: theme.card, borderBottom: '4px solid #f39c12' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={cardLabel}>Filter Date:</p>
                <input type="date" value={statsDate} onChange={(e) => setStatsDate(e.target.value)}
                  style={{ border: 'none', background: 'transparent', color: theme.text, fontSize: '13px', fontWeight: 'bold', outline: 'none', cursor: 'pointer', maxWidth: '130px' }} />
                <h2 className="card-value" style={{ ...cardValue, color: theme.text }}>{stats.todayAppts} Appts</h2>
              </div>
              <div style={{ ...iconCircle, background: 'rgba(243, 156, 18, 0.1)', color: '#f39c12' }}>📅</div>
            </div>
          </div>

          <div style={{ ...newCardStyle, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '100%' }}>
                <p style={{ ...cardLabel, color: 'rgba(255,255,255,0.8)' }}>Total Revenue</p>
                <h2 className="card-value" style={{ ...cardValue, color: '#ffffff', marginBottom: '10px' }}>₹{stats.totalEarnings}</h2>
                <div style={{ display: 'flex', gap: '15px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '10px' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)' }}>ONLINE</span>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>₹{stats.onlineEarnings}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)' }}>CLINIC</span>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>₹{stats.offlineEarnings}</div>
                  </div>
                </div>
              </div>
              <div style={{ ...iconCircle, background: 'rgba(255, 255, 255, 0.2)', color: '#fff' }}>💰</div>
            </div>
          </div>
        </div>

        {/* 🔥 Chat Floating Button */}
        <div style={{ position: 'fixed', bottom: '80px', right: '30px', zIndex: 1000 }}>
          <button
            className="chat-btn"
            onClick={() => { setIsChatOpen(!isChatOpen); setShowChatList(true); }}
            style={{
              ...iconCircle,
              width: '60px', height: '60px', borderRadius: '50%',
              background: unreadMobiles.length > 0 ? '#ff4d4d' : '#1e90ff',
              color: 'white', border: 'none',
              boxShadow: unreadMobiles.length > 0 ? '0 0 20px rgba(255,77,77,0.6)' : '0 5px 15px rgba(0,0,0,0.3)',
              cursor: 'pointer', position: 'relative', transition: '0.3s', fontSize: '22px'
            }}>
            💬
            {unreadMobiles.length > 0 && (
              <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: 'white', color: 'red', borderRadius: '50%', padding: '2px 7px', fontSize: '12px', fontWeight: 'bold', border: '2px solid red' }}>
                {unreadMobiles.length}
              </span>
            )}
          </button>

          {/* 🔥 Chat Modal — fully responsive */}
          {isChatOpen && (
            <div className="chat-modal" style={{
              ...boxStyle, background: theme.card,
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '600px', maxWidth: '95vw',
              border: `1px solid ${theme.border}`,
              display: 'flex', flexDirection: 'column',
              height: '600px', maxHeight: '90vh',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              overflow: 'hidden', zIndex: 2000, borderRadius: '15px'
            }}>
              {/* Chat Header */}
              <div style={{ background: '#1e90ff', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Back button on mobile when in chat */}
                  {isMobile && !showChatList && (
                    <button onClick={() => setShowChatList(true)}
                      style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '8px', padding: '4px 8px', fontSize: '14px' }}>
                      ← Back
                    </button>
                  )}
                  <h4 style={{ margin: 0, color: 'white', fontSize: '15px' }}>
                    {isMobile && !showChatList && selectedChat ? `Chat: ${selectedChat.name}` : 'Admin Chat Support'}
                  </h4>
                </div>
                <button onClick={() => setIsChatOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Left Panel — Patient List */}
                {(!isMobile || showChatList) && (
                  <div className="chat-left-panel" style={{ width: '40%', borderRight: `1px solid ${theme.border}`, padding: '10px', overflowY: 'auto', background: darkMode ? '#111827' : '#f9fafb', flexShrink: 0 }}>
                    <input type="text" placeholder="Search patient..."
                      value={chatSearch} onChange={(e) => setChatSearch(e.target.value)}
                      style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '5px', border: `1px solid ${theme.border}`, fontSize: '12px', boxSizing: 'border-box' }} />
                    {[...new Set(appointments.map(a => a.patient_mobile))].filter(mobile => {
                      const patient = appointments.find(a => a.patient_mobile === mobile);
                      return patient?.patient_name.toLowerCase().includes(chatSearch.toLowerCase()) || mobile.includes(chatSearch);
                    }).map((mobile) => {
                      const patient = appointments.find(a => a.patient_mobile === mobile);
                      const hasNewMsg = unreadMobiles.includes(String(mobile));
                      return (
                        <div key={mobile}
                          onClick={() => openChat({ name: patient.patient_name, mobile: mobile })}
                          style={{ padding: '10px', borderRadius: '8px', cursor: 'pointer', background: selectedChat?.mobile === mobile ? '#1e90ff22' : 'transparent', marginBottom: '8px', border: `1.5px solid ${hasNewMsg ? '#ff4d4d' : 'transparent'}`, transition: '0.2s' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '12px', color: hasNewMsg ? '#ff4d4d' : theme.text, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            {patient.patient_name}
                            {hasNewMsg && <span style={{ width: '10px', height: '10px', background: 'red', borderRadius: '50%', display: 'inline-block' }}></span>}
                          </div>
                          <div style={{ fontSize: '10px', color: '#888' }}>{mobile}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Right Panel — Chat Messages */}
                {(!isMobile || !showChatList) && (
                  <div className="chat-right-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px', minWidth: 0 }}>
                    {selectedChat ? (
                      <>
                        <div style={{ fontWeight: 'bold', color: '#1e90ff', marginBottom: '10px', fontSize: '13px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '5px' }}>
                          Chatting with: {selectedChat.name}
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px', background: darkMode ? '#0f172a' : '#f8f9fa', borderRadius: '10px', display: 'flex', flexDirection: 'column' }}>
                          {chatMessages.map((m, i) => {
                            const isAdmin = String(m.author).trim().toLowerCase() === "admin";
                            return (
                              <div key={i} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start', width: '100%', marginBottom: '8px' }}>
                                <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: isAdmin ? '15px 15px 0px 15px' : '15px 15px 15px 0px', fontSize: '13px', background: isAdmin ? '#1e90ff' : '#e5e7eb', color: isAdmin ? '#fff' : '#000', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', wordBreak: 'break-word' }}>
                                  <span>{m.message}</span>
                                  <span style={{ fontSize: '9px', marginTop: '4px', alignSelf: 'flex-end', opacity: 0.7, display: 'block' }}>
                                    {new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={chatEndRef} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <input value={adminMsg} onChange={(e) => setAdminMsg(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendAdminReply()}
                            placeholder="Type message..."
                            style={{ ...inputStyle, flex: 1, padding: '10px', fontSize: '13px', background: theme.bg, color: theme.text, borderColor: theme.border }} />
                          <button onClick={sendAdminReply} style={{ ...addBtnStyle, width: 'auto', padding: '10px 15px' }}>Send</button>
                        </div>
                      </>
                    ) : (
                      <div style={{ margin: 'auto', color: '#888', fontSize: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>✉️</div>
                        Select a patient to start conversation
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Earnings Section */}
        <div style={{ ...boxStyle, background: theme.card, marginBottom: '20px', border: `1px solid ${theme.border}` }}>
          <h3 style={{ ...titleStyle, color: theme.text, borderBottomColor: theme.border, padding: '15px' }}>📈 Doctor Earnings</h3>
          <div className="earnings-scroll" style={{ display: 'flex', gap: '15px', overflowX: 'auto', padding: '0 15px 15px 15px', WebkitOverflowScrolling: 'touch' }}>
            {doctorRevenue.map((doc, i) => (
              <div key={i} className="earnings-card" style={{ minWidth: '200px', padding: '15px', borderRadius: '12px', background: darkMode ? '#0f172a' : '#f8f9fa', border: `1px solid ${theme.border}`, flexShrink: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: theme.text }}>Dr. {doc.name}</div>
                <p style={{ fontSize: '11px', color: '#888', margin: '2px 0 10px' }}>{doc.speciality}</p>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#10b981' }}>₹{doc.revenue}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Doctors Management */}
        <div className="doctors-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
          <div style={{ ...boxStyle, background: theme.card, border: `1px solid ${theme.border}` }}>
            <h3 style={{ ...titleStyle, color: theme.text, borderBottomColor: theme.border, padding: '15px 15px 0 15px' }}>➕ Add Doctor</h3>
            <form onSubmit={handleAddDoctor} style={formStyle}>
              <input type="text" placeholder="Full Name" required style={{ ...inputStyle, background: theme.bg, color: theme.text, borderColor: theme.border }} value={newDoctor.name} onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })} />
              <input type="text" placeholder="Speciality" required style={{ ...inputStyle, background: theme.bg, color: theme.text, borderColor: theme.border }} value={newDoctor.speciality} onChange={(e) => setNewDoctor({ ...newDoctor, speciality: e.target.value })} />
              <input type="text" placeholder="Mobile" required style={{ ...inputStyle, background: theme.bg, color: theme.text, borderColor: theme.border }} value={newDoctor.mobile} onChange={(e) => setNewDoctor({ ...newDoctor, mobile: e.target.value })} />
              <input type="password" placeholder="Set Password" required style={{ ...inputStyle, background: theme.bg, color: theme.text, borderColor: theme.border }} value={newDoctor.password} onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })} />
              <button type="submit" style={addBtnStyle}>Register Doctor</button>
            </form>
          </div>

          <div style={{ ...boxStyle, background: theme.card, border: `1px solid ${theme.border}` }}>
            <h3 style={{ ...titleStyle, color: theme.text, borderBottomColor: theme.border, padding: '15px 15px 0 15px' }}>🩺 Doctor Staff</h3>
            <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {doctorsList.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '12px 0', fontSize: '14px', color: theme.text, fontWeight: '600' }}>Dr. {doc.name}</td>
                      <td style={{ textAlign: 'right' }}><button onClick={() => deleteDoctor(doc.id)} style={delBtnStyle}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Activity Logs */}
        <div style={{ ...boxStyle, background: theme.card, marginTop: '20px', border: `1px solid ${theme.border}` }}>
          <div className="activity-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px' }}>
            <h3 style={{ margin: 0, color: theme.text, fontSize: '18px' }}>📑 Activity Logs</h3>
            <input
              type="text" placeholder="Search patient name..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              style={{ ...inputStyle, padding: '8px 15px', fontSize: '13px', width: '220px', background: theme.bg, color: theme.text }} />
          </div>

          {/* 🔥 Mobile: Card layout | Desktop: Table layout */}
          {isMobile ? (
            <div style={{ padding: '0 10px 15px' }}>
              {filteredAppointments.map((a, i) => (
                <div key={i} style={{ background: darkMode ? '#0f172a' : '#f9fafb', borderRadius: '10px', padding: '12px', marginBottom: '10px', border: `1px solid ${theme.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: theme.text }}>{a.patient_name}</span>
                    <span style={statusBadge(a.status)}>{a.status || 'Pending'}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    <span>📅 {formatIndiaDate(a.appointment_date)}</span>
                    <span>👨‍⚕️ {a.doctor_name}</span>
                    <span>💳 {a.payment_mode}</span>
                    <span>🔖 {a.utr_no || 'N/A'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto' }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: '600px' }}>
                <thead>
                  <tr style={{ textAlign: "left", fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>
                    <th style={tdStyle}>Date</th>
                    <th style={tdStyle}>Patient</th>
                    <th style={thStyle}>Doctor</th>
                    <th style={thStyle}>Mode</th>
                    <th style={thStyle}>UTR</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((a, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ ...tdStyle, color: theme.text }}>{formatIndiaDate(a.appointment_date)}</td>
                      <td style={{ ...tdStyle, color: theme.text }}>{a.patient_name}</td>
                      <td style={{ ...tdStyle, color: theme.text }}>{a.doctor_name}</td>
                      <td style={{ ...tdStyle, color: theme.text }}>{a.payment_mode}</td>
                      <td style={{ ...tdStyle, color: theme.text }}>{a.utr_no || 'N/A'}</td>
                      <td style={tdStyle}><span style={statusBadge(a.status)}>{a.status || 'Pending'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <ToastContainer position="bottom-right" />
    </Layout>
  );
}

const newCardStyle = { padding: '20px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' };
const cardLabel = { fontSize: '12px', fontWeight: 'bold', margin: 0, opacity: 0.7 };
const cardValue = { fontSize: '32px', fontWeight: '900', margin: '5px 0 0 0' };
const iconCircle = { width: '50px', height: '50px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' };
const boxStyle = { borderRadius: "15px", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" };
const titleStyle = { paddingBottom: '12px', fontSize: '16px', fontWeight: '800', margin: 0 };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' };
const inputStyle = { padding: '12px', borderRadius: '10px', border: '1px solid', outline: 'none', width: '100%', boxSizing: 'border-box' };
const addBtnStyle = { padding: '12px', background: '#1e90ff', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' };
const delBtnStyle = { background: 'transparent', color: '#ff4d4d', border: '1px solid #ff4d4d', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' };
const tdStyle = { padding: "15px 10px", fontSize: '14px' };
const thStyle = { ...tdStyle, fontWeight: '700' };
const statusBadge = (status) => ({ padding: '4px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', background: status === 'Confirmed' ? '#dcfce7' : '#fef9c3', color: status === 'Confirmed' ? '#28a745' : '#b45309', whiteSpace: 'nowrap' });
