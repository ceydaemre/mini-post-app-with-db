const pool = require("../config/db");
const bcrypt = require("bcrypt");

const {
    buildCardHeader,
    buildRepostInfo,
} = require("./helpers/entryBuilders");

const {
    getOriginalEntry
} = require("./helpers/entryQueries");
const { toggleEntryRepost } = require("../controllers/entryController");

const VALID_ENTRY_TYPES = ["POST", "COMMENT", "REPOST", "QUOTE"];

async function createEntryService({ user_id, type, content, parent_entry_id, original_entry_id,}) {
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
            throw new Error(
                "POST için parent_entry_id ve original_entry_id null olmalıdır."
            );
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

async function getEntryDetailByEntryIdService(entry_id) {
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
        const hydratedEntry = await hydrateEntryCardByEntryIdService(selectedEntry.id);

        const childrenQuery = `
            SELECT *
            FROM entries
            WHERE parent_entry_id = $1
            ORDER BY created_at ASC
        `;

        const childrenResult = await pool.query(childrenQuery, [selectedEntry.id]);

        const hydratedChildren = await Promise.all(
            childrenResult.rows.map(async (child) => {
                return await hydrateEntryCardByEntryIdService(child.id);
            })
        );

        return {
            entry_type: selectedEntry.type,
            entry: hydratedEntry,
            children: hydratedChildren,
        };
    }

    if (selectedEntry.type === "COMMENT") {
        const hydratedEntry = await hydrateEntryCardByEntryIdService(selectedEntry.id);

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

            const parentResult = await pool.query(parentQuery, [currentEntry.parent_entry_id,]);

            if (parentResult.rows.length === 0) {
                break;
            }

            currentEntry = parentResult.rows[0];
        }

        const rootContext = currentEntry;
        const hydratedRootContext = await hydrateEntryCardByEntryIdService(rootContext.id);

        const hydratedChildren = await Promise.all(
            childrenResult.rows.map(async (child) => {
                return await hydrateEntryCardByEntryIdService(child.id);
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

        const repostUserResult = await pool.query(repostUserQuery, [selectedEntry.user_id,]);

        if (repostUserResult.rows.length === 0) {
            throw new Error("Kullanıcı bulunamadı.");
        }

        const reposter = repostUserResult.rows[0];

        const hydratedEntry = await hydrateEntryCardByEntryIdService(originalEntry.id);

        const hydratedChildren = await Promise.all(
            childrenResult.rows.map(async (child) => {
                return await hydrateEntryCardByEntryIdService(child.id);
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

        const hydratedEntry = await hydrateEntryCardByEntryIdService(selectedEntry.id);

        const hydratedChildren = await Promise.all(
            childrenResult.rows.map(async (child) => {
                return await hydrateEntryCardByEntryIdService(child.id);
            })
        );

        const embeddedOriginalEntry = await hydrateEntryCardByEntryIdService(originalEntry.id);

        return {
            entry_type: selectedEntry.type,
            entry: hydratedEntry,
            embedded_original_entry: embeddedOriginalEntry,
            children: hydratedChildren,
        };
    }

  throw new Error("Desteklenmeyen entry type.");
}

async function hydrateEntryCardByEntryIdService(entry_id) {
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
            is_liked_by_me: false,
            is_reposted_by_me: false,
        },
    };
}

async function getTimelineEntriesService(limit, offset) {
    const entriesQuery = `
        SELECT *
        FROM entries
        ORDER BY created_at DESC
        LIMIT $1
        OFFSET $2
    `;

    const entriesResult = await pool.query(entriesQuery, [limit, offset]);

    const hydratedEntries = await Promise.all(
        entriesResult.rows.map(async (entry) => {
            return await hydrateTimelineEntryCardByEntryIdService(entry.id);
        })
    );

    return hydratedEntries;
}

async function hydrateTimelineEntryCardByEntryIdService(entry_id) {

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
        const hydratedEntry = await hydrateEntryCardByEntryIdService(selectedEntry.id);
        const cardHeader = buildCardHeader(hydratedEntry);

        return {
            entry_type: selectedEntry.type,
            card_header: cardHeader,
            entry: hydratedEntry,
        };
    }

    if (selectedEntry.type === "REPOST") {
        const originalEntry = await getOriginalEntry(selectedEntry);
        const hydratedOriginalEntry = await hydrateEntryCardByEntryIdService(originalEntry.id);

        const repostUserQuery = `
            SELECT *
            FROM users
            WHERE id = $1
        `;

        const repostUserResult = await pool.query(repostUserQuery, [selectedEntry.user_id,]);

        if (repostUserResult.rows.length === 0) {
            throw new Error("Kullanıcı bulunamadı.");
        }

        const reposter = repostUserResult.rows[0];
        const repostInfo = buildRepostInfo(reposter, selectedEntry);
        const cardHeader = buildCardHeader(hydratedOriginalEntry);

        return {
            entry_type: selectedEntry.type,
            card_header: cardHeader,
            entry: hydratedOriginalEntry,
            repost_info: repostInfo,
        };
    }

    if (selectedEntry.type === "QUOTE") {
        const originalEntry = await getOriginalEntry(selectedEntry);
        const hydratedOriginalEntry = await hydrateEntryCardByEntryIdService(originalEntry.id);
        const hydratedQuote = await hydrateEntryCardByEntryIdService(selectedEntry.id);
        const cardHeader = buildCardHeader(hydratedQuote);

        return {
            entry_type: selectedEntry.type,
            card_header: cardHeader,
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

    const entryResult = await pool.query(entryQuery, [ entry_id ]);

    if(entryResult.rows.length === 0) {
        throw new Error("Gönderi bulunamadı");
    }

    const likeQuery = `
        SELECT * 
        FROM entry_likes
        WHERE user_id = $1 
        AND entry_id = $2
    `;

    const likeResult = await pool.query(likeQuery, [ user_id, entry_id ]);

    if(likeResult.rows.length > 0) {
        const deleteLikeQuery = `
            DELETE FROM entry_likes
            WHERE user_id = $1
            AND entry_id = $2
        `;

        const deleteLikeResult = await pool.query(deleteLikeQuery, [ user_id, entry_id ]);

        return {
            entry_id,
            is_liked_by_me: false
        }
    }

    if(likeResult.rows.length === 0) {
        const likeEntryQuery = `
            INSERT INTO entry_likes
            (user_id, entry_id)
            VALUES ($1, $2)
        `;

        const likeEntryResult = await pool.query(likeEntryQuery, [ user_id, entry_id ]);

        return {
            entry_id,
            is_liked_by_me : true
        };
    }
}

async function toggleEntryRepostService(user_id, original_entry_id) {
    const originalEntryQuery = `
        SELECT *
        FROM entries
        WHERE id = $1
    `;

    const OriginalEntryResult = await pool.query(originalEntryQuery, [ original_entry_id ]);

    if(OriginalEntryResult.rows.length === 0) {
        throw new Error("Gönderi bulunamadı");
    }

    const repostQuery = `
        SELECT *
        FROM entries
        WHERE type = 'REPOST'
        AND user_id = $1
        AND original_entry_id = $2
    `;

    const repostResult = await pool.query(repostQuery, [user_id, original_entry_id]);

    if(repostResult.rows.length > 0) {
        const deleteRepostQuery = `
            DELETE FROM entries
            WHERE type = 'REPOST'
            AND user_id = $1
            AND original_entry_id = $2
        `;

        const deleteRepostResult = await pool.query(deleteRepostQuery, [user_id, original_entry_id]);

        return {
            original_entry_id,
            is_reposted_by_me : false
        }
    } else {
        const repostEntryQuery = `
            INSERT INTO entries
            (user_id, type, content, parent_entry_id, original_entry_id)
            VALUES ($1, $2, $3, $4, $5)
        `;

        const repostEntryResult = await pool.query(repostEntryQuery, [ user_id, 'REPOST', null, null, original_entry_id]);

        return {
            original_entry_id,
            is_reposted_by_me : true
        }
    }
}

module.exports = {
    createEntryService,
    getEntryDetailByEntryIdService,
    hydrateEntryCardByEntryIdService,
    getTimelineEntriesService,
    hydrateTimelineEntryCardByEntryIdService,
    toggleEntryLikeService,
    toggleEntryRepostService
};