const {
    createEntryService,
    getEntryDetailByEntryIdService,
    getTimelineEntriesService,
    toggleEntryLikeService,
    toggleEntryRepostService
} = require("../services/entryService");

async function createPost(req, res) {
    try {
        const user_id  = req.user.id;
        const content = req.body.content;

        const result = await createEntryService({
            user_id,
            type : "POST",
            content,
            parent_entry_id : null,
            original_entry_id : null
        });

        return res.status(201).json({
            message: "Entry oluşturuldu.",
            data: result,
        });

    } catch (error) {

        console.error("createPost controller hatası : ", error.message);

        return res.status(400).json({
            message: error.message
        });
    }
}

async function createComment(req, res) {
    try{
        const user_id = req.user.id;
        const parent_entry_id = Number(req.params.id);
        const content = req.body.content;

        if(Number.isNaN(parent_entry_id)) {
            return res.status(400).json({
                message : "Geçersiz parent_entry_id"
            })
        }

        const result = await createEntryService({
            user_id,
            type : "COMMENT",
            content,
            parent_entry_id,
            original_entry_id : null
        });

        return res.status(201).json({
            message : "Comment oluşturuldu.",
            data : result
        })
    } catch(error) {

        console.error("createComment hatası : ", error.message);

        return res.status(401).json({
            message : error.message
        });
    }
}

async function createRepost(req, res) {
   try{
        const user_id = req.user.id;
        const original_entry_id = Number(req.params.id);
        const content = req.body.content;

        if(Number.isNaN(original_entry_id)) {
            return res.status(400).json({
                message : "Geçersiz original_entry_id."
            })
        }

        const result = await createEntryService({
            user_id,
            type : "REPOST",
            content,
            parent_entry_id : null,
            original_entry_id
        });

        return res.status(401).json({
            message : "Repost oluşturuldu.",
            data : result
        })
   } catch(error) {

        console.error("createRepost hatası : ", error.message);

        return res.status(400).json({
            message : error.message
        });
   }

}

async function createQuote(req, res) {
    try {
        const user_id = req.user.id;
        const original_entry_id = Number(req.params.id);
        const content = req.body.content;

        if(Number.isNaN(original_entry_id)) {
            return res.status(400).json({
                message : "Geçersiz original_entry_id."
            });
        }

        const result = await createEntryService({
            user_id,
            type : "QUOTE",
            content,
            parent_entry_id : null,
            original_entry_id
        });

        return res.status(201).json({
            message : "Quote oluşturuldu.",
            data : result
        });

    } catch(error) {

        console.error("createQuote hatası : ", error.message);

        return res.status(400).json({
            message : error.message
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

        const result = await getEntryDetailByEntryIdService(entry_id);

        return res.status(200).json({
            message: "Entry detail getirildi.",
            data: result,
        });

    } catch (error) {

        console.error("getEntryDetailByEntryId controller hatası : ", error.message);

        return res.status(400).json({
            message: error.message,
        });
    }
}

async function getTimelineEntries(req, res) {
  try {
        let limit = Number(req.query.limit);
        let offset = Number(req.query.offset);

        if (Number.isNaN(limit)) {
            limit = 10;
        }

        if (Number.isNaN(offset)) {
            offset = 0;
        }

        if (limit < 1) {
            return res.status(400).json({
                message: "Geçersiz limit değeri. 1 veya daha büyük bir değer giriniz.",
            });
        }

        if (offset < 0) {
            return res.status(400).json({
                message: "Geçersiz offset değeri. 0 veya daha büyük bir değer giriniz.",
            });
        }

        const result = await getTimelineEntriesService(limit, offset);

        return res.status(200).json({
            message: "Timeline getirildi.",
            data: result,
        });

    } catch (error) {

        console.error("getTimelineEntries controller hatası : ", error.message);

        return res.status(400).json({
            message: error.message,
        });
  }
}

async function toggleEntryLike(req, res) {
    try{
        const user_id = req.user.id;
        const entry_id = Number(req.params.id);

        if(Number.isNaN(entry_id)){
            return res.status(400).json({
                message : "Geçersiz entry_id."
            });
        }

        const result = await toggleEntryLikeService(user_id, entry_id);

        if(result.is_liked_by_me === true) {

            return res.status(200).json({
                message : "Gönderi beğenildi.",
                data : result
            });
        } else {

            return res.status(200).json({
                message : "Gönderi beğenisi geri alındı.",
                data : result
            });
        }

    } catch(error) {

        console.error("toggleEntryLike controller hatası : ", error.message);

        return res.status(400).json({
            mesage : error.message
        });
    }
}
async function toggleEntryRepost(req, res) {
    try {
        const user_id = req.user.id;
        const original_entry_id = Number(req.params.id);

        if(Number.isNaN(original_entry_id)) {
            return res.status(400).json({
                message : "Geçersiz entry_id."
            });
        }

        const result = await toggleEntryRepostService(user_id, original_entry_id);

        if(result.is_reposted_by_me === true) {
            return res.status(200).json({
                message : "Gönderi repostlandı.",
                data : result
            });
        } else {
            return res.status(200).json({
                message : "Gönderi repost'u geri alındı."
            });
        }

    } catch(error) {
        
        console.error("toggleEntryRepost controller hatası : ", error.message);

        return res.status(400).json({
            message : error.message
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
    toggleEntryRepost
};