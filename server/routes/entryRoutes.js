const express = require("express");
const router = express.Router();

const {
    createPost,
    createComment,
    createRepost,
    createQuote,
    getEntryDetailByEntryId,
    getTimelineEntries
} = require("../controllers/entryController");

const {
    authMiddleware
} = require("../middlewares/authMiddleware");

router.post("/", authMiddleware, createPost);
router.post("/:id/comments", authMiddleware, createComment);
router.post("/:id/repost", authMiddleware, createRepost);
router.post("/:id/quote", authMiddleware, createQuote);

router.get("/", getTimelineEntries);
router.get("/:id", getEntryDetailByEntryId);


module.exports = router;