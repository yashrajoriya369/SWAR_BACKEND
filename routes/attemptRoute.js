const express = require("express");
const router = express.Router();
const { startAttempt, finishAttempt } = require("../controllers/attemptCtrl");
const { protect } = require("../middlewares/authMiddleware");

router.post("/start/:quizId", protect, startAttempt);
router.post("/finish/:attemptId", protect, finishAttempt);

module.exports = router;
