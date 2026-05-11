import Joi from 'joi';

export const updateMeSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .required()
        .messages({
            'string.empty': 'Name is required',
            'string.min': 'Name must be at least 2 characters',
            'string.max': 'Name must be at most 50 characters',
            'any.required': 'Name is required',
        }),
})
    .prefs({ allowUnknown: false, stripUnknown: false })
    .messages({
        'object.unknown': 'Unsupported field {{#label}}. Only "name" can be updated.',
    });

export const updateAiSettingsSchema = Joi.object({
    aiEnabled: Joi.number()
        .valid(0, 1)
        .required()
        .messages({
            'any.only': 'aiEnabled must be 0 or 1',
            'any.required': 'aiEnabled is required',
            'number.base': 'aiEnabled must be 0 or 1',
        }),
})
    .prefs({ allowUnknown: false, stripUnknown: false })
    .messages({
        'object.unknown': 'Unsupported field {{#label}}. Only "aiEnabled" can be updated.',
    });
