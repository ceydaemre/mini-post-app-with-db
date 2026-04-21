const pool = require("../config/db");

const {
    buildCardHeader,
    buildRepostInfo,
} = require("./helpers/entryBuilders");

const {
    getOriginalEntry,
} = require("./helpers/entryQueries");

const { 
    buildPaginationMeta,
    buildCursorPaginationMeta
} = require("./helpers/pagination");

const VALID_ENTRY_TYPES = ["POST", "COMMENT", "REPOST", "QUOTE"];

async function createEntryService({
    user_id,
    type,
    content,
    parent_entry_id,
    original_entry_id,
}) {
    if (!user_id) {
        throw new Error("user_id zorunludur.");
    }

    if (!type) {
        throw new Error("type zorunludur.");
    }

    if (!VALID_ENTRY_TYPES.includes(type)) {
        throw new Error("Geçersiz entry type.");
    }

    const has_content =
        content !== null &&
        content !== undefined &&
        String(content).trim() !== "";

    if (type === "POST") {
        if (parent_entry_id !== null || original_entry_id !== null) {
            throw new Error("POST için parent_entry_id ve original_entry_id null olmalıdır.");
        }

        if (!has_content) {
            throw new Error("POST için şimdilik content zorunludur.");
        }
    }

    if (type === "COMMENT") {
        if (parent_entry_id === null || parent_entry_id === undefined) {
            throw new Error("COMMENT için parent_entry_id zorunludur.");
        }

        if (original_entry_id !== null) {
            throw new Error("COMMENT için original_entry_id null olmalıdır.");
        }

        if (!has_content) {
            throw new Error("COMMENT için şimdilik content zorunludur.");
        }
    }

    if (type === "REPOST") {
        if (parent_entry_id !== null) {
            throw new Error("REPOST için parent_entry_id null olmalıdır.");
        }

        if (original_entry_id === null || original_entry_id === undefined) {
            throw new Error("REPOST için original_entry_id zorunludur.");
        }

        if (has_content) {
            throw new Error("REPOST için content boş olmalıdır.");
        }
    }

    if (type === "QUOTE") {
        if (parent_entry_id !== null) {
            throw new Error("QUOTE için parent_entry_id null olmalıdır.");
        }

        if (original_entry_id === null || original_entry_id === undefined) {
            throw new Error("QUOTE için original_entry_id zorunludur.");
        }

        if (!has_content) {
            throw new Error("QUOTE için şimdilik content zorunludur.");
        }
    }

    const query = `
        INSERT INTO entries (user_id, type, content, parent_entry_id, original_entry_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;

    const values = [
        user_id,
        type,
        content ?? null,
        parent_entry_id ?? null,
        original_entry_id ?? null,
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
}

async function getEntryDetailByEntryIdService(entry_id, current_user_id = null) {
    const selectedEntryQuery = `
        SELECT *
        FROM entries
        WHERE id = $1
    `;

    const selectedEntryResult = await pool.query(selectedEntryQuery, [entry_id]);

    if (selectedEntryResult.rows.length === 0) {
        throw new Error("Entry bulunamadı.");
    }

    const selectedEntry = selectedEntryResult.rows[0];

    if (selectedEntry.type === "POST") {
        const hydratedEntry = await hydrateEntryCardByEntryIdService(selectedEntry.id, current_user_id);

        const childrenQuery = `
            SELECT *
            FROM entries
            WHERE parent_entry_id = $1
            ORDER BY created_at ASC
        `;

        const childrenResult = await pool.query(childrenQuery, [selectedEntry.id]);

        const hydratedChildren = await Promise.all(
            childrenResult.rows.map(async (child) => {
                return await hydrateEntryCardByEntryIdService(child.id, current_user_id);
            })
        );

        return {
            entry_type: selectedEntry.type,
            entry: hydratedEntry,
            children: hydratedChildren,
        };
    }

    if (selectedEntry.type === "COMMENT") {
        const hydratedEntry = await hydrateEntryCardByEntryIdService(selectedEntry.id, current_user_id);

        const childrenQuery = `
            SELECT *
            FROM entries
            WHERE parent_entry_id = $1
            ORDER BY created_at ASC
        `;

        const childrenResult = await pool.query(childrenQuery, [selectedEntry.id]);

        let currentEntry = selectedEntry;

        while (currentEntry.parent_entry_id !== null) {
            const parentQuery = `
                SELECT *
                FROM entries
                WHERE id = $1
            `;

            const parentResult = await pool.query(parentQuery, [currentEntry.parent_entry_id]);

            if (parentResult.rows.length === 0) {
                break;
            }

            currentEntry = parentResult.rows[0];
        }

        const rootContext = currentEntry;
        const hydratedRootContext = await hydrateEntryCardByEntryIdService(rootContext.id, current_user_id);

        const hydratedChildren = await Promise.all(
            childrenResult.rows.map(async (child) => {
                return await hydrateEntryCardByEntryIdService(child.id, current_user_id);
            })
        );

        return {
            entry_type: selectedEntry.type,
            entry: hydratedEntry,
            children: hydratedChildren,
            root_context: hydratedRootContext,
        };
    }

    if (selectedEntry.type === "REPOST") {
        const originalEntry = await getOriginalEntry(selectedEntry);

        const childrenQuery = `
            SELECT *
            FROM entries
            WHERE parent_entry_id = $1
            ORDER BY created_at ASC
        `;

        const childrenResult = await pool.query(childrenQuery, [originalEntry.id]);

        const repostUserQuery = `
            SELECT *
            FROM users
            WHERE id = $1
        `;

        const repostUserResult = await pool.query(repostUserQuery, [selectedEntry.user_id]);

        if (repostUserResult.rows.length === 0) {
            throw new Error("Kullanıcı bulunamadı.");
        }

        const reposter = repostUserResult.rows[0];

        const hydratedEntry = await hydrateEntryCardByEntryIdService(originalEntry.id, current_user_id);

        const hydratedChildren = await Promise.all(
            childrenResult.rows.map(async (child) => {
                return await hydrateEntryCardByEntryIdService(child.id, current_user_id);
            })
        );

        return {
            entry_type: selectedEntry.type,
            entry: hydratedEntry,
            children: hydratedChildren,
            repost_info: {
                repost_entry_id: selectedEntry.id,
                reposter: {
                    id: reposter.id,
                    full_name: reposter.full_name,
                    username: reposter.username,
                    profile_image_url: reposter.profile_image_url,
                },
            },
        };
    }

    if (selectedEntry.type === "QUOTE") {
        const originalEntry = await getOriginalEntry(selectedEntry);

        const childrenQuery = `
            SELECT *
            FROM entries
            WHERE parent_entry_id = $1
            ORDER BY created_at ASC
        `;

        const childrenResult = await pool.query(childrenQuery, [selectedEntry.id]);

        const hydratedEntry = await hydrateEntryCardByEntryIdService(selectedEntry.id, current_user_id);

        const hydratedChildren = await Promise.all(
            childrenResult.rows.map(async (child) => {
                return await hydrateEntryCardByEntryIdService(child.id, current_user_id);
            })
        );

        const embeddedOriginalEntry = await hydrateEntryCardByEntryIdService(originalEntry.id, current_user_id);

        return {
            entry_type: selectedEntry.type,
            entry: hydratedEntry,
            embedded_original_entry: embeddedOriginalEntry,
            children: hydratedChildren,
        };
    }

    throw new Error("Desteklenmeyen entry type.");
}

async function hydrateEntryCardByEntryIdService(entry_id, current_user_id = null) {
    const entryQuery = `
        SELECT *
        FROM entries
        WHERE id = $1
    `;

    const entryResult = await pool.query(entryQuery, [entry_id]);
    const entry = entryResult.rows[0];

    if (!entry) {
        throw new Error("Entry bulunamadı.");
    }

    const authorQuery = `
        SELECT *
        FROM users
        WHERE id = $1
    `;

    const authorResult = await pool.query(authorQuery, [entry.user_id]);
    const author = authorResult.rows[0];

    if (!author) {
        throw new Error("Kullanıcı bulunamadı.");
    }

    const likesQuery = `
        SELECT COUNT(*) AS count
        FROM entry_likes
        WHERE entry_id = $1
    `;

    const likesResult = await pool.query(likesQuery, [entry.id]);
    const likesCount = Number(likesResult.rows[0].count);

    const commentsQuery = `
        SELECT COUNT(*) AS count
        FROM entries
        WHERE parent_entry_id = $1
    `;

    const commentsResult = await pool.query(commentsQuery, [entry.id]);
    const commentsCount = Number(commentsResult.rows[0].count);

    const repostsQuery = `
        SELECT COUNT(*) AS count
        FROM entries
        WHERE original_entry_id = $1
        AND type IN ('REPOST', 'QUOTE')
    `;

    const repostsResult = await pool.query(repostsQuery, [entry.id]);
    const repostsCount = Number(repostsResult.rows[0].count);

    let is_liked_by_me = false;
    let is_reposted_by_me = false;

    if (current_user_id !== null && current_user_id !== undefined) {
        const likedByMeQuery = `
            SELECT *
            FROM entry_likes
            WHERE user_id = $1
            AND entry_id = $2
        `;

        const likedByMeResult = await pool.query(likedByMeQuery, [current_user_id, entry.id]);
        is_liked_by_me = likedByMeResult.rows.length > 0;

        const repostedByMeQuery = `
            SELECT *
            FROM entries
            WHERE user_id = $1
            AND original_entry_id = $2
            AND type = 'REPOST'
        `;

        const repostedByMeResult = await pool.query(repostedByMeQuery, [current_user_id, entry.id]);
        is_reposted_by_me = repostedByMeResult.rows.length > 0;
    }

    return {
        id: entry.id,
        type: entry.type,
        content: entry.content,
        parent_entry_id: entry.parent_entry_id,
        original_entry_id: entry.original_entry_id,
        is_deleted: entry.is_deleted,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        author: {
            id: author.id,
            full_name: author.full_name,
            username: author.username,
            profile_image_url: author.profile_image_url,
        },
        stats: {
            likes_count: likesCount,
            comments_count: commentsCount,
            reposts_count: repostsCount,
        },
        viewer_state: {
            is_liked_by_me,
            is_reposted_by_me,
        },
    };
}

async function getTimelineEntriesService(feed_type, limit, cursor_created_at, cursor_id, current_user_id) {
    if (feed_type !== "foryou" && feed_type !== "following") {
        throw new Error("Geçersiz feed_type.");
    }

    if (!Number.isInteger(limit) || limit < 1) {
        throw new Error("Geçersiz limit.");
    }

    if (!Number.isInteger(current_user_id) || current_user_id < 1) {
        throw new Error("Geçersiz current_user_id.");
    }

    const hasCursor =
        cursor_created_at !== null &&
        cursor_id !== null;

    if (hasCursor) {
        if (Number.isNaN(new Date(cursor_created_at).getTime())) {
            throw new Error("Geçersiz cursor_created_at.");
        }

        if (!Number.isInteger(cursor_id) || cursor_id < 1) {
            throw new Error("Geçersiz cursor_id.");
        }
    }

    let rawEntriesResult;

    if (feed_type === "foryou") {
        if (!hasCursor) {
            const forYouQuery = `
                SELECT *
                FROM entries
                ORDER BY created_at DESC, id DESC
                LIMIT $1
            `;

            rawEntriesResult = await pool.query(forYouQuery, [limit + 1]);
        } else {
            const forYouCursorQuery = `
                SELECT *
                FROM entries
                WHERE
                    created_at < $2
                    OR (created_at = $2 AND id < $3)
                ORDER BY created_at DESC, id DESC
                LIMIT $1
            `;

            rawEntriesResult = await pool.query(forYouCursorQuery, [
                limit + 1,
                cursor_created_at,
                cursor_id
            ]);
        }
    }

    if (feed_type === "following") {
        const followedUsersQuery = `
            SELECT following_id
            FROM user_follows
            WHERE follower_id = $1
        `;

        const followedUsersResult = await pool.query(followedUsersQuery, [current_user_id]);

        if (followedUsersResult.rows.length === 0) {
            if (!hasCursor) {
                const fallbackForYouQuery = `
                    SELECT *
                    FROM entries
                    ORDER BY created_at DESC, id DESC
                    LIMIT $1
                `;

                rawEntriesResult = await pool.query(fallbackForYouQuery, [limit + 1]);
            } else {
                const fallbackForYouCursorQuery = `
                    SELECT *
                    FROM entries
                    WHERE
                        created_at < $2
                        OR (created_at = $2 AND id < $3)
                    ORDER BY created_at DESC, id DESC
                    LIMIT $1
                `;

                rawEntriesResult = await pool.query(fallbackForYouCursorQuery, [
                    limit + 1,
                    cursor_created_at,
                    cursor_id
                ]);
            }
        } else {
            const followedUserIds = followedUsersResult.rows.map(
                (row) => row.following_id
            );

            if (!hasCursor) {
                const followingQuery = `
                    SELECT *
                    FROM entries
                    WHERE user_id = ANY($1::bigint[])
                       OR user_id = $2
                    ORDER BY created_at DESC, id DESC
                    LIMIT $3
                `;

                rawEntriesResult = await pool.query(followingQuery, [
                    followedUserIds,
                    current_user_id,
                    limit + 1
                ]);
            } else {
                const followingCursorQuery = `
                    SELECT *
                    FROM entries
                    WHERE
                        (
                            user_id = ANY($1::bigint[])
                            OR user_id = $2
                        )
                        AND
                        (
                            created_at < $3
                            OR (created_at = $3 AND id < $4)
                        )
                    ORDER BY created_at DESC, id DESC
                    LIMIT $5
                `;

                rawEntriesResult = await pool.query(followingCursorQuery, [
                    followedUserIds,
                    current_user_id,
                    cursor_created_at,
                    cursor_id,
                    limit + 1
                ]);
            }
        }
    }

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

    const pagination = buildCursorPaginationMeta(
        limit,
        rawEntriesResult.rows.length,
        hydratedEntries
    );

    return {
        items: hydratedEntries,
        pagination
    };
}
async function hydrateTimelineEntryCardByEntryIdService(entry_id, current_user_id) {
    const entryQuery = `
        SELECT *
        FROM entries
        WHERE id = $1
    `;

    const entryResult = await pool.query(entryQuery, [entry_id]);

    if (entryResult.rows.length === 0) {
        throw new Error("Entry bulunamadı.");
    }

    const selectedEntry = entryResult.rows[0];

    if (selectedEntry.type === "POST" || selectedEntry.type === "COMMENT") {
        const hydratedEntry = await hydrateEntryCardByEntryIdService(selectedEntry.id, current_user_id);

        return {
            entry_type: selectedEntry.type,
            card_header: buildCardHeader(hydratedEntry),
            entry: hydratedEntry,
        };
    }

    if (selectedEntry.type === "REPOST") {
        const originalEntry = await getOriginalEntry(selectedEntry);
        const hydratedOriginalEntry = await hydrateEntryCardByEntryIdService(originalEntry.id, current_user_id);

        const repostUserQuery = `
            SELECT *
            FROM users
            WHERE id = $1
        `;

        const repostUserResult = await pool.query(repostUserQuery, [selectedEntry.user_id]);

        if (repostUserResult.rows.length === 0) {
            throw new Error("Kullanıcı bulunamadı.");
        }

        const reposter = repostUserResult.rows[0];

        return {
            entry_type: selectedEntry.type,
            card_header: buildCardHeader(hydratedOriginalEntry),
            entry: hydratedOriginalEntry,
            repost_info: buildRepostInfo(reposter, selectedEntry),
        };
    }

    if (selectedEntry.type === "QUOTE") {
        const originalEntry = await getOriginalEntry(selectedEntry);
        const hydratedOriginalEntry = await hydrateEntryCardByEntryIdService(originalEntry.id, current_user_id);
        const hydratedQuote = await hydrateEntryCardByEntryIdService(selectedEntry.id, current_user_id);

        return {
            entry_type: selectedEntry.type,
            card_header: buildCardHeader(hydratedQuote),
            entry: hydratedQuote,
            embedded_original_entry: hydratedOriginalEntry,
        };
    }

    throw new Error("Desteklenmeyen entry type.");
}

async function toggleEntryLikeService(user_id, entry_id) {
    const entryQuery = `
        SELECT *
        FROM entries
        WHERE id = $1
    `;

    const entryResult = await pool.query(entryQuery, [entry_id]);

    if (entryResult.rows.length === 0) {
        throw new Error("Gönderi bulunamadı.");
    }

    const likeQuery = `
        SELECT *
        FROM entry_likes
        WHERE user_id = $1
        AND entry_id = $2
    `;

    const likeResult = await pool.query(likeQuery, [user_id, entry_id]);

    if (likeResult.rows.length > 0) {
        const deleteLikeQuery = `
            DELETE FROM entry_likes
            WHERE user_id = $1
            AND entry_id = $2
        `;

        await pool.query(deleteLikeQuery, [user_id, entry_id]);

        return {
            entry_id,
            is_liked_by_me: false,
        };
    }

    const likeEntryQuery = `
        INSERT INTO entry_likes (user_id, entry_id)
        VALUES ($1, $2)
    `;

    await pool.query(likeEntryQuery, [user_id, entry_id]);

    return {
        entry_id,
        is_liked_by_me: true,
    };
}

async function toggleEntryRepostService(user_id, original_entry_id) {
    const originalEntryQuery = `
        SELECT *
        FROM entries
        WHERE id = $1
    `;

    const originalEntryResult = await pool.query(originalEntryQuery, [original_entry_id]);

    if (originalEntryResult.rows.length === 0) {
        throw new Error("Gönderi bulunamadı.");
    }

    const repostQuery = `
        SELECT *
        FROM entries
        WHERE type = 'REPOST'
        AND user_id = $1
        AND original_entry_id = $2
    `;

    const repostResult = await pool.query(repostQuery, [user_id, original_entry_id]);

    if (repostResult.rows.length > 0) {
        const deleteRepostQuery = `
            DELETE FROM entries
            WHERE type = 'REPOST'
            AND user_id = $1
            AND original_entry_id = $2
        `;

        await pool.query(deleteRepostQuery, [user_id, original_entry_id]);

        return {
            original_entry_id,
            is_reposted_by_me: false,
        };
    }

    const repostEntryQuery = `
        INSERT INTO entries (user_id, type, content, parent_entry_id, original_entry_id)
        VALUES ($1, $2, $3, $4, $5)
    `;

    await pool.query(repostEntryQuery, [user_id, "REPOST", null, null, original_entry_id]);

    return {
        original_entry_id,
        is_reposted_by_me: true,
    };
}

module.exports = {
    createEntryService,
    getEntryDetailByEntryIdService,
    hydrateEntryCardByEntryIdService,
    getTimelineEntriesService,
    hydrateTimelineEntryCardByEntryIdService,
    toggleEntryLikeService,
    toggleEntryRepostService,
};