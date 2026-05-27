import sendErrorResponse from '../common/http/send-error-response.js';

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
    if (!req.user) {
        return sendErrorResponse(res, 401, 'Unauthorized', 'AUTH_REQUIRED');
    }

    if (!allowedRoles.includes(req.user.role)) {
        return sendErrorResponse(
            res,
            403,
            'Forbidden',
            'ROLE_UNAUTHORIZED',
        );
    }

    next();
};

export default authorizeRoles;
