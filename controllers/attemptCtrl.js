const mongoose = require("mongoose");
const Attempt = require("../models/quizAttemptModel");
const Quiz = require("../models/quizSchema");
const asyncHandler = require("express-async-handler");
const { gradeAttempt } = require("../utils/grader");

// Helper
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * POST /quizzes/:quizId/start
 */
const startAttempt = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const quizId = req.params.quizId;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!isValidObjectId(quizId)) return res.status(400).json({ error: "Invalid quizId" });

  const quiz = await Quiz.findById(quizId);
  if (!quiz) return res.status(404).json({ error: "Quiz not found" });

  // check if quiz is running
  const now = new Date();
  if (now < new Date(quiz.startTime) || now > new Date(quiz.endTime)) {
    return res.status(403).json({ error: "Quiz is not currently running" });
  }

  // check assignment
  if (!quiz.assignedUsers?.includes(userId)) {
    return res.status(403).json({ error: "You are not assigned this quiz" });
  }

  // enforce attempt limit
  const attemptsCount = await Attempt.countDocuments({ quizId, userId });
  if (quiz.attemptType === "Single" && attemptsCount >= 1) {
    return res.status(409).json({ error: "User already attempted this quiz" });
  }
  if (quiz.maxAttemptsPerUser && attemptsCount >= quiz.maxAttemptsPerUser) {
    return res.status(409).json({ error: "Attempt limit reached for this quiz" });
  }

  // create attempt
  const attempt = await Attempt.create({
    quizId,
    userId,
    startedAt: new Date(),
    score: 0,
    completed: false,
    userAgent: req.get("User-Agent") || "",
    ip: req.headers["x-forwarded-for"] || req.ip,
    answers: [],
    autoGraded: true,
  });

  // increment attemptCount
  Quiz.findByIdAndUpdate(quizId, { $inc: { attemptCount: 1 } }).catch(() => {});

  return res.status(201).json({ attemptId: attempt._id, startedAt: attempt.startedAt });
});

/**
 * POST /quizzes/:quizId/submit/:attemptId
 * Body: { answers: [ { questionId, selected, timeSpentMs } ] }
 */
const finishAttempt = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { quizId, attemptId } = req.params;
  const { answers } = req.body || {};

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!isValidObjectId(quizId) || !isValidObjectId(attemptId)) {
    return res.status(400).json({ error: "Invalid quizId or attemptId" });
  }
  if (!Array.isArray(answers)) return res.status(400).json({ error: "answers array is required" });

  const attempt = await Attempt.findById(attemptId);
  if (!attempt) return res.status(404).json({ error: "Attempt not found" });
  if (String(attempt.userId) !== String(userId)) {
    return res.status(403).json({ error: "This attempt does not belong to you" });
  }
  if (attempt.completed) return res.status(409).json({ error: "Attempt already submitted" });

  const quiz = await Quiz.findById(quizId);
  if (!quiz) return res.status(404).json({ error: "Quiz not found" });

  const now = new Date();
  if (now < new Date(quiz.startTime) || now > new Date(quiz.endTime)) {
    return res.status(403).json({ error: "Quiz is not currently running" });
  }

  // grade answers
  let gradedResult;
  try {
    gradedResult = gradeAttempt(quiz, answers);
  } catch (err) {
    console.error("Grading error:", err);
    return res.status(500).json({ error: "Failed to grade answers" });
  }

  const { totalScore, answers: gradedAnswers } = gradedResult;

  // save attempt
  attempt.answers = gradedAnswers.map((ga) => ({
    questionId: ga.questionId,
    selected: ga.selected,
    timeSpentMs: ga.timeSpentMs || 0,
    isCorrect: !!ga.isCorrect,
    marksObtained: ga.marksObtained || 0,
  }));
  attempt.score = totalScore;
  attempt.completed = true;
  attempt.finishedAt = new Date();
  attempt.gradedAt = new Date();
  attempt.autoGraded = true;
  attempt.gradedBy = null;

  await attempt.save();

  // increment completedCount in quiz
  Quiz.findByIdAndUpdate(quizId, { $inc: { completedCount: 1 } }).catch(() => {});

  return res.status(200).json({
    message: "Attempt submitted and graded",
    attemptId: attempt._id,
    score: attempt.score,
    gradedAt: attempt.gradedAt,
    answers: attempt.answers,
  });
});

module.exports = { startAttempt, finishAttempt };
