const {
    toggleFollowService,
    getUserProfileService,
    getUserPostsService,
    getUserRepliesService,
    getUserLikesService
} = require("../services/userService");

async function toggleFollow(req, res) {
    try {
        const follower_id = Number(req.user.id);
        const following_id = Number(req.params.id);

        if (!Number.isInteger(follower_id) || follower_id < 1) {
            return res.status(400).json({ message: "Hatalı follower_id." });
        }

        if (!Number.isInteger(following_id) || following_id < 1) {
            return res.status(400).json({ message: "Hatalı following_id." });
        }

        const result = await toggleFollowService(follower_id, following_id);

        return res.status(200).json({
            message: result.is_following ? "Kullanıcı takip edildi." : "Takipten çıkıldı.",
            data: result
        });

    } catch (error) {
        console.error("toggleFollow controller hatası:", error.message);
        return res.status(400).json({ message: error.message });
    }
}

async function getUserProfile(req, res) {
    try {
        const profile_user_id = Number(req.params.id);

        const current_user_id =
            req.user && req.user.id !== undefined
                ? Number(req.user.id)
                : null;

        if (!Number.isInteger(profile_user_id) || profile_user_id < 1) {
            return res.status(400).json({ message: "Geçersiz profile_user_id." });
        }

        const result = await getUserProfileService(profile_user_id, current_user_id);

        return res.status(200).json({
            message: "Profil getirildi.",
            data: result
        });

    } catch (error) {
        console.error("getUserProfile controller hatası:", error.message);
        return res.status(400).json({ message: error.message });
    }
}

async function getUserPosts(req, res) {
    try {
        const profile_user_id = Number(req.params.id);

        const current_user_id =
            req.user && req.user.id !== undefined
                ? Number(req.user.id)
                : null;

        let limit = Number(req.query.limit);
        let offset = Number(req.query.offset);

        if (Number.isNaN(limit)) limit = 10;
        if (Number.isNaN(offset)) offset = 0;

        if (!Number.isInteger(profile_user_id) || profile_user_id < 1) {
            return res.status(400).json({ message: "Geçersiz profile_user_id." });
        }

        if (!Number.isInteger(limit) || limit < 1) {
            return res.status(400).json({ message: "Geçersiz limit." });
        }

        if (!Number.isInteger(offset) || offset < 0) {
            return res.status(400).json({ message: "Geçersiz offset." });
        }

        const result = await getUserPostsService(
            profile_user_id,
            current_user_id,
            limit,
            offset
        );

        return res.status(200).json({
            message: "Kullanıcının postları getirildi.",
            data: result
        });

    } catch (error) {
        console.error("getUserPosts controller hatası:", error.message);
        return res.status(400).json({ message: error.message });
    }
}

async function getUserReplies(req, res) {
    try {
        const profile_user_id = Number(req.params.id);

        const current_user_id =
            req.user && req.user.id !== undefined
                ? Number(req.user.id)
                : null;

        let limit = Number(req.query.limit);
        let offset = Number(req.query.offset);

        if (Number.isNaN(limit)) limit = 10;
        if (Number.isNaN(offset)) offset = 0;

        if (!Number.isInteger(profile_user_id) || profile_user_id < 1) {
            return res.status(400).json({ message: "Geçersiz profile_user_id." });
        }

        if (!Number.isInteger(limit) || limit < 1) {
            return res.status(400).json({ message: "Geçersiz limit." });
        }

        if (!Number.isInteger(offset) || offset < 0) {
            return res.status(400).json({ message: "Geçersiz offset." });
        }

        const result = await getUserRepliesService(
            profile_user_id,
            current_user_id,
            limit,
            offset
        );

        return res.status(200).json({
            message: "Kullanıcının yanıtları getirildi.",
            data: result
        });

    } catch (error) {
        console.error("getUserReplies controller hatası:", error.message);
        return res.status(400).json({ message: error.message });
    }
}

async function getUserLikes(req, res) {
    try {
        const profile_user_id = Number(req.params.id);
        const current_user_id = Number(req.user.id);

        let limit = Number(req.query.limit);
        let offset = Number(req.query.offset);

        if (Number.isNaN(limit)) {
            limit = 10;
        }

        if (Number.isNaN(offset)) {
            offset = 0;
        }

        if (!Number.isInteger(profile_user_id) || profile_user_id < 1) {
            return res.status(400).json({
                message: "Geçersiz profile_user_id."
            });
        }

        if (!Number.isInteger(current_user_id) || current_user_id < 1) {
            return res.status(400).json({
                message: "Geçersiz current_user_id."
            });
        }

        if (!Number.isInteger(limit) || limit < 1) {
            return res.status(400).json({
                message: "Geçersiz limit."
            });
        }

        if (!Number.isInteger(offset) || offset < 0) {
            return res.status(400).json({
                message: "Geçersiz offset."
            });
        }

        const result = await getUserLikesService(
            profile_user_id,
            current_user_id,
            limit,
            offset
        );

        return res.status(200).json({
            message: "Kullanıcının beğendiği entryler getirildi.",
            data: result
        });

    } catch (error) {
        console.error("getUserLikes controller hatası:", error.message);

        return res.status(400).json({
            message: error.message
        });
    }
}

module.exports = {
    toggleFollow,
    getUserProfile,
    getUserPosts,
    getUserReplies,
    getUserLikes
};