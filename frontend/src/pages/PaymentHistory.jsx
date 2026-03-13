import React, { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const patientMobile = localStorage.getItem("patientMobile");

  const fetchPayments = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/appointments");
      const myPayments = res.data.filter(a =>
        String(a.patient_mobile || "").trim() === String(patientMobile || "").trim() &&
        a.payment_mode === "Online"
      );
      setPayments(myPayments);
    } catch (err) { console.error("Payment fetch error"); }
  };

  useEffect(() => {
    if (patientMobile) {
      fetchPayments();
      const interval = setInterval(fetchPayments, 3000);
      return () => clearInterval(interval);
    }
  }, [patientMobile]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const filteredPayments = payments.filter(p => {
    const matchesUTR = (p.utr_no || "").toLowerCase().includes(searchTerm.toLowerCase());
    const recordDate = p.appointment_date ? new Date(p.appointment_date).toISOString().split('T')[0] : "";
    const matchesDate = filterDate === "" || recordDate === filterDate;
    return matchesUTR && matchesDate;
  });

  return (
    <Layout>
      <style>{`
        .ph-wrapper { padding: 20px; background: #f8fafc; min-height: 90vh; }
        .ph-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 10px; }
        .ph-filters { display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
        .ph-filter-input { padding: 10px 14px; border-radius: 8px; border: 1px solid #ddd; outline: none; font-size: 14px; min-width: 180px; flex: 1; }

        /* Desktop table */
        .ph-table-wrap { background: white; border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); overflow: hidden; overflow-x: auto; }
        .ph-table { width: 100%; border-collapse: collapse; min-width: 500px; }
        .ph-mobile-cards { display: none; }

        @media (max-width: 650px) {
          .ph-wrapper { padding: 12px 10px; }
          .ph-header { flex-direction: column; align-items: flex-start; }
          .ph-filter-input { min-width: 0; }
          .ph-table-wrap { display: none; }
          .ph-mobile-cards { display: block; }
        }
      `}</style>

      <div className="ph-wrapper">
        <div className="ph-header">
          <h2 style={{ color: "#1e90ff", fontWeight: "800", margin: 0 }}>💸 My Payment History</h2>
          <div style={{ fontSize: '12px', color: '#64748b', background: '#e2e8f0', padding: '5px 12px', borderRadius: '20px' }}>
            Total Payments: <b>{filteredPayments.length}</b>
          </div>
        </div>

        <div className="ph-filters">
          <input type="text" placeholder="Search by UTR Number..."
            className="ph-filter-input"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <input type="date" className="ph-filter-input"
            value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          {(searchTerm || filterDate) && (
            <button onClick={() => { setSearchTerm(""); setFilterDate(""); }}
              style={{ background: '#ff4d4d', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold' }}>
              Reset
            </button>
          )}
        </div>

        {/* Desktop Table */}
        <div className="ph-table-wrap">
          <table className="ph-table">
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                <th style={thStyle}>Appt. Date</th>
                <th style={thStyle}>Payment Date</th>
                <th style={thStyle}>Doctor</th>
                <th style={thStyle}>Fee</th>
                <th style={thStyle}>UTR Number</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length > 0 ? filteredPayments.map((p, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={tdStyle}>{formatDate(p.appointment_date)}</td>
                  <td style={tdStyle}><span style={{ color: '#64748b', fontSize: '13px' }}>{formatDate(p.created_at)}</span></td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: '600' }}>Dr. {p.doctor_name}</div>
                    <small style={{ color: '#888' }}>{p.appointment_time}</small>
                  </td>
                  <td style={tdStyle}>₹1</td>
                  <td style={tdStyle}>
                    <code style={{ background: '#fff9db', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ffe066', fontSize: '12px' }}>
                      {p.utr_no || "N/A"}
                    </code>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: '#28a745', fontWeight: 'bold', background: '#dcfce7', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                      Paid ✅
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ fontSize: '28px', marginBottom: '10px' }}>🔍</div>
                  No payments match your search criteria.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 🔥 Mobile Cards */}
        <div className="ph-mobile-cards">
          {filteredPayments.length > 0 ? filteredPayments.map((p, index) => (
            <div key={index} style={{ background: 'white', borderRadius: '12px', padding: '15px', marginBottom: '12px', boxShadow: '0 3px 10px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: '700', fontSize: '15px' }}>Dr. {p.doctor_name}</div>
                <span style={{ color: '#28a745', fontWeight: 'bold', background: '#dcfce7', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>Paid ✅</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                <div><span style={{ fontWeight: '600' }}>Appt:</span> {formatDate(p.appointment_date)}</div>
                <div><span style={{ fontWeight: '600' }}>Paid:</span> {formatDate(p.created_at)}</div>
                <div><span style={{ fontWeight: '600' }}>Time:</span> {p.appointment_time}</div>
                <div><span style={{ fontWeight: '600' }}>Fee:</span> ₹1</div>
              </div>
              <div style={{ marginTop: '10px', background: '#fff9db', padding: '8px', borderRadius: '6px', border: '1px solid #ffe066' }}>
                <span style={{ fontSize: '11px', color: '#888', fontWeight: '600' }}>UTR: </span>
                <code style={{ fontSize: '13px', color: '#333' }}>{p.utr_no || "N/A"}</code>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>🔍</div>
              No payments match your search criteria.
            </div>
          )}
          <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '10px' }}>
            * Only UPI/Online payments shown here.
          </p>
        </div>

        <p style={{ marginTop: '15px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
          * Only payments made via UPI/Online mode are shown here.
        </p>
      </div>
    </Layout>
  );
}

const thStyle = { padding: "14px", color: "#64748b", fontSize: "12px", textTransform: "uppercase", fontWeight: '700' };
const tdStyle = { padding: "14px", fontSize: "14px", color: "#334155" };
