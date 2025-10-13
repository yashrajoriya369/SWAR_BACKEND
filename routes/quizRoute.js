const express = require("express");
const router = express.Router();
const {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  deleteQuiz,
  updateQuiz,
  getQuizzesWithUserAttempts,
  getQuizzesWithFacultyId,
} = require("../controllers/quizController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.get(
  "/faculty",
  protect,
  authorizeRoles("faculty"),
  getQuizzesWithFacultyId
);

router.get(
  "/user",
  protect,
  authorizeRoles("student"),
  getQuizzesWithUserAttempts
);
// Routes
router.get(
  "/",
  protect,
  authorizeRoles("faculty", "superadmin"),
  getAllQuizzes
);
router.post("/", protect, authorizeRoles("faculty"), createQuiz);
router.get(
  "/:id",
  protect,
  authorizeRoles("student", "faculty", "superadmin"),
  getQuizById
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("faculty", "superadmin"),
  deleteQuiz
);
router.put(
  "/:id",
  protect,
  authorizeRoles("faculty", "superadmin"),
  updateQuiz
);

module.exports = router;
