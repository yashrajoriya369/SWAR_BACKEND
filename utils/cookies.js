const isProduction = process.env.NODE_ENV === "production";

function setTokenCookie(res, token, { maxAge = 1000 * 60 * 60 * 3 } = {}) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge,
  });
}

function clearTokenCookie(res) {
  res.cookie("token", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    expires: new Date(0),
  });
}

module.exports = { setTokenCookie, clearTokenCookie };
