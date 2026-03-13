const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http'); 
const { Server } = require('socket.io'); 

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app); 
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// database connection with multipleStatements enabled for batch updates
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'root', 
    database: 'hospital_db',
    multipleStatements: true 
});

db.connect(err => {
    if (err) console.error("❌ DB Connection Failed:", err.message);
    else console.log("✅ MySQL Connected Successfully");
});

// Helper Function: Token Re-ordering Logic (Database aur Dashboard sync rakhne ke liye)
const reorderTokens = (doctor_name, appointment_date) => {
    const fetchSql = `SELECT id FROM appointments WHERE doctor_name = ? AND appointment_date = ? AND status != 'Rejected' ORDER BY STR_TO_DATE(appointment_time, '%h:%i %p') ASC`;
    
    db.query(fetchSql, [doctor_name, appointment_date], (fetchErr, rows) => {
        if (fetchErr || rows.length === 0) return;

        let updateQueries = "";
        rows.forEach((row, index) => {
            updateQueries += mysql.format("UPDATE appointments SET token_number = ? WHERE id = ?; ", [index + 1, row.id]);
        });

        if (updateQueries) {
            db.query(updateQueries, (upErr) => {
                if (upErr) console.error("❌ Token Reorder Sync Error:", upErr.message);
                io.emit("new_appointment_booked", { doctor: doctor_name, date: appointment_date });
            });
        }
    });
};

// --- PRESERVED FEATURES: CHAT & LOGIN ---
io.on("connection", (socket) => {
    socket.on("join_room", (room) => socket.join(room));
    socket.on("send_message", (data) => {
        const { room, author, message } = data;
        const sql = "INSERT INTO messages (room_id, sender_name, message) VALUES (?, ?, ?)";
        db.query(sql, [room, author, message], (err) => {
            if (!err) io.to(room).emit("receive_message", data);
        });
    });
});

app.get('/api/messages/:room', (req, res) => {
    const sql = "SELECT sender_name AS author, message, created_at AS timestamp FROM messages WHERE room_id = ? ORDER BY created_at ASC";
    db.query(sql, [req.params.room], (err, results) => res.json(results));
});

app.post('/api/login', (req, res) => {
    const { username, password, role } = req.body;
    db.query("SELECT * FROM users WHERE username = ? AND password = ? AND role = ?", [username, password, role], (err, results) => {
        if (results && results.length > 0) res.json({ success: true, user: results[0] });
        else res.status(401).json({ success: false });
    });
});

app.post('/api/patient-login', (req, res) => {
    const { name, mobile } = req.body;
    db.query("SELECT * FROM patients WHERE mobile = ?", [mobile], (err, results) => {
        if (results && results.length > 0) res.json({ success: true, user: results[0] });
        else {
            db.query("INSERT INTO patients (full_name, mobile) VALUES (?, ?)", [name, mobile], (err, result) => {
                res.json({ success: true, id: result.insertId });
            });
        }
    });
});

// --- FIXED: BOOK APPOINTMENT & AUTO-SYNC TOKEN ---
app.post('/api/book', (req, res) => {
    const { patient_name, patient_mobile, patient_age, doctor_name, reason, appointment_date, appointment_time, payment_mode, utr_no } = req.body;
    const formattedPaymentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const sql = `INSERT INTO appointments (patient_name, patient_mobile, patient_age, doctor_name, reason, appointment_date, appointment_time, status, payment_mode, utr_no, payment_date, token_number) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, 0)`;
    const values = [patient_name, patient_mobile, patient_age, doctor_name, reason, appointment_date, appointment_time, payment_mode, utr_no, formattedPaymentDate];

    db.query(sql, values, (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.sqlMessage });
        
        const newId = result.insertId;
        // Token sync function call
        reorderTokens(doctor_name, appointment_date);
        res.status(200).json({ success: true, id: newId });
    });
});

app.get('/api/appointments', (req, res) => {
    db.query("SELECT * FROM appointments ORDER BY id DESC", (err, results) => res.json(results));
});

// --- UPDATED: UPDATE APPOINTMENT (With Token Sync on Reject) ---
app.put('/api/appointments/:id', (req, res) => {
    const appointmentId = req.params.id;
    const { status, prescription, next_follow_up } = req.body;

    db.query("SELECT * FROM appointments WHERE id = ?", [appointmentId], (tErr, tResults) => {
        if (tErr || !tResults.length) return res.status(500).json({ success: false, error: "Not found" });

        const oldData = tResults[0];
        const finalStatus = status !== undefined ? status : oldData.status;
        const finalPresc = prescription !== undefined ? prescription : oldData.prescription;
        const finalFollowUp = next_follow_up !== undefined ? next_follow_up : oldData.next_follow_up;

        const updateSql = "UPDATE appointments SET status = ?, prescription = ?, next_follow_up = ? WHERE id = ?";
        db.query(updateSql, [finalStatus, finalPresc, finalFollowUp, appointmentId], (err) => {
            if (err) return res.status(500).json({ success: false, error: err.sqlMessage });

            // Agar status Reject hua hai, toh tokens firse adjust karo
            if (finalStatus === 'Rejected') {
                reorderTokens(oldData.doctor_name, oldData.appointment_date);
            }

            io.emit("status_updated", { id: appointmentId, status: finalStatus, token_number: oldData.token_number });
            res.json({ success: true, token_number: oldData.token_number }); 
        });
    });
});

app.get('/api/doctors', (req, res) => {
    db.query("SELECT * FROM doctors ORDER BY id DESC", (err, results) => res.json(results));
});

server.listen(5000, () => console.log("🚀 Server running on port 5000"));