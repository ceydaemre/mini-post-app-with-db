const pool = require("../config/db");

const {
    buildCardHeader,
    buildRepostInfo,
    buildEntryDetailResponse,
} = require("./helpers/entryBuilders");

const {
    getOriginalEntry,
} = require("./helpers/entryQueries");

const { 
    buildPaginationMeta,
    buildCursorPaginationMeta,
} = require("./helpers/pagination");
const {
    createNotificationService
} = require("./notificationsService");

const VALID_ENTRY_TYPES = ["POST", "COMMENT", "REPOST", "QUOTE"];

const VALID_MEDIA_TYPES = ["image", "video", "gif"];

async function getRootEntryByEntryService(entry, current_user_id = null) {
    let currentEntry = entry;

    while (currentEntry.parent_entry_id !== null) {
        const rootEntryQuery = `
            SELECT *
            FROM entries
            WHERE id = $1
        `;

        const rootEntryResult = await pool.query(rootEntryQuery, [
            currentEntry.parent_entry_id
        ]);

        if (rootEntryResult.rows.length === 0) {
            throw new Error("Parent entry bulunamadı.");
        }

        currentEntry = rootEntryResult.rows[0];
    }

    return await hydrateEntryCardByEntryIdService(
        currentEntry.id,
        current_user_id
    );
}
async function getParentChainByEntryIdService(entry, current_user_id = null) {
    let currentEntry = entry;
    const temporaryParentEntries = [];

    while (currentEntry.parent_entry_id !== null) {
        const parentQuery = `
            SELECT *
            FROM entries
            WHERE id = $1
        `;

        const parentResult = await pool.query(parentQuery, [
            currentEntry.parent_entry_id
        ]);

        if (parentResult.rows.length === 0) {
            throw new Error("Parent entry bulunamadı.");
        }

        const parent = parentResult.rows[0];
        temporaryParentEntries.push(parent);
        currentEntry = parent;
    }

    if (temporaryParentEntries.length > 0) {
        temporaryParentEntries.pop();
    }

    temporaryParentEntries.reverse();

    const hydratedParentChain = await Promise.all(
        temporaryParentEntries.map(async (parent) => {
            return await hydrateEntryCardByEntryIdService(
                parent.id,
                current_user_id
            );
        })
    );

    return hydratedParentChain;
}

async function getChildrenByEntryIdService(entry_id, current_user_id = null) {
    const childrenQuery = `
        SELECT *
        FROM entries
        WHERE parent_entry_id = $1
        ORDER BY created_at ASC
    `;

    const childrenResult = await pool.query(childrenQuery, [entry_id]);

    const hydratedChildren = await Promise.all(
        childrenResult.rows.map(async (child) => {
            return await hydrateEntryCardByEntryIdService(
                child.id,
                current_user_id
            );
        })
    );

    return hydratedChildren;
}
async function createEntryService({
    user_id,
    type,
    content,
    parent_entry_id,
    original_entry_id,
    media = []
}) {
    user_id = Number(user_id);

    if (!Number.isInteger(user_id) || user_id < 1) {
        throw new Error("Geçersiz user_id.");
    }

    if (!type) {
        throw new Error("type zorunludur.");
    }

    if (!VALID_ENTRY_TYPES.includes(type)) {
        throw new Error("Geçersiz entry type.");
    }

    if (parent_entry_id !== null && parent_entry_id !== undefined) {
        parent_entry_id = Number(parent_entry_id);
    }

    if (original_entry_id !== null && original_entry_id !== undefined) {
        original_entry_id = Number(original_entry_id);
    }

    if (media === undefined) {
        media = [];
    }

    if (!Array.isArray(media)) {
        throw new Error("Geçersiz media.");
    }

    const normalizedMedia = media.map((mediaItem) => {
        if (typeof mediaItem !== "object" || mediaItem === null) {
            throw new Error("Geçersiz media item.");
        }

        if (!mediaItem.media_url || String(mediaItem.media_url).trim() === "") {
            throw new Error("media_url zorunludur.");
        }

        const media_type = mediaItem.media_type || "image";

        if (!VALID_MEDIA_TYPES.includes(media_type)) {
            throw new Error("Geçersiz media_type.");
        }

        return {
            media_url: String(mediaItem.media_url).trim(),
            media_type
        };
    });

    const has_content =
        content !== null &&
        content !== undefined &&
        String(content).trim() !== "";

    let parentEntry = null;
    let originalEntry = null;

    if (type === "POST") {
        if (parent_entry_id !== null && parent_entry_id !== undefined) {
            throw new Error("POST için parent_entry_id null olmalıdır.");
        }

        if (original_entry_id !== null && original_entry_id !== undefined) {
            throw new Error("POST için original_entry_id null olmalıdır.");
        }

        if (!has_content) {
            throw new Error("POST için şimdilik content zorunludur.");
        }
    }

    if (type === "COMMENT") {
        if (parent_entry_id === null || parent_entry_id === undefined) {
            throw new Error("COMMENT için parent_entry_id zorunludur.");
        }

        if (!Number.isInteger(parent_entry_id) || parent_entry_id < 1) {
            throw new Error("Geçersiz parent_entry_id.");
        }

        if (original_entry_id !== null && original_entry_id !== undefined) {
            throw new Error("COMMENT için original_entry_id null olmalıdır.");
        }

        if (!has_content) {
            throw new Error("COMMENT için şimdilik content zorunludur.");
        }

        const parentEntryQuery = `
            SELECT *
            FROM entries
            WHERE id = $1
              AND is_deleted = false
        `;

        const parentEntryResult = await pool.query(parentEntryQuery, [
            parent_entry_id
        ]);

        if (parentEntryResult.rows.length === 0) {
            throw new Error("Yorum yapılacak gönderi bulunamadı veya silinmiş.");
        }

        parentEntry = parentEntryResult.rows[0];
    }

    if (type === "REPOST") {
        if (parent_entry_id !== null && parent_entry_id !== undefined) {
            throw new Error("REPOST için parent_entry_id null olmalıdır.");
        }

        if (original_entry_id === null || original_entry_id === undefined) {
            throw new Error("REPOST için original_entry_id zorunludur.");
        }

        if (!Number.isInteger(original_entry_id) || original_entry_id < 1) {
            throw new Error("Geçersiz original_entry_id.");
        }

        if (has_content) {
            throw new Error("REPOST için content boş olmalıdır.");
        }

        if (normalizedMedia.length > 0) {
            throw new Error("REPOST için media boş olmalıdır.");
        }

        const originalEntryQuery = `
            SELECT *
            FROM entries
            WHERE id = $1
              AND is_deleted = false
        `;

        const originalEntryResult = await pool.query(originalEntryQuery, [
            original_entry_id
        ]);

        if (originalEntryResult.rows.length === 0) {
            throw new Error("Repost yapılacak gönderi bulunamadı veya silinmiş.");
        }

        originalEntry = originalEntryResult.rows[0];
    }

    if (type === "QUOTE") {
        if (parent_entry_id !== null && parent_entry_id !== undefined) {
            throw new Error("QUOTE için parent_entry_id null olmalıdır.");
        }

        if (original_entry_id === null || original_entry_id === undefined) {
            throw new Error("QUOTE için original_entry_id zorunludur.");
        }

        if (!Number.isInteger(original_entry_id) || original_entry_id < 1) {
            throw new Error("Geçersiz original_entry_id.");
        }

        if (!has_content) {
            throw new Error("QUOTE için şimdilik content zorunludur.");
        }

        const originalEntryQuery = `
            SELECT *
            FROM entries
            WHERE id = $1
              AND is_deleted = false
        `;

        const originalEntryResult = await pool.query(originalEntryQuery, [
            original_entry_id
        ]);

        if (originalEntryResult.rows.length === 0) {
            throw new Error("Alıntılanacak gönderi bulunamadı veya silinmiş.");
        }

        originalEntry = originalEntryResult.rows[0];
    }

    const query = `
        INSERT INTO entries (
            user_id,
            type,
            content,
            parent_entry_id,
            original_entry_id
        )
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

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(query, values);

        const createdEntry = result.rows[0];

        if (type === "COMMENT" && parentEntry !== null) {
            await createNotificationService({
                receiver_user_id: Number(parentEntry.user_id),
                actor_user_id: Number(user_id),
                type: "COMMENT",
                entry_id: Number(createdEntry.id)
            }, client);
        }

        if (type === "QUOTE" && originalEntry !== null) {
            await createNotificationService({
                receiver_user_id: Number(originalEntry.user_id),
                actor_user_id: Number(user_id),
                type: "QUOTE",
                entry_id: Number(createdEntry.id)
            }, client);
        }
        
        const insertedMedia = [];

        for(mediaItem of normalizedMedia) {
            const mediaInsertQuery = `
                INSERT INTO entry_media (
                    entry_id,
                    media_url,
                    media_type
                )
                VALUES($1, $2, $3) 
                RETURNING entry_id, media_url, media_type
            `;

            const mediaInsertResult = await client.query(mediaInsertQuery, [createdEntry.id, mediaItem.media_url, mediaItem.media_type]);

            insertedMedia.push(mediaInsertResult.rows[0]);
        }

        await client.query("COMMIT");

        return {
            ...createdEntry,
            media : insertedMedia
        }
    } catch(error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
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
        const hydratedEntry = await hydrateEntryCardByEntryIdService(
            selectedEntry.id,
            current_user_id
        );

        const children = await getChildrenByEntryIdService(
            selectedEntry.id,
            current_user_id
        );

        return buildEntryDetailResponse(
            selectedEntry.type,
            hydratedEntry,
            null,
            [],
            children
        );
    }

    if (selectedEntry.type === "COMMENT") {
        const hydratedEntry = await hydrateEntryCardByEntryIdService(
            selectedEntry.id,
            current_user_id
        );

        const root_context = await getRootEntryByEntryService(
            selectedEntry,
            current_user_id
        );

        const parent_chain = await getParentChainByEntryIdService(
            selectedEntry,
            current_user_id
        );

        const children = await getChildrenByEntryIdService(
            selectedEntry.id,
            current_user_id
        );

        return buildEntryDetailResponse(
            selectedEntry.type,
            hydratedEntry,
            root_context,
            parent_chain,
            children
        );
    }

    if (selectedEntry.type === "REPOST") {
        const originalEntry = await getOriginalEntry(selectedEntry);

        const hydratedEntry = await hydrateEntryCardByEntryIdService(
            originalEntry.id,
            current_user_id
        );

        const children = await getChildrenByEntryIdService(
            originalEntry.id,
            current_user_id
        );

        const repostUserQuery = `
            SELECT *
            FROM users
            WHERE id = $1
        `;

        const repostUserResult = await pool.query(
            repostUserQuery,
            [selectedEntry.user_id]
        );

        if (repostUserResult.rows.length === 0) {
            throw new Error("Kullanıcı bulunamadı.");
        }

        const reposter = repostUserResult.rows[0];

        return {
            ...buildEntryDetailResponse(
                selectedEntry.type,
                hydratedEntry,
                null,
                [],
                children
            ),
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
        const hydratedEntry = await hydrateEntryCardByEntryIdService(
            selectedEntry.id,
            current_user_id
        );

        const originalEntry = await getOriginalEntry(selectedEntry);

        const embedded_original_entry = await hydrateEmbeddedOriginalEntryService(
            originalEntry.id,
            current_user_id
        );

        const children = await getChildrenByEntryIdService(
            selectedEntry.id,
            current_user_id
        );

        return {
            ...buildEntryDetailResponse(
                selectedEntry.type,
                hydratedEntry,
                null,
                [],
                children
            ),
            embedded_original_entry
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

    if (entry.is_deleted === true) {
        const commentsQuery = `
            SELECT COUNT(*) AS count
            FROM entries
            WHERE parent_entry_id = $1
            AND is_deleted = false
        `;

        const commentsResult = await pool.query(commentsQuery, [entry.id]);
        const commentsCount = Number(commentsResult.rows[0].count);

        return {
            id: entry.id,
            type: entry.type,
            content: null,
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
            media: [],
            stats: {
                likes_count: 0,
                comments_count: commentsCount,
                reposts_count: 0,
            },
            viewer_state: {
                is_liked_by_me: false,
                is_reposted_by_me: false,
            },
        };
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
          AND is_deleted = false
    `;

    const commentsResult = await pool.query(commentsQuery, [entry.id]);
    const commentsCount = Number(commentsResult.rows[0].count);

    const repostsQuery = `
        SELECT COUNT(*) AS count
        FROM entries
        WHERE original_entry_id = $1
          AND type IN ('REPOST', 'QUOTE')
          AND is_deleted = false
    `;

    const repostsResult = await pool.query(repostsQuery, [entry.id]);
    const repostsCount = Number(repostsResult.rows[0].count);

    const mediaQuery = `
        SELECT id, entry_id, media_url, media_type, created_at
        FROM entry_media
        WHERE entry_id = $1
        ORDER BY created_at ASC, id ASC
    `;

    const mediaResult = await pool.query(mediaQuery, [entry.id]);
    const media = mediaResult.rows;

    let is_liked_by_me = false;
    let is_reposted_by_me = false;

    if (current_user_id !== null && current_user_id !== undefined) {
        const likedByMeQuery = `
            SELECT 1
            FROM entry_likes
            WHERE user_id = $1
              AND entry_id = $2
        `;

        const likedByMeResult = await pool.query(likedByMeQuery, [
            current_user_id,
            entry.id
        ]);

        is_liked_by_me = likedByMeResult.rows.length > 0;

        const repostedByMeQuery = `
            SELECT 1
            FROM entries
            WHERE user_id = $1
              AND original_entry_id = $2
              AND type = 'REPOST'
              AND is_deleted = false
        `;

        const repostedByMeResult = await pool.query(repostedByMeQuery, [
            current_user_id,
            entry.id
        ]);

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
        media,
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
async function hydrateEmbeddedOriginalEntryService(entry_id, current_user_id = null) {
    return await hydrateEntryCardByEntryIdService(entry_id, current_user_id);
}
async function getTimelineEntriesService(
    feed_type,
    limit,
    cursor_created_at,
    cursor_id,
    current_user_id,
    cursor_score = null) {
    if (feed_type !== "foryou" && feed_type !== "following") {
        throw new Error("Geçersiz feed_type.");
    }

    if (!Number.isInteger(limit) || limit < 1) {
        throw new Error("Geçersiz limit.");
    }

    if (!Number.isInteger(current_user_id) || current_user_id < 1) {
        throw new Error("Geçersiz current_user_id.");
    }

    const hasCreatedAtCursor = cursor_created_at !== null;
    const hasIdCursor = cursor_id !== null && cursor_id !== undefined;
    const hasScoreCursor = cursor_score !== null && cursor_score !== undefined;

    if (hasCreatedAtCursor) {
        if (Number.isNaN(new Date(cursor_created_at).getTime())) {
            throw new Error("Geçersiz cursor_created_at.");
        }
    }

    if (hasIdCursor) {
        if (!Number.isInteger(cursor_id) || cursor_id < 1) {
            throw new Error("Geçersiz cursor_id.");
        }
    }

    if (hasScoreCursor) {
        if (Number.isNaN(Number(cursor_score))) {
            throw new Error("Geçersiz cursor_score.");
        }
    }

    let rawEntriesResult;

    if (feed_type === "foryou") {
        const hasCursor =
            hasScoreCursor &&
            hasCreatedAtCursor &&
            hasIdCursor;

        if (!hasCursor) {
            const forYouQuery = `
                WITH ranked_entries AS (
                    SELECT
                        e.*,
                        (
                            (
                                SELECT COUNT(*)
                                FROM entry_likes el
                                WHERE el.entry_id = e.id
                            ) * 2
                            +
                            (
                                SELECT COUNT(*)
                                FROM entries c
                                WHERE c.parent_entry_id = e.id
                                  AND c.is_deleted = false
                            ) * 3
                            +
                            (
                                SELECT COUNT(*)
                                FROM entries r
                                WHERE r.original_entry_id = e.id
                                  AND r.type IN ('REPOST', 'QUOTE')
                                  AND r.is_deleted = false
                            ) * 4
                            +
                            GREATEST(
                                0,
                                100 - EXTRACT(EPOCH FROM (NOW() - e.created_at)) / 3600
                            )
                        ) AS score
                    FROM entries e
                    WHERE e.is_deleted = false
                )
                SELECT *
                FROM ranked_entries
                ORDER BY score DESC, created_at DESC, id DESC
                LIMIT $1
            `;

            rawEntriesResult = await pool.query(forYouQuery, [limit + 1]);

        } else {
            const forYouCursorQuery = `
                WITH ranked_entries AS (
                    SELECT
                        e.*,
                        (
                            (
                                SELECT COUNT(*)
                                FROM entry_likes el
                                WHERE el.entry_id = e.id
                            ) * 2
                            +
                            (
                                SELECT COUNT(*)
                                FROM entries c
                                WHERE c.parent_entry_id = e.id
                                  AND c.is_deleted = false
                            ) * 3
                            +
                            (
                                SELECT COUNT(*)
                                FROM entries r
                                WHERE r.original_entry_id = e.id
                                  AND r.type IN ('REPOST', 'QUOTE')
                                  AND r.is_deleted = false
                            ) * 4
                            +
                            GREATEST(
                                0,
                                100 - EXTRACT(EPOCH FROM (NOW() - e.created_at)) / 3600
                            )
                        ) AS score
                    FROM entries e
                    WHERE e.is_deleted = false
                )
                SELECT *
                FROM ranked_entries
                WHERE
                    score < $1
                    OR (
                        score = $1
                        AND created_at < $2
                    )
                    OR (
                        score = $1
                        AND created_at = $2
                        AND id < $3
                    )
                ORDER BY score DESC, created_at DESC, id DESC
                LIMIT $4
            `;

            rawEntriesResult = await pool.query(forYouCursorQuery, [
                cursor_score,
                cursor_created_at,
                cursor_id,
                limit + 1
            ]);
        }
    }

    if (feed_type === "following") {
        const hasCursor =
            hasCreatedAtCursor &&
            hasIdCursor;

        const followedUsersQuery = `
            SELECT following_id
            FROM user_follows
            WHERE follower_id = $1
        `;

        const followedUsersResult = await pool.query(
            followedUsersQuery,
            [current_user_id]
        );

        if (followedUsersResult.rows.length === 0) {
            if (!hasCursor) {
                const fallbackForYouQuery = `
                    SELECT *
                    FROM entries
                    WHERE is_deleted = false
                    ORDER BY created_at DESC, id DESC
                    LIMIT $1
                `;

                rawEntriesResult = await pool.query(
                    fallbackForYouQuery,
                    [limit + 1]
                );

            } else {
                const fallbackForYouCursorQuery = `
                    SELECT *
                    FROM entries
                    WHERE is_deleted = false
                      AND (
                          created_at < $2
                          OR (created_at = $2 AND id < $3)
                      )
                    ORDER BY created_at DESC, id DESC
                    LIMIT $1
                `;

                rawEntriesResult = await pool.query(
                    fallbackForYouCursorQuery,
                    [
                        limit + 1,
                        cursor_created_at,
                        cursor_id
                    ]
                );
            }

        } else {
            const followedUserIds = followedUsersResult.rows.map(
                (row) => row.following_id
            );

            if (!hasCursor) {
                const followingQuery = `
                    SELECT *
                    FROM entries
                    WHERE is_deleted = false
                      AND (
                          user_id = ANY($1::bigint[])
                          OR user_id = $2
                      )
                    ORDER BY created_at DESC, id DESC
                    LIMIT $3
                `;

                rawEntriesResult = await pool.query(
                    followingQuery,
                    [
                        followedUserIds,
                        current_user_id,
                        limit + 1
                    ]
                );

            } else {
                const followingCursorQuery = `
                    SELECT *
                    FROM entries
                    WHERE is_deleted = false
                      AND (
                          user_id = ANY($1::bigint[])
                          OR user_id = $2
                      )
                      AND (
                          created_at < $3
                          OR (created_at = $3 AND id < $4)
                      )
                    ORDER BY created_at DESC, id DESC
                    LIMIT $5
                `;

                rawEntriesResult = await pool.query(
                    followingCursorQuery,
                    [
                        followedUserIds,
                        current_user_id,
                        cursor_created_at,
                        cursor_id,
                        limit + 1
                    ]
                );
            }
        }
    }

    const rawEntries = rawEntriesResult.rows;

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

    let next_cursor = null;

    if (has_more && selectedEntries.length > 0) {
        const lastEntry = selectedEntries[selectedEntries.length - 1];

        if (feed_type === "foryou") {
            next_cursor = {
                cursor_score: Number(lastEntry.score),
                cursor_created_at: lastEntry.created_at,
                cursor_id: Number(lastEntry.id)
            };
        }

        if (feed_type === "following") {
            next_cursor = {
                cursor_created_at: lastEntry.created_at,
                cursor_id: Number(lastEntry.id)
            };
        }
    }

    return {
        items: hydratedEntries,
        pagination: {
            limit,
            has_more,
            next_cursor
        }
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

        const hydratedOriginalEntry = await hydrateEmbeddedOriginalEntryService(
            originalEntry.id,
            current_user_id
        );

        const hydratedQuote = await hydrateEntryCardByEntryIdService(
            selectedEntry.id,
            current_user_id
        );

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
    user_id = Number(user_id);
    entry_id = Number(entry_id);

    if (!Number.isInteger(user_id) || user_id < 1) {
        throw new Error("Geçersiz user_id.");
    }

    if (!Number.isInteger(entry_id) || entry_id < 1) {
        throw new Error("Geçersiz entry_id.");
    }

    const entryQuery = `
        SELECT *
        FROM entries
        WHERE id = $1
          AND is_deleted = false
    `;

    const entryResult = await pool.query(entryQuery, [entry_id]);

    if (entryResult.rows.length === 0) {
        throw new Error("Gönderi bulunamadı.");
    }

    const entry = entryResult.rows[0];

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
            is_liked_by_me: false
        };
    }

    const likeEntryQuery = `
        INSERT INTO entry_likes (user_id, entry_id)
        VALUES ($1, $2)
    `;

    await pool.query(likeEntryQuery, [user_id, entry_id]);

    await createNotificationService({
        receiver_user_id: Number(entry.user_id),
        actor_user_id: Number(user_id),
        type: "LIKE",
        entry_id: Number(entry_id)
    });
    return {
        entry_id,
        is_liked_by_me: true
    };
}

async function toggleEntryRepostService(user_id, original_entry_id) {
    user_id = Number(user_id);
    original_entry_id = Number(original_entry_id);

    if (!Number.isInteger(user_id) || user_id < 1) {
        throw new Error("Geçersiz user_id.");
    }

    if (!Number.isInteger(original_entry_id) || original_entry_id < 1) {
        throw new Error("Geçersiz original_entry_id.");
    }

    const originalEntryQuery = `
        SELECT *
        FROM entries
        WHERE id = $1
          AND is_deleted = false
    `;

    const originalEntryResult = await pool.query(originalEntryQuery, [
        original_entry_id
    ]);

    if (originalEntryResult.rows.length === 0) {
        throw new Error("Repost yapılacak gönderi bulunamadı veya silinmiş.");
    }

    const originalEntry = originalEntryResult.rows[0];

    const repostQuery = `
        SELECT *
        FROM entries
        WHERE type = 'REPOST'
          AND user_id = $1
          AND original_entry_id = $2
          AND is_deleted = false
    `;

    const repostResult = await pool.query(repostQuery, [
        user_id,
        original_entry_id
    ]);

    if (repostResult.rows.length > 0) {
        const deleteRepostQuery = `
            DELETE FROM entries
            WHERE type = 'REPOST'
              AND user_id = $1
              AND original_entry_id = $2
              AND is_deleted = false
        `;

        await pool.query(deleteRepostQuery, [
            user_id,
            original_entry_id
        ]);

        return {
            original_entry_id,
            is_reposted_by_me: false,
        };
    }

    const repostInsertQuery = `
        INSERT INTO entries (
            user_id,
            type,
            content,
            parent_entry_id,
            original_entry_id
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;

    const repostInsertResult = await pool.query(repostInsertQuery, [
        user_id,
        "REPOST",
        null,
        null,
        original_entry_id
    ]);

    const repostEntry = repostInsertResult.rows[0];

    await createNotificationService({
        receiver_user_id: Number(originalEntry.user_id),
        actor_user_id: Number(user_id),
        type: "REPOST",
        entry_id: Number(repostEntry.id)
    });

    return {
        original_entry_id,
        is_reposted_by_me: true,
    };
}
async function getEntryLikesService(entry_id, current_user_id, limit = 10, offset = 0) {
    if (!Number.isInteger(entry_id) || entry_id < 1) {
        throw new Error("Geçersiz entry_id.");
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

    const entryCheckQuery = `
        SELECT 1
        FROM entries
        WHERE id = $1
    `;

    const entryCheckResult = await pool.query(entryCheckQuery, [entry_id]);

    if (entryCheckResult.rows.length === 0) {
        throw new Error("Entry bulunamadı.");
    }

    const likesQuery = `
        SELECT
            u.id,
            u.full_name,
            u.username,
            u.profile_image_url,
            el.created_at AS liked_at
        FROM entry_likes el
        INNER JOIN users u
            ON el.user_id = u.id
        WHERE el.entry_id = $1
        ORDER BY el.created_at DESC
        LIMIT $2
        OFFSET $3
    `;

    const likesResult = await pool.query(likesQuery, [
        entry_id,
        limit + 1,
        offset
    ]);

    const rawUsers = likesResult.rows;

    const has_more = rawUsers.length > limit;

    const paginatedUsers = rawUsers.slice(0, limit);

    const userIds = paginatedUsers.map(user => user.id);

    let followingSet = new Set();

    if (userIds.length > 0) {
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
            followingResult.rows.map(row => row.following_id)
        );
    }

    const items = paginatedUsers.map(user => {
        const is_me = Number(user.id) === current_user_id;
        const is_following = followingSet.has(user.id);

        return {
            id: user.id,
            full_name: user.full_name,
            username: user.username,
            profile_image_url: user.profile_image_url,
            liked_at: user.liked_at,
            is_me,
            is_following
        };
    });

    return {
        entry_id,
        items,
        pagination: {
            limit,
            offset,
            has_more,
            next_offset: has_more ? offset + limit : null
        }
    };
}

async function deleteEntryService(user_id, entry_id) {
    user_id = Number(user_id);
    entry_id = Number(entry_id);

    if (!Number.isInteger(user_id) || user_id < 1) {
        throw new Error("Geçersiz user_id.");
    }

    if (!Number.isInteger(entry_id) || entry_id < 1) {
        throw new Error("Geçersiz entry_id.");
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const entryQuery = `
            SELECT *
            FROM entries
            WHERE id = $1
        `;

        const entryResult = await client.query(entryQuery, [entry_id]);

        if (entryResult.rows.length === 0) {
            throw new Error("Gönderi bulunamadı.");
        }

        const entry = entryResult.rows[0];

        if (entry.is_deleted === true) {
            throw new Error("Gönderi zaten silinmiş.");
        }

        if (Number(entry.user_id) !== user_id) {
            throw new Error("Bu gönderiyi silme yetkiniz yok.");
        }

        const updateEntryQuery = `
            UPDATE entries
            SET
                is_deleted = TRUE,
                content = NULL,
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, is_deleted, updated_at
        `;

        const updateEntryResult = await client.query(updateEntryQuery, [entry_id]);

        const deleteMediaQuery = `
            DELETE FROM entry_media
            WHERE entry_id = $1
        `;

        await client.query(deleteMediaQuery, [entry_id]);

        await client.query("COMMIT");

        return {
            entry_id: updateEntryResult.rows[0].id,
            is_deleted: updateEntryResult.rows[0].is_deleted,
            updated_at: updateEntryResult.rows[0].updated_at
        };

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;

    } finally {
        client.release();
    }
}

module.exports = {
    createEntryService,
    getEntryDetailByEntryIdService,
    hydrateEntryCardByEntryIdService,
    getTimelineEntriesService,
    hydrateTimelineEntryCardByEntryIdService,
    toggleEntryLikeService,
    toggleEntryRepostService,
    getEntryLikesService,
    deleteEntryService
};