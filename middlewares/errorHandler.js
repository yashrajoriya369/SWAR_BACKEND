// Not Found
const notFound = (req, res, next) => {
  const error = new Error(`Not FoundL ${req.orginalUrl}`);
  res.status(404);
  next(error);
};
// Error Handler
const errorHandler = (err, req, res, next) => {
  const statuscode = res.statusCode == 200 ? 500 : res.statusCode;
  res.status(statuscode);
  res.json({
    status: "fail",
    message: err?.message,
    statck: process.env.NODE_ENV === "production" ? undefined : err?.statck,
  });
};

module.exports = { notFound, errorHandler };
