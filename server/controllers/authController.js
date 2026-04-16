const {
    registerUserService,
    loginUserService
} = require("../services/authService");

async function registerUser(req, res) {
    try {
        const { full_name, username, email, password } = req.body;

        const result = await registerUserService({ full_name, username, email, password });

        return res.status(201).json({
            message : "Kullanıcı başarıyla oluşturuldu.",
            data : result
        });

    } catch(error) {
        console.error("registerUser controller hatası : ", error.message);

        return res.status(400).json({
            message : error.message
        });
    }
}

async function loginUser(req, res) {
    try {
        const { email, password } = req.body

        const result = await loginUserService({ email, password });

        return res.status(200).json({
            message : "Giriş yapıldı.",
            data : result
        })
    } catch(error) {
        console.error("loginUser controller hatası : ", error.message);

        return res.status(400).json({
            message : error.message
        });
    }
} 

module.exports = {
    registerUser,
    loginUser
};