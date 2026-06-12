import sendErrorResponse from '../common/http/send-error-response.js';

const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const messages = error.details.map((detail) => detail.message);

            return sendErrorResponse(res, 400, 'Validation failed', 'VALIDATION_ERROR', messages);
        }

        req.body = value;
        next();
    };
};

export default validate;
