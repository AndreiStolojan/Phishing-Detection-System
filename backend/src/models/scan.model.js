import mongoose from 'mongoose';

const triggeredRuleSchema = new mongoose.Schema(
    {
        rule: {
            type: String,
            required: true,
            trim: true,
        },
        points: {
            type: Number,
            required: true,
        },
        details: {
            type: String,
            default: '',
            trim: true,
        },
    },
    {
        _id: false,
    }
);

const scanSchema = new mongoose.Schema(
    {
        emailId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Email',
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        score: {
            type: Number,
            required: true,
            min: 0,
        },
        ruleScore: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        aiScore: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        verdict: {
            type: String,
            enum: ['safe', 'suspicious', 'likely_phishing'],
            required: true,
        },
        reasons: {
            type: [String],
            default: [],
        },
        triggeredRules: {
            type: [triggeredRuleSchema],
            default: [],
        },
        // True when the email came from an official, brand-controlled sending domain
        // (see brand-verification.service.js). Drives the verified-brand context
        // modifier layer and the "verified sender" UI badge.
        senderVerifiedBrand: {
            type: Boolean,
            default: false,
        },
        verifiedBrandName: {
            type: String,
            default: null,
            trim: true,
        },
        // Set when the sender matched the user's allowlist/blocklist at scan time
        // (see sender-list.service.js). Records WHICH entry decided the outcome.
        senderListMatch: {
            type: new mongoose.Schema(
                {
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
                { _id: false }
            ),
            default: null,
        },
        scanSource: {
            type: String,
            enum: ['manual', 'sync'],
            default: 'manual',
        },
        engineVersion: {
            type: String,
            default: null,
            trim: true,
        },
        aiSignals: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        aiExplanation: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        aiExplanationMeta: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        scannedAt: {
            type: Date,
            default: Date.now,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

scanSchema.index({ userId: 1, emailId: 1 }, { unique: true });

const Scan = mongoose.model('Scan', scanSchema);

export default Scan;
