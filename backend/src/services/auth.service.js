import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import createError from '../common/errors/create-error.js';
import { JWT_EXPIRES_IN, JWT_SECRET } from '../config/env.js';
import User from '../models/user.model.js';

const toPublicUser = (user) => ({
    _id: user._id,
    name: user.name,
    avatarDataUrl: user.avatarDataUrl ?? null,
    email: user.email,
    role: user.role,
    settings: {
        aiEnabled: Boolean(user.settings?.aiEnabled),
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

const buildAuthResponse = (user, token) => ({
    token,
    user: toPublicUser(user),
});

export const registerUser = async ({ name, email, password }) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            throw createError('User already exists', 409, [], 'USER_ALREADY_EXISTS');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const createdUsers = await User.create(
            [{ name, email, passwordHash: hashedPassword, role: 'user' }],
            { session }
        );

        const createdUser = createdUsers[0];
        const token = jwt.sign(
            { userId: createdUser._id },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        await session.commitTransaction();

        return buildAuthResponse(createdUser, token);
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

export const loginUser = async ({ email, password }) => {
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
        throw createError('Invalid email or password', 401, [], 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
        throw createError('Invalid email or password', 401, [], 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign(
        { userId: user._id },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    return buildAuthResponse(user, token);
};

export const logoutUser = async () => ({
    success: true,
});

export { toPublicUser };
