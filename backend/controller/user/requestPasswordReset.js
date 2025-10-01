const crypto = require("crypto");
const userModel = require("../../models/userModel");
const nodemailer = require("nodemailer");

async function requestPasswordReset(req, res) {
    try {
        const { email } = req.body;

        if (!email) throw new Error("Por favor, proporciona un email.");

        const user = await userModel.findOne({ email });
        if (!user) throw new Error("Usuario no encontrado.");

        // Generar un token único
        const token = crypto.randomBytes(32).toString("hex");

        // Guardar el token en el usuario con un tiempo de expiración (1 hora)
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
        await user.save();

        // Configuración de nodemailer
        const transporter = nodemailer.createTransport({
            service: "gmail", // Usa el servicio de correo que prefieras
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // URL para restablecer contraseña
        const resetUrl = `${process.env.FRONTEND_URL}/restablecer-contrasena/${token}`;

        // Enviar el correo
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Restablecimiento de contraseña",
            text: `Hola, ${user.name}. Puedes restablecer tu contraseña accediendo al siguiente enlace: ${resetUrl}`,
        });

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
