const express = require("express");
const router = express.Router();

const {
    searchUsers,
    searchEntries
} = require("../controllers/searchController");

const {
    optionalAuthMiddleware
} = require("../middlewares/authMiddleware");

router.get("/users", optionalAuthMiddleware, searchUsers);
router.get("/entries", optionalAuthMiddleware, searchEntries);

module.exports = router;