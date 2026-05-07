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
    profile_user_id = Number(profile_user_id);

    if (current_user_id !== null && current_user_id !== undefined) {
        current_user_id = Number(current_user_id);
    } else {
        current_user_id = null;
    }

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
        SELECT
            id,
            full_name,
            username,
            bio,
            profile_image_url,
            banner_image_url,
            created_at,
            updated_at
        FROM users
        WHERE id = $1
    `;

    const profileUserResult = await pool.query(profileUserQuery, [
        profile_user_id
    ]);

    if (profileUserResult.rows.length === 0) {
        throw new Error("Kullanıcı bulunamadı.");
    }

    const profileUser = profileUserResult.rows[0];

    const postsCountQuery = `
        SELECT COUNT(*) AS count
        FROM entries
        WHERE user_id = $1
          AND type IN ('POST', 'REPOST', 'QUOTE')
          AND is_deleted = false
    `;

    const postsCountResult = await pool.query(postsCountQuery, [
        profile_user_id
    ]);

    const postsCount = Number(postsCountResult.rows[0].count);

    const followersCountQuery = `
        SELECT COUNT(*) AS count
        FROM user_follows
        WHERE following_id = $1
    `;

    const followersCountResult = await pool.query(followersCountQuery, [
        profile_user_id
    ]);

    const followersCount = Number(followersCountResult.rows[0].count);

    const followingCountQuery = `
        SELECT COUNT(*) AS count
        FROM user_follows
        WHERE follower_id = $1
    `;

    const followingCountResult = await pool.query(followingCountQuery, [
        profile_user_id
    ]);

    const followingCount = Number(followingCountResult.rows[0].count);

    const is_me =
        current_user_id !== null &&
        current_user_id === profile_user_id;

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
        stats: {
            posts_count: postsCount,
            followers_count: followersCount,
            following_count: followingCount
        },
        viewer_state: {
            is_me,
            is_following
        }
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
          AND is_deleted = false
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
          AND is_deleted = false
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
        SELECT el.*
        FROM entry_likes el
        INNER JOIN entries e
            ON el.entry_id = e.id
        WHERE el.user_id = $1
          AND e.is_deleted = false
        ORDER BY el.id DESC
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

async function updateMyProfileService({
    user_id,
    full_name,
    bio,
    profile_image_url,
    banner_image_url
}) {
    user_id = Number(user_id);

    if (!Number.isInteger(user_id) || user_id < 1) {
        throw new Error("Geçersiz user_id.");
    }

    const hasAtLeastOneField =
        full_name !== undefined ||
        bio !== undefined ||
        profile_image_url !== undefined ||
        banner_image_url;

    if (!hasAtLeastOneField) {
        throw new Error("Güncellenecek en az bir alan gönderilmelidir.");
    }

    const fields = [];
    const values = [];

    if (full_name !== undefined) {
        const normalizedFullName = String(full_name).trim();

        if (normalizedFullName === "") {
            throw new Error("full_name boş olamaz.");
        }

        if (normalizedFullName.length > 100) {
            throw new Error("full_name 100 karakterden uzun olamaz.");
        }

        values.push(normalizedFullName);
        fields.push(`full_name = $${values.length}`);
    }

    if (bio !== undefined) {
        let normalizedBio = String(bio).trim();

        if (normalizedBio === "") {
            normalizedBio = null;
        }

        if (normalizedBio !== null && normalizedBio.length > 250) {
            throw new Error("bio 250 karakterden uzun olamaz.");
        }

        values.push(normalizedBio);
        fields.push(`bio = $${values.length}`);
    }

    if (profile_image_url !== undefined) {
        let normalizedProfileImageUrl = String(profile_image_url).trim();

        if (normalizedProfileImageUrl === "") {
            normalizedProfileImageUrl = null;
        }

        values.push(normalizedProfileImageUrl);
        fields.push(`profile_image_url = $${values.length}`);
    }

    if(banner_image_url !== undefined) {
        let normalizedBannerImageUrl = String(banner_image_url).trim();

        if (normalizedBannerImageUrl === "") {
            normalizedBannerImageUrl = null;
        }

        values.push(normalizedBannerImageUrl);
        fields.push(`banner_image_url = $${values.length}`);
    }

    values.push(user_id);

    const query = `
        UPDATE users
        SET
            ${fields.join(", ")},
            updated_at = NOW()
        WHERE id = $${values.length}
        RETURNING
            id,
            full_name,
            username,
            email,
            bio,
            profile_image_url,
            banner_image_url,
            created_at,
            updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        throw new Error("Kullanıcı bulunamadı.");
    }

    return result.rows[0];
}

async function getUserFollowersService(
    profile_user_id,
    current_user_id = null,
    limit = 10,
    offset = 0
) {
    profile_user_id = Number(profile_user_id);

    if (current_user_id !== null && current_user_id !== undefined) {
        current_user_id = Number(current_user_id);
    } else {
        current_user_id = null;
    }

    limit = Number(limit);
    offset = Number(offset);

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

    const profileUserResult = await pool.query(profileUserQuery, [
        profile_user_id
    ]);

    if (profileUserResult.rows.length === 0) {
        throw new Error("Kullanıcı bulunamadı.");
    }

    const followersListQuery = `
        SELECT
            u.id,
            u.full_name,
            u.username,
            u.profile_image_url,
            uf.created_at AS followed_at
        FROM user_follows uf
        INNER JOIN users u
            ON uf.follower_id = u.id
        WHERE uf.following_id = $1
        ORDER BY uf.created_at DESC
        LIMIT $2
        OFFSET $3
    `;

    const followersListResult = await pool.query(followersListQuery, [
        profile_user_id,
        limit + 1,
        offset
    ]);

    const selectedFollowers =
        followersListResult.rows.length > limit
            ? followersListResult.rows.slice(0, limit)
            : followersListResult.rows;

    const followerIds = selectedFollowers.map((follower) => follower.id);

    let followingSet = new Set();

    if (current_user_id !== null && followerIds.length > 0) {
        const followingQuery = `
            SELECT following_id
            FROM user_follows
            WHERE follower_id = $1
              AND following_id = ANY($2::bigint[])
        `;

        const followingResult = await pool.query(followingQuery, [
            current_user_id,
            followerIds
        ]);

        followingSet = new Set(
            followingResult.rows.map((row) => String(row.following_id))
        );
    }

    const items = selectedFollowers.map((follower) => {
        return {
            id: follower.id,
            full_name: follower.full_name,
            username: follower.username,
            profile_image_url: follower.profile_image_url,
            followed_at: follower.followed_at,
            is_me:
                current_user_id !== null &&
                Number(follower.id) === current_user_id,
            is_following: followingSet.has(String(follower.id))
        };
    });

    const pagination = buildPaginationMeta(
        limit,
        offset,
        followersListResult.rows.length,
        items.length
    );

    return {
        items,
        pagination
    };
}

async function getUserFollowingService(
    profile_user_id,
    current_user_id = null,
    limit = 10,
    offset = 0
) {
    profile_user_id = Number(profile_user_id);

    if (current_user_id !== null && current_user_id !== undefined) {
        current_user_id = Number(current_user_id);
    } else {
        current_user_id = null;
    }

    limit = Number(limit);
    offset = Number(offset);

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

    const profileUserResult = await pool.query(profileUserQuery, [
        profile_user_id
    ]);

    if (profileUserResult.rows.length === 0) {
        throw new Error("Kullanıcı bulunamadı.");
    }

    const followingListQuery = `
        SELECT
            u.id,
            u.full_name,
            u.username,
            u.profile_image_url,
            uf.created_at AS followed_at
        FROM user_follows uf
        INNER JOIN users u
            ON uf.following_id = u.id
        WHERE uf.follower_id = $1
        ORDER BY uf.created_at DESC
        LIMIT $2
        OFFSET $3
    `;

    const followingListResult = await pool.query(followingListQuery, [
        profile_user_id,
        limit + 1,
        offset
    ]);

    const selectedFollowing =
        followingListResult.rows.length > limit
            ? followingListResult.rows.slice(0, limit)
            : followingListResult.rows;

    const followingIds = selectedFollowing.map((user) => user.id);

    let viewerFollowingSet = new Set();

    if (current_user_id !== null && followingIds.length > 0) {
        const viewerFollowingQuery = `
            SELECT following_id
            FROM user_follows
            WHERE follower_id = $1
              AND following_id = ANY($2::bigint[])
        `;

        const viewerFollowingResult = await pool.query(viewerFollowingQuery, [
            current_user_id,
            followingIds
        ]);

        viewerFollowingSet = new Set(
            viewerFollowingResult.rows.map((row) => String(row.following_id))
        );
    }

    const items = selectedFollowing.map((user) => {
        return {
            id: user.id,
            full_name: user.full_name,
            username: user.username,
            profile_image_url: user.profile_image_url,
            followed_at: user.followed_at,
            is_me:
                current_user_id !== null &&
                Number(user.id) === current_user_id,
            is_following: viewerFollowingSet.has(String(user.id))
        };
    });

    const pagination = buildPaginationMeta(
        limit,
        offset,
        followingListResult.rows.length,
        items.length
    );

    return {
        items,
        pagination
    };
}

async function getUserMediaService(
    profile_user_id,
    current_user_id = null,
    limit = 10,
    offset = 0
) {
    profile_user_id = Number(profile_user_id);

    if (current_user_id !== null && current_user_id !== undefined) {
        current_user_id = Number(current_user_id);
    } else {
        current_user_id = null;
    }

    limit = Number(limit);
    offset = Number(offset);

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

    const profileUserResult = await pool.query(profileUserQuery, [
        profile_user_id
    ]);

    if (profileUserResult.rows.length === 0) {
        throw new Error("Kullanıcı bulunamadı.");
    }

    const mediaEntriesQuery = `
        SELECT DISTINCT e.*
        FROM entries e
        INNER JOIN entry_media em
            ON em.entry_id = e.id
        WHERE e.user_id = $1
          AND e.is_deleted = false
          AND e.type IN ('POST', 'COMMENT', 'QUOTE')
        ORDER BY e.created_at DESC, e.id DESC
        LIMIT $2
        OFFSET $3
    `;

    const mediaEntriesResult = await pool.query(mediaEntriesQuery, [
        profile_user_id,
        limit + 1,
        offset
    ]);

    const selectedEntries =
        mediaEntriesResult.rows.length > limit
            ? mediaEntriesResult.rows.slice(0, limit)
            : mediaEntriesResult.rows;

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
        mediaEntriesResult.rows.length,
        hydratedEntries.length
    );

    return {
        items: hydratedEntries,
        pagination
    };
}


module.exports = {
    toggleFollowService,
    getUserProfileService,
    getUserPostsService,
    getUserRepliesService,
    getUserLikesService,
    updateMyProfileService,
    getUserFollowersService,
    getUserFollowingService,
    getUserMediaService
};