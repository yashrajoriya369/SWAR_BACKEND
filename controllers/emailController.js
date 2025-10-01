const nodemailer = require("nodemailer");
const sendResetPasswordEmail = require("../Templates/emailTemplate");
const otpTemplate = require("../Templates/otpTemplates");
const notificationTemplate = require("../Templates/notificationTemplate");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_ID,
    pass: process.env.MAIL_PASS,
  },
});

const sendEmail = async (to, subject, type, payload = {}) => {
  let htmlContent = "";

  switch (type) {
    case "reset":
      htmlContent = sendResetPasswordEmail(payload.resetLink, payload.userName);
      break;
    case "otp":
      htmlContent = otpTemplate(payload.otp);
      break;
    case "notification":
      htmlContent = notificationTemplate(
        payload.title,
        payload.message,
        payload.buttonText,
        payload.buttonLink
      );
      break;
    default:
      throw new Error("Invalid email type");
  }
  await transporter.sendMail({
    from: '"Hey 👻" <yashrajoriya369@gmail.com>',
    to,
    subject,
    html: htmlContent,
  });
};

module.exports = sendEmail;
