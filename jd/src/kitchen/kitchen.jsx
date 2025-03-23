import React, { useState, useEffect } from "react";

const Kitchen = () => {
  const [orders, setOrders] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    // Fetch orders from the database
    fetch("/api/orders")
      .then((response) => response.json())
      .then((data) => setOrders(data))
      .catch((error) => console.error("Error fetching orders:", error));
  }, []);

  const handleCheckboxChange = (itemId) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSubmit = () => {
    setOrders((prevOrders) =>
      prevOrders
        .map((order) => ({
          ...order,
          items: order.items.filter((item) => !selectedItems.includes(item.id)),
        }))
        .filter((order) => order.items.length > 0)
    );
    setSelectedItems([]);

    fetch("/api/remove-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds: selectedItems }),
    }).catch((error) => console.error("Error updating orders:", error));
  };

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div className="logo-container">
          <img
            src={new URL("../assets/jd.jpg", import.meta.url).href}
            alt="JD Logo"
            className="logo"
          />
          <h6 className="restaurant-name">JD Restaurant</h6>
        </div>
      </div>

      <div className="content">
        <h1>Kitchen Orders</h1>
        {orders.length === 0 ? (
          <div className="no-orders">
            <h3>No orders placed</h3>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.tableNumber}>
              <h2>Table {order.tableNumber}</h2>
              <ul>
                {order.items.map((item) => (
                  <li key={item.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleCheckboxChange(item.id)}
                      />
                      {item.name}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
        {orders.length > 0 && <button onClick={handleSubmit}>Submit</button>}
      </div>
    </div>
  );
};

export default Kitchen;
