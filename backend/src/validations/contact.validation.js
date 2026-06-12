import Joi from 'joi';

export const contactMessageSchema = Joi.object({
    message: Joi.string()
        .trim()
        .min(1)
        .max(10000)
        .required()
        .messages({
            'string.empty': 'Message is required',
            'string.min': 'Message is required',
            'string.max': 'Message must be at most 10000 characters',
            'any.required': 'Message is required',
        }),
    subject: Joi.string()
        .trim()
        .min(2)
        .max(120)
        .allow('')
        .optional()
        .messages({
            'string.min': 'Subject must be at least 2 characters',
            'string.max': 'Subject must be at most 120 characters',
        }),
})
    .prefs({ allowUnknown: false, stripUnknown: false })
    .messages({
        'object.unknown': 'Unsupported field {{#label}}. Only "message" and "subject" are accepted.',
    });
