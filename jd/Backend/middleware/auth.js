import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
dotenv.config();
const app = express();
app.use(express.json());
app.use(cookieParser());

const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key";

export const authenticateJWT = (req, res, next) => {
  const token = req.cookies.auth_token; // Read from cookies

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Forbidden: Invalid token" });
    }
    req.customerId = decoded.customerId; // Store in request
    next();
  });
};
