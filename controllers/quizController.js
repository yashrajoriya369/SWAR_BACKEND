const Quiz = require("../models/quizSchema");

// Create a New Quiz
const createQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.create(req.body);
    res.status(201).json(quiz);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find();
    res.status(200).json(quizzes);
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

const getQuizById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid quiz ID format" });
    }

    const quiz = await Quiz.findById(id);

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    return res.status(200).json(quiz);
  } catch (err) {
    console.error("Error fetching quiz:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createQuiz,
  getQuizById,
  getAllQuizzes,
};
