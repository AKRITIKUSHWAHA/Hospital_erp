import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";

export default function MedicalRecords() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    setRecords([
      { id: 1, date: "2024-03-20", title: "Blood Test Report", doctor: "Dr. Sharma", file: "report1.pdf" },
      { id: 2, date: "2024-03-22", title: "X-Ray Chest", doctor: "Dr. Verma", file: "xray.jpg" }
    ]);
  }, []);

  return (
    <Layout>
      <style>{`
        .mr-wrapper { padding: 20px; background: #f8fafc; min-height: 90vh; }
        .mr-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .mr-card {
          background: white;
          padding: 20px;
          border-radius: 15px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          text-align: center;
          border: 1px solid #e2e8f0;
          transition: transform 0.2s;
        }
        .mr-card:hover { transform: translateY(-2px); }
        .mr-dl-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          width: 100%;
          font-size: 14px;
          margin-top: 10px;
        }

        @media (max-width: 500px) {
          .mr-wrapper { padding: 12px 10px; }
          .mr-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
          .mr-card { padding: 15px 12px; }
          .mr-card h4 { font-size: 13px; }
        }

        @media (max-width: 360px) {
          .mr-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="mr-wrapper">
        <h2 style={{ color: "#28a745", fontWeight: "800", margin: '0 0 5px 0' }}>📜 My Medical Records</h2>
        <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>Your reports and health documents</p>

        <div className="mr-grid">
          {records.map(record => (
            <div key={record.id} className="mr-card">
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📄</div>
              <h4 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>{record.title}</h4>
              <p style={{ fontSize: '12px', color: '#666', margin: '0 0 2px' }}>📅 {record.date}</p>
              <p style={{ fontSize: '12px', color: '#666', margin: '0 0 12px' }}>👨‍⚕️ {record.doctor}</p>
              <button className="mr-dl-btn" onClick={() => alert('Downloading...')}>
                Download 📥
              </button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
