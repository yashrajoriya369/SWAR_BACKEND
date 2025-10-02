function getQuizRuntimeStatus(quiz, userAttempted = false) {
  const now = new Date();

  if (now < new Date(quiz.startTime)) return "Upcoming";
  if (now >= new Date(quiz.startTime) && now <= new Date(quiz.endTime)) {
    return "Active";
  }
  if (userAttempted) return "Finished";
  return "Ended";
}

module.exports = { getQuizRuntimeStatus };
