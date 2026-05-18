const { Pool } = require("pg");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env")
});
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || undefined,
  database: process.env.DB_NAME,
});

module.exports = pool;