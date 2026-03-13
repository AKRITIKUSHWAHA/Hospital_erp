import React, { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { toast, ToastContainer } from "react-toastify";
import QRCode from "react-qr-code";
import "react-toastify/dist/ReactToastify.css";

export default function BookAppointment() {
  const loggedInMobile = localStorage.getItem("patientMobile") || "";
  const loggedInName = localStorage.getItem("patientName") || "";

  const [formData, setFormData] = useState({
    patient_name: loggedInName, patient_mobile: loggedInMobile,
    patient_age: "", doctor_name: "", reason: "",
    appointment_date: "", appointment_time: "",
    payment_mode: "Clinic", utr_no: "", payment_date: ""
  });

  const [doctors, setDoctors] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);

  const timeSlots = [
    "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "02:00 PM", "02:30 PM",
    "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM"
  ];

  const upiID = "kushwahaakriti2001-1@okhdfcbank";
  const upiLink = `upi://pay?pa=${upiID}&pn=Clinic&am=1&cu=INR`;

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/doctors");
        setDoctors(res.data);
      } catch (err) { console.error("Doctors fetch error"); }
    };
    fetchDoctors();
  }, []);

  const handleClear = () => {
    setFormData({
      ...formData, patient_name: loggedInName, patient_age: "",
      doctor_name: "", reason: "", appointment_date: "",
      appointment_time: "", payment_mode: "Clinic", utr_no: "", payment_date: ""
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.appointment_time) return toast.warn("Please select a time slot!");
    if (!formData.patient_age) return toast.warn("Please enter patient age!");
    const currentFullDate = new Date().toISOString();
    if (formData.payment_mode === "Online" && !formData.utr_no) {
      setShowPayModal(true); return;
    }
    try {
      const finalData = { ...formData, payment_date: currentFullDate, status: "Pending", token_number: 0 };
      const res = await axios.post("http://localhost:5000/api/book", finalData);
      if (res.data.success) {
        toast.info(`🚀 Request Sent! Waiting for Dr. ${formData.doctor_name} to confirm.`);
        const payDetail = formData.payment_mode === "Online" ? `Online (UTR: ${formData.utr_no})` : "Cash at Clinic";
        const whatsappMsg = `New Appointment Request (Pending Approval)\n\nName: ${formData.patient_name}\nAge: ${formData.patient_age}\nDoctor: Dr. ${formData.doctor_name}\nDate: ${formData.appointment_date}\nTime: ${formData.appointment_time}\nPayment: ${payDetail}\nReason: ${formData.reason || "checkup"}\n\nNote: Token number will be generated after Doctor confirms your appointment.`;
        const whatsappUrl = `https://wa.me/917879098553?text=${encodeURIComponent(whatsappMsg)}`;
        setShowPayModal(false);
        setTimeout(() => { window.open(whatsappUrl, "_blank"); handleClear(); }, 2000);
      }
    } catch (err) {
      console.error(err); toast.error("Booking failed! Please try again.");
    }
  };

  return (
    <Layout>
      <style>{`
        .ba-wrapper {
          padding: 20px;
          background: #f4f7f6;
          min-height: 90vh;
        }
        .ba-card {
          max-width: 700px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }
        .ba-name-age {
          display: flex;
          gap: 15px;
        }
        .ba-timegrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 10px;
          margin-top: 5px;
        }
        .ba-timeslot {
          padding: 10px;
          border-radius: 10px;
          border: 2px solid;
          cursor: pointer;
          font-size: 12px;
          font-weight: bold;
          transition: 0.2s;
          text-align: center;
        }
        .ba-pay-row {
          display: flex;
          gap: 20px;
          margin-top: 10px;
          flex-wrap: wrap;
        }
        .ba-submit-row {
          display: flex;
          gap: 15px;
          margin-top: 20px;
        }

        @media (max-width: 600px) {
          .ba-wrapper { padding: 12px 10px; }
          .ba-card { padding: 20px 15px; border-radius: 14px; }
          .ba-name-age { flex-direction: column; gap: 0; }
          .ba-timegrid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .ba-timeslot { font-size: 11px; padding: 8px 4px; }
          .ba-submit-row { flex-direction: column; gap: 10px; }
          .ba-submit-row button { width: 100% !important; }
        }
        @media (max-width: 380px) {
          .ba-timegrid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="ba-wrapper">
        <div className="ba-card">
          <h2 style={{ color: "#1e90ff", marginBottom: "5px", fontWeight: "800" }}>📝 Book Appointment</h2>
          <p style={{ color: "#777", marginBottom: "20px", fontSize: "13px" }}>
            Logged in as: <b style={{ color: "#333" }}>{loggedInName}</b>
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Name + Age */}
            <div className="ba-name-age" style={{ gap: '15px' }}>
              <div style={{ ...inputGroup, flex: 2 }}>
                <label style={labelStyle}>Patient Name:</label>
                <input style={inputStyle} type="text" value={formData.patient_name}
                  onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })} required />
              </div>
              <div style={{ ...inputGroup, flex: 1 }}>
                <label style={labelStyle}>Age:</label>
                <input style={inputStyle} type="number" placeholder="Years" value={formData.patient_age}
                  onChange={(e) => setFormData({ ...formData, patient_age: e.target.value })} required />
              </div>
            </div>

            {/* Mobile */}
            <div style={inputGroup}>
              <label style={labelStyle}>Registered Mobile:</label>
              <input style={{ ...inputStyle, background: "#f8f9fa", cursor: "not-allowed", color: "#888" }}
                type="text" value={formData.patient_mobile} readOnly />
            </div>

            {/* Doctor */}
            <div style={inputGroup}>
              <label style={labelStyle}>Consulting Doctor:</label>
              <select style={inputStyle} value={formData.doctor_name}
                onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })} required>
                <option value="">-- Select Doctor --</option>
                {doctors.map(doc => <option key={doc.id} value={doc.name}>Dr. {doc.name} ({doc.speciality})</option>)}
              </select>
            </div>

            {/* Date */}
            <div style={inputGroup}>
              <label style={labelStyle}>Preferred Date:</label>
              <input style={inputStyle} type="date" min={new Date().toISOString().split("T")[0]}
                value={formData.appointment_date}
                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })} required />
            </div>

            {/* Time Slots */}
            <div style={inputGroup}>
              <label style={labelStyle}>Select Time Slot:</label>
              <div className="ba-timegrid">
                {timeSlots.map((slot) => (
                  <button key={slot} type="button" className="ba-timeslot"
                    onClick={() => setFormData({ ...formData, appointment_time: slot })}
                    style={{
                      borderColor: formData.appointment_time === slot ? "#1e90ff" : "#e2e8f0",
                      background: formData.appointment_time === slot ? "#1e90ff" : "white",
                      color: formData.appointment_time === slot ? "white" : "#555"
                    }}>
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Mode */}
            <div style={{ ...inputGroup, background: '#f8f9fa', padding: '15px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <label style={labelStyle}>Payment Method:</label>
              <div className="ba-pay-row">
                <label style={{ cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="radio" name="pay" value="Clinic"
                    checked={formData.payment_mode === "Clinic"}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })} />
                  Pay at Clinic
                </label>
                <label style={{ cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="radio" name="pay" value="Online"
                    checked={formData.payment_mode === "Online"}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })} />
                  Online UPI (₹1)
                </label>
              </div>
            </div>

            {/* Reason */}
            <div style={inputGroup}>
              <label style={labelStyle}>Reason / Symptoms:</label>
              <textarea style={{ ...inputStyle, minHeight: "80px", resize: "none" }}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Briefly describe your health issue..." />
            </div>

            {/* Buttons */}
            <div className="ba-submit-row">
              <button type="submit" style={btnStyle}>
                {formData.payment_mode === "Online" && !formData.utr_no ? "Pay Now & Send Request" : "Send Appointment Request 🚀"}
              </button>
              <button type="button" onClick={handleClear} style={clearBtnStyle}>Clear</button>
            </div>
          </form>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{ margin: '0 0 10px 0' }}>Scan & Pay ₹1</h3>
            <div style={{ background: 'white', padding: '10px', display: 'inline-block', borderRadius: '10px' }}>
              <QRCode value={upiLink} size={150} />
            </div>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>Pay via PhonePe, GPay or Paytm</p>
            <div style={{ marginTop: '15px', textAlign: 'left' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#444' }}>ENTER UTR / TRANSACTION ID:</label>
              <input style={{ ...inputStyle, marginTop: '5px', borderColor: '#1e90ff', width: '100%', boxSizing: 'border-box' }}
                placeholder="e.g. 401234567890"
                value={formData.utr_no}
                onChange={(e) => setFormData({ ...formData, utr_no: e.target.value })} />
            </div>
            <button onClick={() => { if (formData.utr_no.length >= 10) handleSubmit(); else toast.error("Please enter valid 12-digit UTR"); }}
              style={{ ...btnStyle, marginTop: '12px', width: '100%', background: '#1e90ff' }}>
              Verify & Send Booking Request
            </button>
            <button onClick={() => setShowPayModal(false)}
              style={{ background: 'none', border: 'none', color: '#999', marginTop: '10px', cursor: 'pointer', width: '100%' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <ToastContainer position="bottom-right" />
    </Layout>
  );
}

const inputGroup = { display: "flex", flexDirection: "column", gap: "6px" };
const labelStyle = { fontWeight: "700", color: "#444", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" };
const inputStyle = { padding: "13px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "15px", outline: "none", width: "100%", boxSizing: "border-box" };
const btnStyle = { flex: 2, padding: "15px", background: "#25D366", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "800", fontSize: "15px" };
const clearBtnStyle = { flex: 1, padding: "15px", background: "#f8f9fa", color: "#666", border: "1px solid #e2e8f0", borderRadius: "12px", cursor: "pointer", fontWeight: "bold" };
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '15px', boxSizing: 'border-box' };
const modalContent = { background: '#fff', padding: '25px 20px', borderRadius: '20px', textAlign: 'center', width: '100%', maxWidth: '340px' };
