const Joi = require("joi");

const validateSignup = (data) => {
  const schema = Joi.object({
    fullName: Joi.string().min(3).max(50).required().messages({
      "string.empty": "Full name is required",
      "string.min": "Full name must be at least 3 characters",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "string.empty": "Email is required",
    }),
    password: Joi.string()
      .min(8)
      .pattern(new RegExp("(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])"))
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters long",
        "string.pattern.base":
          "Password must include uppercase, lowercase, and a number",
      }),
  });

  return schema.validate(data);
};

module.exports = { validateSignup };
