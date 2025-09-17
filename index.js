const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv").config({ quiet: true });
const PORT = process.env.PORT || 4000;
const dbConnect = require("./config/dbConnect");
const app = express();
const authRouter = require("./routes/authRoute");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");

dbConnect();
app.use(morgan("dev"));
// app.use(
//   cors({
//     origin: "https://user-omega-three.vercel.app/",
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE"],
//   })
// );
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/api/auth", authRouter);

app.get("/", (req, res) => {
  res.send("Hello from Server Side");
});

app.listen(PORT, () => {
  console.log(`Server is running at PORT ${PORT}`);
});
