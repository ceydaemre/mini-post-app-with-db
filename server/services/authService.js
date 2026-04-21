const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { hydrateEntryCardByEntryIdService, hydrateTimelineEntryCardByEntryIdService } = require("./entryService");

async function registerUserService({ full_name, username, email, password }) {
    if(!full_name || String(full_name).trim() === "") {
        throw new Error("full_name zorunludur.");
    }

    if(!username || String(username).trim() === "") {
        throw new Error("username zorunludur.");
    }

    if(!email || String(email).trim() === "") {
        throw new Error("email zorunludur.");
    }

    if(!password || String(password).trim() === "") {
        throw new Error("password zorunludur.");
    }

    const existingEmailQuery = `
        SELECT * 
        FROM users
        WHERE email = $1
    `;

    const existingEmailResult = await pool.query(existingEmailQuery, [ email ]);

    if(existingEmailResult.rows.length > 0) {
        throw new Error("Bu email zaten kullanılıyor.");
    }

    const existingUsernameQuery = `
        SELECT * 
        FROM users
        WHERE username = $1
    `;

    const existingUsernameResult = await pool.query(existingUsernameQuery, [ username ]);

    if(existingUsernameResult.rows.length > 0) {
        throw new Error("Bu username zaten kullanılıyor.");
    }

    const saltRounds = 10 //şifreyi kaç tur karıştıracağını belirler
    const password_hash = await bcrypt.hash(password, saltRounds);

    const insertUserQuery = `
        INSERT INTO users (full_name, username, email, password_hash)
        VALUES ($1, $2, $3, $4)
        RETURNING id, full_name, username, email
    `;

    const values = [full_name, username, email, password_hash];

    const insertUserResult = await pool.query(insertUserQuery, values);
    
    return insertUserResult.rows[0];

}

async function loginUserService({email, password}) {

    if(!email || String(email).trim() === "") {
        throw new Error("email zorunludur.");
    }

    if(!password || String(password).trim() === "") {
        throw new Error("password zorunludur.");
    }

    const findUserQuery = `
        SELECT id, full_name, username, email, password_hash, created_at
        FROM users
        WHERE email = $1
    `;

    const findUserResult = await pool.query(findUserQuery, [email]);

    if(findUserResult.rows.length === 0) {
        throw new Error("Email veya şifre hatalı");
    }

    const user = findUserResult.rows[0];

    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);

    if(!isPasswordMatch) {
        throw new Error("Email veya şifre hatalı.");
    }

    const token = jwt.sign ({
        id : user.id,
        username : user.username,
    },
    process.env.JWT_SECRET,
    {
        expiresIn : "7d",
    });

    const safeUser = {
        id : user.id,
        full_name : user.full_name,
        username : user.username,
        email : user.email,
        created_at : user.created_at
    }

    return {
        user : safeUser,
        token
    };
}

module.exports = {
  registerUserService,
  loginUserService,
};

