import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MenuPopup from "./MenuPopup";
import "./AdminPage.css";

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState("tables");
  const [tables, setTables] = useState([]); // Initialize as an empty array
  const [menuItems, setMenuItems] = useState([]);
  const [popupVisible, setPopupVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [viewPopupVisible, setViewPopupVisible] = useState(false); // State for view popup
  const [selectedTable, setSelectedTable] = useState(null); // State for selected table

  // ✅ Fetch tables from the database on component mount
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/tables", {
          method: "GET",
          credentials: "include", // Include cookies if needed
        });

        if (!response.ok) {
          throw new Error("Failed to fetch tables");
        }

        const data = await response.json();
        setTables(data); // Set the fetched tables
      } catch (error) {
        console.error("Error fetching tables:", error);
      }
    };

    fetchTables();
  }, []);

  // ✅ Fetch menu items from database on component mount
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/amenu", {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch menu items");
        }

        const data = await response.json();
        console.log("Fetched Menu Items:", data); // Debugging
        setMenuItems(data); // Set the fetched menu items
      } catch (error) {
        console.error("Error fetching menu items:", error);
      }
    };

    fetchMenuItems();
  }, []);

  // ✅ Handle Save (Add or Update Item)
  const handleSave = async (item) => {
    const formData = new FormData();
    if (item.id) formData.append("id", item.id); // Include ID for updates
    formData.append("name", item.name || ""); // Ensure non-empty values
    formData.append("description", item.description || "");
    formData.append("category", item.category || "");
    formData.append("price", item.price || "");
    if (item.imageFile) {
      formData.append("image", item.imageFile); // Include image file if provided
    } else {
      console.warn("No image file provided for the menu item.");
    }

    try {
      console.log(
        "FormData being sent:",
        Object.fromEntries(formData.entries())
      ); // Debugging
      const response = await fetch("http://localhost:5000/api/amenu", {
        method: "POST",
        body: formData, // Send as multipart/form-data
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setMenuItems((prev) => {
          const existingIndex = prev.findIndex((i) => i.id === updatedItem.id);
          if (existingIndex !== -1) {
            // Update existing item
            const updatedItems = [...prev];
            updatedItems[existingIndex] = updatedItem;
            return updatedItems;
          }
          // Add new item
          return [...prev, updatedItem];
        });
        setPopupVisible(false);
        alert("Menu item saved successfully!");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to save menu item.");
      }
    } catch (error) {
      console.error("Error saving menu item:", error);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  // ✅ Handle Edit (Reused for adding/updating items)
  const handleEdit = (item) => {
    setCurrentItem(item); // Pass the full item for editing
    setPopupVisible(true); // Open the popup
  };

  // ✅ Handle Delete
  const handleDelete = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/amenu/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMenuItems((prev) => prev.filter((item) => item.id !== id));
        alert("Menu item deleted successfully!");
      } else {
        alert("Failed to delete menu item. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting menu item:", error);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  const handleSubmit = async (formData) => {
    try {
      const response = await fetch("http://localhost:5000/api/amenu", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error) {
          alert(data.error); // Show error message to the user
        }
      } else {
        alert("Menu item added successfully!");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const handleView = async (table) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/orders/${table.id}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedTable({
          ...table,
          orders: data.orders,
          totalAmount: data.totalAmount,
        });
        setViewPopupVisible(true); // Show the popup
      } else {
        console.error("Failed to fetch order details.");
        alert("Failed to fetch order details. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      alert("An unexpected error occurred. Please try again later.");
    }
  };

  const handlePaymentDone = async (tableId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/tables/${tableId}/vacate`,
        {
          method: "PUT",
          credentials: "include",
        }
      );

      if (response.ok) {
        // Update the table status locally
        setTables((prevTables) =>
          prevTables.map((table) =>
            table.id === tableId ? { ...table, status: "Vacant" } : table
          )
        );
        setViewPopupVisible(false); // Close the popup
        alert("Table status updated to Vacant.");
      } else {
        console.error("Failed to update table status.");
        alert("Failed to update table status. Please try again.");
      }
    } catch (error) {
      console.error("Error updating table status:", error);
      alert("An unexpected error occurred. Please try again later.");
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="header-container">
          <div className="logo-container">
            <img
              src={new URL("../assets/jd.jpg", import.meta.url).href}
              alt="JD Logo"
              className="logo"
            />
            <h2>JD Restaurant</h2>
          </div>
        </div>
      </header>

      <div className="admin-content">
        <nav className="admin-nav">
          <button
            className={`nav-btn ${activeTab === "tables" ? "active" : ""}`}
            onClick={() => setActiveTab("tables")}
          >
            Tables
          </button>
          <button
            className={`nav-btn ${activeTab === "menu" ? "active" : ""}`}
            onClick={() => setActiveTab("menu")}
          >
            Menu Items
          </button>
        </nav>

        <div className="tab-content">
          {activeTab === "tables" && (
            <div className="tables-section">
              <h2>Table Management</h2>
              <div className="table-cards">
                {tables.map((table) => (
                  <div key={table.id} className="table-card">
                    <div className="table-card-header">
                      <h3>Table Number: {table.table_number}</h3>{" "}
                      {/* Display the table number */}
                      <span
                        className={`status-badge ${table.status.toLowerCase()}`}
                      >
                        {table.status}
                      </span>
                    </div>
                    <div className="table-card-content">
                      <p>Total Items Ordered: {table.total_items_ordered}</p>{" "}
                      {/* Display total items ordered */}
                    </div>
                    <div className="table-card-actions">
                      <button
                        className="action-btn view"
                        onClick={() => handleView(table)}
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "menu" && (
            <div className="menu-section">
              <div className="menu-header">
                <h2>Menu Management</h2>
                <button
                  className="action-btn add"
                  onClick={() => {
                    setCurrentItem(null); // Reset current item to null for adding a new item
                    setPopupVisible(true); // Show the popup
                  }}
                >
                  Add Item
                </button>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Price (₹)</th>
                    <th>Image</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.description}</td>
                      <td>{item.category}</td>
                      <td>{item.price}</td>
                      <td>
                        <img
                          src={item.image}
                          alt={item.name}
                          className="menu-image"
                        />
                      </td>
                      <td>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDelete(item.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {popupVisible && (
        <MenuPopup
          item={currentItem} // Pass the current item (null for new item)
          onClose={() => setPopupVisible(false)} // Close the popup
          onSave={handleSave} // Save the new or updated item
        />
      )}

      {viewPopupVisible && selectedTable && (
        <div className="view-popup">
          <div className="popup-content">
            {/* Close button at the top-right */}
            <button
              style={{ width: "10px", right: "60px", top: "30px" }}
              className="close-btn-top"
              onClick={() => setViewPopupVisible(false)}
            >
              &times;
            </button>

            <h3>Table Number: {selectedTable.table_number}</h3>
            <h4>Total Amount: ₹{selectedTable.totalAmount}</h4>
            <h4>Items Ordered:</h4>
            <ul>
              {selectedTable.orders.map((order, index) => (
                <li key={index}>
                  {order.item_name} - {order.quantity} x ₹{order.price}
                </li>
              ))}
            </ul>

            {/* Payment Done button */}
            <button
              className="payment-done-btn"
              onClick={() => handlePaymentDone(selectedTable.id)}
            >
              Payment Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
