import mongoose from 'mongoose';

import connectToDatabase from '../src/database/mongodb.js';

mongoose.set('autoIndex', false);

const { default: Scan } = await import('../src/models/scan.model.js');

const findDuplicateScanGroups = () =>
    Scan.aggregate([
        {
            $group: {
                _id: {
                    userId: '$userId',
                    emailId: '$emailId',
                },
                count: { $sum: 1 },
            },
        },
        {
            $match: {
                count: { $gt: 1 },
            },
        },
    ]);

const cleanupDuplicateScans = async () => {
    await connectToDatabase();

    const duplicateGroups = await findDuplicateScanGroups();
    let deletedCount = 0;

    for (const group of duplicateGroups) {
        const scans = await Scan.find({
            userId: group._id.userId,
            emailId: group._id.emailId,
        })
            .sort({
                scannedAt: -1,
                updatedAt: -1,
                createdAt: -1,
            })
            .select('_id')
            .lean();

        const [scanToKeep, ...scansToDelete] = scans;

        if (!scanToKeep || scansToDelete.length === 0) {
            continue;
        }

        const deleteResult = await Scan.deleteMany({
            _id: { $in: scansToDelete.map((scan) => scan._id) },
        });

        deletedCount += deleteResult.deletedCount || 0;
        console.log(
            `Kept scan ${scanToKeep._id} for user ${group._id.userId} email ${group._id.emailId}; deleted ${deleteResult.deletedCount || 0}.`
        );
    }

    console.log(
        `Duplicate scan cleanup completed. Groups: ${duplicateGroups.length}. Deleted scans: ${deletedCount}.`
    );
};

cleanupDuplicateScans()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Duplicate scan cleanup failed:', error.message);
        process.exit(1);
    });
