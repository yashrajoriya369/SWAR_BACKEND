const exporess = require("express");
const router = exporess.Router();
const {
  enrollVoice,
  verifyVoice,
  resetVoice,
} = require("../controllers/voiceCtrl");
const { protect } = require("../middlewares/authMiddleware");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/enroll", protect, upload.single("file"), enrollVoice);
router.post("/verify", protect, upload.single("file"), verifyVoice);
router.post("/reset", protect, resetVoice);

module.exports = router;
