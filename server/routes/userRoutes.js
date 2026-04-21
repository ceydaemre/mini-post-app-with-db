const express = require("express");
const router = express.Router();

const {
    toggleFollow,
    getUserProfile,
    getUserPosts,
    getUserReplies,
    getUserLikes
} = require("../controllers/userController");

const {
    authMiddleware,
    optionalAuthMiddleware,
} = require("../middlewares/authMiddleware");

router.post("/:id/follow", authMiddleware, toggleFollow);
router.get("/:id/likes", authMiddleware, getUserLikes);
router.get("/:id/profile", optionalAuthMiddleware, getUserProfile);
router.get("/:id/posts", optionalAuthMiddleware, getUserPosts);
router.get("/:id/replies", optionalAuthMiddleware, getUserReplies);

module.exports = router;