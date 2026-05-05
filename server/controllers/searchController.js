const {
    searchUsersService,
    searchEntriesService
} = require("../services/searchService");

async function searchUsers(req, res) {
    try {
        const q = req.query.q;

        const current_user_id =
            req.user && req.user.id !== undefined
                ? Number(req.user.id)
                : null;

        let limit = Number(req.query.limit);
        let offset = Number(req.query.offset);

        if (Number.isNaN(limit)) {
            limit = 10;
        }

        if (Number.isNaN(offset)) {
            offset = 0;
        }

        if (!q || String(q).trim() === "") {
            return res.status(400).json({
                message: "Arama parametresi zorunludur."
            });
        }

        const result = await searchUsersService(
            q,
            current_user_id,
            limit,
            offset
        );

        return res.status(200).json({
            message: "Kullanıcı arama sonuçları getirildi.",
            data: result
        });

    } catch (error) {
        console.error("searchUsers controller hatası:", error.message);

        return res.status(400).json({
            message: error.message
        });
    }
}

async function searchEntries(req, res) {
    try {
        const q = req.query.q;

        const current_user_id =
            req.user && req.user.id !== undefined
                ? Number(req.user.id)
                : null;

        let limit = Number(req.query.limit);
        let offset = Number(req.query.offset);

        if (Number.isNaN(limit)) {
            limit = 10;
        }

        if (Number.isNaN(offset)) {
            offset = 0;
        }

        if (!q || String(q).trim() === "") {
            return res.status(400).json({
                message: "Arama parametresi zorunludur."
            });
        }

        const result = await searchEntriesService(
            q,
            current_user_id,
            limit,
            offset
        );

        return res.status(200).json({
            message: "Entry arama sonuçları getirildi.",
            data: result
        });

    } catch (error) {
        console.error("searchEntries controller hatası:", error.message);

        return res.status(400).json({
            message: error.message
        });
    }
}

module.exports = {
    searchUsers,
    searchEntries
};