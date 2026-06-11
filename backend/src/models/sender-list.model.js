import mongoose from 'mongoose';

const senderListEntrySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        listType: {
            type: String,
            enum: ['allow', 'block'],
            required: true,
        },
        kind: {
            type: String,
            enum: ['sender', 'domain'],
            required: true,
        },
        value: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
    },
    {
        timestamps: true,
    }
);

/*
 * One entry per (user, kind, value). Mutual exclusivity is enforced by this index:
 * a sender or domain has exactly one entry, whose listType is either allow or block —
 * it can never be on both lists at the same time.
 */
senderListEntrySchema.index({ userId: 1, kind: 1, value: 1 }, { unique: true });

const SenderListEntry = mongoose.model('SenderListEntry', senderListEntrySchema);

export default SenderListEntry;
