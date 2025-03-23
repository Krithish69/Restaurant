import React from "react";
import "../CSS/ThankYouPage.css"; // Import the CSS file
import { useNavigate } from "react-router-dom"; // Import useNavigate

const ThankYou = () => {
  const navigate = useNavigate(); // Initialize useNavigate

  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/logout", {
        method: "POST",
        credentials: "include", // Ensures cookies are sent
      });

      if (response.ok) {
        console.log("Logged out successfully!");
        navigate("/"); // Redirect to the home page
      } else {
        console.error("Failed to log out.");
        alert("Failed to log out. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An unexpected error occurred. Please try again later.");
    }
  };

  return (
    <div className="thank-you-container">
      <h1 className="thank-you-text">Thank you for visiting!</h1>
      <p className="thank-you-message">Pay the bill to the cashier.</p>
      <div className="wave"></div> {/* Optional Wave Effect */}
      <button onClick={handleLogout} className="logout-button">
        Logout
      </button>
    </div>
  );
};

export default ThankYou;
