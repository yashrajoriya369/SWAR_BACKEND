const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv").config({ quiet: true });
const PORT = process.env.PORT || 4000;
const dbConnect = require("./config/dbConnect");
const app = express();
const authRouter = require("./routes/authRoute");
const postRouter = require("./routes/quizRoute");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");

dbConnect();
app.use(morgan("dev"));
// app.use(cors());

// Allow multiple specific origins
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://user-omega-three.vercel.app",
  "https://swar-admin-ko63.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // if you need cookies / auth headers
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/quizzes", postRouter);

app.get("/", (req, res) => {
  res.send("Hello from Server Side");
});

app.listen(PORT, () => {
  console.log(`Server is running at PORT ${PORT}`);
});
