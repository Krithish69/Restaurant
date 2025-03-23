import React, { useState, useEffect } from "react";
import "../CSS/Menu.css";
import Cart from "../frontend/Cart";
import { Buffer } from "buffer";

const Menu = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [userDetails, setUserDetails] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]); // New state for order history
  const [showSidebar, setShowSidebar] = useState(false); // New state for sidebar

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/menu", {
          method: "GET",
          credentials: "include", // Ensures cookies (customerId) are sent
        });

        if (!response.ok) {
          throw new Error("Failed to fetch menu");
        }

        const data = await response.json();
        setMenuItems(data);
      } catch (error) {
        console.error("Error fetching menu:", error);
      }
    };

    fetchMenu();
  }, []);

  const categoryImages = {
    All: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&h=100",
    Starters:
      "https://images.unsplash.com/photo-1541014741259-de529411b96a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&h=100",
    "Main Course":
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&h=100",
    Desserts:
      "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&h=100",
  };

  const addToCart = (item) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id);
      if (existingItem) {
        return prevItems.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prevItems, { ...item, quantity: 1 }];
    });
  };

  const fetchUserDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/customer/details",
        {
          method: "GET",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("User details:", data);
        setUserDetails(data.customer);
        setOrderHistory(data.orders); // Set order history
        setShowSidebar(true); // Show sidebar
      } else {
        console.log("Failed to fetch user details.");
        alert("Please log in.");
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      alert("An unexpected error occurred.");
    }
  };

  return (
    <div className="menu-container">
      {/* Header */}
      <div className="header">
        <div className="logo-container">
          <img
            src={new URL("../assets/jd.jpg", import.meta.url).href}
            alt="JD Logo"
            className="logo"
          />
          <h6 className="restaurant-name">JD Restaurant</h6>
          <button className="profile-icon" onClick={fetchUserDetails}>
            👤
          </button>
        </div>
      </div>

      {showSidebar && userDetails && (
        <div className="sidebar">
          <div className="sidebar-content">
            <h2>User Details</h2>
            <p>
              <strong>Email:</strong> {userDetails.email}
            </p>
            <p>
              <strong>Phone:</strong> {userDetails.phone}
            </p>
            <h3>Order History</h3>
            <ul>
              {orderHistory.length > 0 ? (
                orderHistory.map((order, index) => (
                  <li key={index}>
                    <p>
                      <strong>Order ID:</strong> {order.id}
                    </p>
                    <p>
                      <strong>Date:</strong> {order.date}
                    </p>
                    <p>
                      <strong>Total:</strong> ${order.total}
                    </p>
                  </li>
                ))
              ) : (
                <p>No previous orders found.</p>
              )}
            </ul>
            <button onClick={() => setShowSidebar(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Search menu items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Buttons */}
      <div className="category-buttons">
        {Object.keys(categoryImages).map((category) => (
          <div key={category} className="category-button">
            <div
              onClick={() => setSelectedCategory(category)}
              className={`category-icon ${
                selectedCategory === category ? "selected" : ""
              }`}
            >
              <img src={categoryImages[category]} alt={category} />
            </div>
            <span className="category-text">{category}</span>
          </div>
        ))}
      </div>

      {/* Menu Items Grid */}
      <div className="menu-categories">
        <div className="menu-items">
          {(() => {
            const filteredItems = menuItems.filter((item) => {
              const matchesCategory =
                selectedCategory === "All" ||
                item.category === selectedCategory;
              const matchesSearch = item.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
              return matchesCategory && matchesSearch;
            });

            if (filteredItems.length === 0) {
              return (
                <div className="no-items">
                  <h3>No items found</h3>
                  <p>
                    Sorry, we couldn't find any items matching "{searchQuery}"
                    in {selectedCategory} category.
                  </p>
                </div>
              );
            }

            return filteredItems.map((item) => {
              console.log("Item Image:", item.image); // Log the image data

              // Convert the Buffer data to Base64 string
              const base64Image = item.image
                ? `data:image/jpeg;base64,${Buffer.from(
                    item.image.data
                  ).toString("base64")}`
                : "https://via.placeholder.com/100";

              return (
                <div key={item.id} className="menu-item">
                  <div className="item-image">
                    <img
                      src={base64Image}
                      alt={item.name}
                      onError={(e) => {
                        e.target.onerror = null; // Prevent infinite loop if placeholder image fails
                        e.target.src = "https://via.placeholder.com/100"; // Fallback to placeholder image
                      }}
                    />
                  </div>
                  <div className="item-details">
                    <h3 className="item-name">{item.name}</h3>
                    <p className="item-description">{item.description}</p>
                    <div className="item-actions">
                      <span className="item-price">{item.price}</span>
                      <button
                        className="add-to-cart"
                        onClick={() => addToCart(item)}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Cart Button */}
      <div className="cart-button-container">
        <button className="cart-button" onClick={() => setShowCart(true)}>
          🛒 Cart{" "}
          {cartItems.length > 0 &&
            `(${cartItems.reduce((sum, item) => sum + item.quantity, 0)})`}
        </button>
      </div>

      {showCart && (
        <Cart
          cartItems={cartItems}
          setCartItems={setCartItems}
          showCart={showCart}
          setShowCart={setShowCart}
        />
      )}
    </div>
  );
};

export default Menu;
