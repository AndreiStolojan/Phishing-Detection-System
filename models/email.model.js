import mongoose from 'mongoose';

const providerActionErrorSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            default: null,
            trim: true,
        },
        message: {
            type: String,
            default: null,
            trim: true,
        },
    },
    {
        _id: false,
    }
);

const emailSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        mailAccountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MailAccount',
            required: true,
            index: true,
        },
        provider: {
            type: String,
            enum: ['gmail'],
            required: true,
            default: 'gmail',
        },
        providerMessageId: {
            type: String,
            required: true,
            trim: true,
        },
        threadId: {
            type: String,
            default: null,
        },
        subject: {
            type: String,
            default: '',
            trim: true,
        },
        from: {
            type: String,
            default: '',
            trim: true,
        },
        to: {
            type: String,
            default: '',
            trim: true,
        },
        replyTo: {
            type: String,
            default: '',
            trim: true,
            lowercase: true,
        },
        displayName: {
            type: String,
            default: '',
            trim: true,
        },
        senderDomain: {
            type: String,
            default: '',
            trim: true,
            lowercase: true,
        },
        replyToDomain: {
            type: String,
            default: '',
            trim: true,
            lowercase: true,
        },
        snippet: {
            type: String,
            default: '',
        },
        textBody: {
            type: String,
            default: '',
        },
        htmlBody: {
            type: String,
            default: '',
        },
        links: {
            type: [String],
            default: [],
        },
        linkDomains: {
            type: [String],
            default: [],
        },
        linkCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        hasShortenedUrl: {
            type: Boolean,
            default: false,
        },
        suspiciousLinkPatterns: {
            type: [String],
            default: [],
        },
        attachmentExtensions: {
            type: [String],
            default: [],
        },
        receivedAt: {
            type: Date,
            default: null,
        },
        syncSource: {
            type: String,
            enum: ['gmail_initial_sync', 'gmail_manual_sync', 'gmail_scheduled_sync', 'gmail_resync'],
            default: 'gmail_manual_sync',
        },
        userVerdict: {
            type: String,
            enum: ['safe', 'phishing'],
            default: null,
        },
        reviewedAt: {
            type: Date,
            default: null,
        },
        lastManualAction: {
            type: String,
            enum: [
                'mark_safe',
                'mark_phishing',
                'allow_sender',
                'allow_domain',
                'block_sender',
                'block_domain',
            ],
            default: null,
        },
        lastProviderAction: {
            type: String,
            enum: ['gmail_move_to_spam'],
            default: null,
        },
        lastProviderActionStatus: {
            type: String,
            enum: ['success', 'failed', 'skipped'],
            default: null,
        },
        lastProviderActionAt: {
            type: Date,
            default: null,
        },
        lastProviderActionError: {
            type: providerActionErrorSchema,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

emailSchema.index({ userId: 1, providerMessageId: 1 }, { unique: true });
emailSchema.index({ userId: 1, receivedAt: -1 });

const Email = mongoose.model('Email', emailSchema);

export default Email;
