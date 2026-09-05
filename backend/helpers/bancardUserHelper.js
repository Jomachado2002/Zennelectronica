const UserModel = require('../models/userModel');
const BancardTransactionModel = require('../models/bancardTransactionModel');

function escapeRegex(value = '') {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function generateUniqueBancardUserId() {
    for (let attempts = 0; attempts < 12; attempts++) {
        const candidate = Math.floor(100000 + Math.random() * 900000);
        const exists = await UserModel.findOne({ bancardUserId: candidate }).select('_id').lean();
        if (!exists) return candidate;
    }
    return parseInt(`${Date.now()}`.slice(-6), 10);
}

async function ensureBancardUserId(user) {
    if (!user) return null;
    if (user.bancardUserId) return user.bancardUserId;

    const userId = user._id || user.id;
    if (!userId) return null;

    const fresh = await UserModel.findById(userId).select('bancardUserId');
    if (!fresh) return null;
    if (fresh.bancardUserId) {
        user.bancardUserId = fresh.bancardUserId;
        return fresh.bancardUserId;
    }

    const bancardUserId = await generateUniqueBancardUserId();
    fresh.bancardUserId = bancardUserId;
    await UserModel.findByIdAndUpdate(userId, { bancardUserId });
    user.bancardUserId = bancardUserId;
    return bancardUserId;
}

function buildUserPurchaseMatch(user, extra = {}) {
    const userId = user?._id || user?.id;
    const matchOr = [];

    if (userId) {
        matchOr.push({ created_by: userId });
        matchOr.push({ created_by: String(userId) });
    }

    const bancardUserId = user?.bancardUserId;
    if (bancardUserId) {
        matchOr.push({ user_bancard_id: bancardUserId });
        matchOr.push({ user_bancard_id: String(bancardUserId) });
        matchOr.push({ user_bancard_id: Number(bancardUserId) });
    }

    if (user?.email) {
        matchOr.push({
            'customer_info.email': {
                $regex: `^${escapeRegex(user.email.trim())}$`,
                $options: 'i'
            }
        });
    }

    if (matchOr.length === 0) return extra;

    return {
        ...extra,
        $or: matchOr
    };
}

async function claimGuestTransactionsForUser(user) {
    if (!user?._id) return { claimed: 0 };

    const bancardUserId = await ensureBancardUserId(user);
    const email = user.email ? String(user.email).trim().toLowerCase() : '';
    if (!email) return { claimed: 0 };

    const result = await BancardTransactionModel.updateMany(
        {
            $and: [
                {
                    $or: [
                        { created_by: { $regex: '^guest-' } },
                        { created_by: null },
                        { created_by: { $exists: false } }
                    ]
                },
                email
                    ? {
                        'customer_info.email': {
                            $regex: `^${escapeRegex(email)}$`,
                            $options: 'i'
                        }
                    }
                    : { _id: null }
            ]
        },
        {
            $set: {
                created_by: user._id,
                user_bancard_id: bancardUserId || null,
                user_type: 'REGISTERED',
                visible_to_user: true
            }
        }
    );

    return { claimed: result.modifiedCount || 0 };
}

function interpretBancardConfirmation(confirmation = {}) {
    const hasAuthorization = Boolean(confirmation.authorization_number && confirmation.ticket_number);
    const hasResponseAndCode = confirmation.response === 'S' && confirmation.response_code === '00';
    const hasApprovalCode = confirmation.response_code === '00';
    const isRejected =
        confirmation.response === 'N' ||
        (confirmation.response_code && confirmation.response_code !== '00' && !hasAuthorization);
    const isApproved = hasResponseAndCode || hasAuthorization || hasApprovalCode;

    let status = 'pending';
    if (isApproved) status = 'approved';
    else if (isRejected) status = 'rejected';

    return {
        isApproved,
        isRejected,
        status,
        hasAuthorization
    };
}

function buildConfirmationUpdate(confirmation = {}, { currentStatus } = {}) {
    const interpreted = interpretBancardConfirmation(confirmation);
    const nextStatus = currentStatus === 'approved' && interpreted.status === 'pending'
        ? 'approved'
        : interpreted.status;

    const updateData = {
        status: nextStatus,
        visible_to_user: true
    };

    if (confirmation.response) updateData.response = confirmation.response;
    if (confirmation.response_code) updateData.response_code = confirmation.response_code;
    if (confirmation.response_description) updateData.response_description = confirmation.response_description;
    if (confirmation.extended_response_description) {
        updateData.extended_response_description = confirmation.extended_response_description;
    }
    if (confirmation.authorization_number) updateData.authorization_number = confirmation.authorization_number;
    if (confirmation.ticket_number) updateData.ticket_number = confirmation.ticket_number;
    if (confirmation.security_information) updateData.security_information = confirmation.security_information;

    if (nextStatus === 'approved') {
        updateData.bancard_confirmed = true;
        updateData.confirmation_date = new Date();
        updateData.can_rollback = true;
        updateData.show_in_user_purchases = true;
    } else if (nextStatus === 'rejected') {
        updateData.bancard_confirmed = true;
        updateData.confirmation_date = new Date();
        updateData.can_rollback = false;
        updateData.show_in_user_purchases = false;
    }

    return {
        ...interpreted,
        status: nextStatus,
        updateData,
        justApproved: nextStatus === 'approved' && currentStatus !== 'approved'
    };
}

module.exports = {
    escapeRegex,
    generateUniqueBancardUserId,
    ensureBancardUserId,
    buildUserPurchaseMatch,
    claimGuestTransactionsForUser,
    interpretBancardConfirmation,
    buildConfirmationUpdate
};
