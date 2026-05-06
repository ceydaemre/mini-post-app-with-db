const pool = require("../config/db");
const {
    hydrateTimelineEntryCardByEntryIdService
} = require("./entryService");

async function searchUsersService(q, current_user_id = null, limit = 10, offset = 0) {
    if(!q || String(q).trim() === "") {
        throw new Error("Arama parametressi zorunludur.");
    }

    const searchTerm = String(q).trim();

    if(current_user_id !== null && current_user_id < 1) {
        throw new Error("Geçersiz current_user_id");
    }

    if(limit < 1) {
        throw new Error("Geçersiz limit.");
    }

    if(offset < 0) {
        throw new Error("Geçersiz offset.");
    }

    const query = `
        SELECT id, full_name, username, profile_image_url
        FROM users
        WHERE username ILIKE '%' || $1 || '%'
            OR full_name ILIKE '%' || $1 || '%'
        ORDER BY username ASC
        LIMIT $2
        OFFSET $3   
    `;

        const result = await pool.query(query, [searchTerm, limit + 1, offset]);

    const rawUsers = result.rows;
    const has_more = rawUsers.length > limit;
    const selectedUsers = rawUsers.slice(0, limit);

    const userIds = selectedUsers.map((user) => user.id);

    let followingSet = new Set();

    if (current_user_id !== null && userIds.length > 0) {
        const followingQuery = `
            SELECT following_id
            FROM user_follows
            WHERE follower_id = $1
              AND following_id = ANY($2::bigint[])
        `;

        const followingResult = await pool.query(followingQuery, [
            current_user_id,
            userIds
        ]);

        followingSet = new Set(
            followingResult.rows.map((row) => row.following_id)
        );
    }

    const items = selectedUsers.map((user) => {
        const is_me = current_user_id !== null && Number(user.id) === current_user_id;

        return {
            id: user.id,
            full_name: user.full_name,
            username: user.username,
            profile_image_url: user.profile_image_url,
            is_me,
            is_following: !is_me && followingSet.has(user.id)
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

async function searchEntriesService(q, current_user_id = null, limit = 10, offset = 0) {
    if (!q || String(q).trim() === "") {
        throw new Error("Arama parametresi zorunludur.");
    }

    const searchTerm = String(q).trim();

    if (
        current_user_id !== null &&
        (!Number.isInteger(current_user_id) || current_user_id < 1)
    ) {
        throw new Error("Geçersiz current_user_id.");
    }

    if (!Number.isInteger(limit) || limit < 1) {
        throw new Error("Geçersiz limit.");
    }

    if (!Number.isInteger(offset) || offset < 0) {
        throw new Error("Geçersiz offset.");
    }

    const query = `
        SELECT id
        FROM entries
        WHERE content ILIKE '%' || $1 || '%'
          AND is_deleted = false
        ORDER BY created_at DESC, id DESC
        LIMIT $2
        OFFSET $3
    `;

    const result = await pool.query(query, [
        searchTerm,
        limit + 1,
        offset
    ]);

    const rawEntries = result.rows;
    const has_more = rawEntries.length > limit;
    const selectedEntries = rawEntries.slice(0, limit);

    const hydratedEntries = await Promise.all(
        selectedEntries.map(async (entry) => {
            return await hydrateTimelineEntryCardByEntryIdService(
                entry.id,
                current_user_id
            );
        })
    );

    return {
        items: hydratedEntries,
        pagination: {
            limit,
            offset,
            has_more,
            next_offset: has_more ? offset + limit : null
        }
    };
}

module.exports = {
    searchUsersService,
    searchEntriesService
};