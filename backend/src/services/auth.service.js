import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import createError from '../common/errors/create-error.js';
import { JWT_EXPIRES_IN, JWT_SECRET } from '../config/env.js';
import User from '../models/user.model.js';

export const toPublicUser = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    settings: {
        aiEnabled: Boolean(user.settings?.aiEnabled),
        alertsEnabled: Boolean(user.settings?.alertsEnabled),
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

const buildAuthResponse = (user, token) => ({
    token,
    user: toPublicUser(user),
});

const signToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

export const registerUser = async ({ name, email, password }) => {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw createError('User already exists', 409, [], 'USER_ALREADY_EXISTS');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const createdUser = await User.create({ name, email, passwordHash: hashedPassword, role: 'user' });

    const token = signToken(createdUser._id);

    return buildAuthResponse(createdUser, token);
};

export const loginUser = async ({ email, password }) => {
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
        throw createError('Invalid email or password', 401, [], 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
        throw createError('Invalid password', 401, [], 'INVALID_CREDENTIALS');
    }

    const token = signToken(user._id);

    return buildAuthResponse(user, token);
};
