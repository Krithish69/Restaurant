// Cart.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate from react-router-dom
import { CIcon } from "@coreui/icons-react";
import * as icon from "@coreui/icons";
import "../CSS/Cart.css"; // Import the CSS file
import { Buffer } from "buffer";
import ThankYouPage from "./ThankYou.jsx"; // Correct the import statement
import * as jwt_decode from "jwt-decode"; // Import jwt-decode using namespace import

const Cart = ({ cartItems, setCartItems, showCart, setShowCart }) => {
  const [notes, setNotes] = useState({});
  const [showNoteInput, setShowNoteInput] = useState({});
  const [tempNotes, setTempNotes] = useState({}); // Store temp notes per item
  const [orderPlaced, setOrderPlaced] = useState(false); // State to track order placement
  const navigate = useNavigate(); // Initialize useNavigate

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (itemId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    const updatedNotes = { ...notes };
    delete updatedNotes[itemId];
    setNotes(updatedNotes);
  };

  const handleNoteChange = (itemId, note) => {
    setTempNotes((prev) => ({ ...prev, [itemId]: note }));
  };

  const submitNote = (itemId) => {
    if (!tempNotes[itemId]?.trim()) return;
    setNotes((prev) => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), tempNotes[itemId]],
    }));
    setTempNotes((prev) => ({ ...prev, [itemId]: "" }));
  };

  const toggleNoteInput = (itemId) => {
    setShowNoteInput((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const removeNote = (itemId, noteIndex) => {
    setNotes((prev) => ({
      ...prev,
      [itemId]: prev[itemId].filter((_, index) => index !== noteIndex),
    }));
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price.replace("₹", ""));
      return total + price * item.quantity;
    }, 0);
  };

  const calculateTax = (subtotal) => subtotal * 0.05;
  const calculateTotal = () =>
    calculateSubtotal() + calculateTax(calculateSubtotal());

  const handlePayment = async () => {
    try {
      const totalAmount = cartItems.reduce((total, item) => {
        const price = parseFloat(item.price.replace("₹", ""));
        return total + price * item.quantity;
      }, 0);

      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth_token="))
        ?.split("=")[1];
      const decodedToken = jwt_decode(token); // Use decode instead of jwt_decode
      const tableNumber = decodedToken.tableNumber; // Get table number from token

      const orderDetails = {
        total_amount: totalAmount,
        order_details: cartItems,
        notes: notes,
        table_number: tableNumber, // Include table number
      };

      const response = await fetch("http://localhost:5000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Ensures cookies (customerId) are sent
        body: JSON.stringify(orderDetails),
      });

      if (response.ok) {
        const data = await response.json();
        const billNumber = data.billNumber; // Get the bill number from the response
        console.log("Order placed successfully! Bill Number:", billNumber);
        setCartItems([]);
        setShowCart(false);
        setOrderPlaced(true);
        navigate("/thank-you", { state: { billNumber } }); // Pass bill number to ThankYou page
      } else {
        alert("Failed to place order. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An unexpected error occurred. Please try again later.");
    }
  };

  if (orderPlaced) {
    return <ThankYouPage />; // Render ThankYouPage if order is placed
  }

  return (
    <div className={`cart-modal ${showCart ? "show" : ""}`}>
      <div className="cart-content">
        <div className="cart-header">
          <h2>Your Cart</h2>
          <button onClick={() => setShowCart(false)} className="close-button">
            ×
          </button>
        </div>

        {cartItems.length === 0 ? (
          <p className="empty-cart-message">Your cart is empty</p>
        ) : (
          <>
            {cartItems.map((item) => {
              // Convert the Buffer data to Base64 string
              const base64Image = item.image
                ? `data:image/jpeg;base64,${Buffer.from(
                    item.image.data
                  ).toString("base64")}`
                : "https://via.placeholder.com/100";

              return (
                <div key={item.id} className="cart-item">
                  <img
                    src={base64Image}
                    alt={item.name}
                    className="cart-item-image"
                  />
                  <div className="cart-item-details">
                    <h6>{item.name}</h6>
                    <p>{item.price}</p>
                    <div className="notes-section">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleNoteInput(item.id);
                        }}
                      >
                        {showNoteInput[item.id] ? "Hide Notes" : "Add Notes"}
                      </a>
                      {showNoteInput[item.id] && (
                        <div className="note-input-container">
                          <input
                            type="text"
                            value={tempNotes[item.id] || ""}
                            onChange={(e) =>
                              handleNoteChange(item.id, e.target.value)
                            }
                            placeholder="Enter your note..."
                          />
                          <button onClick={() => submitNote(item.id)}>
                            Add Note
                          </button>
                        </div>
                      )}
                      {notes[item.id]?.length > 0 && (
                        <div className="notes-list">
                          {notes[item.id].map((note, index) => (
                            <div key={index} className="note-item">
                              <p>
                                Note {index + 1}: {note}
                              </p>
                              <button
                                onClick={() => removeNote(item.id, index)}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="quantity-controls">
                    <div className="quantity-buttons">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="remove-button"
                    >
                      {CIcon ? (
                        <CIcon icon={icon?.cilTrash} className="trash-icon" />
                      ) : (
                        "🗑"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="cart-summary">
              <div className="summary-details">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>₹{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Tax (5%):</span>
                  <span>₹{calculateTax(calculateSubtotal()).toFixed(2)}</span>
                </div>
                <div className="summary-row total">
                  <span>Total Amount:</span>
                  <span>₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
              <button onClick={handlePayment} className="pay-button">
                Place order
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Cart;
