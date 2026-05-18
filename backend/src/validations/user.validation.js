import Joi from 'joi';

const AVATAR_DATA_URL_MAX_LENGTH = 700000;
const AVATAR_DATA_URL_PATTERN = /^data:image\/(?:png|jpeg|webp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const validateAvatarDataUrl = (value, helpers) => {
    if (value === null || value === '') {
        return value;
    }

    if (typeof value !== 'string') {
        return helpers.error('avatarDataUrl.base');
    }

    if (value.length > AVATAR_DATA_URL_MAX_LENGTH) {
        return helpers.error('avatarDataUrl.max');
    }

    if (!AVATAR_DATA_URL_PATTERN.test(value)) {
        return helpers.error('avatarDataUrl.format');
    }

    return value;
};

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
    avatarDataUrl: Joi.any()
        .custom(validateAvatarDataUrl)
        .optional()
        .messages({
            'avatarDataUrl.base': 'avatarDataUrl must be a string, null, or empty string',
            'avatarDataUrl.max': 'Avatar image is too large. Maximum length is 700000 characters',
            'avatarDataUrl.format': 'Avatar must be a PNG, JPEG, or WebP data URL encoded as base64',
        }),
})
    .or('name', 'avatarDataUrl')
    .prefs({ allowUnknown: false, stripUnknown: false })
    .messages({
        'object.missing': 'At least one field is required: name or avatarDataUrl',
        'object.unknown': 'Unsupported field {{#label}}. Only "name" and "avatarDataUrl" can be updated.',
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
