const pool = require("../config/db");

const VALID_NOTIFICATION_TYPES = [
    "FOLLOW",
    "LIKE",
    "COMMENT",
    "REPOST",
    "QUOTE"
];

async function createNotificationService({
    receiver_user_id,
    actor_user_id,
    type,
    entry_id = null
}) {
    receiver_user_id = Number(receiver_user_id);
    actor_user_id = Number(actor_user_id);

    if (entry_id !== null) {
        entry_id = Number(entry_id);
    }

    if (!Number.isInteger(receiver_user_id) || receiver_user_id < 1) {
        throw new Error("Geçersiz receiver_user_id.");
    }

    if (!Number.isInteger(actor_user_id) || actor_user_id < 1) {
        throw new Error("Geçersiz actor_user_id.");
    }

    if (receiver_user_id === actor_user_id) {
        return null;
    }

    if (!VALID_NOTIFICATION_TYPES.includes(type)) {
        throw new Error("Geçersiz notification type.");
    }

    const query = `
        INSERT INTO notifications (
            receiver_user_id,
            actor_user_id,
            type,
            entry_id
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;

    const result = await pool.query(query, [
        receiver_user_id,
        actor_user_id,
        type,
        entry_id
    ]);

    return result.rows[0];
}

async function getNotificationsService(user_id, limit = 10, offset = 0) {
    user_id = Number(user_id);

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
            n.id,
            n.type,
            n.entry_id,
            n.is_read,
            n.created_at,
            actor.id AS actor_id,
            actor.full_name AS actor_full_name,
            actor.username AS actor_username,
            actor.profile_image_url AS actor_profile_image_url
        FROM notifications n
        INNER JOIN users actor
            ON n.actor_user_id = actor.id
        WHERE n.receiver_user_id = $1
        ORDER BY n.created_at DESC, n.id DESC
        LIMIT $2
        OFFSET $3
    `;

    const result = await pool.query(query, [
        user_id,
        limit + 1,
        offset
    ]);

    const rawNotifications = result.rows;
    const has_more = rawNotifications.length > limit;
    const selectedNotifications = rawNotifications.slice(0, limit);

    const items = selectedNotifications.map((notification) => {
        return {
            id: notification.id,
            type: notification.type,
            entry_id: notification.entry_id,
            is_read: notification.is_read,
            created_at: notification.created_at,
            actor: {
                id: notification.actor_id,
                full_name: notification.actor_full_name,
                username: notification.actor_username,
                profile_image_url: notification.actor_profile_image_url
            }
        };
    });

    return {
        items,
        pagination: {
            limit,
            offset,
            has_more,
            next_offset: has_more ? offset + limit : null
        }
    };
}

async function markNotificationAsReadService(user_id, notification_id) {
    user_id = Number(user_id);
    notification_id = Number(notification_id);

    if (!Number.isInteger(user_id) || user_id < 1) {
        throw new Error("Geçersiz user_id.");
    }

    if (!Number.isInteger(notification_id) || notification_id < 1) {
        throw new Error("Geçersiz notification_id.");
    }

    const query = `
        UPDATE notifications
        SET is_read = TRUE
        WHERE id = $1
          AND receiver_user_id = $2
        RETURNING *
    `;

    const result = await pool.query(query, [
        notification_id,
        user_id
    ]);

    if (result.rows.length === 0) {
        throw new Error("Bildirim bulunamadı.");
    }

    return result.rows[0];
}

async function markAllNotificationsAsReadService(user_id) {
    user_id = Number(user_id);

    if (!Number.isInteger(user_id) || user_id < 1) {
        throw new Error("Geçersiz user_id.");
    }

    const query = `
        UPDATE notifications
        SET is_read = TRUE
        WHERE receiver_user_id = $1
          AND is_read = FALSE
    `;

    await pool.query(query, [user_id]);

    return {
        is_read: true
    };
}

async function getUnreadNotificationsCountService(user_id) {
    user_id = Number(user_id);

    if (!Number.isInteger(user_id) || user_id < 1) {
        throw new Error("Geçersiz user_id.");
    }

    const query = `
        SELECT COUNT(*) AS count
        FROM notifications
        WHERE receiver_user_id = $1
          AND is_read = FALSE
    `;

    const result = await pool.query(query, [user_id]);

    return {
        unread_count: Number(result.rows[0].count)
    };
}

module.exports = {
    createNotificationService,
    getNotificationsService,
    markNotificationAsReadService,
    markAllNotificationsAsReadService,
    getUnreadNotificationsCountService
};