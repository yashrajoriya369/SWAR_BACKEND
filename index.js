const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv").config({ quiet: true });
const PORT = process.env.PORT || 4000;
const dbConnect = require("./config/dbConnect");
const app = express();
const authRouter = require("./routes/authRoute");

dbConnect();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// app.use("/api/user", authRouter);
app.use("/api/auth", authRouter);

app.listen(PORT, () => {
  console.log(`Server is running at PORT ${PORT}`);
});
