const mongoose = require("mongoose");

const facultyInviteSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  inviteToken: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  isUsed: { type: Boolean, default: false },
});

module.exports = mongoose.model("FacultyInvite", facultyInviteSchema);
