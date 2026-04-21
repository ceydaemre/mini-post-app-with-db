const express = require("express");
const router = express.Router();

const {
    createPost,
    createComment,
    createRepost,
    createQuote,
    getEntryDetailByEntryId,
    getTimelineEntries,
    toggleEntryLike,
    toggleEntryRepost,
} = require("../controllers/entryController");

const {
    authMiddleware,
    optionalAuthMiddleware,
} = require("../middlewares/authMiddleware");

router.post("/", authMiddleware, createPost);
router.post("/:id/comments", authMiddleware, createComment);
router.post("/:id/repost", authMiddleware, createRepost);
router.post("/:id/quote", authMiddleware, createQuote);

router.get("/", authMiddleware, getTimelineEntries);
router.get("/:id", optionalAuthMiddleware, getEntryDetailByEntryId);

router.patch("/:id/like", authMiddleware, toggleEntryLike);
router.patch("/:id/repost", authMiddleware, toggleEntryRepost);

module.exports = router;