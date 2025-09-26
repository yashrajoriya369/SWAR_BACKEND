const { default: mongoose } = require("mongoose");

const dbConnect = () => {
  try {
    const conn = mongoose.connect(process.env.MONGODB_URL);
    console.log("Database Connect Successfully");
  } catch (error) {
    console.log("Database connection failed.", error);
    process.exit(1);
  }
};

module.exports = dbConnect;
