const {
    getNotificationsService,
    markNotificationAsReadService,
    markAllNotificationsAsReadService,
    getUnreadNotificationsCountService
} = require("../services/notificationsService");

async function getNotifications(req, res) {
    try {
        const user_id = Number(req.user.id);

        let limit = Number(req.query.limit);
        let offset = Number(req.query.offset);

        if (Number.isNaN(limit)) limit = 10;
        if (Number.isNaN(offset)) offset = 0;

        const result = await getNotificationsService(user_id, limit, offset);

        return res.status(200).json({
            message: "Bildirimler getirildi.",
            data: result
        });

    } catch (error) {
        console.error("getNotifications controller hatası:", error.message);

        return res.status(400).json({
            message: error.message
        });
    }
}

async function markNotificationAsRead(req, res) {
    try {
        const user_id = Number(req.user.id);
        const notification_id = Number(req.params.id);

        const result = await markNotificationAsReadService(
            user_id,
            notification_id
        );

        return res.status(200).json({
            message: "Bildirim okundu olarak işaretlendi.",
            data: result
        });

    } catch (error) {
        console.error("markNotificationAsRead controller hatası:", error.message);

        return res.status(400).json({
            message: error.message
        });
    }
}

async function markAllNotificationsAsRead(req, res) {
    try {
        const user_id = Number(req.user.id);

        const result = await markAllNotificationsAsReadService(user_id);

        return res.status(200).json({
            message: "Tüm bildirimler okundu olarak işaretlendi.",
            data: result
        });

    } catch (error) {
        console.error("markAllNotificationsAsRead controller hatası:", error.message);

        return res.status(400).json({
            message: error.message
        });
    }
}

async function getUnreadNotificationsCount(req, res) {
    try {
        const user_id = Number(req.user.id);

        const result = await getUnreadNotificationsCountService(user_id);

        return res.status(200).json({
            message: "Okunmamış bildirim sayısı getirildi.",
            data: result
        });

    } catch (error) {
        console.error("getUnreadNotificationsCount controller hatası:", error.message);

        return res.status(400).json({
            message: error.message
        });
    }
}

module.exports = {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadNotificationsCount
};