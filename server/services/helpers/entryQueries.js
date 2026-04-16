const pool = require("../../config/db");

async function getOriginalEntry(entry) {
    if (entry.original_entry_id === null || entry.original_entry_id === undefined) {
        throw new Error("Original entry bulunamadı.");
    }

    const result = await pool.query(`SELECT * FROM entries WHERE id = $1`,[entry.original_entry_id]);

    if (result.rows.length === 0) {
        throw new Error("Original entry bulunamadı.");
    }

    return result.rows[0];
}

module.exports = {
    getOriginalEntry,
};