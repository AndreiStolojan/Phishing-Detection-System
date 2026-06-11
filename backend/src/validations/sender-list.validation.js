import Joi from 'joi';

export const createSenderListEntrySchema = Joi.object({
    listType: Joi.string().valid('allow', 'block').required().messages({
        'any.only': 'listType must be "allow" or "block"',
        'any.required': 'listType is required',
    }),
    kind: Joi.string().valid('sender', 'domain').required().messages({
        'any.only': 'kind must be "sender" or "domain"',
        'any.required': 'kind is required',
    }),
    value: Joi.alternatives().conditional('kind', {
        is: 'sender',
        then: Joi.string().trim().lowercase().email({ tlds: false }).required().messages({
            'string.email': 'value must be a valid email address',
            'any.required': 'value is required',
        }),
        otherwise: Joi.string().trim().lowercase().domain({ tlds: false }).required().messages({
            'string.domain': 'value must be a valid domain (e.g. example.com)',
            'any.required': 'value is required',
        }),
    }),
});

export const senderListEntryParamsSchema = Joi.object({
    id: Joi.string().hex().length(24).required().messages({
        'string.empty': 'List entry id is required',
        'string.hex': 'List entry id must be a valid MongoDB ObjectId',
        'string.length': 'List entry id must be a valid MongoDB ObjectId',
        'any.required': 'List entry id is required',
    }),
});
