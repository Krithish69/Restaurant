import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faPhone,
  faEnvelope,
  faKey,
} from "@fortawesome/free-solid-svg-icons";
import "../CSS/LoginPage.css";
import jdLogo from "../assets/jd.jpg"; // Make sure to add your logo to assets folder

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    otp: "",
  });

  const [showOTP, setShowOTP] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState("");
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let interval;
    if (showOTP && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [showOTP, timer]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const sendOTP = async () => {
    if (!validateEmail(formData.email)) {
      alert("Please enter a valid email address");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/send-otp", {
        // Update with your backend URL
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        //alert(Your OTP is: ${data.otp}); //remove this line in production.
        setShowOTP(true);
      } else {
        alert("Failed to send OTP. Please try again.");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      alert("Failed to send OTP. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies with the request
        body: JSON.stringify({ email: formData.email, otp: formData.otp }),
      });

      if (response.ok) {
        localStorage.setItem("isAuthenticated", "true");
        navigate("/menu");
      } else {
        alert("Invalid OTP. Please try again.");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const resendOTP = async () => {
    try {
      const response = await fetch("http://localhost:5000/send-otp", {
        // Update with your backend URL
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData), //send all form data.
      });

      if (response.ok) {
        const data = await response.json();
        //alert(Your new OTP is: ${data.otp}); //remove in production.
        setTimer(30); // Reset timer
        setCanResend(false); //Reset resend state.
      } else {
        alert("Failed to resend OTP. Please try again.");
      }
    } catch (error) {
      console.error("Error resending OTP:", error);
      alert("Failed to resend OTP. Please try again.");
    }
  };

  return (
    <div className="container">
      <div className="login-box">
        <div className="logo">
          <img src={jdLogo} alt="JD Restaurant Logo" />
        </div>
        <h2>Welcome to JD Restaurant</h2>

        <form onSubmit={handleSubmit}>
          <h6>Name:</h6>
          <div className="input-group">
            <FontAwesomeIcon icon={faUser} className="input-icon" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Full Name"
              required
            />
          </div>

          <h6>Phone Number:</h6>
          <div className="input-group">
            <FontAwesomeIcon icon={faPhone} className="input-icon" />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Phone Number"
              pattern="[0-9]{10}"
              required
            />
          </div>

          <h6>Email ID:</h6>
          <div className="input-group">
            <FontAwesomeIcon icon={faEnvelope} className="input-icon" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Email ID"
              required
            />
          </div>

          {showOTP && (
            <>
              <h6>Enter OTP:</h6>
              <div className="input-group">
                <FontAwesomeIcon icon={faKey} className="input-icon" />
                <input
                  type="text"
                  name="otp"
                  value={formData.otp}
                  onChange={handleInputChange}
                  placeholder="Enter OTP"
                  maxLength="6"
                  required
                />
              </div>
              <div className="resend-container">
                {timer > 0 ? (
                  <p className="timer">Resend OTP in {timer}s</p>
                ) : (
                  <a
                    type="button"
                    className="resend-button"
                    onClick={resendOTP} // Call resendOTP function
                  >
                    Resend OTP
                  </a>
                )}
              </div>
            </>
          )}

          {!showOTP ? (
            <button type="button" onClick={sendOTP}>
              Send OTP
            </button>
          ) : (
            <button type="submit">Verify & Login</button>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
