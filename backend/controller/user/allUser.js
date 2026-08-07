const userModel = require("../../models/userModel")

async function allUsers(req, res) {
    try {
        const currentUser = await userModel.findById(req.userId).select('role');
        if (!currentUser || (currentUser.role !== 'ROOT' && currentUser.role !== 'ADMIN')) {
            return res.status(403).json({
                message: "Solo administradores pueden ver todos los usuarios",
                error: true,
                success: false
            });
        }

        const allUser = await userModel.find()
            .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken')
            .sort({ createdAt: -1 });

        res.json({
            message: "Todos los usuarios",
            data: allUser,
            success: true,
            error: false
        });

    } catch (err) {
        res.json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
}

module.exports = allUsers;
