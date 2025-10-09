const express = require("express");
const { registerAdminUser } = require("../controllers/adminCtrl");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const router = express.Router();

router.post(
  "/create-user",
  protect,
  authorizeRoles("superadmin"),
  registerAdminUser
);

module.exports = router;
