import mongoose from 'mongoose';

const mailAccountSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        provider: {
            type: String,
            enum: ['gmail'],
            required: true,
            default: 'gmail',
        },
        accountEmail: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        status: {
            type: String,
            enum: ['active', 'revoked', 'error'],
            default: 'active',
        },
        accessToken: {
            type: String,
            required: true,
        },
        refreshToken: {
            type: String,
            default: null,
        },
        tokenExpiryDate: {
            type: Date,
            default: null,
        },
        lastSyncedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

mailAccountSchema.index({ userId: 1, provider: 1 }, { unique: true });

const MailAccount = mongoose.model('MailAccount', mailAccountSchema);

export default MailAccount;
