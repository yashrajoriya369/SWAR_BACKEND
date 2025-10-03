const mongoose = require("mongoose");
const Attempt = require("../models/quizAttemptModel");
const Quiz = require("../models/quizSchema");
const asyncHandler = require("express-async-handler");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const startAttempt = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;
    const quizId = req.params.quizId;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(quizId))
      return res.status(400).json({ error: "Invalid quizId" });

    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const now = new Date();
    if (now < new Date(quiz.startTime) || now > new Date(quiz.endTime)) {
      return res.status(400).json({ error: "Quiz is not currently running" });
    }

    const QuizObjectId = (id) => new mongoose.Types.ObjectId(id);
    const UserObjectId = (id) => new mongoose.Types.ObjectId(id);

    if (quiz.attemptType === "Single") {
      const filter = {
        quizId: QuizObjectId(quizId),
        userId: UserObjectId(userId),
      };
      const update = {
        $setOnInsert: {
          quizId: QuizObjectId(quizId),
          userId: UserObjectId(userId),
          startedAt: new Date(),
          score: 0,
          completed: false,
          userAgent: req.get("User-Agent") || "",
          ip: req.ip,
        },
      };
      const opts = {
        upsert: true,
        new: true,
        rawResult: true,
        setDefaultsOnInsert: true,
      };

      const resRaw = await Attempt.findOneAndUpdate(filter, update, opts);
      let attemptDoc = resRaw && resRaw.value ? resRaw.value : null;

      if (!attemptDoc) {
        attemptDoc = await Attempt.findOne(filter).lean();
      }

      if (!attemptDoc) {
        console.debug(
          "Upsert returned no value and findOne didn't find it; creating fallback attempt.",
          { filter, resRaw }
        );
        const created = await Attempt.create({
          quizId: QuizObjectId(quizId),
          userId: UserObjectId(userId),
          startedAt: new Date(),
          score: 0,
          completed: false,
          userAgent: req.get("User-Agent") || "",
          ip: req.ip,
        });
        attemptDoc = created.toObject ? created.toObject() : created;
      }

      const wasExisting =
        resRaw &&
        resRaw.lastErrorObject &&
        resRaw.lastErrorObject.updatedExisting;

      if (wasExisting) {
        return res
          .status(409)
          .json({ error: "User already attempted this quiz" });
      }

      Quiz.findByIdAndUpdate(quizId, { $inc: { attemptCount: 1 } }).catch(
        () => {}
      );

      return res
        .status(201)
        .json({ attemptId: attemptDoc._id, startedAt: attemptDoc.startedAt });
    }

    const attempt = await Attempt.create({
      quizId,
      userId,
      startedAt: new Date(),
      score: 0,
      completed: false,
      userAgent: req.get("User-Agent") || "",
      ip: req.ip,
    });

    Quiz.findByIdAndUpdate(quizId, { $inc: { attemptCount: 1 } }).catch(
      () => {}
    );

    return res
      .status(201)
      .json({ attemptId: attempt._id, startedAt: attempt.startedAt });
  } catch (error) {
    console.error("Failed to start attempt:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

const finishAttempt = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;
    const { attemptId } = req.params;
    const { score = 0, completed = true, answers } = req.body || {};

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!isValidObjectId(attemptId))
      return res.status(400).json({ error: "Invalid attemptId" });

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ error: "Attempt not found" });

    if (attempt.userId.toString() !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const wasCompleted = attempt.completed;

    attempt.score = typeof score === "number" ? score : attempt.score;
    attempt.completed = !!completed;
    attempt.finishedAt = new Date();
    if (answers) attempt.answers = answers;

    await attempt.save();

    if (!wasCompleted && attempt.completed) {
      await Quiz.findByIdAndUpdate(attempt.quizId, {
        $inc: { completedCount: 1 },
      }).catch(() => {});
    }

    return res
      .status(200)
      .json({ message: "Attempt finished", attemptId: attempt._id });
  } catch (error) {
    console.error("Failed to finish attempt:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = {
  startAttempt,
  finishAttempt,
};
