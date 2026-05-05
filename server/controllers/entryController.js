const {
    createEntryService,
    getEntryDetailByEntryIdService,
    getTimelineEntriesService,
    toggleEntryLikeService,
    toggleEntryRepostService,
    getEntryLikesService
} = require("../services/entryService");

const { 
    buildPaginationMeta
} = require("../services/helpers/pagination");

async function createPost(req, res) {
    try {
        const user_id = req.user.id;
        const content = req.body.content;

        const result = await createEntryService({
            user_id,
            type: "POST",
            content,
            parent_entry_id: null,
            original_entry_id: null,
            media: req.body.media
        });

        return res.status(201).json({
            message: "Entry oluşturuldu.",
            data: result,
        });
    } catch (error) {
        console.error("createPost controller hatası:", error.message);

        return res.status(400).json({
            message: error.message,
        });
    }
}

async function createComment(req, res) {
    try {
        const user_id = req.user.id;
        const parent_entry_id = Number(req.params.id);
        const content = req.body.content;

        if (Number.isNaN(parent_entry_id)) {
            return res.status(400).json({
                message: "Geçersiz parent_entry_id.",
            });
        }

        const result = await createEntryService({
            user_id,
            type: "COMMENT",
            content,
            parent_entry_id,
            original_entry_id: null,
            media: req.body.media
        });

        return res.status(201).json({
            message: "Comment oluşturuldu.",
            data: result,
        });
    } catch (error) {
        console.error("createComment controller hatası:", error.message);

        return res.status(400).json({
            message: error.message,
        });
    }
}

async function createRepost(req, res) {
    try {
        const user_id = req.user.id;
        const original_entry_id = Number(req.params.id);

        if (Number.isNaN(original_entry_id)) {
            return res.status(400).json({
                message: "Geçersiz original_entry_id.",
            });
        }

        const result = await createEntryService({
            user_id,
            type: "REPOST",
            content: null,
            parent_entry_id: null,
            original_entry_id,
        });

        return res.status(201).json({
            message: "Repost oluşturuldu.",
            data: result,
        });
    } catch (error) {
        console.error("createRepost controller hatası:", error.message);

        return res.status(400).json({
            message: error.message,
        });
    }
}

async function createQuote(req, res) {
    try {
        const user_id = req.user.id;
        const original_entry_id = Number(req.params.id);
        const content = req.body.content;

        if (Number.isNaN(original_entry_id)) {
            return res.status(400).json({
                message: "Geçersiz original_entry_id.",
            });
        }

        const result = await createEntryService({
            user_id,
            type: "QUOTE",
            content,
            parent_entry_id: null,
            original_entry_id,
            media: req.body.media

        });

        return res.status(201).json({
            message: "Quote oluşturuldu.",
            data: result,
        });
    } catch (error) {
        console.error("createQuote controller hatası:", error.message);

        return res.status(400).json({
            message: error.message,
        });
    }
}

async function getEntryDetailByEntryId(req, res) {
    try {
        const entry_id = Number(req.params.id);

        if (Number.isNaN(entry_id)) {
            return res.status(400).json({
                message: "Geçersiz entry_id.",
            });
        }

        const current_user_id = req.user ? req.user.id : null;

        const result = await getEntryDetailByEntryIdService(entry_id, current_user_id);

        return res.status(200).json({
            message: "Entry detail getirildi.",
            data: result,
        });
    } catch (error) {
        console.error("getEntryDetailByEntryId controller hatası:", error.message);

        return res.status(400).json({
            message: error.message,
        });
    }
}

async function getTimelineEntries(req, res) {
    try {
        const current_user_id = Number(req.user.id);
        const feed_type = req.query.feed || "foryou";

        let limit = Number(req.query.limit);

        if (Number.isNaN(limit)) {
            limit = 10;
        }

        const cursor_created_at = req.query.cursor_created_at || null;

        const raw_cursor_id = req.query.cursor_id;
        let cursor_id = null;

        if (raw_cursor_id !== undefined) {
            cursor_id = Number(raw_cursor_id);
        }

        const raw_cursor_score = req.query.cursor_score;
        let cursor_score = null;

        if (raw_cursor_score !== undefined) {
            cursor_score = Number(raw_cursor_score);
        }

        if (!Number.isInteger(current_user_id) || current_user_id < 1) {
            return res.status(400).json({
                message: "Geçersiz current_user_id."
            });
        }

        if (!Number.isInteger(limit) || limit < 1) {
            return res.status(400).json({
                message: "Geçersiz limit değeri. 1 veya daha büyük bir değer giriniz."
            });
        }

        if (feed_type !== "foryou" && feed_type !== "following") {
            return res.status(400).json({
                message: "Geçersiz feed_type değeri. Sadece 'following' veya 'foryou' olabilir."
            });
        }

        const has_cursor_created_at = cursor_created_at !== null;
        const has_cursor_id = raw_cursor_id !== undefined;
        const has_cursor_score = raw_cursor_score !== undefined;

        if (feed_type === "foryou") {
            const has_any_cursor =
                has_cursor_score ||
                has_cursor_created_at ||
                has_cursor_id;

            const has_full_cursor =
                has_cursor_score &&
                has_cursor_created_at &&
                has_cursor_id;

            if (has_any_cursor && !has_full_cursor) {
                return res.status(400).json({
                    message: "For You cursor için cursor_score, cursor_created_at ve cursor_id birlikte gönderilmelidir."
                });
            }

            if (has_cursor_score && Number.isNaN(cursor_score)) {
                return res.status(400).json({
                    message: "Geçersiz cursor_score değeri."
                });
            }
        }

        if (feed_type === "following") {
            if (has_cursor_created_at !== has_cursor_id) {
                return res.status(400).json({
                    message: "Following cursor için cursor_created_at ve cursor_id birlikte gönderilmelidir."
                });
            }
        }

        if (has_cursor_id && (!Number.isInteger(cursor_id) || cursor_id < 1)) {
            return res.status(400).json({
                message: "Geçersiz cursor_id değeri."
            });
        }

        if (
            has_cursor_created_at &&
            Number.isNaN(new Date(cursor_created_at).getTime())
        ) {
            return res.status(400).json({
                message: "Geçersiz cursor_created_at değeri."
            });
        }

        const result = await getTimelineEntriesService(
            feed_type,
            limit,
            cursor_created_at,
            cursor_id,
            current_user_id,
            cursor_score
        );

        return res.status(200).json({
            message: "Timeline getirildi.",
            data: result
        });

    } catch (error) {
        console.error("getTimelineEntries controller hatası:", error.message);

        return res.status(400).json({
            message: error.message
        });
    }
}
async function toggleEntryLike(req, res) {
    try {
        const user_id = req.user.id;
        const entry_id = Number(req.params.id);

        if (Number.isNaN(entry_id)) {
            return res.status(400).json({
                message: "Geçersiz entry_id.",
            });
        }

        const result = await toggleEntryLikeService(user_id, entry_id);

        if (result.is_liked_by_me === true) {
            return res.status(200).json({
                message: "Gönderi beğenildi.",
                data: result,
            });
        }

        return res.status(200).json({
            message: "Gönderi beğenisi geri alındı.",
            data: result,
        });
    } catch (error) {
        console.error("toggleEntryLike controller hatası:", error.message);

        return res.status(400).json({
            message: error.message,
        });
    }
}

async function toggleEntryRepost(req, res) {
    try {
        const user_id = req.user.id;
        const original_entry_id = Number(req.params.id);

        if (Number.isNaN(original_entry_id)) {
            return res.status(400).json({
                message: "Geçersiz entry_id.",
            });
        }

        const result = await toggleEntryRepostService(user_id, original_entry_id);

        if (result.is_reposted_by_me === true) {
            return res.status(200).json({
                message: "Gönderi repostlandı.",
                data: result,
            });
        }

        return res.status(200).json({
            message: "Gönderi repost'u geri alındı.",
            data: result,
        });
    } catch (error) {
        console.error("toggleEntryRepost controller hatası:", error.message);

        return res.status(400).json({
            message: error.message,
        });
    }
}

async function getEntryLikes(req, res) {
    try {
        const entry_id = Number(req.params.id);
        const current_user_id = Number(req.user.id);

        let limit = Number(req.query.limit);
        let offset = Number(req.query.offset);

        if (Number.isNaN(limit)) {
            limit = 10;
        }

        if (Number.isNaN(offset)) {
            offset = 0;
        }

        if (!Number.isInteger(entry_id) || entry_id < 1) {
            return res.status(400).json({
                message: "Geçersiz entry_id.",
            });
        }

        if (!Number.isInteger(current_user_id) || current_user_id < 1) {
            return res.status(400).json({
                message: "Geçersiz current_user_id.",
            });
        }

        if (!Number.isInteger(limit) || limit < 1) {
            return res.status(400).json({
                message: "Geçersiz limit.",
            });
        }

        if (!Number.isInteger(offset) || offset < 0) {
            return res.status(400).json({
                message: "Geçersiz offset.",
            });
        }

        const result = await getEntryLikesService(
            entry_id,
            current_user_id,
            limit,
            offset
        );

        return res.status(200).json({
            message: "Entry likes getirildi.",
            data: result
        });

    } catch(error) {
        console.error("getEntryLikes controller hatası : ", error.message);

        return res.status(400).json({
            message: error.message
        });
    }
}

module.exports = {
    createPost,
    createComment,
    createRepost,
    createQuote,
    getEntryDetailByEntryId,
    getTimelineEntries,
    toggleEntryLike,
    toggleEntryRepost,
    getEntryLikes
};