const crypto = require("crypto");
const userModel = require("../../models/userModel");
const { sendPasswordResetEmail } = require("../../services/brevoService");

async function requestPasswordReset(req, res) {
    try {
        const { email } = req.body;

        if (!email) throw new Error("Por favor, proporciona un email.");

        const user = await userModel.findOne({ email });
        if (!user) throw new Error("Usuario no encontrado.");

        const token = crypto.randomBytes(32).toString("hex");

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
        await user.save();

        const frontendUrl = (process.env.FRONTEND_URL || "https://www.zenn.com.py").replace(/\/$/, "");
        const resetUrl = `${frontendUrl}/restablecer-contrasena/${token}`;

        const emailResult = await sendPasswordResetEmail({
            email: user.email,
            name: user.name,
            resetUrl,
        });

        if (!emailResult.success) {
            throw new Error(emailResult.error || "No se pudo enviar el correo.");
        }

        res.status(200).json({
            message: "Correo enviado con instrucciones para restablecer tu contraseña.",
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

module.exports = requestPasswordReset;
