const express = require("express");
const router = express.Router();

const {
  uploadSingleMedia
} = require("../controllers/uploadController");

const {
  authMiddleware
} = require("../middlewares/authMiddleware");

router.post("/media", authMiddleware, uploadSingleMedia);

module.exports = router;
