const pool = require("../config/db");
const {
    hydrateTimelineEntryCardByEntryIdService
} = require("./entryService");
const {
    buildPaginationMeta
} = require("./helpers/pagination");
const {
    createNotificationService
} = require("./notificationsService");

async function toggleFollowService(follower_id, following_id) {
    follower_id = Number(follower_id);
    following_id = Number(following_id);

    if (!Number.isInteger(follower_id) || follower_id < 1) {
        throw new Error("Geçersiz follower_id.");
    }

    if (!Number.isInteger(following_id) || following_id < 1) {
        throw new Error("Geçersiz following_id.");
    }

    if (follower_id === following_id) {
        throw new Error("Kullanıcı kendi kendini takip edemez.");
    }

    const followedQuery = `
        SELECT 1
        FROM users
        WHERE id = $1
    `;

    const followedResult = await pool.query(followedQuery, [following_id]);

    if (followedResult.rows.length === 0) {
        throw new Error("Kullanıcı bulunamadı.");
    }

    const isFollowedQuery = `
        SELECT 1
        FROM user_follows
        WHERE follower_id = $1
          AND following_id = $2
    `;

    const isFollowedResult = await pool.query(isFollowedQuery, [
        follower_id,
        following_id
    ]);

    if (isFollowedResult.rows.length > 0) {
        const deleteFollowerQuery = `
            DELETE FROM user_follows
            WHERE follower_id = $1
              AND following_id = $2
        `;

        await pool.query(deleteFollowerQuery, [follower_id, following_id]);

        return {
            following_id,
            is_following: false
        };
    }

    const followUserQuery = `
        INSERT INTO user_follows (follower_id, following_id)
        VALUES ($1, $2)
    `;

    await pool.query(followUserQuery, [follower_id, following_id]);

    await createNotificationService({
        receiver_user_id: Number(following_id),
        actor_user_id: Number(follower_id),
        type: "FOLLOW",
        entry_id: null
    });

    return {
        following_id,
        is_following: true
    };
}
async function getUserProfileService(profile_user_id, current_user_id = null) {
    if (!Number.isInteger(profile_user_id) || profile_user_id < 1) {
        throw new Error("Geçersiz profile_user_id.");
    }

    if (
        current_user_id !== null &&
        (!Number.isInteger(current_user_id) || current_user_id < 1)
    ) {
        throw new Error("Geçersiz current_user_id.");
    }

    const profileUserQuery = `
        SELECT id, full_name, username, bio, profile_image_url, created_at
        FROM users
        WHERE id = $1
    `;

    const profileUserResult = await pool.query(profileUserQuery, [profile_user_id]);

    if (profileUserResult.rows.length === 0) {
        throw new Error("Kullanıcı bulunamadı.");
    }

    const profileUser = profileUserResult.rows[0];

    const userFollowingsQuery = `
        SELECT COUNT(*) AS count
        FROM user_follows
        WHERE follower_id = $1
    `;

    const userFollowingsResult = await pool.query(userFollowingsQuery, [profile_user_id]);
    const userFollowings = Number(userFollowingsResult.rows[0].count);

    const userFollowersQuery = `
        SELECT COUNT(*) AS count
        FROM user_follows
        WHERE following_id = $1
    `;

    const userFollowersResult = await pool.query(userFollowersQuery, [profile_user_id]);
    const userFollowers = Number(userFollowersResult.rows[0].count);

    const is_me =
        current_user_id !== null && current_user_id === profile_user_id;

    let is_following = false;

    if (!is_me && current_user_id !== null) {
        const isFollowingQuery = `
            SELECT 1
            FROM user_follows
            WHERE follower_id = $1
              AND following_id = $2
        `;

        const isFollowingResult = await pool.query(isFollowingQuery, [
            current_user_id,
            profile_user_id
        ]);

        is_following = isFollowingResult.rows.length > 0;
    }

    return {
        profile_user: profileUser,
        followers_count: userFollowers,
        following_count: userFollowings,
        is_following,
        is_me
    };
}

async function getUserPostsService(profile_user_id, current_user_id = null, limit = 10, offset = 0) {
    if (!Number.isInteger(profile_user_id) || profile_user_id < 1) {
        throw new Error("Geçersiz profile_user_id.");
    }

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

    const profileUserQuery = `
        SELECT 1
        FROM users
        WHERE id = $1
    `;

    const profileUserResult = await pool.query(profileUserQuery, [profile_user_id]);

    if (profileUserResult.rows.length === 0) {
        throw new Error("Kullanıcı bulunamadı.");
    }

    const entriesQuery = `
        SELECT *
        FROM entries
        WHERE user_id = $1
          AND type IN ('POST', 'REPOST', 'QUOTE')
        ORDER BY created_at DESC
        LIMIT $2
        OFFSET $3
    `;

    const rawEntriesResult = await pool.query(entriesQuery, [
        profile_user_id,
        limit + 1,
        offset
    ]);

    const selectedEntries =
        rawEntriesResult.rows.length > limit
            ? rawEntriesResult.rows.slice(0, limit)
            : rawEntriesResult.rows;

    const hydratedEntries = await Promise.all(
        selectedEntries.map(async (entry) => {
            return await hydrateTimelineEntryCardByEntryIdService(
                entry.id,
                current_user_id
            );
        })
    );

    const pagination = buildPaginationMeta(
        limit,
        offset,
        rawEntriesResult.rows.length,
        hydratedEntries.length
    );

    return {
        items: hydratedEntries,
        pagination
    };
}

async function getUserRepliesService(profile_user_id, current_user_id = null, limit = 10, offset = 0) {
    if (!Number.isInteger(profile_user_id) || profile_user_id < 1) {
        throw new Error("Geçersiz profile_user_id.");
    }

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

    const profileUserQuery = `
        SELECT 1
        FROM users
        WHERE id = $1
    `;

    const profileUserResult = await pool.query(profileUserQuery, [profile_user_id]);

    if (profileUserResult.rows.length === 0) {
        throw new Error("Kullanıcı bulunamadı.");
    }

    const repliesQuery = `
        SELECT *
        FROM entries
        WHERE user_id = $1
          AND type = 'COMMENT'
        ORDER BY created_at DESC
        LIMIT $2
        OFFSET $3
    `;

    const rawRepliesResult = await pool.query(repliesQuery, [
        profile_user_id,
        limit + 1,
        offset
    ]);

    const selectedReplies =
        rawRepliesResult.rows.length > limit
            ? rawRepliesResult.rows.slice(0, limit)
            : rawRepliesResult.rows;

    const hydratedReplies = await Promise.all(
        selectedReplies.map(async (reply) => {
            return await hydrateTimelineEntryCardByEntryIdService(
                reply.id,
                current_user_id
            );
        })
    );

    const pagination = buildPaginationMeta(
        limit,
        offset,
        rawRepliesResult.rows.length,
        hydratedReplies.length
    );

    return {
        items: hydratedReplies,
        pagination
    };
}

async function getUserLikesService(profile_user_id, current_user_id, limit = 10, offset = 0) {
    if (!Number.isInteger(profile_user_id) || profile_user_id < 1) {
        throw new Error("Geçersiz profile_user_id.");
    }

    if (!Number.isInteger(current_user_id) || current_user_id < 1) {
        throw new Error("Geçersiz current_user_id.");
    }

    if (!Number.isInteger(limit) || limit < 1) {
        throw new Error("Geçersiz limit.");
    }

    if (!Number.isInteger(offset) || offset < 0) {
        throw new Error("Geçersiz offset.");
    }

    const findUserQuery = `
        SELECT 1
        FROM users
        WHERE id = $1
    `;

    const findUserResult = await pool.query(findUserQuery, [profile_user_id]);

    if (findUserResult.rows.length === 0) {
        throw new Error("Kullanıcı bulunamadı.");
    }

    const userLikesQuery = `
        SELECT *
        FROM entry_likes
        WHERE user_id = $1
        ORDER BY id DESC
        LIMIT $2
        OFFSET $3
    `;

    const rawLikesResult = await pool.query(userLikesQuery, [
        profile_user_id,
        limit + 1,
        offset
    ]);

    const selectedLikes =
        rawLikesResult.rows.length > limit
            ? rawLikesResult.rows.slice(0, limit)
            : rawLikesResult.rows;

    const hydratedLikes = await Promise.all(
        selectedLikes.map(async (like) => {
            return await hydrateTimelineEntryCardByEntryIdService(
                like.entry_id,
                current_user_id
            );
        })
    );

    const pagination = buildPaginationMeta(
        limit,
        offset,
        rawLikesResult.rows.length,
        hydratedLikes.length
    );

    return {
        items: hydratedLikes,
        pagination
    };
}

async function getUserLikesService(profile_user_id, current_user_id, limit = 10, offset = 0) {
    if (!Number.isInteger(profile_user_id) || profile_user_id < 1) {
        throw new Error("Geçersiz profile_user_id.");
    }

    if (!Number.isInteger(current_user_id) || current_user_id < 1) {
        throw new Error("Geçersiz current_user_id.");
    }

    if (!Number.isInteger(limit) || limit < 1) {
        throw new Error("Geçersiz limit.");
    }

    if (!Number.isInteger(offset) || offset < 0) {
        throw new Error("Geçersiz offset.");
    }

    const profileUserQuery = `
        SELECT 1
        FROM users
        WHERE id = $1
    `;

    const profileUserResult = await pool.query(profileUserQuery, [profile_user_id]);

    if (profileUserResult.rows.length === 0) {
        throw new Error("Kullanıcı bulunamadı.");
    }

    const userLikesQuery = `
        SELECT entry_id
        FROM entry_likes
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        OFFSET $3
    `;

    const rawLikesResult = await pool.query(userLikesQuery, [
        profile_user_id,
        limit + 1,
        offset
    ]);

    const rawLikes = rawLikesResult.rows;

    const selectedLikes = rawLikes.slice(0, limit);

    const hydratedLikes = await Promise.all(
        selectedLikes.map(async (like) => {
            return await hydrateTimelineEntryCardByEntryIdService(
                like.entry_id,
                current_user_id
            );
        })
    );

    const pagination = buildPaginationMeta(
        limit,
        offset,
        rawLikes.length,
        hydratedLikes.length
    );

    return {
        items: hydratedLikes,
        pagination
    };
}

module.exports = {
    toggleFollowService,
    getUserProfileService,
    getUserPostsService,
    getUserRepliesService,
    getUserLikesService
};