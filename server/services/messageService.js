const pool = require("../config/db");

async function sendMessageService({
    sender_id,
    receiver_id,
    content
}) {
    sender_id = Number(sender_id);
    receiver_id = Number(receiver_id);

    if (!Number.isInteger(sender_id) || sender_id < 1) {
        throw new Error("Geçersiz sender_id.");
    }

    if (!Number.isInteger(receiver_id) || receiver_id < 1) {
        throw new Error("Geçersiz receiver_id.");
    }

    if (sender_id === receiver_id) {
        throw new Error("Kullanıcı kendine mesaj gönderemez.");
    }

    if (!content || String(content).trim() === "") {
        throw new Error("Mesaj içeriği zorunludur.");
    }

    const normalizedContent = String(content).trim();

    if (normalizedContent.length > 1000) {
        throw new Error("Mesaj 1000 karakterden uzun olamaz.");
    }

    const receiverQuery = `
        SELECT id, full_name, username, profile_image_url
        FROM users
        WHERE id = $1
    `;

    const receiverResult = await pool.query(receiverQuery, [receiver_id]);

    if (receiverResult.rows.length === 0) {
        throw new Error("Mesaj gönderilecek kullanıcı bulunamadı.");
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const existingConversationQuery = `
            SELECT cp.conversation_id
            FROM conversation_participants cp
            WHERE cp.user_id IN ($1, $2)
            GROUP BY cp.conversation_id
            HAVING COUNT(DISTINCT cp.user_id) = 2
            LIMIT 1
        `;

        const existingConversationResult = await client.query(
            existingConversationQuery,
            [sender_id, receiver_id]
        );

        let conversation_id;

        if (existingConversationResult.rows.length > 0) {
            conversation_id = existingConversationResult.rows[0].conversation_id;
        } else {
            const createConversationQuery = `
                INSERT INTO conversations DEFAULT VALUES
                RETURNING id, created_at, updated_at
            `;

            const createConversationResult = await client.query(
                createConversationQuery
            );

            conversation_id = createConversationResult.rows[0].id;

            const insertParticipantsQuery = `
                INSERT INTO conversation_participants (
                    conversation_id,
                    user_id
                )
                VALUES ($1, $2), ($1, $3)
            `;

            await client.query(insertParticipantsQuery, [
                conversation_id,
                sender_id,
                receiver_id
            ]);
        }

        const insertMessageQuery = `
            INSERT INTO messages (
                conversation_id,
                sender_id,
                content
            )
            VALUES ($1, $2, $3)
            RETURNING
                id,
                conversation_id,
                sender_id,
                content,
                is_read,
                created_at
        `;

        const insertMessageResult = await client.query(insertMessageQuery, [
            conversation_id,
            sender_id,
            normalizedContent
        ]);

        const createdMessage = insertMessageResult.rows[0];

        const updateConversationQuery = `
            UPDATE conversations
            SET updated_at = NOW()
            WHERE id = $1
            RETURNING id, created_at, updated_at
        `;

        const updateConversationResult = await client.query(
            updateConversationQuery,
            [conversation_id]
        );

        await client.query("COMMIT");

        return {
            conversation: updateConversationResult.rows[0],
            message: createdMessage
        };

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;

    } finally {
        client.release();
    }
}

async function getMyConversationsService(user_id, limit = 10, offset = 0) {
    user_id = Number(user_id);
    limit = Number(limit);
    offset = Number(offset);

    if (!Number.isInteger(user_id) || user_id < 1) {
        throw new Error("Geçersiz user_id.");
    }

    if (!Number.isInteger(limit) || limit < 1) {
        throw new Error("Geçersiz limit.");
    }

    if (!Number.isInteger(offset) || offset < 0) {
        throw new Error("Geçersiz offset.");
    }

    const query = `
        SELECT
            c.id AS conversation_id,
            c.updated_at,

            other_user.id AS other_user_id,
            other_user.full_name AS other_user_full_name,
            other_user.username AS other_user_username,
            other_user.profile_image_url AS other_user_profile_image_url,

            last_message.id AS last_message_id,
            last_message.sender_id AS last_message_sender_id,
            last_message.content AS last_message_content,
            last_message.is_read AS last_message_is_read,
            last_message.created_at AS last_message_created_at,

            (
                SELECT COUNT(*)
                FROM messages unread_messages
                WHERE unread_messages.conversation_id = c.id
                  AND unread_messages.sender_id != $1
                  AND unread_messages.is_read = false
            ) AS unread_count

        FROM conversations c

        INNER JOIN conversation_participants my_participant
            ON my_participant.conversation_id = c.id
           AND my_participant.user_id = $1

        INNER JOIN conversation_participants other_participant
            ON other_participant.conversation_id = c.id
           AND other_participant.user_id != $1

        INNER JOIN users other_user
            ON other_user.id = other_participant.user_id

        LEFT JOIN LATERAL (
            SELECT
                m.id,
                m.sender_id,
                m.content,
                m.is_read,
                m.created_at
            FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT 1
        ) last_message ON true

        ORDER BY c.updated_at DESC, c.id DESC
        LIMIT $2
        OFFSET $3
    `;

    const result = await pool.query(query, [
        user_id,
        limit + 1,
        offset
    ]);

    const rawConversations = result.rows;
    const has_more = rawConversations.length > limit;
    const selectedConversations = rawConversations.slice(0, limit);

    const items = selectedConversations.map((conversation) => {
        return {
            conversation_id: conversation.conversation_id,
            other_user: {
                id: conversation.other_user_id,
                full_name: conversation.other_user_full_name,
                username: conversation.other_user_username,
                profile_image_url: conversation.other_user_profile_image_url
            },
            last_message: conversation.last_message_id
                ? {
                    id: conversation.last_message_id,
                    sender_id: conversation.last_message_sender_id,
                    content: conversation.last_message_content,
                    is_read: conversation.last_message_is_read,
                    created_at: conversation.last_message_created_at
                }
                : null,
            unread_count: Number(conversation.unread_count),
            updated_at: conversation.updated_at
        };
    });

    return {
        items,
        pagination: {
            limit,
            offset,
            count: items.length,
            has_more,
            next_offset: has_more ? offset + limit : null
        }
    };
}

async function getMessagesByConversationService(
    current_user_id,
    conversation_id,
    limit = 20,
    offset = 0
) {
    current_user_id = Number(current_user_id);
    conversation_id = Number(conversation_id);
    limit = Number(limit);
    offset = Number(offset);

    if (!Number.isInteger(current_user_id) || current_user_id < 1) {
        throw new Error("Geçersiz current_user_id.");
    }

    if (!Number.isInteger(conversation_id) || conversation_id < 1) {
        throw new Error("Geçersiz conversation_id.");
    }

    if (!Number.isInteger(limit) || limit < 1) {
        throw new Error("Geçersiz limit.");
    }

    if (!Number.isInteger(offset) || offset < 0) {
        throw new Error("Geçersiz offset.");
    }

    const participantQuery = `
        SELECT 1
        FROM conversation_participants
        WHERE conversation_id = $1
          AND user_id = $2
    `;

    const participantResult = await pool.query(participantQuery, [
        conversation_id,
        current_user_id
    ]);

    if (participantResult.rows.length === 0) {
        throw new Error("Konuşma bulunamadı.");
    }

    const otherUserQuery = `
        SELECT
            u.id,
            u.full_name,
            u.username,
            u.profile_image_url
        FROM conversation_participants cp
        INNER JOIN users u
            ON u.id = cp.user_id
        WHERE cp.conversation_id = $1
          AND cp.user_id != $2
        LIMIT 1
    `;

    const otherUserResult = await pool.query(otherUserQuery, [
        conversation_id,
        current_user_id
    ]);

    if (otherUserResult.rows.length === 0) {
        throw new Error("Konuşmadaki diğer kullanıcı bulunamadı.");
    }

    const otherUser = otherUserResult.rows[0];

    const messagesQuery = `
        SELECT
            id,
            conversation_id,
            sender_id,
            content,
            is_read,
            created_at
        FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT $2
        OFFSET $3
    `;

    const messagesResult = await pool.query(messagesQuery, [
        conversation_id,
        limit + 1,
        offset
    ]);

    const rawMessages = messagesResult.rows;
    const has_more = rawMessages.length > limit;
    const selectedMessages = rawMessages.slice(0, limit);

    const items = selectedMessages.map((message) => {
        return {
            id: message.id,
            conversation_id: message.conversation_id,
            sender_id: message.sender_id,
            content: message.content,
            is_read: message.is_read,
            created_at: message.created_at
        };
    });

    return {
        conversation: {
            id: conversation_id,
            other_user: {
                id: otherUser.id,
                full_name: otherUser.full_name,
                username: otherUser.username,
                profile_image_url: otherUser.profile_image_url
            }
        },
        items,
        pagination: {
            limit,
            offset,
            count: items.length,
            has_more,
            next_offset: has_more ? offset + limit : null
        }
    };
}

async function markConversationMessagesAsReadService(current_user_id, conversation_id) {
    current_user_id = Number(current_user_id);
    conversation_id = Number(conversation_id);

    if (!Number.isInteger(current_user_id) || current_user_id < 1) {
        throw new Error("Geçersiz current_user_id.");
    }

    if (!Number.isInteger(conversation_id) || conversation_id < 1) {
        throw new Error("Geçersiz conversation_id.");
    }

    const participantQuery = `
        SELECT 1
        FROM conversation_participants
        WHERE conversation_id = $1
          AND user_id = $2
    `;

    const participantResult = await pool.query(participantQuery, [
        conversation_id,
        current_user_id
    ]);

    if (participantResult.rows.length === 0) {
        throw new Error("Konuşma bulunamadı.");
    }

    const markAsReadQuery = `
        UPDATE messages
        SET is_read = TRUE
        WHERE conversation_id = $1
          AND sender_id != $2
          AND is_read = FALSE
        RETURNING id
    `;

    const markAsReadResult = await pool.query(markAsReadQuery, [
        conversation_id,
        current_user_id
    ]);

    return {
        conversation_id,
        is_read: true,
        updated_count: markAsReadResult.rows.length
    };
}

async function getUnreadMessagesCountService(current_user_id) {
    current_user_id = Number(current_user_id);

    if (!Number.isInteger(current_user_id) || current_user_id < 1) {
        throw new Error("Geçersiz current_user_id.");
    }

    const query = `
        SELECT COUNT(*) AS unread_count
        FROM messages m
        INNER JOIN conversation_participants cp
            ON cp.conversation_id = m.conversation_id
        WHERE cp.user_id = $1
          AND m.sender_id != $1
          AND m.is_read = false
    `;

    const result = await pool.query(query, [current_user_id]);

    return {
        unread_count: Number(result.rows[0].unread_count)
    };
}

module.exports = {
    sendMessageService,
    getMyConversationsService,
    getMessagesByConversationService,
    markConversationMessagesAsReadService,
    getUnreadMessagesCountService
};
