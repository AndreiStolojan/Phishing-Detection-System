import {
    addSenderListEntry,
    getSenderListEntries,
    removeSenderListEntry,
} from '../services/sender-list.service.js';

export const listSenderListEntries = async (req, res, next) => {
    try {
        const entries = await getSenderListEntries({
            userId: req.user._id,
            withMatchCounts: req.query.withMatchCounts === '1',
        });

        res.status(200).json({
            success: true,
            data: { entries },
        });
    } catch (error) {
        next(error);
    }
};

export const createSenderListEntry = async (req, res, next) => {
    try {
        const { listType, kind, value } = req.body;
        const { entry, created } = await addSenderListEntry({
            userId: req.user._id,
            listType,
            kind,
            value,
        });

        res.status(created ? 201 : 200).json({
            success: true,
            message: created ? 'List entry added' : 'List entry already exists',
            data: { entry },
        });
    } catch (error) {
        next(error);
    }
};

export const deleteSenderListEntry = async (req, res, next) => {
    try {
        const entry = await removeSenderListEntry({
            userId: req.user._id,
            entryId: req.params.id,
        });

        res.status(200).json({
            success: true,
            message: 'List entry removed',
            data: { entry },
        });
    } catch (error) {
        next(error);
    }
};
