import {
    getLatestScanForEmail,
    scanEmailWithRules,
} from '../services/scan.service.js';

export const scanEmail = async (req, res, next) => {
    try {
        const result = await scanEmailWithRules({
            userId: req.user._id,
            emailId: req.params.emailId,
            scanSource: 'manual',
        });

        res.status(200).json({
            success: true,
            message: 'Email scan updated successfully',
            data: result.scan,
        });
    } catch (error) {
        next(error);
    }
};

export const getLatestEmailScan = async (req, res, next) => {
    try {
        const scan = await getLatestScanForEmail({
            userId: req.user._id,
            emailId: req.params.emailId,
        });

        res.status(200).json({
            success: true,
            data: scan,
        });
    } catch (error) {
        next(error);
    }
};
