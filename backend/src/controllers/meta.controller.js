import { getStatusForUser } from '../services/meta.service.js';

export const getMetaStatus = async (req, res, next) => {
    try {
        const status = await getStatusForUser(req.user._id);

        res.status(200).json({
            success: true,
            data: status,
        });
    } catch (error) {
        next(error);
    }
};
