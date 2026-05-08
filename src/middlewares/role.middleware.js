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
            'ROLE_FORBIDDEN',
            ['Your account does not have permission to access this resource.']
        );
    }

    next();
};

export default authorizeRoles;
