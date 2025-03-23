import QRCode from "qrcode";

export const generateQRCode = async (tableId) => {
  try {
    const url = `http://localhost:5173/qr-handler?tableId=${tableId}`;
    const qrCode = await QRCode.toDataURL(url);
    return qrCode;
  } catch (error) {
    console.error("Error generating QR code:", error);
  }
};
