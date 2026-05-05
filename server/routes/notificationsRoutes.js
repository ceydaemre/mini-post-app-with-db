const express = require("express");
const router = express.Router();

const {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadNotificationsCount
} = require("../controllers/notificationsController");

const {
    authMiddleware
} = require("../middlewares/authMiddleware");

router.get("/", authMiddleware, getNotifications);
router.get("/unread-count", authMiddleware, getUnreadNotificationsCount);
router.patch("/read-all", authMiddleware, markAllNotificationsAsRead);
router.patch("/:id/read", authMiddleware, markNotificationAsRead);

module.exports = router;