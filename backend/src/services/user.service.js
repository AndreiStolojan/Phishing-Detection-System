import User from '../models/user.model.js';
import Email from '../models/email.model.js';
import Scan from '../models/scan.model.js';
import MailAccount from '../models/mail-account.model.js';
import SenderListEntry from '../models/sender-list.model.js';
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

    if (Object.hasOwn(payload, 'name')) {
        user.name = payload.name;
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
        aiEnabled: Boolean(payload.aiEnabled),
    };

    await user.save();

    return {
        aiEnabled: user.settings.aiEnabled,
    };
};

export const deleteCurrentUser = async (authenticatedUserId) => {
    const user = await User.findById(authenticatedUserId);

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    // Cascade: every collection that stores per-user data.
    await Promise.all([
        Scan.deleteMany({ userId: user._id }),
        Email.deleteMany({ userId: user._id }),
        MailAccount.deleteMany({ userId: user._id }),
        SenderListEntry.deleteMany({ userId: user._id }),
    ]);
    await User.deleteOne({ _id: user._id });

    return { deleted: true };
};

export const updateCurrentUserNotificationSettings = async (authenticatedUserId, payload) => {
    const user = await User.findById(authenticatedUserId);

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    const current = user.settings?.toObject?.() ?? {};

    user.settings = {
        ...current,
        ...(Object.hasOwn(payload, 'alertsEnabled') && { alertsEnabled: Boolean(payload.alertsEnabled) }),
        ...(Object.hasOwn(payload, 'digestEnabled') && { digestEnabled: Boolean(payload.digestEnabled) }),
        ...(Object.hasOwn(payload, 'digestHour') && { digestHour: Number(payload.digestHour) }),
    };

    await user.save();

    return {
        alertsEnabled: user.settings.alertsEnabled,
        digestEnabled: user.settings.digestEnabled,
        digestHour: user.settings.digestHour,
    };
};
