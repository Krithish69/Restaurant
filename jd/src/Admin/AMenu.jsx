import React from "react";
import { Link } from "react-router-dom";
import "./AMenu.css";

const Menu = () => {
  return (
    <div className="menu-page">
      <header className="menu-header">
        <h1>JD Restaurant Menu</h1>
        <Link to="/" className="admin-link">
          ← Back to Admin
        </Link>
      </header>
      <div className="menu-content">
        <h2>Our Menu</h2>
        {/* Add your menu content here */}
        <div className="menu-items">
          <div className="menu-item">
            <h3>Classic Burger</h3>
            <p>₹299</p>
          </div>
          {/* Add more menu items */}
        </div>
      </div>
    </div>
  );
};

export default Menu;
