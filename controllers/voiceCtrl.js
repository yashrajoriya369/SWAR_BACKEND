const User = require("../models/userModel");
const {
  getEmbeddingFromAudio,
} = require("../voice-service/voice/embeddingService");

const enrollVoice = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "Audio file required" });

    const embedding = await getEmbeddingFromAudio(req.file.buffer);
    const phrase = req.body.phrase || null;
    const consentGiven =
      req.body.consentGiven === "true" || req.body.consentGiven === true;

    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const profile = await user.addVoiceEmbedding(
      embedding,
      phrase,
      req.file.originalname,
      consentGiven
    );

    return res.json({
      success: true,
      message: "Enrollment added",
      profile,
    });
  } catch (err) {
    console.error("enrollVoice error:", err);
    return res.status(400).json({ success: false, message: err.message });
  }
};

const verifyVoice = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "Audio file required" });

    const embedding = await getEmbeddingFromAudio(req.file.buffer);

    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const result = await user.verifyVoiceEmbedding(embedding, {
      method: req.body.method,
      threshold: req.body.threshold ? Number(req.body.threshold) : undefined,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error("verifyVoice error:", err);

    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

const resetVoice = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const cleared = await user.clearVoiceProfile();
    return res.json({
      success: true,
      message: "Voice profile cleared",
      profile: cleared,
    });
  } catch (err) {
    console.error("resetVoice error:", err);
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

module.exports = {
  enrollVoice,
  verifyVoice,
  resetVoice,
};
