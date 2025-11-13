const notificationTemplate = (
  title,
  message,
  buttonText = null,
  buttonLink = null
) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@40
              <p>Your trusted platform for preparation & success</p>0;600&display=swap" rel="stylesheet">
  <style>
    body { 
      font-family: 'Poppins', Arial, sans-serif; 
      background:#f4f6fb; 
      margin:0; 
      padding:0; 
    }
    .container { 
      max-width:600px; 
      margin:40px auto; 
      background:#fff; 
      border-radius:12px; 
      overflow:hidden; 
      box-shadow:0 4px 20px rgba(0,0,0,0.08); 
    }
    .header {
      background: linear-gradient(135deg, #007bff, #00c6ff);
      color:#fff;
      padding:20px 30px;
      text-align:center;
    }
    .header h2 {
      margin:0;
      font-size:22px;
      font-weight:600;
    }
    .content { 
      padding:30px; 
      color:#444;
    }
    .content p { 
      line-height:1.6; 
      font-size:15px; 
      margin:0 0 15px; 
    }
    .btn { 
      display:inline-block; 
      padding:14px 28px; 
      margin-top:20px; 
      font-size:15px; 
      font-weight:600;
      color:#fff; 
      background: linear-gradient(135deg, #007bff, #00c6ff);
      text-decoration:none; 
      border-radius:8px; 
      transition: all 0.3s ease;
    }
    .btn:hover {
      background: linear-gradient(135deg, #0056b3, #004099);
    }
    .divider {
      border-top:1px solid #eee;
      margin:25px 0;
    }
    .footer { 
      font-size:12px; 
      color:#999; 
      padding:15px; 
      text-align:center; 
      background:#f9f9f9; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${title}</h2>
      <p>Your trusted platform for preparation & success</p>
    </div>
    <div class="content">
      <p>${message}</p>
      ${
        buttonText && buttonLink
          ? `<a href="${buttonLink}" class="btn">${buttonText}</a>`
          : ""
      }
      <div class="divider"></div>
      <p style="font-size:13px; color:#777; text-align:center;">
        If you did not expect this email, you can safely ignore it.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} SYNRX. All rights reserved.
    </div>
  </div>
</body>
</html>

`;
};

module.exports = notificationTemplate;
