import mongoose from 'mongoose';

const dmarcPolicySchema = new mongoose.Schema(
    {
        domain: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['found', 'not_found'],
            required: true,
        },
        record: {
            type: String,
            default: null,
        },
        policy: {
            type: String,
            enum: ['none', 'quarantine', 'reject', null],
            default: null,
        },
        subdomainPolicy: {
            type: String,
            enum: ['none', 'quarantine', 'reject', null],
            default: null,
        },
        adkim: {
            type: String,
            enum: ['r', 's', null],
            default: null,
        },
        aspf: {
            type: String,
            enum: ['r', 's', null],
            default: null,
        },
        pct: {
            type: Number,
            min: 0,
            max: 100,
            default: null,
        },
        fetchedAt: {
            type: Date,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// MongoDB removes stale cache entries eventually. Reads still require
// expiresAt > now because TTL cleanup is asynchronous.
dmarcPolicySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const DmarcPolicy = mongoose.model('DmarcPolicy', dmarcPolicySchema);

export default DmarcPolicy;
