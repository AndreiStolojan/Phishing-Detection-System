// Express recognizes a middleware as error-handling only if it has 4 arguments.
// `next` is not used here, but it must be kept in the signature.
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Server Error';
    let errors = err.errors || [];
    let code = err.code || null;

    if (err.name === 'CastError') {
        statusCode = 404;
        message = 'Resource not found';
        code = 'RESOURCE_NOT_FOUND';
    }

    if (err.code === 11000) {
        statusCode = 409;
        message = 'Duplicate field value entered';
        code = 'DUPLICATE_FIELD';
    }

    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation failed';
        errors = Object.values(err.errors).map((value) => value.message);
        code = 'VALIDATION_ERROR';
    }

    const payload = {
        success: false,
        statusCode,
        message,
    };

    if (code) {
        payload.code = code;
    }

    if (errors.length > 0) {
        payload.errors = errors;
    }

    if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
        console.error('[error]', err);
    }

    res.status(statusCode).json(payload);
};

export default errorMiddleware;
