import mongoose from 'mongoose';

const urlReputationSchema = new mongoose.Schema(
    {
        keyHash: {
            type: String,
            required: true,
            match: /^[a-f0-9]{64}$/,
        },
        source: {
            type: String,
            required: true,
            enum: ['web_risk', 'urlhaus', 'rdap', 'redirect'],
        },
        subjectType: {
            type: String,
            required: true,
            enum: ['url', 'domain'],
        },
        status: {
            type: String,
            required: true,
            enum: [
                'malicious',
                'clean',
                'found',
                'not_found',
                'unavailable',
                'blocked',
                'resolved',
            ],
        },
        threatTypes: {
            type: [String],
            default: [],
            validate: {
                validator: (value) => value.length <= 8,
                message: 'Threat types exceed the cache bound',
            },
        },
        registeredAt: { type: Date, default: null },
        targetHash: {
            type: String,
            default: null,
            match: /^(?:[a-f0-9]{64})?$/,
        },
        hopCount: { type: Number, default: null, min: 0, max: 5 },
        fetchedAt: { type: Date, required: true },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

urlReputationSchema.index({ source: 1, keyHash: 1 }, { unique: true });
urlReputationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const UrlReputation = mongoose.model('UrlReputation', urlReputationSchema);

export default UrlReputation;
