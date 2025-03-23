import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./frontend/loginPage.jsx";
import Menu from "./frontend/Menu.jsx";
import ThankYouPage from "./frontend/ThankYou.jsx";
import Amenu from "./Admin/Amenu.jsx";
import Admin from "./Admin/AdminPage.jsx";
import QRCodeHandler from "./frontend/QRCodeHandler";
import Kitchen from "./kitchen/kitchen.jsx";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/thank-you" element={<ThankYouPage />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/amenu" element={<Amenu />} />
          <Route path="/qr-handler" element={<QRCodeHandler />} />
          <Route path="/kitchen" element={<Kitchen />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
