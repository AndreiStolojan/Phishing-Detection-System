import mongoose from 'mongoose';

import createError from '../common/errors/create-error.js';
import Email from '../models/email.model.js';
import { moveGmailMessageToSpam } from './mail-account.service.js';

const ACTIONS = {
    markSafe: 'mark_safe',
    markPhishing: 'mark_phishing',
};

const toPublicEmailAction = (email) => ({
    emailId: email._id,
    userVerdict: email.userVerdict,
    reviewedAt: email.reviewedAt,
    lastManualAction: email.lastManualAction,
    lastProviderAction: email.lastProviderAction || null,
    lastProviderActionStatus: email.lastProviderActionStatus || null,
    lastProviderActionAt: email.lastProviderActionAt || null,
    lastProviderActionError: email.lastProviderActionError || null,
});

const toPublicActionResult = ({
    action,
    email = null,
    providerAction = null,
}) => ({
    action,
    email:
        email && Object.prototype.hasOwnProperty.call(email, 'emailId')
            ? email
            : email
              ? toPublicEmailAction(email)
              : null,
    providerAction,
});

const validateEmailId = (emailId) => {
    if (!mongoose.Types.ObjectId.isValid(emailId)) {
        throw createError('Invalid email id', 400, [], 'INVALID_EMAIL_ID');
    }
};

const findOwnedEmailById = async ({ userId, emailId }) => {
    validateEmailId(emailId);

    const email = await Email.findOne({
        _id: emailId,
        userId,
    });

    if (!email) {
        throw createError('Email not found', 404, [], 'EMAIL_NOT_FOUND');
    }

    return email;
};

const updateManualReview = async ({ email, userVerdict, action }) => {
    email.userVerdict = userVerdict;
    email.reviewedAt = new Date();
    email.lastManualAction = action;

    await email.save();

    return toPublicEmailAction(email);
};

const toProviderActionFailure = (error) => ({
    type: 'gmail_move_to_spam',
    status: 'failed',
    errorCode: error?.code || 'GMAIL_MOVE_TO_SPAM_FAILED',
    message: error?.message || 'Failed to move Gmail message to spam.',
});

const trackProviderAction = async ({ email, providerAction }) => {
    email.lastProviderAction = providerAction.type;
    email.lastProviderActionStatus = providerAction.status;
    email.lastProviderActionAt = new Date();
    email.lastProviderActionError =
        providerAction.status === 'success'
            ? null
            : {
                  code: providerAction.errorCode || null,
                  message: providerAction.message || null,
              };

    await email.save();

    return providerAction;
};

const moveEmailToGmailSpamAfterManualPhishing = async ({ userId, email }) => {
    let providerAction;

    try {
        providerAction = await moveGmailMessageToSpam({ userId, email });
    } catch (error) {
        providerAction = toProviderActionFailure(error);
    }

    return trackProviderAction({ email, providerAction });
};

export const markEmailSafeForUser = async ({ userId, emailId }) => {
    const email = await findOwnedEmailById({ userId, emailId });
    const emailAction = await updateManualReview({
        email,
        userVerdict: 'safe',
        action: ACTIONS.markSafe,
    });

    return toPublicActionResult({
        action: ACTIONS.markSafe,
        email: emailAction,
    });
};

export const markEmailPhishingForUser = async ({ userId, emailId }) => {
    const email = await findOwnedEmailById({ userId, emailId });
    const emailAction = await updateManualReview({
        email,
        userVerdict: 'phishing',
        action: ACTIONS.markPhishing,
    });

    const providerAction = await moveEmailToGmailSpamAfterManualPhishing({
        userId,
        email,
    });

    return toPublicActionResult({
        action: ACTIONS.markPhishing,
        email: {
            ...emailAction,
            lastProviderAction: email.lastProviderAction || null,
            lastProviderActionStatus: email.lastProviderActionStatus || null,
            lastProviderActionAt: email.lastProviderActionAt || null,
            lastProviderActionError: email.lastProviderActionError || null,
        },
        providerAction,
    });
};
