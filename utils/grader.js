function gradeAttempt(quiz, userAnswers) {
  const qById = new Map();
  quiz.questions.forEach((q) => qById.set(String(q._id), q));

  let totalScore = 0;
  const gradedAnswers = userAnswers.map((ua) => {
    const qid = String(ua.questionId);
    const question = qById.get(qid);

    if (!question) {
      return {
        questionId: ua.questionId,
        selected: ua.selected,
        timeSpentMs: ua.timeSpentMs || 0,
        isCorrect: false,
        marksObtained: 0,
      };
    }

    const correct = question.correctAnswer;
    let isCorrect = false;
    let marksObtained = 0;

    if (question.questionType === "Multiple Choice") {
      let selectedValue;
      if (Array.isArray(ua.selected)) {
        selectedValue =
          ua.selected.length === 1 ? question.options[ua.selected[0]] : null;
      } else {
        selectedValue =
          typeof ua.selected === "number"
            ? question.options[ua.selected]
            : ua.selected;
      }

      isCorrect = selectedValue === correct;
      marksObtained = isCorrect ? question.marks || 0 : 0;
    } else if (question.questionType === "Checkbox") {
      if (Array.isArray(ua.selected) && Array.isArray(correct)) {
        const sel = ua.selected.map((s) => String(s));
        const corr = correct.map((s) => String(s));
        const selSet = new Set(sel);
        const corrSet = new Set(corr);
        isCorrect =
          selSet.size === corrSet.size &&
          Array.from(corrSet).every((v) => selSet.has(v));
        marksObtained = isCorrect ? question.marks || 0 : 0;
      } else {
        isCorrect = false;
        marksObtained = 0;
      }
    } else {
      isCorrect = false;
      marksObtained = 0;
    }

    totalScore += marksObtained;

    return {
      questionId: ua.questionId,
      selected:
        ua.selected !== undefined && ua.selected !== null
          ? ua.selected
          : question.questionType === "Checkbox"
          ? [] // empty array for unchecked
          : null, // null for single choice unanswered
      timeSpentMs: ua.timeSpentMs || 0,
      isCorrect,
      marksObtained,
    };
  });

  return { totalScore, answers: gradedAnswers };
}

module.exports = { gradeAttempt };
