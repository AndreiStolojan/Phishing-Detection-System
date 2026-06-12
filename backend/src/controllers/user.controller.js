import {
    deleteCurrentUser,
    getAllUsers,
    getCurrentUser,
    getUserById,
    updateCurrentUser,
    updateCurrentUserAiSettings,
    updateCurrentUserNotificationSettings,
} from '../services/user.service.js';

export const getUsers = async (req, res, next) => {
    try {
        const users = await getAllUsers();

        res.status(200).json({ success: true, data: users });
    } catch (err) {
        next(err);
    }
};

export const getUser = async (req, res, next) => {
    try {
        const user = await getUserById(req.params.id);

        res.status(200).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

export const getMe = async (req, res, next) => {
    try {
        const user = await getCurrentUser(req.user._id);

        res.status(200).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

export const updateMe = async (req, res, next) => {
    try {
        const user = await updateCurrentUser(req.user._id, req.body);

        res.status(200).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

export const deleteMe = async (req, res, next) => {
    try {
        const result = await deleteCurrentUser(req.user._id);

        res.status(200).json({ success: true, message: 'Account deleted', data: result });
    } catch (err) {
        next(err);
    }
};

export const updateMeAiSettings = async (req, res, next) => {
    try {
        const aiSettings = await updateCurrentUserAiSettings(req.user._id, req.body);

        res.status(200).json({ success: true, data: aiSettings });
    } catch (err) {
        next(err);
    }
};

export const updateMeNotificationSettings = async (req, res, next) => {
    try {
        const notificationSettings = await updateCurrentUserNotificationSettings(req.user._id, req.body);

        res.status(200).json({ success: true, data: notificationSettings });
    } catch (err) {
        next(err);
    }
};
