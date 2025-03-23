import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "localhost", // 🔥 Make sure this is correct
  user: "root", // 🔥 Your MySQL username
  password: "", // 🔥 Your MySQL password
  database: "jd", // 🔥 Ensure this DB exists!
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default db;
