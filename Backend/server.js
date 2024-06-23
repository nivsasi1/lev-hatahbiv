/* eslint-disable spaced-comment */
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const passport = require("passport");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");
const jwt = require("jsonwebtoken");
const LocalStrategy = require("passport-local").Strategy;
const { Strategy, ExtractJwt } = require("passport-jwt");
const session = require("express-session");
const MongoDBSession = require("connect-mongodb-session")(session);
const User = require("./models/authentication/user.model");

// require("dotenv").config();
require("dotenv").config({ path: ".env" });

//app config
const app = express();
app.use(express.json());
const port = process.env.PORT || 5000;
// app.set("view engine", "ejs");

app.use(cors());
app.use(bodyParser.json({ limit: "100mb" }));
app.use(express.json({ limit: "100mb" }));
// !
app.use(morgan("dev"));
app.use(cookieParser());
// !
app.use("/uploads", express.static("uploads")); // to acsses the uploades folder in the server

// Configure Mongo
const dbUrl = process.env.DB_URL;

// Connect to Mongo with Mongoose
const store = new MongoDBSession({
  uri: dbUrl,
  collection: "sessions",
});

mongoose
  .connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // useCreateIndex: true,
  })
  .then(() =>
    console.log("MongoDB database connection established successfully")
  )
  .catch((err) => console.log(err));

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      maxAge: 60 * 60 * 1000 * 24, // 1 day
      secure: false, // Set to true if using HTTPS
      httpOnly: true,
    },
  })
);

passport.use(
  new Strategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.SECRET,
    },
    function (jwtPayload, done) {
      return done(null, jwtPayload);
    }
  )
);

// Configure the local strategy
passport.use(
  "local",
  new LocalStrategy(
    { usernameField: "username", passwordField: "password" },
    (username, password, done) => {
      if (password !== process.env.PASS) {
        return done(new Error("invalid admin password"), null);
      }
      User.findOne({ username })
        .then((user) => {
          if (!user) {
            if (!user) return done("not found 1", null);
          } else {
            done(null, user.toObject());
          }
        })
        .catch((err) => {
          return done(err, null);
        });
    }
  )
);

app.use(passport.initialize());
app.use(passport.session());

if (process.env.NODE_ENV === "production") {
  //set static folder
  app.use(express.static("frontend/build"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "frontend", "build", "index.html"));
  });
}
app.post("/admin_signin", async (req, res, next) => {
  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err === "not found") {
      return res
        .status(400)
        .json({ error: true, error_message: "שגיאה - המשתמש לא נמצא" });
    }
    if (!user) {
      return res
        .status(400)
        .json({ error: true, error_message: "שגיאה - המשתמש לא נמצא" });
    }
    req.login(user, { session: false }, (err) => {
      if (err) {
        return res
          .status(400)
          .json({ error: true, error_message: err.message });
      }
      return res.json({
        error: false,
        data: {
          jwt: jwt.sign(user, process.env.SECRET),
          user: btoa(encodeURIComponent(JSON.stringify(user))),
        },
      });
    });
  })(req, res, next);
});

app.get(
  "/get_user",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    if (req) {
      res.json({ data: req.user });
    } else {
      res.json({ error: true, error_message: "not authenticated" });
    }
  }
);

const products = require("./routes/products/products");
app.use("/", products);

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
