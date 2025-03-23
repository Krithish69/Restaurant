import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const QRCodeHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableId = searchParams.get("tableId"); // Get tableId from query params

  useEffect(() => {
    const occupyTable = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/tables/${tableId}/occupy`,
          {
            method: "PUT",
            credentials: "include",
          }
        );

        if (response.ok) {
          console.log("Table status updated to Occupied.");
          alert("Welcome! Your table is now occupied.");
          navigate("/thank-you"); // Redirect to Thank You page or another page
        } else {
          console.error("Failed to update table status.");
          alert("Failed to occupy the table. Please try again.");
        }
      } catch (error) {
        console.error("Error updating table status:", error);
        alert("An unexpected error occurred. Please try again later.");
      }
    };

    if (tableId) {
      occupyTable();
    }
  }, [tableId, navigate]);

  return <div>Processing your request...</div>;
};

export default QRCodeHandler;
