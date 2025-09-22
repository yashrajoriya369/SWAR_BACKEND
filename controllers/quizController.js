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

module.exports = {
  createQuiz,
};
