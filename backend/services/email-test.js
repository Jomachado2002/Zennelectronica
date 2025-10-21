const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // TLS
    auth: {
        user: 'ventas@zenn.com.py',
        pass: 'knccsnxcdnjkpthv'
    },
    tls: {
        rejectUnauthorized: false // evita errores de certificados si los hay
    },
    debug: true // ✅ Muestra más info en consola
});

async function sendTestEmail() {
    try {
        await transporter.verify();
        

        const info = await transporter.sendMail({
            from: '"Zenn Test" <ventas@zenn.com.py>',
            to: 'ventas@zenn.com.py', // Puedes cambiar esto si querés
            subject: '✅ Prueba de envío SMTP desde Node.js',
            text: 'Este es un correo de prueba usando contraseña de aplicación.',
            html: '<b>Este es un correo de prueba usando contraseña de aplicación.</b>',
        });

        
        
        
    } catch (error) {
        // console.error removed for production
        // console.error removed for production
        if (error.response) {
            // console.error removed for production
        }
    }
}

sendTestEmail();
