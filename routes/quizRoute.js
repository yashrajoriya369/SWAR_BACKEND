const express = require("express");
const router = express.Router();
const {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  deleteQuiz,
  updateQuiz,
} = require("../controllers/quizController");

// Routes
router.get("/", getAllQuizzes);
router.post("/", createQuiz);
router.get("/:id", getQuizById);
router.delete("/:id", deleteQuiz);
router.put("/:id", updateQuiz);

module.exports = router;
