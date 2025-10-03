const express = require("express");
const router = express.Router();
const {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  deleteQuiz,
  updateQuiz,
  getQuizzesWithUserAttempts,
} = require("../controllers/quizController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/user", protect, getQuizzesWithUserAttempts);
// Routes
router.get("/", getAllQuizzes);
router.post("/", createQuiz);
router.get("/:id", getQuizById);
router.delete("/:id", deleteQuiz);
router.put("/:id", updateQuiz);


module.exports = router;
