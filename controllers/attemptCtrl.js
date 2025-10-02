// controllers/attemptController.js
const mongoose = require("mongoose");
const Attempt = require("../models/quizAttemptModel");
const Quiz = require("../models/quizSchema");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// async function startAttempt(req, res) {
//   try {
//     const userId = req.user?.id;
//     const quizId = req.params.quizId;

//     if (!userId) return res.status(401).json({ error: "Unauthorized" });
//     if (!isValidObjectId(quizId))
//       return res.status(400).json({ error: "Invalid quizId" });

//     const quiz = await Quiz.findById(quizId).lean();
//     if (!quiz) return res.status(404).json({ error: "Quiz not found" });

//     const now = new Date();
//     if (now < new Date(quiz.startTime) || now > new Date(quiz.endTime)) {
//       return res.status(400).json({ error: "Quiz is not currently running" });
//     }

//     if (quiz.attemptType === "Single") {
//       // Atomic find-or-insert with `new mongoose.Types.ObjectId(...)`
//       const filter = {
//         quizId: new mongoose.Types.ObjectId(quizId),
//         userId: new mongoose.Types.ObjectId(userId),
//       };
//       const update = {
//         $setOnInsert: {
//           quizId: new mongoose.Types.ObjectId(quizId),
//           userId: new mongoose.Types.ObjectId(userId),
//           startedAt: new Date(),
//           score: 0,
//           completed: false,
//           userAgent: req.get("User-Agent") || "",
//           ip: req.ip,
//         },
//       };
//       const opts = {
//         upsert: true,
//         new: true,
//         rawResult: true,
//         setDefaultsOnInsert: true,
//       };

//       const resRaw = await Attempt.findOneAndUpdate(filter, update, opts);

//       // Defensive: if resRaw is falsy, fallback to create
//       if (!resRaw) {
//         const fallback = await Attempt.create({
//           quizId: new mongoose.Types.ObjectId(quizId),
//           userId: new mongoose.Types.ObjectId(userId),
//           startedAt: new Date(),
//           score: 0,
//           completed: false,
//           userAgent: req.get("User-Agent") || "",
//           ip: req.ip,
//         });
//         Quiz.findByIdAndUpdate(quizId, { $inc: { attemptCount: 1 } }).catch(() => {});
//         return res.status(201).json({ attemptId: fallback._id, startedAt: fallback.startedAt });
//       }

//       if (resRaw.lastErrorObject && resRaw.lastErrorObject.updatedExisting) {
//         return res.status(409).json({ error: "User already attempted this quiz" });
//       }

//       const attemptDoc = resRaw.value;
//       Quiz.findByIdAndUpdate(quizId, { $inc: { attemptCount: 1 } }).catch(() => {});
//       return res.status(201).json({ attemptId: attemptDoc._id, startedAt: attemptDoc.startedAt });
//     }

//     // Multiple attempts: regular create (Mongoose will cast strings to ObjectId)
//     const attempt = await Attempt.create({
//       quizId,
//       userId,
//       startedAt: new Date(),
//       score: 0,
//       completed: false,
//       userAgent: req.get("User-Agent") || "",
//       ip: req.ip,
//     });

//     Quiz.findByIdAndUpdate(quizId, { $inc: { attemptCount: 1 } }).catch(() => {});
//     return res.status(201).json({ attemptId: attempt._1, startedAt: attempt.startedAt });
//   } catch (error) {
//     console.error("Failed to start attempt:", error);
//     return res.status(500).json({ error: "Server error" });
//   }
// }

// controllers/attemptCtrl.js (replace only the startAttempt function)
async function startAttempt(req, res) {
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

    // helper constructors
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

      // perform atomic upsert
      const resRaw = await Attempt.findOneAndUpdate(filter, update, opts);

      // Defensive handling: resRaw may not include `.value` in some driver versions
      let attemptDoc = resRaw && resRaw.value ? resRaw.value : null;

      if (!attemptDoc) {
        // Try to fetch the document that should have been created
        attemptDoc = await Attempt.findOne(filter).lean();
      }

      // If still not found, fallback to creating (rare)
      if (!attemptDoc) {
        console.debug("Upsert returned no value and findOne didn't find it; creating fallback attempt.", { filter, resRaw });
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

      // If the upsert discovered an existing doc, react accordingly
      // Some driver versions include lastErrorObject.updatedExisting === true
      const wasExisting =
        resRaw && resRaw.lastErrorObject && resRaw.lastErrorObject.updatedExisting;

      if (wasExisting) {
        return res.status(409).json({ error: "User already attempted this quiz" });
      }

      // increment attempt count best-effort
      Quiz.findByIdAndUpdate(quizId, { $inc: { attemptCount: 1 } }).catch(() => {});

      return res
        .status(201)
        .json({ attemptId: attemptDoc._id, startedAt: attemptDoc.startedAt });
    }

    // Multiple attempts allowed — plain create (Mongoose will cast IDs)
    const attempt = await Attempt.create({
      quizId,
      userId,
      startedAt: new Date(),
      score: 0,
      completed: false,
      userAgent: req.get("User-Agent") || "",
      ip: req.ip,
    });

    // increment attemptCount (best-effort)
    Quiz.findByIdAndUpdate(quizId, { $inc: { attemptCount: 1 } }).catch(() => {});

    return res.status(201).json({ attemptId: attempt._id, startedAt: attempt.startedAt });
  } catch (error) {
    console.error("Failed to start attempt:", error);
    return res.status(500).json({ error: "Server error" });
  }
}


async function finishAttempt(req, res) {
  try {
    const userId = req.user?.id;
    const { attemptId } = req.params;
    const { score = 0, completed = true, answers } = req.body || {};

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!isValidObjectId(attemptId)) return res.status(400).json({ error: "Invalid attemptId" });

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
      await Quiz.findByIdAndUpdate(attempt.quizId, { $inc: { completedCount: 1 } }).catch(() => {});
    }

    return res.status(200).json({ message: "Attempt finished", attemptId: attempt._id });
  } catch (error) {
    console.error("Failed to finish attempt:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  startAttempt,
  finishAttempt,
};
