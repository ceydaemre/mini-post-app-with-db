const express = require("express");
const router = express.Router();

const {
    toggleFollow,
    getUserProfile,
    getUserPosts,
    getUserReplies,
    getUserLikes,
    updateMyProfile,
    getUserFollowers,
    getUserFollowing,
    getUserMedia
} = require("../controllers/userController");

const {
    authMiddleware,
    optionalAuthMiddleware,
} = require("../middlewares/authMiddleware");

router.patch("/me/profile", authMiddleware, updateMyProfile);

router.post("/:id/follow", authMiddleware, toggleFollow);

router.get("/:id/followers", optionalAuthMiddleware, getUserFollowers);
router.get("/:id/following", optionalAuthMiddleware, getUserFollowing);
router.get("/:id/media", optionalAuthMiddleware, getUserMedia);

router.get("/:id/profile", optionalAuthMiddleware, getUserProfile);
router.get("/:id/posts", optionalAuthMiddleware, getUserPosts);
router.get("/:id/replies", optionalAuthMiddleware, getUserReplies);
router.get("/:id/likes", authMiddleware, getUserLikes);

module.exports = router;