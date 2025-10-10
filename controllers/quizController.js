const mongoose = require("mongoose");
const Quiz = require("../models/quizSchema");
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const { getQuizRuntimeStatus } = require("../utils/quiz");
const Attempt = require("../models/quizAttemptModel");

// Create a New Quiz
const createQuiz = async (req, res) => {
  try {
    const {
      subjectId,
      quizName,
      attemptType,
      startTime,
      endTime,
      durationMinutes,
      status,
      questions,
    } = req.body;

    if (
      !subjectId ||
      !quizName ||
      !attemptType ||
      !startTime ||
      !endTime ||
      !durationMinutes ||
      !questions ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Missing or invalid required fields" });
    }

    const quiz = await Quiz.create({
      subjectId,
      quizName,
      attemptType,
      startTime,
      endTime,
      durationMinutes,
      status,
      questions,
      createdBy: req.user._id,
      facultyId: req.user._id,
      shuffleQuestions: req.body.shuffleQuestions || false,
      shuffleOptions: req.body.shuffleOptions || false,
      visibility: req.body.visibility || "private",
      notes: req.body.notes || "",
      assignedUsers: req.body.assignedUsers || [req.user._id], // ensure assigned
      attemptCount: 0,
      completedCount: 0,
    });

    res.status(201).json({ message: "Quiz created successfully", quiz });
  } catch (error) {
    console.error("Error creating quiz:", error);
    if (error.name === "ValidationError") {
      const details = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      return res.status(400).json({ error: "Validation failed", details });
    }
    res.status(500).json({ error: error.message || "Server error" });
  }
};

// Get All Quizzes
const getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find()
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    const enriched = quizzes.map((q) => {
      return {
        ...q,
        runtimeStatus: getQuizRuntimeStatus(q, false),
      };
    });
    res.status(200).json(enriched);
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get a Single Quiz by ID
const getQuizById = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid quiz ID format" });
  }

  try {
    const quiz = await Quiz.findById(id);

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    res.status(200).json(quiz);
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Update a Quiz
const updateQuiz = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid quiz ID format" });
  }

  const allowedUpdates = [
    "subjectId",
    "quizName",
    "attemptType",
    "startTime",
    "endTime",
    "durationMinutes",
    "status",
    "questions",
  ];

  const updates = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res
      .status(400)
      .json({ error: "No valid fields provided for update" });
  }

  try {
    const updatedQuiz = await Quiz.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedQuiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    res.status(200).json({ message: "Quiz updated successfully", updatedQuiz });
  } catch (error) {
    console.error("Error updating quiz:", error);

    res.status(500).json({ error: "Server error" });
  }
};

// Delete a Quiz
const deleteQuiz = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid quiz ID format" });
  }

  try {
    const deletedQuiz = await Quiz.findByIdAndDelete(id);

    if (!deletedQuiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    res.status(200).json({ message: "Quiz deleted successfully" });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getQuizzesWithUserAttempts = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // pagination
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(req.query.limit || "20", 10))
    );
    const skip = (page - 1) * limit;

    // fetch quiz list (lean for performance)
    const quizzes = await Quiz.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    if (!quizzes || quizzes.length === 0) {
      return res.status(200).json({ quizzes: [], page, limit });
    }

    // collect quizIds from quizzes (they are already ObjectId or strings)
    const quizIds = quizzes.map((q) => q._id);

    // aggregate latest attempt per quiz for this user
    const attemptsAgg = await Attempt.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId), // use `new` here
          quizId: { $in: quizIds },
        },
      },
      { $sort: { createdAt: -1 } }, // newest first
      {
        $group: {
          _id: "$quizId",
          attempt: { $first: "$$ROOT" },
        },
      },
    ]);

    // map quizId -> attempt
    const attemptMap = new Map();
    for (const item of attemptsAgg) {
      attemptMap.set(item._id.toString(), item.attempt);
    }

    // attach userAttempt + runtimeStatus
    const result = quizzes.map((quiz) => {
      const a = attemptMap.get(quiz._id.toString()) || null;
      const userAttempt = a
        ? {
            attemptId: a._id,
            score: a.score,
            completed: !!a.completed,
            startedAt: a.startedAt,
            finishedAt: a.finishedAt,
          }
        : null;

      const runtimeStatus = getQuizRuntimeStatus(quiz, !!userAttempt);

      return {
        ...quiz,
        runtimeStatus,
        userAttempt,
      };
    });

    return res.status(200).json({ quizzes: result, page, limit });
  } catch (error) {
    console.error("Error in getQuizzesWithUserAttempts:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  getQuizzesWithUserAttempts,
};
