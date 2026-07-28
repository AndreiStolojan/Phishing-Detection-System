import Joi from "joi";

const lowerCasePattern = /[a-z]/;
const upperCasePattern = /[A-Z]/;
const numberPattern = /\d/;
const specialCharacterPattern = /[^A-Za-z\d]/;
const localEmailSyntax = Joi.string().email({ tlds: { allow: false } });
const publicEmailSyntax = Joi.string().email({ tlds: { allow: true } });

// Local development uses the reserved `.test` domain for the demo account;
// all other domains must have an IANA-recognized public suffix.
const emailField = Joi.string().trim().lowercase().custom((value, helpers) => {
  if (value.endsWith('.test')) {
    const { error } = localEmailSyntax.validate(value);
    return error ? helpers.error('string.email') : value;
  }
  const { error } = publicEmailSyntax.validate(value);
  return error ? helpers.error('string.email') : value;
}).required().messages({
  "string.empty": "Email is required",
  "string.email": "Please provide a valid email address",
  "any.required": "Email is required",
});

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 2 characters",
    "string.max": "Name must be at most 50 characters",
    "any.required": "Name is required",
  }),

  email: emailField,

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(lowerCasePattern, { name: "lowercase letter" })
    .pattern(upperCasePattern, { name: "uppercase letter" })
    .pattern(numberPattern, { name: "number" })
    .pattern(specialCharacterPattern, { name: "special character" })
    .required()
    .messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 8 characters",
      "string.max": "Password must be at most 128 characters",
      "string.pattern.name": "Password must include at least one {#name}",
      "any.required": "Password is required",
    }),
});

export const loginSchema = Joi.object({
  email: emailField,

  password: Joi.string().required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
});
