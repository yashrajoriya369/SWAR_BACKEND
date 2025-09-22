const express = require("express");
const { createQuiz, getQuizById } = require("../controllers/quizController");
const router = express.Router();

router.post("/", createQuiz);
router.get("/:id", getQuizById);

module.exports = router;
