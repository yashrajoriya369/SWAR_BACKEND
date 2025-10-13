const User = require("../models/userModel");

const enrollVoice = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { embedding, phrase, audioUrl } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const profile = await user.addVoiceEmbedding(embedding, phrase, audioUrl);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const verifyVoice = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { embedding } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const result = await user.verifyVoiceEmbedding(embedding);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  enrollVoice,
  verifyVoice,
};
