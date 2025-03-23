import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import db from "./db.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { authenticateJWT } from "./middleware/auth.js";
import mysql from "mysql2/promise"; // Ensure mysql2 is installed

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173", // Frontend URL
    credentials: true, // Allow credentials (cookies)
  })
);
app.use(bodyParser.json({ limit: "50mb" })); // Increase the limit to 50mb
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true })); // Increase the limit for URL-encoded data
app.use(cookieParser()); // Middleware to handle cookies

// Nodemailer transporter configuration (Gmail example)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // Your Gmail email address
    pass: process.env.GMAIL_PASS, // Your Gmail password or App Password
  },
});

// Function to generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Function to send OTP via Nodemailer
async function sendOTPEmail(email, otp) {
  const mailOptions = {
    from: process.env.GMAIL_USER, // Sender email address
    to: email, // Recipient email address
    subject: "Your One-Time Password (OTP)",
    text: `Your OTP is: ${otp}. Please use it to log in.`,
    html: "<p>Your OTP is: <b>" + otp + "</b>. Please use it to log in.</p>",
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${email}via Nodemailer`);
  } catch (error) {
    console.error("Error sending OTP via Nodemailer:", error);
    throw error;
  }
}

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
  throw new Error("JWT_SECRET is not defined in the environment variables");
}

// Initialize the database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost", // Replace with your DB host
  user: process.env.DB_USER || "root", // Replace with your DB user
  password: process.env.DB_PASS || "", // Replace with your DB password
  database: process.env.DB_NAME || "jd", // Replace with your DB name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5174"], // Allow both frontend ports
    credentials: true, // Enable cookies
  })
);

// Ensure menu_item_logs table exists
async function ensureMenuItemLogsTable() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS menu_item_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        menu_item_id INT NOT NULL,
        action VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
      )
    `);
  } catch (error) {
    console.error("Error ensuring menu_item_logs table:", error);
  } finally {
    connection.release();
  }
}

// Call the function to ensure the table exists
ensureMenuItemLogsTable();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Endpoint to send OTP
app.post("/send-otp", async (req, res) => {
  console.log("Request received:", req.body);
  const { name, phone, email, tableNumber } = req.body; // Include tableNumber
  const otp = generateOTP();

  try {
    const connection = await db.getConnection();
    await connection.execute(
      "INSERT INTO customer (name, phone, email, otp, table_number) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE otp = ?, table_number = ?",
      [name, phone, email, otp, tableNumber, otp, tableNumber]
    );
    connection.release();

    await sendOTPEmail(email, otp);

    res.json({ message: "OTP sent successfully" }); //remove otp from the response in production.
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// Endpoint to verify OTP and login
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const connection = await db.getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM customer WHERE email = ? AND otp = ?",
      [email, otp]
    );
    connection.release();

    if (rows.length > 0) {
      const customerId = rows[0].id; // Fixed variable reference
      const tableNumber = rows[0].table_number; // Get table number

      // Generate JWT Token
      const token = jwt.sign({ customerId, tableNumber }, SECRET_KEY, {
        expiresIn: "1d",
      });
      console.log("Token generated:", token);

      // Send token in HTTP-only Cookie
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      });

      res.json({ message: "Login successful" });
    } else {
      res.status(401).json({ error: "Invalid OTP" });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

// Login Route - Store customerId in cookie
app.post("/api/login", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const [customer] = await db.query(
      "SELECT id FROM customer WHERE email = ?",
      [email]
    );
    if (!customer.length)
      return res.status(404).json({ error: "Customer not found" });

    const customerId = customer[0].id;

    // ✅ Generate JWT Token
    const token = jwt.sign({ customerId }, SECRET_KEY, { expiresIn: "1d" });

    // ✅ Send token in HTTP-only Cookie
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/customer", authenticateJWT, async (req, res) => {
  try {
    const [customer] = await db.query("SELECT * FROM customer WHERE id = ?", [
      req.customerId,
    ]);
    if (!customer.length)
      return res.status(404).json({ error: "Customer not found" });

    res.json({ message: "Customer authenticated", customer });
  } catch (error) {
    console.error("Error fetching customer data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/menu", async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection(); // Get a connection
    console.log("Connected to database successfully."); // Debugging

    const [rows] = await connection.execute("SELECT * FROM menu_items"); // Fetch data
    connection.release(); // Release the connection
    res.json(rows);
  } catch (error) {
    console.error("Database error:", error.message); // Log actual error
    if (connection) connection.release(); // Ensure connection is released
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

app.get("/api/customer/details", (req, res) => {
  console.log("Cookies received:", req.cookies); // Check if customerId exists

  const token = req.cookies.auth_token;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log("decoded", decoded);

  const { customerId } = decoded;
  console.log("customerId", customerId);
  if (!customerId) {
    console.log("❌ No customerId found in cookies.");
    return res.status(401).json({ error: "Not authenticated" });
  }

  res.json({ message: "Customer authenticated", customerId });
});

// Place Order API - Uses customerId from JWT token in cookie
app.post("/api/orders", async (req, res) => {
  try {
    const { total_amount, order_details, notes, table_number } = req.body;

    const connection = await db.getConnection();

    // Insert the order into the database
    const [result] = await connection.query(
      "INSERT INTO orders (customer_id, total_amount) VALUES (?, ?)",
      [table_number, total_amount]
    );

    const orderId = result.insertId; // Get the generated order ID
    const billNumber = `BILL-${orderId}`; // Generate the bill number

    // Update the bill_number column
    await connection.query("UPDATE orders SET bill_number = ? WHERE id = ?", [
      billNumber,
      orderId,
    ]);

    // Insert order items into the database
    for (const item of order_details) {
      await connection.query(
        "INSERT INTO order_items (order_id, item_id, quantity) VALUES (?, ?, ?)",
        [orderId, item.id, item.quantity]
      );
    }

    connection.release();

    res.status(201).json({ message: "Order placed successfully", billNumber });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: "Failed to place order" });
  }
});

// Multer setup for image uploads ADMIN
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Add or update a menu item ADMIN
app.post("/api/amenu", upload.single("image"), async (req, res) => {
  try {
    console.log("Request body:", req.body); // Debugging
    console.log("Uploaded file:", req.file); // Debugging

    const { name, description, category, price } = req.body;
    const imageBuffer = req.file ? req.file.buffer : null;

    // Validate required fields
    if (!name || !description || !category || !price) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Validate price
    if (isNaN(price) || price <= 0) {
      return res
        .status(400)
        .json({ error: "Price must be a positive number." });
    }

    const connection = await pool.getConnection();

    // Check if an item with the same name already exists
    const [existingItem] = await connection.query(
      "SELECT * FROM menu_items WHERE name = ?",
      [name]
    );

    if (existingItem.length > 0) {
      // Update the existing item
      const existingId = existingItem[0].id;
      await connection.query(
        "UPDATE menu_items SET description = ?, category = ?, price = ?, image = ? WHERE id = ?",
        [description, category, price, imageBuffer, existingId]
      );

      const [updatedItem] = await connection.query(
        "SELECT * FROM menu_items WHERE id = ?",
        [existingId]
      );
      connection.release();
      return res.status(200).json(updatedItem[0]);
    } else {
      // Add a new item
      const formattedPrice = `₹${price}`; // Add currency symbol
      const [result] = await connection.query(
        "INSERT INTO menu_items (name, description, category, price, image) VALUES (?, ?, ?, ?, ?)",
        [name, description, category, formattedPrice, imageBuffer]
      );

      // Fetch the newly added item
      const [newItem] = await connection.query(
        "SELECT * FROM menu_items WHERE id = ?",
        [result.insertId]
      );

      // Insert the new item into the database (if additional logic is required)
      await connection.query(
        "INSERT INTO menu_item_logs (menu_item_id, action) VALUES (?, ?)",
        [result.insertId, "added"]
      );

      connection.release();
      return res.status(201).json(newItem[0]);
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Get a single menu item ADMIN
app.get("/api/amenu/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      "SELECT * FROM menu_items WHERE id = ?",
      [id]
    );
    connection.release();

    if (rows.length > 0) {
      const menuItem = rows[0];
      if (menuItem.image) {
        const base64Image = menuItem.image.toString("base64"); // Convert buffer to base64
        const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;
        menuItem.image = imageDataUrl; //replace buffer with the base64 string.
      }
      res.status(200).json(menuItem);
    } else {
      res.status(404).send("Menu item not found");
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Get all menu items ADMIN
app.get("/api/amenu", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT * FROM menu_items"); // Fetch all menu items
    connection.release();

    // Convert image buffer to Base64 for each item
    const processedItems = rows.map((item) => {
      if (item.image) {
        const base64Image = item.image.toString("base64");
        item.image = `data:image/jpeg;base64,${base64Image}`;
      }
      return item;
    });

    res.status(200).json(processedItems);
  } catch (error) {
    console.error("Error fetching menu items:", error);
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
});

// Delete a menu item ADMIN
app.delete("/api/amenu/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    await connection.query("DELETE FROM menu_items WHERE id = ?", [id]);
    connection.release();
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get customer ID from session
app.get("/api/get-customer-id", async (req, res) => {
  try {
    const email = req.session?.email; // Ensure session has email

    if (!email) {
      return res.status(401).json({ error: "User not logged in" });
    }

    const [customer] = await db.query(
      "SELECT id FROM customer WHERE email = ?",
      [email]
    );

    if (!customer.length) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json({ customer_id: customer[0].id });
  } catch (error) {
    console.error("Error fetching customer ID:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("auth_token");
  res.json({ message: "Logged out successfully" });
});

app.get("/api/tables", async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [rows] = await connection.query(`
      SELECT 
        t.id, 
        t.table_number, 
        t.status, 
        (SELECT COUNT(oi.id) 
         FROM orders o 
         JOIN order_items oi ON o.id = oi.order_id 
         WHERE o.id = t.id) AS total_items_ordered
      FROM tables t
    `); // Replace 'tables', 'orders', and 'order_items' with your actual table names
    connection.release();

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching table data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/orders/:tableId", async (req, res) => {
  try {
    const { tableId } = req.params;

    const connection = await db.getConnection();
    const [orders] = await connection.query(
      `SELECT oi.quantity, oi.price, mi.name AS item_name
       FROM order_items oi
       JOIN menu_items mi ON oi.item_id = mi.id
       WHERE oi.order_id IN (SELECT id FROM orders WHERE id = ?)`,

      [tableId]
    );

    const [total] = await connection.query(
      `SELECT SUM(oi.price * oi.quantity) AS totalAmount
       FROM order_items oi
       WHERE oi.order_id IN (SELECT id FROM orders WHERE id = ?)`,

      [tableId]
    );

    connection.release();

    res.status(200).json({ orders, totalAmount: total[0].totalAmount });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.put("/api/tables/:tableId/vacate", async (req, res) => {
  try {
    const { tableId } = req.params;

    const connection = await db.getConnection();
    await connection.query("UPDATE tables SET status = 'Vacant' WHERE id = ?", [
      tableId,
    ]);
    connection.release();

    res.status(200).json({ message: "Table status updated to Vacant." });
  } catch (error) {
    console.error("Error updating table status:", error);
    res.status(500).json({ error: "Failed to update table status." });
  }
});

app.put("/api/tables/:tableId/occupy", async (req, res) => {
  try {
    const { tableId } = req.params;

    const connection = await db.getConnection();
    const [rows] = await connection.query("SELECT * FROM tables WHERE id = ?", [
      tableId,
    ]);

    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({ error: "Table not found." });
    }

    await connection.query(
      "UPDATE tables SET status = 'Occupied' WHERE id = ?",
      [tableId]
    );
    connection.release();

    res.status(200).json({ message: "Table status updated to Occupied." });
  } catch (error) {
    console.error("Error updating table status:", error);
    res.status(500).json({ error: "Failed to update table status." });
  }
});

app.use((req, res, next) => {
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

// Get all pending orders for the kitchen
app.get("/api/kitchen/orders", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [orders] = await connection.query(`
      SELECT o.id AS order_id, o.table_number, o.total_amount, o.status, 
             JSON_ARRAYAGG(JSON_OBJECT('item_name', mi.name, 'quantity', oi.quantity)) AS items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN menu_items mi ON oi.item_id = mi.id
      WHERE o.status = 'Pending'
      GROUP BY o.id
    `);
    connection.release();

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching kitchen orders:", error);
    res.status(500).json({ error: "Failed to fetch kitchen orders" });
  }
});

// Update order status to 'In Progress'
app.put("/api/kitchen/orders/:orderId/start", async (req, res) => {
  try {
    const { orderId } = req.params;

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      "UPDATE orders SET status = 'In Progress' WHERE id = ? AND status = 'Pending'",
      [orderId]
    );
    connection.release();

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Order not found or already in progress" });
    }

    res.status(200).json({ message: "Order status updated to In Progress" });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// Update order status to 'Completed'
app.put("/api/kitchen/orders/:orderId/complete", async (req, res) => {
  try {
    const { orderId } = req.params;

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      "UPDATE orders SET status = 'Completed' WHERE id = ? AND status = 'In Progress'",
      [orderId]
    );
    connection.release();

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Order not found or not in progress" });
    }

    res.status(200).json({ message: "Order status updated to Completed" });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// Get details of a specific order for the kitchen
app.get("/api/kitchen/orders/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const connection = await pool.getConnection();
    const [orderDetails] = await connection.query(
      `
      SELECT o.id AS order_id, o.table_number, o.total_amount, o.status, 
             JSON_ARRAYAGG(JSON_OBJECT('item_name', mi.name, 'quantity', oi.quantity)) AS items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN menu_items mi ON oi.item_id = mi.id
      WHERE o.id = ?
      GROUP BY o.id
    `,
      [orderId]
    );
    connection.release();

    if (orderDetails.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json(orderDetails[0]);
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ error: "Failed to fetch order details" });
  }
});

// Get all completed orders for the kitchen
app.get("/api/kitchen/orders/completed", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [completedOrders] = await connection.query(`
      SELECT o.id AS order_id, o.table_number, o.total_amount, o.status, 
             JSON_ARRAYAGG(JSON_OBJECT('item_name', mi.name, 'quantity', oi.quantity)) AS items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN menu_items mi ON oi.item_id = mi.id
      WHERE o.status = 'Completed'
      GROUP BY o.id
    `);
    connection.release();

    res.status(200).json(completedOrders);
  } catch (error) {
    console.error("Error fetching completed orders:", error);
    res.status(500).json({ error: "Failed to fetch completed orders" });
  }
});
