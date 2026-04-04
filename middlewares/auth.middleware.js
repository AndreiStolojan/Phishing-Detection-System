import jwt from 'jsonwebtoken';

import sendErrorResponse from '../common/http/send-error-response.js';
import { JWT_SECRET } from '../config/env.js';
import User from '../models/user.model.js';

const authorize = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return sendErrorResponse(
                res,
                401,
                'Unauthorized',
                'AUTH_HEADER_MISSING',
                ['Authorization header is missing. Use Bearer <token>.']
            );
        }

        if (!authHeader.toLowerCase().startsWith('bearer ')) {
            return sendErrorResponse(
                res,
                401,
                'Unauthorized',
                'AUTH_HEADER_INVALID',
                ['Authorization header must use the format Bearer <token>.']
            );
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return sendErrorResponse(
                res,
                401,
                'Unauthorized',
                'AUTH_TOKEN_MISSING',
                ['Bearer token is missing from Authorization header.']
            );
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return sendErrorResponse(
                res,
                401,
                'Unauthorized',
                'AUTH_USER_NOT_FOUND',
                ['The user for this token no longer exists.']
            );
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return sendErrorResponse(
                res,
                401,
                'Unauthorized',
                'AUTH_TOKEN_EXPIRED',
                ['The token has expired. Log in again and use the new token.']
            );
        }

        if (error.name === 'JsonWebTokenError') {
            return sendErrorResponse(
                res,
                401,
                'Unauthorized',
                'AUTH_TOKEN_INVALID',
                ['The token is invalid. Make sure you copied only data.token from login/register.']
            );
        }

        next(error);
    }
};

export default authorize;
