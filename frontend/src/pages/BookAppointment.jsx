import React, { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { toast, ToastContainer } from "react-toastify";
import QRCode from "react-qr-code";
import jsPDF from "jspdf";
import "react-toastify/dist/ReactToastify.css";

export default function BookAppointment() {
  const loggedInMobile = localStorage.getItem("patientMobile") || "";
  const loggedInName   = localStorage.getItem("patientName")   || "";

  const [formData, setFormData] = useState({
    patient_name: loggedInName, patient_mobile: loggedInMobile,
    patient_age: "", doctor_name: "", reason: "",
    appointment_date: "", appointment_time: "",
    payment_mode: "Clinic", utr_no: "", payment_date: ""
  });

  const [doctors, setDoctors]                   = useState([]);
  const [showPayModal, setShowPayModal]           = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState(null);
  const [sendingWA, setSendingWA]                 = useState(false);
  const [whatsappConfig, setWhatsappConfig]       = useState(null);

  const timeSlots = [
    "10:00 AM","10:30 AM","11:00 AM","11:30 AM",
    "12:00 PM","12:30 PM","02:00 PM","02:30 PM",
    "03:00 PM","03:30 PM","04:00 PM","04:30 PM"
  ];

  const upiID  = "kushwahaakriti2001-1@okhdfcbank";
  const upiLink = `upi://pay?pa=${upiID}&pn=Clinic&am=1&cu=INR`;

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/doctors");
        setDoctors(res.data);
      } catch (err) { console.error("Doctors fetch error"); }
    };
    const fetchWhatsappConfig = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/settings/whatsapp");
        setWhatsappConfig(res.data);
      } catch (err) {
        console.error("WhatsApp config fetch error");
        setWhatsappConfig({ enabled: true, mode: "invoice" });
      }
    };
    fetchDoctors();
    fetchWhatsappConfig();
  }, []);

  const handleClear = () => {
    setFormData({
      ...formData, patient_name: loggedInName, patient_age: "",
      doctor_name: "", reason: "", appointment_date: "",
      appointment_time: "", payment_mode: "Clinic", utr_no: "", payment_date: ""
    });
    setBookedAppointment(null);
  };

  // ─── Generate PDF — A4, fully dynamic y, nothing cuts off ──────────────────
  const generateAppointmentPDF = (data) => {
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const W       = 210;
    const MARGIN  = 15;
    const RIGHT   = W - MARGIN;   // 195
    const now     = new Date();

    const issuedDate = now.toLocaleDateString("en-IN", { day:"2-digit", month:"2-digit", year:"numeric" });
    const issuedTime = now.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true });
    const receiptNo  = `OPD-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${String(Math.floor(Math.random()*9000)+1000)}`;

    // helpers
    const setNormal = (size=9, color=[50,50,50]) => { doc.setFont("helvetica","normal"); doc.setFontSize(size); doc.setTextColor(...color); };
    const setBold   = (size=9, color=[20,20,20]) => { doc.setFont("helvetica","bold");   doc.setFontSize(size); doc.setTextColor(...color); };
    const hLine     = (y, lw=0.3, color=[140,140,140]) => { doc.setDrawColor(...color); doc.setLineWidth(lw); doc.line(MARGIN, y, RIGHT, y); };

    // White BG
    doc.setFillColor(255,255,255);
    doc.rect(0, 0, W, 297, "F");

    // ── HEADER ──────────────────────────────────────────────────────────
    let y = 18;
    setBold(13);
    doc.text("DISTRICT GOVERNMENT HOSPITAL", MARGIN, y);
    setNormal(8.5, [70,70,70]);
    doc.text("Ministry of Health & Family Welfare, Govt. of India", MARGIN, y+7);
    doc.text("OPD Appointment Registration", MARGIN, y+12);
    setBold(22);
    doc.text("RECEIPT", RIGHT, y+6, { align:"right" });

    y += 20;
    hLine(y, 0.7, [20,20,20]);

    // ── DATE / RECEIPT ROW ───────────────────────────────────────────────
    y += 10;
    setNormal(9.5, [50,50,50]);
    doc.text("Date:", MARGIN, y);
    setBold(9.5); doc.text(issuedDate, MARGIN+17, y);
    doc.setDrawColor(140,140,140); doc.setLineWidth(0.3);
    doc.line(MARGIN+15, y+1, MARGIN+85, y+1);

    setNormal(9.5, [50,50,50]);
    doc.text("Receipt No:", MARGIN+95, y);
    setBold(9.5); doc.text(receiptNo, MARGIN+117, y);
    doc.line(MARGIN+115, y+1, RIGHT, y+1);

    // ── NAME / CONTACT ROW ───────────────────────────────────────────────
    y += 12;
    setNormal(9.5, [50,50,50]);
    doc.text("Name:", MARGIN, y);
    setBold(9.5); doc.text(data.patient_name || "", MARGIN+17, y);
    doc.setDrawColor(140,140,140); doc.setLineWidth(0.3);
    doc.line(MARGIN+15, y+1, MARGIN+85, y+1);

    setNormal(9.5, [50,50,50]);
    doc.text("Contact No:", MARGIN+95, y);
    setBold(9.5); doc.text(data.patient_mobile || "", MARGIN+117, y);
    doc.line(MARGIN+115, y+1, RIGHT, y+1);

    // ── ADDRESS ROW ──────────────────────────────────────────────────────
    y += 12;
    setNormal(9.5, [50,50,50]);
    doc.text("Address:", MARGIN, y);
    doc.setDrawColor(140,140,140); doc.setLineWidth(0.3);
    doc.line(MARGIN+18, y+1, RIGHT, y+1);

    // ── TABLE ────────────────────────────────────────────────────────────
    y += 12;
    const tableTop   = y;
    const C1 = MARGIN;        // Qty  col  (15mm)
    const C2 = MARGIN + 26;   // Desc col  (41mm start)
    const C3 = MARGIN + 108;  // Price col (123mm start) — wider for long text
    const C4 = MARGIN + 168;  // Amount col(183mm start) — narrow, only "OPD" etc
    const TR = RIGHT;          // table right edge (195mm)
    const RH = 10;             // row height
    // Price col width = 168-108 = 60mm ✅
    // Amount col width = 195-168 = 27mm ✅
    // Desc col width = 108-26 = 82mm ✅

    // header bg
    doc.setFillColor(215,215,215);
    doc.rect(C1, tableTop, TR-C1, RH, "F");

    setBold(9);
    doc.text("Qty.",        C1+3,                  tableTop+7);
    doc.text("Description", (C2+C3)/2,             tableTop+7, { align:"center" });
    doc.text("Price",       C3+(C4-C3)/2,          tableTop+7, { align:"center" });
    doc.text("Amount",      C4+(TR-C4)/2,           tableTop+7, { align:"center" });

    const payModeText = data.payment_mode === "Online" ? "Online UPI" : "Cash at Counter";
    const payAmt      = data.payment_mode === "Online" ? `UTR: ${data.utr_no||"N/A"}` : "";

    const rows = [
      { q:"1",  d:"Patient Name",       p: data.patient_name||"—",           a:"" },
      { q:"2",  d:"Age",                p: `${data.patient_age||"N/A"} Years`, a:"" },
      { q:"3",  d:"Consulting Doctor",  p: `Dr. ${data.doctor_name}`,         a:"OPD" },
      { q:"4",  d:"Department",         p: "General OPD",                     a:"" },
      { q:"5",  d:"Appointment Date",   p: data.appointment_date||"—",        a:"" },
      { q:"6",  d:"Appointment Time",   p: data.appointment_time||"—",        a:"" },
      { q:"7",  d:"Reason / Complaint", p: data.reason||"General Checkup",    a:"" },
      { q:"8",  d:"Payment Mode",       p: payModeText,                       a: payAmt },
      { q:"9",  d:"Status",             p: "Pending Confirmation",            a:"" },
      { q:"10", d:"Token No.",          p: "After doctor confirms",           a:"" },
    ];

    setNormal(9);
    // Price col width = C4-C3 = 34mm, Amount col = TR-C4 = 24mm
    const priceColW  = C4 - C3 - 4;   // usable width inside price col
    const amountColW = TR - C4 - 4;   // usable width inside amount col
    const descColW   = C3 - C2 - 4;   // usable width inside desc col

    rows.forEach((row, i) => {
      const ry = tableTop + RH + i * RH;
      if (i % 2 === 0) { doc.setFillColor(248,248,248); doc.rect(C1, ry, TR-C1, RH, "F"); }
      doc.setTextColor(20,20,20);

      // Qty — left align
      doc.text(row.q, C1+3, ry+7);

      // Description — left align with maxWidth
      doc.text(row.d, C2+3, ry+7, { maxWidth: descColW });

      // Price — center align with maxWidth (stays inside C3→C4)
      doc.text(row.p, C3 + priceColW/2 + 2, ry+7, { align:"center", maxWidth: priceColW });

      // Amount — center align with maxWidth (stays inside C4→TR)
      doc.text(row.a, C4 + amountColW/2 + 2, ry+7, { align:"center", maxWidth: amountColW });
    });

    const tableBottom = tableTop + RH + rows.length * RH;

    // outer border
    doc.setDrawColor(20,20,20); doc.setLineWidth(0.6);
    doc.rect(C1, tableTop, TR-C1, tableBottom-tableTop);

    // col dividers
    doc.setLineWidth(0.4);
    doc.line(C2, tableTop, C2, tableBottom);
    doc.line(C3, tableTop, C3, tableBottom);
    doc.line(C4, tableTop, C4, tableBottom);

    // row dividers
    doc.setLineWidth(0.2); doc.setDrawColor(170,170,170);
    for (let i=1; i<=rows.length; i++) {
      doc.line(C1, tableTop + i*RH, TR, tableTop + i*RH);
    }

    // ── TOTAL ────────────────────────────────────────────────────────────
    y = tableBottom + 10;
    setBold(10);
    doc.text("Total:", C3-18, y);
    doc.setDrawColor(20,20,20); doc.setLineWidth(0.5);
    doc.line(C3+2, y+1, TR, y+1);
    setNormal(9, [50,50,50]);
    const totalTxt = data.payment_mode === "Online" ? "Rs.1 (Online Paid)" : "As applicable at Counter";
    doc.text(totalTxt, C3+5, y);

    // ── NOTE ─────────────────────────────────────────────────────────────
    y += 12;
    setNormal(8.5, [50,50,50]);
    doc.text("Note:", MARGIN, y);
    doc.setFont("helvetica","italic");
    doc.text("Token number will be generated after Doctor confirms your appointment.", MARGIN+12, y);

    // ── ISSUED / STATUS ───────────────────────────────────────────────────
    y += 10;
    setNormal(8.5, [80,80,80]);
    doc.text(`Issued On: ${issuedDate}  |  Time: ${issuedTime}`, MARGIN, y);
    setBold(9, [180,0,0]);
    doc.text("STATUS: PENDING", RIGHT, y, { align:"right" });

    // ── FOOTER DIVIDER ────────────────────────────────────────────────────
    y += 14;
    hLine(y, 0.6, [20,20,20]);

    // ── FOOTER TWO-COL ────────────────────────────────────────────────────
    y += 8;
    setNormal(8, [60,60,60]);
    doc.text("District Government Hospital",   MARGIN, y);
    doc.text("OPD Registration Desk, Block A", MARGIN, y+5);
    doc.text("Tel: 1800-XXX-XXXX",             MARGIN, y+10);

    doc.text("Helpline: 104",                  RIGHT, y,    { align:"right" });
    doc.text("opd@hospital.gov.in",            RIGHT, y+5,  { align:"right" });
    doc.text("Computer generated slip. No signature required.", RIGHT, y+10, { align:"right" });

    return doc.output("datauristring").split(",")[1];
  };

  // ─── Download PDF locally ──────────────────────────────────────────────────
  const downloadPDF = (appointmentData) => {
    const base64 = generateAppointmentPDF(appointmentData);
    const link   = document.createElement("a");
    link.href     = `data:application/pdf;base64,${base64}`;
    link.download = `OPD_Slip_${appointmentData.patient_name}_${appointmentData.appointment_date}.pdf`;
    link.click();
  };

  // ─── Send WhatsApp message via backend ────────────────────────────────────
  const sendWhatsAppPDF = async (appointmentData) => {
    setSendingWA(true);
    try {
      const base64PDF = generateAppointmentPDF(appointmentData);
      const filename  = `appt_${appointmentData.patient_name.replace(/\s+/g,"_")}_${Date.now()}.pdf`;

      const response = await axios.post("http://localhost:5000/api/whatsapp/send-pdf", {
        mobile:           appointmentData.patient_mobile,
        pdf_base64:       base64PDF,
        filename:         filename,
        patient_name:     appointmentData.patient_name,
        doctor_name:      appointmentData.doctor_name,
        appointment_date: appointmentData.appointment_date,
        appointment_time: appointmentData.appointment_time,
        payment_mode:     appointmentData.payment_mode,
        utr_no:           appointmentData.utr_no,
        patient_age:      appointmentData.patient_age,
        reason:           appointmentData.reason,
      });

      if (response.data?.success) {
        toast.success("✅ Appointment details sent on WhatsApp!");
      } else {
        toast.error("WhatsApp failed: " + (response.data?.error || "Unknown error"));
      }
    } catch (err) {
      const status  = err?.response?.status;
      const errData = err?.response?.data;
      if (status === 401 || errData?.error?.includes?.("expired")) {
        toast.error("⚠️ WhatsApp token expired! Admin se token update karwao.", { autoClose: 6000 });
      } else {
        toast.error("WhatsApp failed: " + (errData?.error || err.message));
      }
      console.error("WhatsApp error:", errData || err.message);
    }
    setSendingWA(false);
  };

  // ─── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.appointment_time) return toast.warn("Please select a time slot!");
    if (!formData.patient_age)      return toast.warn("Please enter patient age!");
    const currentFullDate = new Date().toISOString();
    if (formData.payment_mode === "Online" && !formData.utr_no) {
      setShowPayModal(true); return;
    }
    try {
      const finalData = { ...formData, payment_date: currentFullDate, status: "Pending", token_number: 0 };
      const res = await axios.post("http://localhost:5000/api/book", finalData);
      if (res.data.success) {
        toast.info(`🚀 Request Sent! Waiting for Dr. ${formData.doctor_name} to confirm.`);
        setBookedAppointment(finalData);
        setShowPayModal(false);
        const payDetail   = formData.payment_mode === "Online" ? `Online (UTR: ${formData.utr_no})` : "Cash at Clinic";
        const whatsappMsg = `New Appointment Request (Pending Approval)\n\nName: ${formData.patient_name}\nAge: ${formData.patient_age}\nDoctor: Dr. ${formData.doctor_name}\nDate: ${formData.appointment_date}\nTime: ${formData.appointment_time}\nPayment: ${payDetail}\nReason: ${formData.reason || "checkup"}\n\nNote: Token number will be generated after Doctor confirms.`;
        const whatsappUrl = `https://wa.me/917879098553?text=${encodeURIComponent(whatsappMsg)}`;
        setTimeout(() => { window.open(whatsappUrl, "_blank"); }, 1500);
      }
    } catch (err) {
      console.error(err); toast.error("Booking failed! Please try again.");
    }
  };

  return (
    <Layout>
      <style>{`
        .ba-wrapper { padding: 20px; background: #f4f7f6; min-height: 90vh; }
        .ba-card { max-width: 700px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .ba-name-age { display: flex; gap: 15px; }
        .ba-timegrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; margin-top: 5px; }
        .ba-timeslot { padding: 10px; border-radius: 10px; border: 2px solid; cursor: pointer; font-size: 12px; font-weight: bold; transition: 0.2s; text-align: center; }
        .ba-pay-row { display: flex; gap: 20px; margin-top: 10px; flex-wrap: wrap; }
        .ba-submit-row { display: flex; gap: 15px; margin-top: 20px; }
        .ba-success-card { background: linear-gradient(135deg, #e8f5e9, #f0f7ff); border: 2px solid #25D366; border-radius: 16px; padding: 20px; margin-top: 20px; text-align: center; }
        .ba-success-card h3 { color: #1a7a3a; margin: 0 0 8px 0; font-size: 18px; }
        .ba-success-card p { color: #555; font-size: 13px; margin: 0 0 16px 0; }
        .ba-action-btns { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
        .ba-wa-btn { display: flex; align-items: center; gap: 8px; padding: 13px 20px; background: #25D366; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 800; font-size: 14px; transition: 0.2s; }
        .ba-wa-btn:hover { background: #128C7E; transform: translateY(-1px); }
        .ba-wa-btn:disabled { background: #aaa; cursor: not-allowed; transform: none; }
        .ba-pdf-btn { display: flex; align-items: center; gap: 8px; padding: 13px 20px; background: #ff6b35; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 800; font-size: 14px; transition: 0.2s; }
        .ba-pdf-btn:hover { background: #e05a25; transform: translateY(-1px); }
        .ba-new-btn { display: flex; align-items: center; gap: 8px; padding: 13px 20px; background: #f8f9fa; color: #555; border: 1.5px solid #e2e8f0; border-radius: 12px; cursor: pointer; font-weight: 700; font-size: 14px; transition: 0.2s; }
        .ba-new-btn:hover { background: #e9ecef; }
        @media (max-width: 600px) {
          .ba-wrapper { padding: 12px 10px; }
          .ba-card { padding: 20px 15px; border-radius: 14px; }
          .ba-name-age { flex-direction: column; gap: 0; }
          .ba-timegrid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .ba-timeslot { font-size: 11px; padding: 8px 4px; }
          .ba-submit-row { flex-direction: column; gap: 10px; }
          .ba-submit-row button { width: 100% !important; }
          .ba-action-btns { flex-direction: column; }
          .ba-wa-btn, .ba-pdf-btn, .ba-new-btn { width: 100%; justify-content: center; }
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

          {bookedAppointment ? (
            <div className="ba-success-card">
              <div style={{ fontSize: "40px", marginBottom: "8px" }}>🎉</div>
              <h3>Appointment Request Sent!</h3>
              <p>
                Your request with <b>Dr. {bookedAppointment.doctor_name}</b> on{" "}
                <b>{bookedAppointment.appointment_date}</b> at <b>{bookedAppointment.appointment_time}</b> is{" "}
                <span style={{ color: "#f59e0b", fontWeight: "bold" }}>Pending Confirmation</span>.
              </p>
              <div className="ba-action-btns">
                <button
                  className="ba-wa-btn"
                  onClick={() => sendWhatsAppPDF(bookedAppointment)}
                  disabled={sendingWA || !whatsappConfig?.enabled}
                  title={!whatsappConfig?.enabled ? "WhatsApp disabled in settings" : "Send on WhatsApp"}
                >
                  {sendingWA ? <>⏳ Sending...</> : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Send PDF on WhatsApp
                    </>
                  )}
                </button>
                <button className="ba-pdf-btn" onClick={() => downloadPDF(bookedAppointment)}>
                  📄 Download PDF
                </button>
                <button className="ba-new-btn" onClick={handleClear}>
                  ➕ New Booking
                </button>
              </div>
              {!whatsappConfig?.enabled && (
                <p style={{ fontSize: "11px", color: "#e74c3c", marginTop: "12px" }}>
                  ⚠️ WhatsApp sending is disabled. Enable it in Settings.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>

              <div className="ba-name-age" style={{ gap:"15px" }}>
                <div style={{ ...inputGroup, flex:2 }}>
                  <label style={labelStyle}>Patient Name:</label>
                  <input style={inputStyle} type="text" value={formData.patient_name}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })} required />
                </div>
                <div style={{ ...inputGroup, flex:1 }}>
                  <label style={labelStyle}>Age:</label>
                  <input style={inputStyle} type="number" placeholder="Years" value={formData.patient_age}
                    onChange={(e) => setFormData({ ...formData, patient_age: e.target.value })} required />
                </div>
              </div>

              <div style={inputGroup}>
                <label style={labelStyle}>Registered Mobile:</label>
                <input style={{ ...inputStyle, background:"#f8f9fa", cursor:"not-allowed", color:"#888" }}
                  type="text" value={formData.patient_mobile} readOnly />
              </div>

              <div style={inputGroup}>
                <label style={labelStyle}>Consulting Doctor:</label>
                <select style={inputStyle} value={formData.doctor_name}
                  onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })} required>
                  <option value="">-- Select Doctor --</option>
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.name}>Dr. {doc.name} ({doc.speciality})</option>
                  ))}
                </select>
              </div>

              <div style={inputGroup}>
                <label style={labelStyle}>Preferred Date:</label>
                <input style={inputStyle} type="date" min={new Date().toISOString().split("T")[0]}
                  value={formData.appointment_date}
                  onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })} required />
              </div>

              <div style={inputGroup}>
                <label style={labelStyle}>Select Time Slot:</label>
                <div className="ba-timegrid">
                  {timeSlots.map((slot) => (
                    <button key={slot} type="button" className="ba-timeslot"
                      onClick={() => setFormData({ ...formData, appointment_time: slot })}
                      style={{
                        borderColor: formData.appointment_time === slot ? "#1e90ff" : "#e2e8f0",
                        background:  formData.appointment_time === slot ? "#1e90ff" : "white",
                        color:       formData.appointment_time === slot ? "white"   : "#555"
                      }}>
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ ...inputGroup, background:"#f8f9fa", padding:"15px", borderRadius:"12px", border:"1px dashed #cbd5e1" }}>
                <label style={labelStyle}>Payment Method:</label>
                <div className="ba-pay-row">
                  <label style={{ cursor:"pointer", fontSize:"14px", display:"flex", alignItems:"center", gap:"6px" }}>
                    <input type="radio" name="pay" value="Clinic"
                      checked={formData.payment_mode === "Clinic"}
                      onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })} />
                    Pay at Clinic
                  </label>
                  <label style={{ cursor:"pointer", fontSize:"14px", display:"flex", alignItems:"center", gap:"6px" }}>
                    <input type="radio" name="pay" value="Online"
                      checked={formData.payment_mode === "Online"}
                      onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })} />
                    Online UPI (₹1)
                  </label>
                </div>
              </div>

              <div style={inputGroup}>
                <label style={labelStyle}>Reason / Symptoms:</label>
                <textarea style={{ ...inputStyle, minHeight:"80px", resize:"none" }}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Briefly describe your health issue..." />
              </div>

              <div className="ba-submit-row">
                <button type="submit" style={btnStyle}>
                  {formData.payment_mode === "Online" && !formData.utr_no
                    ? "Pay Now & Send Request"
                    : "Send Appointment Request 🚀"}
                </button>
                <button type="button" onClick={handleClear} style={clearBtnStyle}>Clear</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {showPayModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{ margin:"0 0 10px 0" }}>Scan & Pay ₹1</h3>
            <div style={{ background:"white", padding:"10px", display:"inline-block", borderRadius:"10px" }}>
              <QRCode value={upiLink} size={150} />
            </div>
            <p style={{ fontSize:"12px", color:"#666", marginTop:"10px" }}>Pay via PhonePe, GPay or Paytm</p>
            <div style={{ marginTop:"15px", textAlign:"left" }}>
              <label style={{ fontSize:"11px", fontWeight:"bold", color:"#444" }}>ENTER UTR / TRANSACTION ID:</label>
              <input style={{ ...inputStyle, marginTop:"5px", borderColor:"#1e90ff", width:"100%", boxSizing:"border-box" }}
                placeholder="e.g. 401234567890"
                value={formData.utr_no}
                onChange={(e) => setFormData({ ...formData, utr_no: e.target.value })} />
            </div>
            <button
              onClick={() => { if (formData.utr_no.length >= 10) handleSubmit(); else toast.error("Please enter valid UTR"); }}
              style={{ ...btnStyle, marginTop:"12px", width:"100%", background:"#1e90ff" }}>
              Verify & Send Booking Request
            </button>
            <button onClick={() => setShowPayModal(false)}
              style={{ background:"none", border:"none", color:"#999", marginTop:"10px", cursor:"pointer", width:"100%" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <ToastContainer position="bottom-right" />
    </Layout>
  );
}

const inputGroup    = { display:"flex", flexDirection:"column", gap:"6px" };
const labelStyle    = { fontWeight:"700", color:"#444", fontSize:"12px", textTransform:"uppercase", letterSpacing:"0.5px" };
const inputStyle    = { padding:"13px", borderRadius:"12px", border:"1px solid #e2e8f0", fontSize:"15px", outline:"none", width:"100%", boxSizing:"border-box" };
const btnStyle      = { flex:2, padding:"15px", background:"#25D366", color:"white", border:"none", borderRadius:"12px", cursor:"pointer", fontWeight:"800", fontSize:"15px" };
const clearBtnStyle = { flex:1, padding:"15px", background:"#f8f9fa", color:"#666", border:"1px solid #e2e8f0", borderRadius:"12px", cursor:"pointer", fontWeight:"bold" };
const modalOverlay  = { position:"fixed", top:0, left:0, width:"100%", height:"100%", background:"rgba(0,0,0,0.7)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:3000, padding:"15px", boxSizing:"border-box" };
const modalContent  = { background:"#fff", padding:"25px 20px", borderRadius:"20px", textAlign:"center", width:"100%", maxWidth:"340px" };
