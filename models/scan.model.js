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
        scanSource: {
            type: String,
            enum: ['manual', 'sync'],
            default: 'manual',
        },
        engineVersion: {
            type: String,
            default: 'rules-v1',
        },
        aiSignals: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        aiExplanation: {
            type: String,
            default: '',
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

scanSchema.index({ userId: 1, emailId: 1, scannedAt: -1 });

const Scan = mongoose.model('Scan', scanSchema);

export default Scan;
