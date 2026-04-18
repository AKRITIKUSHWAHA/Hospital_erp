const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const path = require('path'); // 🆕 ADD
const fs = require('fs');     // 🆕 ADD

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // 🆕 limit badhaya PDF ke liye

// 🆕 Static folder — WhatsApp API yahan se PDF download karega
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 1. MySQL Connection
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'root',
    database: 'hospital_db'
});

db.connect(err => {
    if (err) {
        console.error("❌ DB Connection Failed:", err.message);
    } else {
        console.log("✅ MySQL Connected Successfully");
    }
});

// 2. LOGIN API
app.post('/api/login', (req, res) => {
    const { username, password, role } = req.body;
    console.log(`Login Attempt: User=${username}, Role=${role}`);
    const sql = "SELECT * FROM users WHERE username = ? AND password = ? AND role = ?";
    db.query(sql, [username, password, role], (err, results) => {
        if (err) {
            console.error("❌ Login SQL Error:", err.sqlMessage);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        if (results.length > 0) {
            res.json({ success: true, user: results[0] });
        } else {
            res.status(401).json({ success: false, message: "Invalid username, password or role" });
        }
    });
});

// PATIENT REGISTRATION & LOGIN API
app.post('/api/patient-login', (req, res) => {
    const { name, mobile } = req.body;
    const checkSql = "SELECT * FROM patients WHERE mobile = ?";
    db.query(checkSql, [mobile], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (results.length > 0) {
            return res.json({ success: true, message: "Welcome back!", user: results[0] });
        } else {
            const insertSql = "INSERT INTO patients (full_name, mobile) VALUES (?, ?)";
            db.query(insertSql, [name, mobile], (err, result) => {
                if (err) return res.status(500).json({ success: false, error: err.message });
                res.json({ success: true, message: "New Patient Registered!", id: result.insertId });
            });
        }
    });
});

// 3. GET ALL APPOINTMENTS API
app.get('/api/appointments', (req, res) => {
    const sql = "SELECT * FROM appointments ORDER BY id DESC";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ Fetch Error:", err.sqlMessage);
            return res.status(500).json({ success: false, error: err.sqlMessage });
        }
        res.json(results);
    });
});

// 4. BOOKING API
app.post('/api/book', (req, res) => {
    const { 
        patient_name, patient_mobile, patient_age, 
        doctor_name, reason, appointment_date, 
        appointment_time, payment_mode, utr_no 
    } = req.body;

    const sql = `INSERT INTO appointments 
    (patient_name, patient_mobile, patient_age, doctor_name, reason, appointment_date, appointment_time, status, payment_mode, utr_no) 
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`;

    db.query(sql, [
        patient_name, 
        patient_mobile, 
        patient_age || null, 
        doctor_name, 
        reason || '', 
        appointment_date, 
        appointment_time, 
        payment_mode || 'Clinic', 
        utr_no || null
    ], (err, result) => {
        if (err) {
            console.error("❌ Booking Error:", err.sqlMessage);
            return res.status(500).json({ success: false, error: err.sqlMessage });
        }
        res.status(200).json({ success: true, id: result.insertId });
    });
});

// 5. UPDATE STATUS & PRESCRIPTION API
app.put('/api/appointments/:id', (req, res) => {
    const { id } = req.params;
    const { status, prescription } = req.body;
    const sql = "UPDATE appointments SET status = ?, prescription = ? WHERE id = ?";
    db.query(sql, [status, prescription || null, id], (err, result) => {
        if (err) {
            console.error("❌ Update Error:", err.sqlMessage);
            return res.status(500).send(err);
        }
        res.json({ success: true });
    });
});

// DOCTOR MANAGEMENT APIs
app.get('/api/doctors', (req, res) => {
    const sql = "SELECT * FROM doctors ORDER BY id DESC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/doctors', (req, res) => {
    const { name, speciality, mobile } = req.body;
    const sql = "INSERT INTO doctors (name, speciality, mobile) VALUES (?, ?, ?)";
    db.query(sql, [name, speciality, mobile], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

app.delete('/api/doctors/:id', (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM doctors WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Doctor removed" });
    });
});

// WHATSAPP BILLING & CONFIG APIs (existing)
app.get('/api/service-config', (req, res) => {
    const sql = "SELECT config_key, config_value FROM service_config";
    db.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const config = {};
        rows.forEach(r => { config[r.config_key] = r.config_value; });
        res.json(config);
    });
});

app.post('/api/update-service-config', (req, res) => {
    const configs = req.body;
    const queries = Object.keys(configs).map(key => {
        return new Promise((resolve, reject) => {
            const sql = "UPDATE service_config SET config_value = ? WHERE config_key = ?";
            db.query(sql, [configs[key], key], (err, result) => {
                if (err) reject(err); else resolve(result);
            });
        });
    });
    Promise.all(queries)
        .then(() => res.json({ success: true }))
        .catch(err => res.status(500).json({ error: err.message }));
});

app.get('/api/bill-details/:id', (req, res) => {
    const { id } = req.params;
    const sql = "SELECT * FROM appointments WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.length === 0) return res.status(404).json({ message: "Bill not found" });
        res.json(result[0]);
    });
});

// =========================================================
// 🆕 WHATSAPP SETTINGS API — service_config table se config lata hai
// =========================================================
app.get('/api/settings/whatsapp', (req, res) => {
    // service_config table use kar rahe hain (config_key, config_value columns)
    const sql = "SELECT config_key, config_value FROM service_config WHERE config_key IN ('whatsapp_api_key','whatsapp_phone_id','whatsapp_enabled','whatsapp_mode')";
    db.query(sql, (err, rows) => {
        if (err) {
            console.error("❌ WhatsApp config fetch error:", err.message);
            return res.status(500).json({ error: err.message });
        }
        const config = {};
        rows.forEach(r => { config[r.config_key] = r.config_value; });
        res.json({
            api_key:  config.whatsapp_api_key  || "",
            phone_id: config.whatsapp_phone_id || "",
            enabled:  config.whatsapp_enabled  === "true",
            mode:     config.whatsapp_mode     || "invoice"
        });
    });
});

// =========================================================
// 🆕 PDF UPLOAD API — base64 PDF save karke public URL deta hai
// =========================================================
app.post('/api/appointments/upload-pdf', (req, res) => {
    try {
        const { pdf_base64, filename } = req.body;

        if (!pdf_base64 || !filename) {
            return res.status(400).json({ error: "pdf_base64 and filename required" });
        }

        // Filename sanitize
        const safeFilename = filename.replace(/[^a-zA-Z0-9_\-\.]/g, "_");

        // Folder create karo agar exist nahi karta
        const uploadsDir = path.join(__dirname, 'public/uploads/appointments');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // PDF file disk pe save karo
        const filePath = path.join(uploadsDir, safeFilename);
        fs.writeFileSync(filePath, Buffer.from(pdf_base64, 'base64'));

        // Public URL return karo
        // ⚠️ Local dev mein: npx ngrok http 5000  phir BASE_URL set karo
        // ⚠️ Production mein: BASE_URL=https://yourdomain.com
        const baseURL = process.env.BASE_URL || 'http://localhost:5000';
        const publicURL = `${baseURL}/uploads/appointments/${safeFilename}`;

        console.log(`✅ PDF saved: ${safeFilename}`);
        res.json({ success: true, url: publicURL, filename: safeFilename });

    } catch (err) {
        console.error("❌ PDF Upload Error:", err.message);
        res.status(500).json({ error: "Failed to save PDF: " + err.message });
    }
});

// =========================================================
// WHATSAPP SEND API
// mode = "text"    → formatted text message (localhost OK)
// mode = "invoice" → PDF document via base64 upload (localhost OK, no ngrok)
// =========================================================
app.post('/api/whatsapp/send-pdf', (req, res) => {
    const {
        mobile, pdf_base64, filename,
        patient_name, doctor_name, appointment_date, appointment_time,
        payment_mode, utr_no, patient_age, reason
    } = req.body;

    if (!mobile) return res.status(400).json({ error: "mobile number required" });

    // Step 1: DB se saari config lo
    const configSql = "SELECT config_key, config_value FROM service_config WHERE config_key IN ('whatsapp_api_key','whatsapp_phone_id','whatsapp_enabled','whatsapp_mode')";
    db.query(configSql, (dbErr, rows) => {
        if (dbErr) return res.status(500).json({ error: "DB error: " + dbErr.message });

        const config = {};
        rows.forEach(r => { config[r.config_key] = r.config_value; });

        if (config.whatsapp_enabled !== "true")
            return res.status(403).json({ error: "WhatsApp disabled in settings" });

        const apiKey  = config.whatsapp_api_key;
        const phoneId = config.whatsapp_phone_id;
        const waMode  = (config.whatsapp_mode || "text").trim().toLowerCase();

        if (!apiKey || !phoneId)
            return res.status(500).json({ error: "API key or Phone ID missing in DB" });

        // Mobile number format
        const cleanMobile = mobile.replace(/\D/g, '');
        const recipient   = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;

        const payDetail = payment_mode === "Online"
            ? `Online UPI (UTR: ${utr_no || 'N/A'})`
            : "Cash at Clinic";

        const https = require('https');

        // ─────────────────────────────────────────────────────────
        // INVOICE MODE — Upload PDF via Meta API (base64, no URL)
        // Step A: Upload media → get media_id
        // Step B: Send document message using media_id
        // Works on localhost — no ngrok needed
        // ─────────────────────────────────────────────────────────
        if (waMode === "invoice" && pdf_base64) {

            // Step A: Upload PDF to WhatsApp Media endpoint
            const pdfBuffer   = Buffer.from(pdf_base64, 'base64');
            const boundary    = '----WA_BOUNDARY_' + Date.now();
            const pdfFilename = `Appointment_${(patient_name || 'Patient').replace(/\s+/g, '_')}.pdf`;

            // Build multipart/form-data body manually
            const bodyParts = [];
            bodyParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="messaging_product"\r\n\r\nwhatsapp\r\n`));
            bodyParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\napplication/pdf\r\n`));
            bodyParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${pdfFilename}"\r\nContent-Type: application/pdf\r\n\r\n`));
            bodyParts.push(pdfBuffer);
            bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
            const uploadBody = Buffer.concat(bodyParts);

            const uploadOptions = {
                hostname: 'graph.facebook.com',
                path: `/v19.0/${phoneId}/media`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': uploadBody.length
                }
            };

            console.log(`📤 Uploading PDF to WhatsApp Media API...`);

            const uploadReq = https.request(uploadOptions, (uploadRes) => {
                let uploadData = '';
                uploadRes.on('data', chunk => { uploadData += chunk; });
                uploadRes.on('end', () => {
                    let mediaId;
                    try {
                        const parsed = JSON.parse(uploadData);
                        console.log("📁 Media Upload Response:", JSON.stringify(parsed));
                        mediaId = parsed.id;
                    } catch(e) {
                        return res.status(500).json({ error: "Media upload parse failed", raw: uploadData });
                    }

                    if (!mediaId) {
                        let uploadErr = uploadData;
                        try { uploadErr = JSON.parse(uploadData); } catch(e) {}
                        return res.status(400).json({ error: "Media upload failed", details: uploadErr });
                    }

                    // Step B: Send document message using media_id
                    const msgPayload = JSON.stringify({
                        messaging_product: "whatsapp",
                        to: recipient,
                        type: "document",
                        document: {
                            id: mediaId,
                            filename: pdfFilename
                        }
                    });

                    const msgOptions = {
                        hostname: 'graph.facebook.com',
                        path: `/v19.0/${phoneId}/messages`,
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(msgPayload)
                        }
                    };

                    console.log(`📲 Sending PDF document to: ${recipient}`);

                    const msgReq = https.request(msgOptions, (msgRes) => {
                        let msgData = '';
                        msgRes.on('data', chunk => { msgData += chunk; });
                        msgRes.on('end', () => {
                            try {
                                const parsed = JSON.parse(msgData);
                                console.log("📲 WhatsApp Send Response:", JSON.stringify(parsed));
                                if (parsed.messages && parsed.messages[0]?.id) {
                                    res.json({ success: true, mode: "invoice", message_id: parsed.messages[0].id });
                                } else if (parsed.error) {
                                    const errMsg = parsed.error.message || "Unknown error";
                                    if (errMsg.includes('expired') || errMsg.includes('Session')) {
                                        res.status(401).json({ error: "Token expired! Update in DB.", details: errMsg });
                                    } else {
                                        res.status(400).json({ error: errMsg, details: parsed });
                                    }
                                } else {
                                    res.status(400).json({ error: "Unexpected response", details: parsed });
                                }
                            } catch(e) {
                                res.status(500).json({ error: "Invalid WhatsApp response" });
                            }
                        });
                    });
                    msgReq.on('error', e => res.status(500).json({ error: e.message }));
                    msgReq.write(msgPayload);
                    msgReq.end();
                });
            });

            uploadReq.on('error', e => {
                console.error("❌ Upload error:", e.message);
                res.status(500).json({ error: "Upload error: " + e.message });
            });
            uploadReq.write(uploadBody);
            uploadReq.end();

        } else {
            // ─────────────────────────────────────────────────────
            // TEXT MODE — Formatted text message
            // ─────────────────────────────────────────────────────
            const msgText = [
                "🏥 *APPOINTMENT CONFIRMATION*",
                "━━━━━━━━━━━━━━━━━━━━",
                `👤 *Patient:* ${patient_name}`,
                `🎂 *Age:* ${patient_age || 'N/A'} years`,
                `📱 *Mobile:* ${mobile}`,
                "━━━━━━━━━━━━━━━━━━━━",
                `🩺 *Doctor:* Dr. ${doctor_name}`,
                `📅 *Date:* ${appointment_date}`,
                `⏰ *Time:* ${appointment_time}`,
                `💊 *Reason:* ${reason || 'General Checkup'}`,
                "━━━━━━━━━━━━━━━━━━━━",
                `💳 *Payment:* ${payDetail}`,
                "━━━━━━━━━━━━━━━━━━━━",
                "⏳ *Status:* PENDING CONFIRMATION",
                "",
                "📌 _Token will be assigned after doctor confirms._",
                "",
                "🙏 Thank you for choosing our clinic!"
            ].join("\n");

            const textPayload = JSON.stringify({
                messaging_product: "whatsapp",
                to: recipient,
                type: "text",
                text: { body: msgText }
            });

            const textOptions = {
                hostname: 'graph.facebook.com',
                path: `/v19.0/${phoneId}/messages`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(textPayload)
                }
            };

            console.log(`📲 Sending text message [mode: ${waMode}] to: ${recipient}`);

            const textReq = https.request(textOptions, (textRes) => {
                let data = '';
                textRes.on('data', chunk => { data += chunk; });
                textRes.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        console.log("📲 WhatsApp Response:", JSON.stringify(parsed));
                        if (parsed.messages && parsed.messages[0]?.id) {
                            res.json({ success: true, mode: "text", message_id: parsed.messages[0].id });
                        } else if (parsed.error) {
                            const errMsg = parsed.error.message || "Unknown error";
                            if (errMsg.includes('expired') || errMsg.includes('Session')) {
                                res.status(401).json({ error: "Token expired! Update in DB.", details: errMsg });
                            } else {
                                res.status(400).json({ error: errMsg, details: parsed });
                            }
                        } else {
                            res.status(400).json({ error: "Unexpected response", details: parsed });
                        }
                    } catch(e) {
                        res.status(500).json({ error: "Invalid WhatsApp response" });
                    }
                });
            });
            textReq.on('error', e => res.status(500).json({ error: e.message }));
            textReq.write(textPayload);
            textReq.end();
        }
    });
});

// Token update API
app.post('/api/whatsapp/update-token', (req, res) => {
    const { token } = req.body;
    if (!token || token.length < 20) return res.status(400).json({ error: "Valid token required" });
    db.query("UPDATE service_config SET config_value = ? WHERE config_key = 'whatsapp_api_key'", [token], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Token updated" });
    });
});

// =========================================================
// SOCKET.IO SETUP — PatientDashboard chat ke liye
// =========================================================
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    socket.on("join_room", (room) => {
        socket.join(room);
        console.log(`👤 ${socket.id} joined room: ${room}`);
    });

    socket.on("send_message", async (data) => {
        // Save to DB
        const sql = "INSERT INTO messages (room, author, sender_mobile, message, time) VALUES (?, ?, ?, ?, ?)";
        db.query(sql, [data.room, data.author, data.sender_mobile, data.message, data.time], (err, result) => {
            if (err) console.error("Message save error:", err.message);
        });
        // Broadcast to room
        io.to(data.room).emit("receive_message", data);
    });

    socket.on("status_updated", (data) => {
        io.emit("status_updated", data);
    });

    socket.on("disconnect", () => {
        console.log("🔌 Socket disconnected:", socket.id);
    });
});

// Messages fetch API
app.get('/api/messages/:mobile', (req, res) => {
    const { mobile } = req.params;
    const sql = "SELECT * FROM messages WHERE room = ? ORDER BY id ASC LIMIT 100";
    db.query(sql, [mobile], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 6. SERVER START
server.listen(5000, () => {
    console.log("🚀 Server running on http://localhost:5000");
});