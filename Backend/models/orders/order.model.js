const mongoose = require("mongoose");

// A record of every order sent from the cart (currently via WhatsApp),
// so the store has history even if a chat message gets lost.
const OrderSchema = new mongoose.Schema({
  items: [
    {
      productId: String,
      name: { type: String, required: true },
      qty: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0 },
    },
  ],
  total: { type: Number, required: true, min: 0 },
  delivery: { type: String, default: "" },
  channel: { type: String, default: "whatsapp" }, // future: "card", "bit"...
  status: {
    type: String,
    enum: ["new", "handled", "cancelled"],
    default: "new",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", OrderSchema);
