const sendErrorResponse = (res, statusCode, message, code = null, errors = []) => {
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

    return res.status(statusCode).json(payload);
};

export default sendErrorResponse;
