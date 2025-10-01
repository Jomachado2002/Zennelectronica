const userModel = require("../../models/userModel")

async function allUsers(req, res) {
    try {
        console.log("userid all Users", req.userId);

        const allUser = await userModel.find();

        res.json({
            message: "Todos los usuarios",
            data: allUser,
            success: true, // Corregido: 'success' estaba mal escrito
            error: false
        });

    } catch (err) {
        res.json({
            message: err.message || err,
            error: true,
            success: false // Asegúrate de que 'success' esté bien escrito
        });
    }
}

module.exports = allUsers;
