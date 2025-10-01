const sendResetPasswordEmail = (resetLink, userName) => {
  return `
  <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Password Reset</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #e0f0ff, #f9f9ff);
      margin: 0;
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #fff;
      padding: 40px 30px;
      border-radius: 12px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header img {
      max-width: 120px;
      margin-bottom: 15px;
    }
    .header h1 {
      font-size: 22px;
      margin: 0;
      color: #007bff;
    }
    .content h2 {
      font-size: 20px;
      margin-bottom: 10px;
    }
    .content p {
      font-size: 15px;
      line-height: 1.6;
      margin: 10px 0;
    }
    .btn {
      display: inline-block;
      background: #007bff;
      color: #fff !important;
      padding: 14px 28px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
      transition: 0.3s ease;
    }
    .btn:hover {
      background: #0056b3;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #888;
      margin-top: 30px;
    }
    .note {
      font-size: 13px;
      color: #555;
      margin-top: 15px;
      border-left: 4px solid #007bff;
      padding-left: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <!-- Replace with your logo -->
      <h1>Password Reset Request</h1>
    </div>

    <div class="content">
      <h2>Hello ${userName || "User"},</h2>
      <p>We received a request to reset your password. To proceed, please click the button below:</p>
      <p><a href="${resetLink}" class="btn">Reset Password</a></p>
      <p class="note">This link will expire in 10 minutes. If you didn’t request a password reset, you can safely ignore this email.</p>
    </div>

    <div class="footer">
      &copy; ${new Date().getFullYear()} PrepMaster. All rights reserved.
    </div>
  </div>
</body>
</html>

  `;
};

module.exports = sendResetPasswordEmail;
