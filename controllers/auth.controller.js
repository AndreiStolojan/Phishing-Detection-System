import { loginUser, logoutUser, registerUser } from '../services/auth.service.js';

export const register = async (req, res, next) => {
    try {
        const authResult = await registerUser(req.body);

        res.status(201).json({
            success: true,
            message: 'User successfully created',
            data: authResult,
        });
    } catch (err) {
        next(err);
    }
};

export const login = async (req, res, next) => {
    try {
        const authResult = await loginUser(req.body);

        res.status(200).json({
            success: true,
            message: 'User successfully signed in',
            data: authResult,
        });
    } catch (err) {
        next(err);
    }
};

export const logout = async (req, res, next) => {
    try {
        await logoutUser();

        res.status(200).json({
            success: true,
            message: 'User successfully signed out',
        });
    } catch (err) {
        next(err);
    }
};

export const signUp = register;
export const signIn = login;
export const signOut = logout;
