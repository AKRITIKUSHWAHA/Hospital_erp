import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [dayFilter, setDayFilter] = useState(new Date().toLocaleDateString('en-CA'));
  const [doctorFilter, setDoctorFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [prescriptions, setPrescriptions] = useState({});
  const [followUps, setFollowUps] = useState({});
  const [historyPatient, setHistoryPatient] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile filter toggle
  const navigate = useNavigate();

  const formatIndiaDate = (d) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getMins = (timeStr) => {
    if (!timeStr) return 0;
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = (parseInt(hours, 10) % 12) + 12;
    else hours = parseInt(hours, 10) % 12;
    return hours * 60 + parseInt(minutes);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loginTime = localStorage.getItem("loginTimestamp");
    const userRole = localStorage.getItem("userRole");
    const now = new Date().getTime();
    const twelveHours = 12 * 60 * 60 * 1000;
    if (loginTime) {
      if (now - loginTime > twelveHours) {
        localStorage.clear(); sessionStorage.clear();
        toast.info("Session expired. Please login again.");
        navigate("/login");
      }
    } else if (!userRole) { navigate("/login"); }
  }, [navigate]);

  const commonMeds = ["Paracetamol", "Pan-D", "Azithromycin", "Cough Syrup", "Vitamin-C", "Cetirizine"];

  const fetchAppointments = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/appointments");
      if (Array.isArray(res.data)) {
        const sorted = res.data.sort((a, b) => {
          const dateA = new Date(a.appointment_date).setHours(0, 0, 0, 0);
          const dateB = new Date(b.appointment_date).setHours(0, 0, 0, 0);
          if (dateA !== dateB) return dateB - dateA;
          return getMins(a.appointment_time) - getMins(b.appointment_time);
        });
        setAppointments(sorted);
      }
    } catch (err) { console.error("Error fetching data"); }
  };

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 5000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = new Date().toLocaleDateString('en-CA');
  const todaySorted = appointments
    .filter(a => new Date(a.appointment_date).toLocaleDateString('en-CA') === todayStr && a.status !== "Rejected")
    .sort((a, b) => getMins(a.appointment_time) - getMins(b.appointment_time));

  const tokenMapping = {};
  todaySorted.forEach((appt, index) => { tokenMapping[appt.id] = index + 1; });

  const getUpcomingPatient = () => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    if (currentMins < 600 || currentMins > 990) return null;
    const activeToday = todaySorted.filter(a => !a.prescription || a.prescription.trim() === "");
    if (activeToday.length === 0) return null;
    const nextPatient = activeToday.find(a => {
      const apptMins = getMins(a.appointment_time);
      return currentMins >= apptMins - 10 && currentMins <= apptMins + 30;
    });
    return nextPatient || activeToday[0];
  };

  const nextInLine = getUpcomingPatient();
  const uniqueDoctors = [...new Set(appointments.map(a => a.doctor_name).filter(Boolean))];

  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => (a.status || "Pending") === "Pending").length,
    done: appointments.filter(a => a.status === "Confirmed" && a.prescription).length
  };

  const filteredAppointments = appointments.filter(appt => {
    const matchesStatus = statusFilter === "All" ? true : (appt.status || "Pending") === statusFilter;
    const matchesDoctor = doctorFilter === "" ? true : appt.doctor_name === doctorFilter;
    const matchesSearch = (appt.patient_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (appt.patient_mobile || "").includes(searchTerm);
    let matchesDay = true;
    if (dayFilter !== "") {
      matchesDay = new Date(appt.appointment_date).toLocaleDateString('en-CA') === dayFilter;
    }
    return matchesStatus && matchesDoctor && matchesSearch && matchesDay;
  });

  const generatePrescriptionPDF = (appt) => {
    const doc = new jsPDF();
    const currentPresc = prescriptions[appt.id] || appt.prescription || "General Consultation";
    const token = tokenMapping[appt.id] || appt.token_number || "P";
    doc.setFillColor(30, 144, 255);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("SMART CLINIC & HEALTHCARE", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text("Quality Care • Affordable Health • 24/7 Support", 105, 30, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Token No: ${token}`, 150, 45);
    doc.text(`Patient Name: ${appt.patient_name} (${appt.patient_age || 'N/A'} Yrs)`, 20, 50);
    doc.text(`Doctor: Dr. ${appt.doctor_name}`, 20, 60);
    doc.text(`Date: ${formatIndiaDate(new Date())}`, 150, 50);
    doc.line(20, 65, 190, 65);
    doc.setFontSize(18);
    doc.setTextColor(30, 144, 255);
    doc.text("Rx", 20, 80);
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(currentPresc, 25, 90);
    if (followUps[appt.id] || appt.next_follow_up) {
      doc.setFontSize(10);
      doc.text(`Next Follow-up: ${formatIndiaDate(followUps[appt.id] || appt.next_follow_up)}`, 20, 150);
    }
    doc.setFontSize(9);
    doc.text("Note: This is a computer generated prescription.", 105, 285, { align: "center" });
    doc.save(`${appt.patient_name}_Token_${token}.pdf`);
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const currentAppt = appointments.find(a => a.id === id);
      const presc = prescriptions[id] || currentAppt.prescription || "";
      const nextVisit = followUps[id] || currentAppt.next_follow_up || null;
      const res = await axios.put(`http://localhost:5000/api/appointments/${id}`, { status: newStatus, prescription: presc, next_follow_up: nextVisit });
      if (res.data.success) { toast.success(`Status updated to ${newStatus}`); fetchAppointments(); }
    } catch (err) { toast.error("Status update failed!"); }
  };

  const handleSendRx = async (appt) => {
    try {
      const presc = prescriptions[appt.id] || appt.prescription || "";
      if (!presc) { toast.warning("Please write some medicine advice first!"); return; }
      const nextVisit = followUps[appt.id] || appt.next_follow_up || null;
      const res = await axios.put(`http://localhost:5000/api/appointments/${appt.id}`, { status: "Confirmed", prescription: presc, next_follow_up: nextVisit });
      if (res.data.success) {
        toast.success("Rx Sent and Saved!");
        generatePrescriptionPDF({ ...appt, status: "Confirmed", prescription: presc, next_follow_up: nextVisit });
        fetchAppointments();
      }
    } catch (err) { toast.error("Failed to process Rx!"); }
  };

  const sendWhatsApp = (mobile, name) => {
    if (!mobile) { toast.error("Number not found!"); return; }
    const formattedNumber = mobile.toString().length === 10 ? `91${mobile}` : mobile;
    const msg = `Smart Clinic Update: Dear ${name}, your check-up report and prescription are ready.`;
    window.open(`https://wa.me/${formattedNumber}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const addMedicine = (id, med) => {
    const current = prescriptions[id] || "";
    setPrescriptions({ ...prescriptions, [id]: current ? current + ", " + med : med });
  };

  const theme = {
    bg: darkMode ? "#0f172a" : "#f1f5f9",
    card: darkMode ? "#1e293b" : "#ffffff",
    text: darkMode ? "#f8fafc" : "#1e293b",
    border: darkMode ? "#334155" : "#e2e8f0"
  };

  return (
    <div style={{ backgroundColor: theme.bg, minHeight: "100vh", transition: "0.3s" }}>
      <style>{`
        .dd-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 20px;
          border-radius: 15px;
          color: white;
          margin-bottom: 20px;
          background: linear-gradient(90deg, #1e3a8a, #3b82f6);
          flex-wrap: wrap;
          gap: 12px;
        }
        .dd-stats { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .dd-banner {
          padding: 16px 20px;
          border-radius: 15px;
          margin-bottom: 20px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
          border-left: 8px solid #3b82f6;
          display: flex;
          align-items: center;
        }
        .dd-banner-inner { display: flex; align-items: center; gap: 15px; width: 100%; flex-wrap: wrap; }
        .dd-banner-right { display: flex; gap: 20px; margin-left: auto; flex-wrap: wrap; }
        .dd-filterbar {
          display: flex;
          gap: 10px;
          padding: 15px;
          border-radius: 12px;
          margin-bottom: 20px;
          align-items: center;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          flex-wrap: wrap;
        }
        .dd-filter-toggle { display: none; }
        .dd-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .dd-card-btns { display: flex; gap: 8px; margin-top: 5px; flex-wrap: wrap; }

        @media (max-width: 768px) {
          .dd-header { padding: 14px; border-radius: 10px; }
          .dd-header h1 { font-size: 17px !important; }
          .dd-header p { font-size: 11px !important; }
          .dd-stats { gap: 8px; }
          .dd-statbox { padding: 4px 10px !important; min-width: 55px !important; font-size: 11px; }
          .dd-banner { padding: 12px; border-left-width: 5px; }
          .dd-banner-right { display: none; }
          .dd-patient-name { font-size: 16px !important; }
          .dd-filter-toggle {
            display: flex !important;
            width: 100%;
            background: #3b82f6;
            color: white;
            border: none;
            padding: 10px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            justify-content: space-between;
            align-items: center;
          }
          .dd-filters-hidden { display: none; }
          .dd-filters-visible { display: flex; flex-direction: column; gap: 8px; width: 100%; }
          .dd-search-input { width: 100% !important; box-sizing: border-box; }
          .dd-select { width: 100% !important; box-sizing: border-box; }
          .dd-cards-grid { grid-template-columns: 1fr; gap: 15px; }
        }
      `}</style>

      <Layout>
        {/* Header */}
        <div className="dd-header">
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>🏥 Smart Clinic Pro</h1>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '12px' }}>Dashboard | {currentTime.toLocaleTimeString()}</p>
          </div>
          <div className="dd-stats">
            <div className="dd-statbox" style={{ ...statBox, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#1e40af', padding: '5px 15px', borderRadius: '10px', minWidth: '70px' }}>
              <span style={{ fontSize: '10px' }}>TOTAL</span><b>{stats.total}</b>
            </div>
            <div className="dd-statbox" style={{ ...statBox, background: '#f59e0b', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5px 15px', borderRadius: '10px', minWidth: '70px' }}>
              <span style={{ fontSize: '10px' }}>PENDING</span><b>{stats.pending}</b>
            </div>
            <div className="dd-statbox" style={{ ...statBox, background: '#10b981', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5px 15px', borderRadius: '10px', minWidth: '70px' }}>
              <span style={{ fontSize: '10px' }}>DONE</span><b>{stats.done}</b>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '50%', width: '38px', height: '38px' }}>
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* Live Banner */}
        <div className="dd-banner" style={{ background: theme.card, color: theme.text }}>
          <div className="dd-banner-inner">
            <div style={livePulseBadge}>LIVE TOKEN</div>
            {nextInLine ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={tokenCircleSmall}>{tokenMapping[nextInLine.id] || "P"}</div>
                  <div>
                    <span className="dd-patient-name" style={{ fontSize: '20px', fontWeight: '900', color: '#3b82f6' }}>
                      {nextInLine.patient_name.toUpperCase()}
                      <span style={{ fontSize: '14px', fontWeight: '400', opacity: 0.7 }}> ({nextInLine.patient_age || 'N/A'} Yrs)</span>
                    </span>
                    <p style={{ margin: '3px 0 0 0', fontSize: '12px', opacity: 0.7 }}>Slot: {nextInLine.appointment_time} | Token: #{tokenMapping[nextInLine.id]}</p>
                  </div>
                </div>
                <div className="dd-banner-right">
                  <div style={nextDetailBox}><span style={nextLabel}>🕒 SLOT TIME</span><b style={{ fontSize: '15px' }}>{nextInLine.appointment_time}</b></div>
                  <div style={nextDetailBox}><span style={nextLabel}>👨‍⚕️ DOCTOR</span><b style={{ fontSize: '15px' }}>Dr. {nextInLine.doctor_name}</b></div>
                </div>
              </>
            ) : (
              <span style={{ fontSize: '15px', opacity: 0.6, fontWeight: 'bold' }}>✅ Clinic Closed or No Patients (10:00 AM - 4:30 PM)</span>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="dd-filterbar" style={{ background: theme.card, color: theme.text }}>
          {/* Mobile toggle button */}
          <button className="dd-filter-toggle" onClick={() => setFiltersOpen(!filtersOpen)}>
            <span>🔍 Filters & Search</span>
            <span>{filtersOpen ? '▲' : '▼'}</span>
          </button>

          {/* Filters — always visible on desktop, toggle on mobile */}
          <div className={filtersOpen ? 'dd-filters-visible' : 'dd-filters-hidden'}
            style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
            <input type="text" placeholder="🔍 Search Patient..."
              className="dd-search-input"
              style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '220px', outline: 'none' }}
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <select className="dd-select" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', background: '#fff', minWidth: '140px' }}
              value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
              <option value="">All Doctors</option>
              {uniqueDoctors.map(doc => <option key={doc} value={doc}>Dr. {doc}</option>)}
            </select>
            <select className="dd-select" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', background: '#fff', minWidth: '130px' }}
              value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Rejected">Rejected</option>
            </select>
            <input type="date" value={dayFilter} onChange={(e) => setDayFilter(e.target.value)}
              className="dd-select"
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', background: '#fff', minWidth: '130px' }} />
            <button onClick={() => { setDayFilter(""); setStatusFilter("All"); setSearchTerm(""); setDoctorFilter(""); setFiltersOpen(false); }}
              style={{ background: '#ef4444', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              Reset
            </button>
          </div>

          {/* Desktop always visible */}
          <style>{`@media (min-width: 769px) { .dd-filters-hidden { display: flex !important; flex-wrap: wrap; gap: 10px; flex: 1; } .dd-filter-toggle { display: none !important; } }`}</style>
        </div>

        {/* Appointment Cards */}
        <div className="dd-cards-grid">
          {filteredAppointments.map((appt, index) => {
            const isLocked = appt.status === "Rejected";
            const isConfirmed = appt.status === "Confirmed";
            const currentToken = tokenMapping[appt.id] || appt.token_number || "P";

            return (
              <div key={appt.id || index} style={{ ...proCard, background: theme.card, color: theme.text, borderTopColor: isConfirmed ? '#10b981' : isLocked ? '#ef4444' : '#f59e0b' }}>
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ ...tokenCircleMain, background: isConfirmed ? '#10b981' : isLocked ? '#ef4444' : '#f59e0b' }}>{currentToken}</div>
                    <h4 style={{ margin: 0, fontSize: '15px' }}>👤 {appt.patient_name}
                      <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748b' }}> ({appt.patient_age || 'N/A'} Yrs)</span>
                    </h4>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => sendWhatsApp(appt.patient_mobile, appt.patient_name)} style={proWaBtn}>WA</button>
                    <button onClick={() => setHistoryPatient(appt)} style={proHistoryBtn}>📜</button>
                  </div>
                </div>

                {/* Info Grid */}
                <div style={infoGrid}>
                  <div style={infoItem}><span>Status:</span><b style={{ color: isConfirmed ? '#10b981' : isLocked ? '#ef4444' : '#f59e0b' }}>{appt.status || "Pending"}</b></div>
                  <div style={infoItem}><span>Appt Time:</span><b>{appt.appointment_time}</b></div>
                  <div style={infoItem}><span>Mobile:</span><b>{appt.patient_mobile}</b></div>
                  <div style={infoItem}><span>Token:</span><b style={{ color: '#3b82f6' }}>#{currentToken}</b></div>
                </div>

                {/* Quick Rx */}
                <div style={{ margin: '10px 0' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>QUICK Rx:</span>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '5px' }}>
                    {commonMeds.map(med => (
                      <button key={med} disabled={isLocked} onClick={() => addMedicine(appt.id, med)} style={proMedTag}>{med}+</button>
                    ))}
                  </div>
                </div>

                <textarea
                  placeholder="Enter Medicine Advice here..."
                  disabled={isLocked}
                  style={{ ...proTextArea, background: isLocked ? theme.bg : '#fff', color: '#333', boxSizing: 'border-box' }}
                  value={prescriptions[appt.id] !== undefined ? prescriptions[appt.id] : (appt.prescription || "")}
                  onChange={(e) => setPrescriptions({ ...prescriptions, [appt.id]: e.target.value })}
                />

                {/* Follow up + Buttons */}
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold' }}>Next Follow-up:</span>
                    <input type="date" disabled={isLocked} style={miniDateInput}
                      value={followUps[appt.id] || appt.next_follow_up || ""}
                      onChange={(e) => setFollowUps({ ...followUps, [appt.id]: e.target.value })} />
                  </div>
                  <div className="dd-card-btns">
                    {!isConfirmed && !isLocked && (
                      <>
                        <button style={proApproveBtn} onClick={() => updateStatus(appt.id, "Confirmed")}>CONFIRM</button>
                        <button style={proRejBtn} onClick={() => updateStatus(appt.id, "Rejected")}>CANCEL</button>
                      </>
                    )}
                    {!isLocked && (
                      <button style={{ ...proPdfBtn, background: '#3b82f6', flex: 2 }} onClick={() => handleSendRx(appt)}>
                        {isConfirmed ? "UPDATE & PRINT Rx" : "GENERATE Rx & PRINT"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Layout>
      <ToastContainer position="top-right" autoClose={2000} />
    </div>
  );
}

const tokenCircleSmall = { background: '#3b82f6', color: 'white', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '900', boxShadow: '0 4px 10px rgba(59,130,246,0.4)', flexShrink: 0 };
const tokenCircleMain = { color: 'white', width: '35px', height: '35px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', flexShrink: 0 };
const livePulseBadge = { background: '#ef4444', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', flexShrink: 0 };
const nextDetailBox = { display: 'flex', flexDirection: 'column', textAlign: 'right' };
const nextLabel = { fontSize: '10px', color: '#64748b', fontWeight: 'bold' };
const statBox = { display: 'flex', flexDirection: 'column', alignItems: 'center' };
const infoGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.02)', padding: '10px', borderRadius: '8px' };
const infoItem = { display: 'flex', flexDirection: 'column', fontSize: '11px' };
const proMedTag = { background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '3px 7px', borderRadius: '15px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' };
const proTextArea = { width: '100%', height: '80px', marginTop: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '10px', fontSize: '13px', resize: 'none' };
const proCard = { padding: '18px', borderRadius: '15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', borderTop: '6px solid #3b82f6', display: 'flex', flexDirection: 'column' };
const proApproveBtn = { flex: 2, background: '#10b981', color: 'white', border: 'none', padding: '11px', borderRadius: '8px', cursor: 'pointer', fontWeight: '900', fontSize: '12px' };
const proPdfBtn = { flex: 2, background: '#3b82f6', color: 'white', border: 'none', padding: '11px', borderRadius: '8px', cursor: 'pointer', fontWeight: '900', fontSize: '12px' };
const proRejBtn = { flex: 1, background: '#64748b', color: 'white', border: 'none', padding: '11px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };
const proWaBtn = { background: '#25D366', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' };
const proHistoryBtn = { background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer' };
const miniDateInput = { border: '1px solid #ddd', padding: '4px 6px', borderRadius: '4px', fontSize: '11px' };
