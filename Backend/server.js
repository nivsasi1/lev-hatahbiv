const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const morgan = require("morgan");

require("dotenv").config({ path: ".env" });

// app config
const app = express();
// Render runs behind a proxy — req.ip must reflect X-Forwarded-For so the
// per-IP rate limiter in routes/newsletter.js doesn't collapse into one bucket.
app.set("trust proxy", 1);
app.use(cors());
app.use(bodyParser.json({ limit: "100mb" }));
app.use(express.json({ limit: "100mb" }));
app.use(morgan("dev"));
app.use("/uploads", express.static("uploads")); // local image fallback (S3 in prod)

const port = process.env.PORT || 5000;

// Connect to Mongo
mongoose
  .connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() =>
    console.log("MongoDB database connection established successfully")
  )
  .catch((err) => console.log(err));

// JWT-protected manager dashboard API (login, product CRUD, upload, publish).
const admin = require("./routes/admin/admin");
app.use("/admin", admin);

// public newsletter + order log (per-IP rate-limited).
const newsletter = require("./routes/newsletter");
app.use("/", newsletter);

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
