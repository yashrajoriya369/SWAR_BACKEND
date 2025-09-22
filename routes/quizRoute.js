const express = require("express");
const {
  createQuiz,
  getQuizById,
  getAllQuizzes,
} = require("../controllers/quizController");
const router = express.Router();

router.post("/", createQuiz);
router.get("/", getAllQuizzes);
router.get("/:id", getQuizById);

module.exports = router;
