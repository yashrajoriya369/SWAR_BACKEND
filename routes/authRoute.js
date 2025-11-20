const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  checkCurrentUser,
  fetchAllUsers,
  sendFacultyInvite,
  completeFacultyRegistration,
} = require("../controllers/authController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);
router.post("/logout", protect, logoutUser);
router.get("/check", checkCurrentUser);
router.get("/fetchusers", protect, authorizeRoles("faculty"), fetchAllUsers);
router.post(
  "/invite-faculty",
  // protect,
  // authorizeRoles("superadmin"),
  sendFacultyInvite
);
router.post("/complete-faculty-registration", completeFacultyRegistration);

module.exports = router;
