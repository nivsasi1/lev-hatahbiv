const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, trim: true, unique: true, required: true },

    firstName: { type: String, trim: true, required: true, maxlength: 32 },
    lastName: { type: String, trim: true, required: true },

    email: {type: String, requierd: true},
    // password: { type: String, required: true },
    permission: { type: String },
    /*
      ? 0 -  מנהל מערכת
     ? 1 - משתמש  
     */

  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
