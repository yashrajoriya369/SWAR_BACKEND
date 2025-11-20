const express = require("express");
const {
  registerAdminUser,
  listPendingFaculty,
  approvedFaculty,
  rejectFaculty,
} = require("../controllers/adminCtrl");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const router = express.Router();

router.post(
  "/create-user",
  protect,
  authorizeRoles("superadmin"),
  registerAdminUser
);

router.get(
  "/pending-faculty",
  protect,
  authorizeRoles("superadmin"),
  listPendingFaculty
);
router.patch(
  "/approve-faculty/:id",
  protect,
  authorizeRoles("superadmin"),
  approvedFaculty
);

router.patch(
  "/reject-faculty/:id",
  protect,
  authorizeRoles("superadmin"),
  rejectFaculty
);

module.exports = router;
