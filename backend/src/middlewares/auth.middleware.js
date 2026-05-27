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
            );
        }

        if (!authHeader.toLowerCase().startsWith('bearer ')) {
            return sendErrorResponse(
                res,
                401,
                'Unauthorized',
                'AUTH_HEADER_INVALID',            );
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return sendErrorResponse(
                res,
                401,
                'Unauthorized',
                'AUTH_TOKEN_MISSING',            );
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return sendErrorResponse(
                res,
                401,
                'Unauthorized',
                'AUTH_USER_NOT_FOUND',            );
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return sendErrorResponse(
                res,
                401,
                'Unauthorized',
                'AUTH_TOKEN_EXPIRED',            );
        }

        if (error.name === 'JsonWebTokenError') {
            return sendErrorResponse(
                res,
                401,
                'Unauthorized',
                'AUTH_TOKEN_INVALID',
            );
        }

        next(error);
    }
};

export default authorize;
