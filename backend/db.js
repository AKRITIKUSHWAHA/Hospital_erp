
// db.js
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",            // DB username
  password: "root", // DB password
  database: "doctor_booking"    // DB name
});

db.connect((err) => {
  if (err) {
    console.error("DB connection failed:", err);
  } else {
    console.log("✅ DB connected");
  }
});

module.exports = db;
