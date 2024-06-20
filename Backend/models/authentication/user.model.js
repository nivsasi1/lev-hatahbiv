const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, trim: true, unique: true, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
