const express = require("express");
const router = express.Router();

const {
    sendMessage,
    getMyConversations,
    getMessagesByConversation,
    markConversationMessagesAsRead,
    getUnreadMessagesCount
} = require("../controllers/messageController");

const {
    authMiddleware
} = require("../middlewares/authMiddleware");

router.get("/unread-count", authMiddleware, getUnreadMessagesCount);

router.get("/conversations", authMiddleware, getMyConversations);
router.get("/conversations/:conversation_id", authMiddleware, getMessagesByConversation);

router.patch(
    "/conversations/:conversation_id/read",
    authMiddleware,
    markConversationMessagesAsRead
);

router.post("/:receiver_id", authMiddleware, sendMessage);

module.exports = router;