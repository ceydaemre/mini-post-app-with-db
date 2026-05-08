const {
    sendMessageService,
    getMyConversationsService,
    getMessagesByConversationService,
    markConversationMessagesAsReadService,
    getUnreadMessagesCountService
} = require("../services/messageService");

async function sendMessage(req, res) {
    try {
        const sender_id = Number(req.user.id);
        const receiver_id = Number(req.params.receiver_id);
        const { content } = req.body;

        if (!Number.isInteger(sender_id) || sender_id < 1) {
            return res.status(400).json({
                message: "Geçersiz sender_id."
            });
        }

        if (!Number.isInteger(receiver_id) || receiver_id < 1) {
            return res.status(400).json({
                message: "Geçersiz receiver_id."
            });
        }

        const result = await sendMessageService({
            sender_id,
            receiver_id,
            content
        });

        return res.status(201).json({
            message: "Mesaj gönderildi.",
            data: result
        });

    } catch (error) {
        console.error("sendMessage controller hatası:", error.message);

        return res.status(400).json({
            message: error.message
        });
    }
}

async function getMyConversations(req, res) {
    try {
        const user_id = Number(req.user.id);

        let limit = Number(req.query.limit);
        let offset = Number(req.query.offset);

        if (Number.isNaN(limit)) {
            limit = 10;
        }

        if (Number.isNaN(offset)) {
            offset = 0;
        }

        if (!Number.isInteger(user_id) || user_id < 1) {
            return res.status(400).json({
                message: "Geçersiz user_id."
            });
        }

        if (!Number.isInteger(limit) || limit < 1) {
            return res.status(400).json({
                message: "Geçersiz limit."
            });
        }

        if (!Number.isInteger(offset) || offset < 0) {
            return res.status(400).json({
                message: "Geçersiz offset."
            });
        }

        const result = await getMyConversationsService(
            user_id,
            limit,
            offset
        );

        return res.status(200).json({
            message: "Konuşmalar getirildi.",
            data: result
        });

    } catch (error) {
        console.error("getMyConversations controller hatası:", error.message);

        return res.status(400).json({
            message: error.message
        });
    }
}

async function getMessagesByConversation(req, res) {
    try {
        const current_user_id = Number(req.user.id);
        const conversation_id = Number(req.params.conversation_id);

        let limit = Number(req.query.limit);
        let offset = Number(req.query.offset);

        if (Number.isNaN(limit)) {
            limit = 20;
        }

        if (Number.isNaN(offset)) {
            offset = 0;
        }

        if (!Number.isInteger(current_user_id) || current_user_id < 1) {
            return res.status(400).json({
                message: "Geçersiz current_user_id."
            });
        }

        if (!Number.isInteger(conversation_id) || conversation_id < 1) {
            return res.status(400).json({
                message: "Geçersiz conversation_id."
            });
        }

        if (!Number.isInteger(limit) || limit < 1) {
            return res.status(400).json({
                message: "Geçersiz limit."
            });
        }

        if (!Number.isInteger(offset) || offset < 0) {
            return res.status(400).json({
                message: "Geçersiz offset."
            });
        }

        const result = await getMessagesByConversationService(
            current_user_id,
            conversation_id,
            limit,
            offset
        );

        return res.status(200).json({
            message: "Mesajlar getirildi.",
            data: result
        });

    } catch (error) {
        console.error("getMessagesByConversation controller hatası:", error.message);

        return res.status(400).json({
            message: error.message
        });
    }
}

async function markConversationMessagesAsRead(req, res) {
    try {
        const current_user_id = Number(req.user.id);
        const conversation_id = Number(req.params.conversation_id);

        if (!Number.isInteger(current_user_id) || current_user_id < 1) {
            return res.status(400).json({
                message: "Geçersiz current_user_id."
            });
        }

        if (!Number.isInteger(conversation_id) || conversation_id < 1) {
            return res.status(400).json({
                message: "Geçersiz conversation_id."
            });
        }

        const result = await markConversationMessagesAsReadService(
            current_user_id,
            conversation_id
        );

        return res.status(200).json({
            message: "Mesajlar okundu olarak işaretlendi.",
            data: result
        });

    } catch (error) {
        console.error("markConversationMessagesAsRead controller hatası:", error.message);

        return res.status(400).json({
            message: error.message
        });
    }
}

async function getUnreadMessagesCount(req, res) {
    try {
        const current_user_id = Number(req.user.id);

        if (!Number.isInteger(current_user_id) || current_user_id < 1) {
            return res.status(400).json({
                message: "Geçersiz current_user_id."
            });
        }

        const result = await getUnreadMessagesCountService(current_user_id);

        return res.status(200).json({
            message: "Okunmamış mesaj sayısı getirildi.",
            data: result
        });

    } catch (error) {
        console.error("getUnreadMessagesCount controller hatası:", error.message);

        return res.status(400).json({
            message: error.message
        });
    }
}

module.exports = {
    sendMessage,
    getMyConversations,
    getMessagesByConversation,
    markConversationMessagesAsRead,
    getUnreadMessagesCount
};