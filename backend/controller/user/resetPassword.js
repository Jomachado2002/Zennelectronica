const bcrypt = require("bcryptjs");
const userModel = require("../../models/userModel");

async function resetPassword(req, res) {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) throw new Error("Token y nueva contraseña son requeridos.");

        // Buscar al usuario con el token válido y no expirado
        const user = await userModel.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }, // Verificar que el token no ha expirado
        });

        if (!user) throw new Error("Token inválido o expirado.");

        // Generar el hash de la nueva contraseña
        const salt = bcrypt.genSaltSync(10);
        const hashPassword = await bcrypt.hashSync(newPassword, salt);

        // Actualizar la contraseña y limpiar el token
        user.password = hashPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({
            message: "Contraseña actualizada exitosamente.",
            success: true,
            error: false,
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || "Ocurrió un error.",
            success: false,
            error: true,
        });
    }
}

module.exports = resetPassword;
