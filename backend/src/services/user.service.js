import User from '../models/user.model.js';
import { toPublicUser } from './auth.service.js';

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

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

    if (hasOwn(payload, 'name')) {
        user.name = payload.name;
    }

    if (hasOwn(payload, 'avatarDataUrl')) {
        user.avatarDataUrl = payload.avatarDataUrl || null;
    }

    await user.save();

    return toPublicUser(user);
};

export const updateCurrentUserAiSettings = async (authenticatedUserId, payload) => {
    const user = await User.findById(authenticatedUserId);

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    user.settings = {
        ...user.settings?.toObject?.(),
        aiEnabled: payload.aiEnabled === 1,
    };

    await user.save();

    return {
        aiEnabled: user.settings.aiEnabled,
    };
};
