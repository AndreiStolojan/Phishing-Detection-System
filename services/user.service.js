import User from '../models/user.model.js';
import { toPublicUser } from './auth.service.js';

export const getAllUsers = async () => {
    const users = await User.find();
    return users.map(toPublicUser);
};

export const getUserById = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        const error = new Error('User not Found');
        error.statusCode = 404;
        throw error;
    }

    return toPublicUser(user);
};

export const getCurrentUser = async (authenticatedUserId) => {
    const user = await User.findById(authenticatedUserId);

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    return toPublicUser(user);
};

export const updateCurrentUser = async (authenticatedUserId, payload) => {
    const user = await User.findById(authenticatedUserId);

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    user.name = payload.name;
    await user.save();

    return toPublicUser(user);
};
