import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { JWT_EXPIRES_IN, JWT_SECRET } from '../config/env.js';
import User from '../models/user.model.js';
import { sendWelcomeEmail } from '../utils/send-email.js';

const toPublicUser = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
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
            const error = new Error('User already exist');
            error.statusCode = 409;
            throw error;
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

        // sendWelcomeEmail({ email, userName: name }).catch((err) => {
        //     console.error('Nu s-a putut trimite emailul de bun venit:', err.message);
        // });

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
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
        const error = new Error('Invalid password');
        error.statusCode = 401;
        throw error;
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
