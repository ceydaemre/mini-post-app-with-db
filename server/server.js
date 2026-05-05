const express = require("express");
const pool = require("./config/db");
require("dotenv").config();

const entryRoutes = require("./routes/entryRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const searchRoutes = require("./routes/searchRoutes");
const notificationsRoutes = require("./routes/notificationsRoutes");
const app = express();

app.use(express.json());

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS current_time");

    return res.status(200).json({
      message: "Server ve database bağlantısı başarılı.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Health check hatası:", error.message);

    return res.status(500).json({
      message: error.message,
    });
  }
});

app.use("/api/entries", entryRoutes);
app.use("/api/auth", authRoutes); 
app.use("/api/users", userRoutes); 
app.use("/api/search", searchRoutes);
app.use("/api/notifications", notificationsRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server çalışıyor: http://localhost:${PORT}`);
});

