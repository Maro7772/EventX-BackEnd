import QRCode from "qrcode";

export const generateQRDataURL = async (text) => {
  return QRCode.toDataURL(text, { width: 256, margin: 1 });
};
