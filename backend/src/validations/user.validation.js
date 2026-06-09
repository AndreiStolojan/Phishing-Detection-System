import Joi from 'joi';

export const updateMeSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .optional()
        .messages({
            'string.empty': 'Name is required',
            'string.min': 'Name must be at least 2 characters',
            'string.max': 'Name must be at most 50 characters',
        }),
})
    .min(1)
    .prefs({ allowUnknown: false, stripUnknown: false })
    .messages({
        'object.min': 'At least one field is required: name',
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

export const updateNotificationSettingsSchema = Joi.object({
    alertsEnabled: Joi.number()
        .valid(0, 1)
        .optional()
        .messages({
            'any.only': 'alertsEnabled must be 0 or 1',
            'number.base': 'alertsEnabled must be 0 or 1',
        }),
    digestEnabled: Joi.number()
        .valid(0, 1)
        .optional()
        .messages({
            'any.only': 'digestEnabled must be 0 or 1',
            'number.base': 'digestEnabled must be 0 or 1',
        }),
    digestHour: Joi.number()
        .integer()
        .min(0)
        .max(23)
        .optional()
        .messages({
            'number.base': 'digestHour must be a number',
            'number.integer': 'digestHour must be an integer',
            'number.min': 'digestHour must be between 0 and 23',
            'number.max': 'digestHour must be between 0 and 23',
        }),
})
    .min(1)
    .prefs({ allowUnknown: false, stripUnknown: false })
    .messages({
        'object.min': 'At least one notification setting field is required.',
        'object.unknown': 'Unsupported field {{#label}}.',
    });
