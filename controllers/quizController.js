// const Quiz = require("../models/quizSchema");

// // Create a New Quiz
// const createQuiz = async (req, res) => {
//   try {
//     const quiz = await Quiz.create(req.body);
//     res.status(201).json(quiz);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// };

// // Get all Quizzes
// const getAllQuizzes = async (req, res) => {
//   try {
//     const quizzes = await Quiz.find();
//     res.status(200).json(quizzes);
//   } catch (error) {
//     console.error("Error fetching quizzes:", error);
//     res.status(500).json({ error: "Server Error" });
//   }
// };

// // Get a Single Quiz
// const getQuizById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Validate ObjectId
//     if (!id.match(/^[0-9a-fA-F]{24}$/)) {
//       return res.status(400).json({ error: "Invalid quiz ID format" });
//     }

//     const quiz = await Quiz.findById(id);

//     if (!quiz) {
//       return res.status(404).json({ error: "Quiz not found" });
//     }

//     return res.status(200).json(quiz);
//   } catch (err) {
//     console.error("Error fetching quiz:", err);
//     return res.status(500).json({ error: "Server error" });
//   }
// };

// // Delete a Quiz
// const deleteQuiz = async (req, res) => {
//   const { id } = req.params;

//   // Validate ID format
//   if (!id.match(/^[0-9a-fA-F]{24}$/)) {
//     return res.status(400).json({ error: "Invalid quiz ID format" });
//   }

//   try {
//     const deletedQuiz = await Quiz.findByIdAndDelete(id);

//     if (!deletedQuiz) {
//       return res.status(404).json({ error: "Quiz not found" });
//     }

//     res.status(200).json({ message: "Quiz deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting quiz:", error);
//     res.status(500).json({ error: "Server error" });
//   }
// };

// // Update a Quiz
// const updateQuiz = async (req, res) => {
//   const { id } = req.params;
//   try {
//     const updateQuiz = await Quiz.findByIdAndUpdate(id, req.body, {
//       new: true,
//     });
//     res.json(updateQuiz);
//   } catch (error) {
//     throw new Error(error);
//   }
// };

// module.exports = {
//   createQuiz,
//   getQuizById,
//   getAllQuizzes,
//   deleteQuiz,
//   updateQuiz,
// };

const mongoose = require("mongoose");
const Quiz = require("../models/quizSchema");

// Helper: Validate MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ============================
// Create a New Quiz
// ============================
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

    // Basic validation
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
      return res.status(400).json({ error: "Missing or invalid required fields" });
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
    });

    res.status(201).json({ message: "Quiz created successfully", quiz });
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({ error: error.message || "Server error" });
  }
};

// ============================
// Get All Quizzes
// ============================
const getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    res.status(200).json(quizzes);
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================
// Get a Single Quiz by ID
// ============================
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

// ============================
// Update a Quiz
// ============================
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
    return res.status(400).json({ error: "No valid fields provided for update" });
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

// ============================
// Delete a Quiz
// ============================
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

module.exports = {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
};

