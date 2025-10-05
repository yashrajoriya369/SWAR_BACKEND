const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv").config({ quiet: true });
const PORT = process.env.PORT || 4000;
const dbConnect = require("./config/dbConnect");
const app = express();
const authRouter = require("./routes/authRoute");
const postRouter = require("./routes/quizRoute");
const otpRouter = require("./routes/otpRoutes");
const passRouter = require("./routes/passRoutes");
const attemptRouter = require("./routes/attemptRoute");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");

dbConnect();
app.use(morgan("dev"));

// const allowedOrigins = [
//   "http://localhost:3000",
//   "http://localhost:3001",
//   "https://user-gold-omega.vercel.app",
//   "https://swar-admin-ko63.vercel.app",
// ];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin) return callback(null, true);

//       if (allowedOrigins.includes(origin)) {
//         return callback(null, true);
//       } else {
//         return callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//   })
// );

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://user-gold-omega.vercel.app",
  "https://swar-admin-ko63.vercel.app",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/quizzes", postRouter);
app.use("/api/auth", otpRouter);
app.use("/api/auth", passRouter);
app.use("/api/attempt", attemptRouter);

app.get("/", (req, res) => {
  res.send("Hello from Server Side");
});

app.listen(PORT, () => {
  console.log(`Server is running at PORT ${PORT}`);
});
