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
const { notFound, errorHandler } = require("./middlewares/errorHandler");

dbConnect();
app.use(morgan("dev"));
app.use(cors({ origin: "http://localhost:3000" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/quizzes", postRouter);

app.use(notFound);
app.use(errorHandler);

app.get("/", (req, res) => {
  res.send("Hello from Server Side");
});

app.listen(PORT, () => {
  console.log(`Server is running at PORT ${PORT}`);
});
