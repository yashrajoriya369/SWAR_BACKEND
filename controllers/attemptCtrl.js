const mongoose = require("mongoose");
const Attempt = require("../models/quizAttemptModel");
const Quiz = require("../models/quizSchema");
const asyncHandler = require("express-async-handler");
const { gradeAttempt } = require("../utils/grader"); // implement as shown earlier

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

  // is quiz open?
  const now = new Date();
  if (now < new Date(quiz.startTime) || now > new Date(quiz.endTime)) {
    return res.status(403).json({ error: "Quiz is not currently running" });
  }

  // check assignment/visibility
  if (!quiz.isAssignedTo(userId)) {
    return res.status(403).json({ error: "You are not assigned this quiz" });
  }

  // enforce maxAttemptsPerUser (Single or numeric limit)
  if (quiz.attemptType === "Single" || (quiz.maxAttemptsPerUser && quiz.maxAttemptsPerUser > 0)) {
    const attemptsCount = await Attempt.countDocuments({ quizId, userId });
    const limit = quiz.attemptType === "Single" ? 1 : quiz.maxAttemptsPerUser;
    if (limit && attemptsCount >= limit) {
      return res.status(409).json({ error: "Attempt limit reached for this quiz" });
    }
  }

  // For Single we upsert to avoid duplicates; for Multiple just create one
  if (quiz.attemptType === "Single") {
    const filter = { quizId: mongoose.Types.ObjectId(quizId), userId: mongoose.Types.ObjectId(userId) };
    const update = {
      $setOnInsert: {
        quizId: mongoose.Types.ObjectId(quizId),
        userId: mongoose.Types.ObjectId(userId),
        startedAt: new Date(),
        score: 0,
        completed: false,
        userAgent: req.get("User-Agent") || "",
        ip: req.ip,
        answers: [],
        autoGraded: true,
      },
    };
    const opts = { upsert: true, new: true, rawResult: true, setDefaultsOnInsert: true };

    const resRaw = await Attempt.findOneAndUpdate(filter, update, opts);

    // If already existed -> conflict (user already started/attempted)
    const existed = resRaw && resRaw.lastErrorObject && resRaw.lastErrorObject.updatedExisting;
    if (existed) {
      return res.status(409).json({ error: "User already attempted this quiz" });
    }

    // either created or found via fallback — respond with created attempt
    let attemptDoc = resRaw && resRaw.value ? resRaw.value : null;
    if (!attemptDoc) {
      // fallback create
      const created = await Attempt.create({
        quizId,
        userId,
        startedAt: new Date(),
        score: 0,
        completed: false,
        userAgent: req.get("User-Agent") || "",
        ip: req.ip,
        answers: [],
        autoGraded: true,
      });
      attemptDoc = created.toObject ? created.toObject() : created;
    }

    // increment attemptCount (best-effort; non-blocking)
    Quiz.findByIdAndUpdate(quizId, { $inc: { attemptCount: 1 } }).catch(() => {});

    return res.status(201).json({ attemptId: attemptDoc._id, startedAt: attemptDoc.startedAt });
  }

  // Multiple attempts (unlimited or limited by maxAttemptsPerUser already checked above)
  const attempt = await Attempt.create({
    quizId,
    userId,
    startedAt: new Date(),
    score: 0,
    completed: false,
    userAgent: req.get("User-Agent") || "",
    ip: req.ip,
    answers: [],
    autoGraded: true,
  });

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
  if (!isValidObjectId(attemptId)) return res.status(400).json({ error: "Invalid attemptId" });
  if (!isValidObjectId(quizId)) return res.status(400).json({ error: "Invalid quizId" });

  if (!Array.isArray(answers)) return res.status(400).json({ error: "answers array is required" });

  // load attempt and quiz
  const attempt = await Attempt.findById(attemptId);
  if (!attempt) return res.status(404).json({ error: "Attempt not found" });

  if (String(attempt.userId) !== String(userId)) {
    return res.status(403).json({ error: "Forbidden: attempt doesn't belong to user" });
  }

  // prevent double submit (fast path)
  if (attempt.completed) {
    return res.status(409).json({ error: "Attempt already submitted" });
  }

  const quiz = await Quiz.findById(quizId);
  if (!quiz) return res.status(404).json({ error: "Quiz not found" });

  // ensure attempt belongs to this quiz
  if (String(attempt.quizId) !== String(quiz._id)) {
    return res.status(400).json({ error: "Attempt does not belong to given quiz" });
  }

  // check quiz window (block submission outside)
  const now = new Date();
  if (now < new Date(quiz.startTime) || now > new Date(quiz.endTime)) {
    return res.status(403).json({ error: "Quiz is not currently running" });
  }

  // grade locally using helper (returns totalScore and graded answers)
  const { totalScore, answers: gradedAnswers } = gradeAttempt(quiz, answers);

  // Start transaction: save attempt (graded), bump completedCount (if first completion)
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // re-fetch attempt inside session to avoid race
    const attemptSession = await Attempt.findById(attemptId).session(session);
    if (!attemptSession) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Attempt not found (during transaction)" });
    }
    if (attemptSession.completed) {
      await session.abortTransaction();
      return res.status(409).json({ error: "Attempt already submitted" });
    }

    // build answers payload to store (matches attempt model's answerSchema)
    const answersToStore = gradedAnswers.map((ga) => ({
      questionId: ga.questionId,
      selected: ga.selected,
      timeSpentMs: ga.timeSpentMs || 0,
      isCorrect: !!ga.isCorrect,
      marksObtained: ga.marksObtained || 0,
    }));

    attemptSession.answers = answersToStore;
    attemptSession.score = totalScore;
    attemptSession.completed = true;
    attemptSession.finishedAt = new Date();
    attemptSession.autoGraded = true;
    attemptSession.gradedAt = new Date();
    attemptSession.gradedBy = null; // auto graded; set teacher id for manual grading

    await attemptSession.save({ session });

    // increment completedCount only if this is the first time it was completed
    await Quiz.findByIdAndUpdate(
      quizId,
      { $inc: { completedCount: 1 } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "Attempt submitted and graded",
      attemptId: attemptSession._id,
      score: attemptSession.score,
      gradedAt: attemptSession.gradedAt,
      answers: attemptSession.answers,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("submitAttempt error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = {
  startAttempt,
  finishAttempt,
};
