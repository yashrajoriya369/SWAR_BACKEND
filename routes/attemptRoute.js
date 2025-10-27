const express = require("express");
const router = express.Router();
const {
  startAttempt,
  finishAttempt,
  showResult,
} = require("../controllers/attemptCtrl");
const { protect } = require("../middlewares/authMiddleware");

router.post("/start/:quizId", protect, startAttempt);
router.post("/finish/:attemptId", protect, finishAttempt);
router.get("/show-result/:quizId", protect, showResult);

module.exports = router;
