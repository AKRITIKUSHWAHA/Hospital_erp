import React, { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import jsPDF from "jspdf";

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);

  const fetchMyData = async () => {
    const mobile = localStorage.getItem("patientMobile");
    if (!mobile) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/appointments`);
      const myFilteredData = res.data.filter(item =>
        String(item.patient_mobile || "").trim() === String(mobile).trim()
      );
      const sortedData = myFilteredData.sort((a, b) => {
        const dateTimeA = new Date(`${a.appointment_date.split('T')[0]}T${a.appointment_time || '00:00'}`);
        const dateTimeB = new Date(`${b.appointment_date.split('T')[0]}T${b.appointment_time || '00:00'}`);
        return dateTimeB - dateTimeA;
      });
      setAppointments(sortedData);
    } catch (err) { console.error("Error fetching appointments"); }
  };

  useEffect(() => {
    fetchMyData();
    const interval = setInterval(fetchMyData, 3000);
    return () => clearInterval(interval);
  }, []);

  const downloadPDF = (item) => {
    const doc = new jsPDF();
    doc.setFillColor(30, 144, 255);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("MEDICAL PRESCRIPTION", 105, 20, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Patient: ${item.patient_name} (${item.patient_age || 'N/A'} Years)`, 20, 45);
    doc.text(`Doctor: Dr. ${item.doctor_name}`, 20, 55);
    doc.text(`Date: ${formatDate(item.appointment_date)}`, 150, 45);
    doc.line(20, 60, 190, 60);
    doc.setFontSize(14);
    doc.setTextColor(30, 144, 255);
    doc.text("Rx (Medicines):", 20, 75);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    const prescText = item.prescription || "No prescription details available yet.";
    const splitText = doc.splitTextToSize(prescText, 170);
    doc.text(splitText, 20, 85);
    if (item.next_follow_up) {
      doc.setFont("helvetica", "bold");
      doc.text(`Next Follow-up: ${formatDate(item.next_follow_up)}`, 20, 130);
    }
    doc.save(`Prescription_${item.patient_name}.pdf`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const statusStyle = (status) => ({
    color: status === 'Confirmed' ? '#28a745' : status === 'Rejected' ? '#dc3545' : '#b45309',
    fontWeight: 'bold', padding: '5px 10px', borderRadius: '8px', fontSize: '11px',
    background: status === 'Confirmed' ? '#dcfce7' : status === 'Rejected' ? '#fee2e2' : '#fef9c3',
    whiteSpace: 'nowrap'
  });

  return (
    <Layout>
      <style>{`
        .ma-wrapper { padding: 20px; background: #f4f7f6; min-height: 90vh; }
        .ma-card { max-width: 1100px; margin: 0 auto; background: white; padding: 25px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .ma-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .ma-user-badge { text-align: right; background: #eef4fb; padding: 10px 15px; border-radius: 12px; }

        /* Desktop: table */
        .ma-table-wrap { overflow-x: auto; }
        .ma-table { width: 100%; border-collapse: collapse; }
        .ma-mobile-cards { display: none; }

        @media (max-width: 700px) {
          .ma-wrapper { padding: 12px 10px; }
          .ma-card { padding: 16px 12px; border-radius: 14px; }
          .ma-header { flex-direction: column; align-items: flex-start; }
          .ma-user-badge { width: 100%; box-sizing: border-box; text-align: left; }
          .ma-table-wrap { display: none; }
          .ma-mobile-cards { display: block; }
        }
      `}</style>

      <div className="ma-wrapper">
        <div className="ma-card">
          <div className="ma-header">
            <div>
              <h2 style={{ color: "#1e90ff", margin: 0, fontWeight: "800" }}>📑 My Appointments</h2>
              <p style={{ color: "#888", fontSize: "13px", margin: "4px 0 0" }}>Recent history at the top</p>
            </div>
            <div className="ma-user-badge">
              <span style={{ fontSize: '13px', color: '#1e90ff', fontWeight: 'bold' }}>
                👤 {localStorage.getItem("patientName")}
              </span><br />
              <span style={{ fontSize: '11px', color: '#555' }}>📞 {localStorage.getItem("patientMobile")}</span>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="ma-table-wrap">
            <table className="ma-table">
              <thead>
                <tr style={{ borderBottom: '2px solid #f4f7f6' }}>
                  <th style={thStyle}>Patient</th>
                  <th style={thStyle}>Doctor</th>
                  <th style={thStyle}>Reason</th>
                  <th style={thStyle}>Date & Time</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length > 0 ? appointments.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f8f9fa' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>
                        {item.patient_name}
                        <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '400' }}> ({item.patient_age || 'N/A'} Yrs)</span>
                      </div>
                      <small style={{ color: '#94a3b8', fontSize: '10px' }}>{item.patient_mobile}</small>
                    </td>
                    <td style={tdStyle}><b>Dr. {item.doctor_name}</b></td>
                    <td style={tdStyle}>{item.reason || "General Checkup"}</td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: '500' }}>{formatDate(item.appointment_date)}</span><br />
                      <small style={{ color: '#888' }}>{item.appointment_time}</small>
                    </td>
                    <td style={tdStyle}><span style={statusStyle(item.status)}>{item.status || "Pending"}</span></td>
                    <td style={tdStyle}>
                      {item.status === "Confirmed" && item.prescription?.trim() ? (
                        <button onClick={() => downloadPDF(item)} style={downloadBtnStyle}>📥 Prescription</button>
                      ) : item.status === "Confirmed" ? (
                        <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold', background: '#fffbeb', padding: '5px', borderRadius: '5px' }}>⏳ Wait for Rx</span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#aaa' }}>{item.status === "Rejected" ? "Rejected" : "Processing..."}</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>🗓️</div>No records found.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 🔥 Mobile Cards */}
          <div className="ma-mobile-cards">
            {appointments.length > 0 ? appointments.map((item) => (
              <div key={item.id} style={{ background: '#f9fafb', borderRadius: '12px', padding: '14px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#1e293b' }}>{item.patient_name}
                      <span style={{ fontSize: '12px', fontWeight: '400', color: '#64748b' }}> ({item.patient_age || 'N/A'} Yrs)</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Dr. {item.doctor_name}</div>
                  </div>
                  <span style={statusStyle(item.status)}>{item.status || "Pending"}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                  <span>📅 {formatDate(item.appointment_date)}</span>
                  <span>🕒 {item.appointment_time}</span>
                  <span style={{ gridColumn: '1/-1' }}>📝 {item.reason || "General Checkup"}</span>
                </div>
                {item.status === "Confirmed" && item.prescription?.trim() ? (
                  <button onClick={() => downloadPDF(item)} style={{ ...downloadBtnStyle, width: '100%' }}>📥 Download Prescription</button>
                ) : item.status === "Confirmed" ? (
                  <div style={{ fontSize: '12px', color: '#f59e0b', background: '#fffbeb', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>⏳ Waiting for prescription</div>
                ) : null}
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>🗓️</div>No records found.
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const thStyle = { textAlign: 'left', padding: '14px', color: '#888', fontSize: '12px', textTransform: 'uppercase' };
const tdStyle = { padding: '16px 14px', color: '#334155', fontSize: '14px' };
const downloadBtnStyle = { background: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(16,185,129,0.2)' };
