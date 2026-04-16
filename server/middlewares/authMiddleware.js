const jwt = require("jsonwebtoken");

async function authMiddleware(req, res, next) {
    try {

        const authHeader= req.headers.authorization;

        if(!authHeader) {
            return res.status(401).json({
                message : "Yetkisiz erişim."
            })
        }

        const parts = authHeader.split(" ");

        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return res.staturs(401).json({
                message : "oken formatı hatalı."
            })
        }

        const token = parts[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();

    } catch(error) {

        return res.status(401).json({
            message: "Geçersiz veya süresi dolmuş token.",
        });
    }
}

module.exports = {
    authMiddleware,
};