const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv").config({ quiet: true });
const PORT = process.env.PORT || 4000;
const dbConnect = require("./config/dbConnect");
const app = express();
const authRouter = require("./routes/authRoute");
const adminRouter = require("./routes/adminRoute");
const postRouter = require("./routes/quizRoute");
const otpRouter = require("./routes/otpRoutes");
const passRouter = require("./routes/passRoutes");
const attemptRouter = require("./routes/attemptRoute");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");

dbConnect();
app.use(morgan("dev"));

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://192.168.1.10:3000",
  "http://localhost:5173",
  "https://user-ten-kohl.vercel.app",
  "https://swar-admin-ko63.vercel.app",
  "https://super-admin-rho-rosy.vercel.app",
  "https://superproject-chi.vercel.app",
  "https://superproject-chi.vercel.app/admin/login",
  "https://superproject-chi.vercel.app/superadmin/login",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Cache-Control"
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
app.use("/api/admin", adminRouter);
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
