const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  checkCurrentUser,
  fetchAllUsers,
  sendFacultyInvite,
  completeFacultyRegistration,
  completeStudentProfile,
  updateStudentProfile,
  updateFullUserProfile,
} = require("../controllers/authController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/signup", registerUser);
router.post(
  "/add-course",
  protect,
  authorizeRoles("student"),
  completeStudentProfile
);
router.put(
  "/update-profile",
  protect,
  authorizeRoles("student"),
  updateStudentProfile
);
router.put("/profile", protect, updateFullUserProfile);

router.post("/login", loginUser);
router.post("/logout", protect, logoutUser);
router.get("/check", checkCurrentUser);
router.get("/fetchusers", protect, authorizeRoles("faculty"), fetchAllUsers);
router.post(
  "/invite-faculty",
  protect,
  authorizeRoles("superadmin"),
  sendFacultyInvite
);
router.post("/complete-faculty-registration", completeFacultyRegistration);

module.exports = router;
