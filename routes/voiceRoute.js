const exporess = require("express");
const router = exporess.Router();
const { enrollVoice, verifyVoice } = require("../controllers/voiceCtrl");
const { protect } = require("../middlewares/authMiddleware");

router.post("/enroll", protect, enrollVoice);
router.post("/verify", protect, verifyVoice);

module.exports = router;
