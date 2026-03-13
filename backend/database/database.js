// // -- Database select karein
// CREATE DATABASE IF NOT EXISTS hospital_db;
// USE hospital_db;

// // -- Purani tables hatana (Optional: Agar fresh shuru karna hai toh)
// DROP TABLE IF EXISTS appointments;
// DROP TABLE IF EXISTS users;

// // -- 1. Users Table (Sirf Doctor aur Admin ke Login ke liye)
// CREATE TABLE users (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     username VARCHAR(255) NOT NULL UNIQUE,
//     password VARCHAR(255) NOT NULL,
//     role ENUM('admin', 'doctor') NOT NULL,
//     full_name VARCHAR(255) -- Doctor ka asli naam
// );

// // -- 2. Appointments Table (Ek hi table saare data ke liye)
// CREATE TABLE appointments (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     patient_name VARCHAR(255) NOT NULL,
//     patient_mobile VARCHAR(15) NOT NULL, -- Patient isi se apna dashboard dekhega
//     doctor_name VARCHAR(255) NOT NULL,   -- Doctor isi se apni list filter karega
//     reason TEXT,
//     appointment_date DATE NOT NULL,
//     appointment_time VARCHAR(50) NOT NULL,
//     status ENUM('Pending', 'Confirmed', 'Rejected') DEFAULT 'Pending',
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );



// ALTER TABLE appointments ADD COLUMN patient_age INT DEFAULT 0;
// ALTER TABLE appointments ADD COLUMN payment_date DATETIME;
// ALTER TABLE appointments ADD COLUMN token_number INT DEFAULT 0; // -- 3. Dummy Accounts (Testing 
// ke liye)
//ALTER TABLE appointments ADD COLUMN token_no INT AFTER appointment_date;


// -- Doctor: user: doctor01, pass: doc123
// INSERT INTO users (username, password, role, full_name) 
// VALUES ('doctor01', 'doc123', 'doctor', 'Dr. Sharma');

// // -- Admin: user: admin01, pass: admin123
// INSERT INTO users (username, password, role) 
// VALUES ('admin01', 'admin123', 'admin');

// select* from  users;

// SELECT * FROM appointments;

// ALTER TABLE appointments ADD COLUMN reason TEXT AFTER appointment_time;

// ALTER TABLE appointments ADD COLUMN prescription TEXT NULL;

// CREATE TABLE doctors (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     name VARCHAR(255) NOT NULL,
//     speciality VARCHAR(255) NOT NULL,
//     mobile VARCHAR(15) NOT NULL,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );

// CREATE TABLE IF NOT EXISTS patients (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     full_name VARCHAR(100) NOT NULL,
//     mobile VARCHAR(15) UNIQUE NOT NULL,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );

// select * from patients;

// ALTER TABLE doctors ADD COLUMN password VARCHAR(255) NOT NULL AFTER mobile;

// CREATE TABLE messages (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     room_id VARCHAR(50) NOT NULL,       -- Ye patient ka mobile number ya unique ID ho sakti hai
//     sender_name VARCHAR(100) NOT NULL,
//     message TEXT NOT NULL,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );

// select * from messages;
