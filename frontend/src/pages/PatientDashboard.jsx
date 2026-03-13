import React, { useEffect, useState, useRef } from "react";
import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";

const socket = io.connect("http://localhost:5000");

export default function PatientDashboard() {
  const navigate = useNavigate();
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [myLatestToken, setMyLatestToken] = useState(null);
  const [myLatestTime, setMyLatestTime] = useState(null);
  const [currentCalling, setCurrentCalling] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const chatEndRef = useRef(null);

  const patientName = localStorage.getItem("patientName") || "Patient";
  const patientMobile = localStorage.getItem("patientMobile");

  const formatIndiaTime = (dateInput) => {
    const dateObj = dateInput ? new Date(dateInput) : new Date();
    return dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getDateLabel = (dateInput) => {
    if (!dateInput) return null;
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return null;
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [chatHistory, isOpen]);

  useEffect(() => {
    const loginTime = localStorage.getItem("loginTime");
    const userRole = localStorage.getItem("userRole");
    if (loginTime && (Date.now() - parseInt(loginTime) > 12 * 60 * 60 * 1000)) {
      localStorage.clear(); navigate("/login");
    } else if (!userRole) {
      navigate("/login");
    }
  }, [navigate]);

  const getMyStats = async () => {
    if (!patientMobile) return;
    try {
      const res = await axios.get("http://localhost:5000/api/appointments");
      const allData = res.data;
      const myData = allData.filter(a => String(a.patient_mobile).trim() === String(patientMobile).trim());
      setAppointmentCount(myData.length);

      const todayStr = new Date().toLocaleDateString('en-CA');
      const getTimeValue = (t) => {
        if (!t) return 0;
        const [time, modifier] = t.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
        return parseInt(hours) * 60 + parseInt(minutes);
      };

      const todayAppointments = allData
        .filter(a => new Date(a.appointment_date).toLocaleDateString('en-CA') === todayStr && a.status !== "Rejected")
        .sort((a, b) => getTimeValue(a.appointment_time) - getTimeValue(b.appointment_time));

      const myTodayAppt = myData
        .filter(a => new Date(a.appointment_date).toLocaleDateString('en-CA') === todayStr)
        .sort((a, b) => b.id - a.id)[0];

      if (myTodayAppt) {
        setMyLatestTime(myTodayAppt.appointment_time);
        if (myTodayAppt.status === "Confirmed") {
          const rank = todayAppointments.findIndex(a => a.id === myTodayAppt.id) + 1;
          setMyLatestToken(rank > 0 ? rank : "...");
        } else {
          setMyLatestToken("P");
        }
      } else {
        setMyLatestToken(null);
        setMyLatestTime(null);
      }

      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const activeNow = todayAppointments.find(a => {
        const apptMins = getTimeValue(a.appointment_time);
        return currentMins >= apptMins - 10 && currentMins <= apptMins + 30;
      });

      if (activeNow) {
        const callRank = todayAppointments.findIndex(a => a.id === activeNow.id) + 1;
        setCurrentCalling(callRank);
      } else {
        const firstPending = todayAppointments.find(a => !a.prescription);
        if (firstPending) {
          const callRank = todayAppointments.findIndex(a => a.id === firstPending.id) + 1;
          setCurrentCalling(callRank);
        } else {
          setCurrentCalling("Wait");
        }
      }
    } catch (err) { console.error("Stats Fetch Error:", err); }
  };

  useEffect(() => {
    getMyStats();
    if (patientMobile) {
      socket.emit("join_room", patientMobile);
      socket.on("status_updated", getMyStats);
      socket.on("new_appointment_booked", getMyStats);
      const interval = setInterval(getMyStats, 5000);
      return () => {
        clearInterval(interval);
        socket.off("new_appointment_booked");
        socket.off("status_updated");
      };
    }
  }, [patientMobile]);

  useEffect(() => {
    if (patientMobile) {
      axios.get(`http://localhost:5000/api/messages/${patientMobile}`)
        .then(res => setChatHistory(res.data))
        .catch(err => console.log(err));
    }
  }, [patientMobile]);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      const newData = { ...data, created_at: data.created_at || new Date() };
      setChatHistory((prev) => [...prev, newData]);
      if (!isOpen) setHasNewMessage(true);
    });
    return () => socket.off("receive_message");
  }, [isOpen]);

  const sendMsg = async () => {
    if (message.trim() !== "") {
      const msgData = {
        room: patientMobile,
        author: patientName,
        sender_mobile: patientMobile,
        message: message,
        time: formatIndiaTime(new Date()),
        created_at: new Date()
      };
      await socket.emit("send_message", msgData);
      setMessage("");
    }
  };

  return (
    <Layout>
      <style>{`
        .pd-wrapper {
          background: #eef4fb;
          padding: 25px;
          border-radius: 15px;
          min-height: 80vh;
          position: relative;
        }
        .pd-header {
          margin-bottom: 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
        }
        .pd-tokens {
          display: flex;
          gap: 15px;
        }
        .pd-ministats {
          display: flex;
          gap: 12px;
          margin-bottom: 25px;
          flex-wrap: wrap;
        }
        .pd-cards {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }
        .pd-card {
          flex: 1;
          min-width: 140px;
          background: white;
          padding: 25px 15px;
          border-radius: 12px;
          cursor: pointer;
          text-align: center;
          box-shadow: 0 5px 15px rgba(0,0,0,0.05);
          font-weight: bold;
          color: #1e90ff;
          font-size: 15px;
          transition: transform 0.2s;
        }
        .pd-card:active { transform: scale(0.97); }
        .pd-support {
          margin-top: 35px;
          background: linear-gradient(135deg, #1e90ff 0%, #0052cc 100%);
          color: white;
          padding: 18px 20px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        .pd-call-btn {
          background: white;
          color: #0052cc;
          padding: 10px 18px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: bold;
          font-size: 14px;
          margin-left: auto;
          white-space: nowrap;
        }

        /* Chat window */
        .chat-window-box {
          width: 320px;
          height: 450px;
        }

        @media (max-width: 768px) {
          .pd-wrapper { padding: 15px 12px; border-radius: 10px; }
          .pd-header { flex-direction: column; align-items: flex-start; }
          .pd-tokens { width: 100%; justify-content: space-between; }
          .pd-ministats { gap: 8px; }
          .pd-ministat { flex: 1; min-width: 120px; font-size: 12px !important; padding: 8px 10px !important; }
          .pd-cards { gap: 10px; }
          .pd-card { min-width: 130px; padding: 20px 10px; font-size: 13px; }
          .pd-support { flex-direction: column; align-items: flex-start; gap: 10px; }
          .pd-call-btn { margin-left: 0; width: 100%; text-align: center; }
          .chat-window-box {
            width: calc(100vw - 40px) !important;
            height: 380px !important;
            max-width: 340px;
          }
          .chat-fab-btn {
            width: 52px !important;
            height: 52px !important;
            font-size: 20px !important;
            bottom: 70px !important;
            right: 15px !important;
          }
        }

        @media (max-width: 420px) {
          .pd-card { min-width: calc(50% - 8px); max-width: calc(50% - 8px); }
          .token-value { font-size: 20px !important; }
        }
      `}</style>

      <div className="pd-wrapper">

        {/* Header */}
        <div className="pd-header">
          <div>
            <h2 style={{ color: "#1e90ff", margin: 0, fontSize: 'clamp(18px, 4vw, 24px)' }}>👋 Welcome, {patientName}</h2>
            <p style={{ color: "#666", margin: '5px 0', fontSize: '13px' }}>Logged in: {patientMobile}</p>
          </div>

          <div className="pd-tokens">
            <div style={tokenBadge}>
              <span style={tokenLabel}>YOUR TOKEN</span>
              <b className="token-value" style={tokenValue}>{myLatestToken || "P"}</b>
              {myLatestTime && <span style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>{myLatestTime}</span>}
            </div>
            <div style={{ ...tokenBadge, borderLeftColor: '#ff4d4d' }}>
              <span style={tokenLabel}>NOW CALLING</span>
              <b className="token-value" style={{ ...tokenValue, color: '#ff4d4d' }}>{currentCalling || "Wait"}</b>
              <span style={{ fontSize: '9px', color: '#ff4d4d', marginTop: '2px' }}>Live Status</span>
            </div>
          </div>
        </div>

        {/* Mini Stats */}
        <div className="pd-ministats">
          <div className="pd-ministat" style={miniStat}>📅 Bookings: <span style={{ color: '#1e90ff' }}>{appointmentCount}</span></div>
          <div className="pd-ministat" style={miniStat}>📂 Records: <span style={{ color: '#28a745' }}>Verified</span></div>
          <div className="pd-ministat" style={{ ...miniStat, borderLeft: '4px solid #f39c12' }}>💳 <span style={{ color: '#f39c12' }}>UPI Enabled</span></div>
        </div>

        {/* Action Cards */}
        <div className="pd-cards">
          <div className="pd-card" style={{ borderLeft: '5px solid #1e90ff' }} onClick={() => navigate("/book-appointment")}>🏥<br />Book Appointment</div>
          <div className="pd-card" style={{ borderLeft: '5px solid #1e90ff' }} onClick={() => navigate("/my-appointments")}>📅<br />My Appointments</div>
          <div className="pd-card" style={{ borderLeft: '5px solid #28a745' }} onClick={() => navigate("/medical-records")}>📜<br />Medical Records</div>
          <div className="pd-card" style={{ borderLeft: '5px solid #f39c12' }} onClick={() => navigate("/payment-history")}>💸<br />Payment History</div>
        </div>

        {/* Support Banner */}
        <div className="pd-support">
          <div style={{ fontSize: '22px' }}>📞</div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>For any time inquiry</div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>Our support team is available 24/7</div>
          </div>
          <a href="tel:7879098553" className="pd-call-btn">Call: 7879098553</a>
        </div>

        {/* Chat FAB */}
        <div style={{ position: 'fixed', bottom: '80px', right: '30px', zIndex: 1000 }}>
          {isOpen && (
            <div className="chat-window-box" style={chatWindow}>
              <div style={chatHeader}>
                <span>💬 Clinic Support</span>
                <button onClick={() => setIsOpen(false)} style={closeBtn}>×</button>
              </div>
              <div style={chatBody}>
                {chatHistory.map((msg, i) => {
                  const isMyMessage = (msg.sender_mobile && String(msg.sender_mobile) === String(patientMobile)) ||
                    (msg.author && String(msg.author).toLowerCase().trim() === String(patientName).toLowerCase().trim());
                  const currentLabel = getDateLabel(msg.created_at);
                  const prevLabel = i > 0 ? getDateLabel(chatHistory[i - 1].created_at) : null;
                  const showDateLabel = currentLabel && currentLabel !== prevLabel;
                  return (
                    <React.Fragment key={i}>
                      {showDateLabel && <div style={dateLabelStyle}>{currentLabel}</div>}
                      <div style={isMyMessage ? myMsg : otherMsg}>
                        <div style={{ fontSize: '13px', fontWeight: '500' }}>{msg.message}</div>
                        <div style={{ textAlign: 'right', fontSize: '9px', opacity: 0.8, marginTop: '2px', color: isMyMessage ? '#e0f2fe' : '#666' }}>
                          {msg.time || formatIndiaTime(msg.created_at)}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <div style={chatFooter}>
                <input style={chatInput} value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMsg()} />
                <button onClick={sendMsg} style={sendBtn}>➤</button>
              </div>
            </div>
          )}
          <button
            className="chat-fab-btn"
            style={chatFab}
            onClick={() => { setIsOpen(!isOpen); setHasNewMessage(false); }}
          >
            {isOpen ? "❌" : "💬"}
            {!isOpen && hasNewMessage && <div style={notificationBadge}></div>}
          </button>
        </div>
      </div>
    </Layout>
  );
}

// Styles
const tokenBadge = { background: 'white', padding: '10px 16px', borderRadius: '12px', borderLeft: '6px solid #1e90ff', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '90px' };
const tokenLabel = { fontSize: '10px', fontWeight: 'bold', color: '#666', marginBottom: '2px' };
const tokenValue = { fontSize: '24px', fontWeight: '900', color: '#1e90ff' };
const miniStat = { background: 'white', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderLeft: '4px solid #1e90ff' };
const dateLabelStyle = { alignSelf: 'center', background: '#e2e8f0', color: '#64748b', fontSize: '11px', padding: '4px 12px', borderRadius: '10px', margin: '10px 0', fontWeight: 'bold' };
const notificationBadge = { position: 'absolute', top: '0px', right: '0px', width: '14px', height: '14px', background: '#ff4d4d', borderRadius: '50%', border: '2px solid white' };
const chatFab = { position: 'relative', width: '60px', height: '60px', borderRadius: '50%', background: '#1e90ff', color: 'white', border: 'none', fontSize: '24px', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' };
const chatWindow = { background: 'white', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', marginBottom: '15px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e0e0e0' };
const chatHeader = { background: '#1e90ff', color: 'white', padding: '14px 15px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const closeBtn = { background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' };
const chatBody = { flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', background: '#f0f2f5' };
const chatFooter = { padding: '10px 12px', borderTop: '1px solid #eee', display: 'flex', gap: '8px', background: 'white' };
const chatInput = { flex: 1, border: '1px solid #ddd', padding: '10px 14px', borderRadius: '25px', outline: 'none', fontSize: '14px' };
const sendBtn = { background: '#1e90ff', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const myMsg = { alignSelf: 'flex-end', background: '#0084ff', color: 'white', padding: '10px 14px', borderRadius: '18px 18px 2px 18px', maxWidth: '80%', wordBreak: 'break-word' };
const otherMsg = { alignSelf: 'flex-start', background: 'white', color: '#333', padding: '10px 14px', borderRadius: '18px 18px 18px 2px', maxWidth: '80%', wordBreak: 'break-word' };
