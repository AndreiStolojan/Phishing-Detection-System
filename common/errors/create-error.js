const createError = (message, statusCode = 500, errors = [], code = null) => {
    const error = new Error(message);

    error.statusCode = statusCode;
    error.errors = errors;
    error.code = code;

    return error;
};

export default createError;
