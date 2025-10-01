const otpTemplate = (otp) => {
 return `
 <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Email Verification</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f0f3f8;
      margin: 0;
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #fff;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    }
    .header {
      background: linear-gradient(135deg, #007bff, #00c6ff);
      color: #fff;
      text-align: center;
      padding: 25px 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 35px 25px;
      text-align: center;
    }
    .content h2 {
      font-size: 20px;
      margin-bottom: 15px;
      color: #222;
    }
    .content p {
      font-size: 15px;
      line-height: 1.6;
      margin: 10px 0;
      color: #555;
    }
    .otp-box {
      margin: 25px auto;
      display: inline-block;
      background: #f0f8ff;
      border: 2px dashed #007bff;
      padding: 16px 32px;
      border-radius: 10px;
      font-size: 26px;
      font-weight: bold;
      color: #007bff;
      letter-spacing: 4px;
    }
    .note {
      font-size: 13px;
      color: #777;
      margin-top: 20px;
    }
    .divider {
      margin: 30px auto;
      border-top: 1px solid #eee;
      width: 80%;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #aaa;
      padding: 20px;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📩 Email Verification</h1>
    </div>

    <div class="content">
      <h2>Hello,</h2>
      <p>Use the OTP code below to verify your email address:</p>
      <div class="otp-box">${otp}</div>
      <p class="note">⏳ This OTP will expire in 10 minutes.<br>
      If you didn’t request this, you can safely ignore this email.</p>
    </div>

    <div class="divider"></div>

    <div class="footer">
      &copy; ${new Date().getFullYear()} PrepMaster. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
};

module.exports = otpTemplate;