import { getAllUsers, getCurrentUser, getUserById, updateCurrentUser } from '../services/user.service.js';

export const getUsers = async (req, res, next) => {
    try{
        const users = await getAllUsers();

        res.status(200).json({success: true, data: users});
    }catch(err){
        next(err);
    }
}

export const getUser = async (req, res, next) => {
    try{
        const user = await getUserById(req.params.id);

        res.status(200).json({success: true, data: user});
    }catch(err){
        next(err);
    }
}

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
