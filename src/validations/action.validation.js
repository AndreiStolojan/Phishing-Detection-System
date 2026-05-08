import Joi from 'joi';

export const emailActionParamsSchema = Joi.object({
    id: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'string.empty': 'Email id is required',
            'string.hex': 'Email id must be a valid MongoDB ObjectId',
            'string.length': 'Email id must be a valid MongoDB ObjectId',
            'any.required': 'Email id is required',
        }),
});
