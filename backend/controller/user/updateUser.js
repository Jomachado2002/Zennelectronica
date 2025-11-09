const userModel = require("../../models/userModel")

async function updateUser(req, res) {

    try{

        const sessionUser = req.userId
        const { userId, email, name, role} = req.body
        
        // Obtener usuario de la sesión
        const user = await userModel.findById(sessionUser)

        if (!user) {
            return res.status(404).json({
                message: "Usuario de sesión no encontrado",
                error: true,
                success: false
            })
        }

        console.log("user.role", user.role)

        // ✅ VALIDACIÓN DE PERMISOS: Solo ADMIN o ROOT pueden cambiar roles
        if (role && role !== user.role) {
            if (user.role !== 'ADMIN' && user.role !== 'ROOT') {
                return res.status(403).json({
                    message: "Solo administradores pueden cambiar roles de usuario",
                    error: true,
                    success: false
                })
            }

            // ✅ VALIDACIÓN: Solo ROOT puede crear otros ROOT
            if (role === 'ROOT' && user.role !== 'ROOT') {
                return res.status(403).json({
                    message: "Solo usuarios ROOT pueden asignar el rol ROOT",
                    error: true,
                    success: false
                })
            }

            // ✅ VALIDACIÓN: No se puede modificar el rol de ROOT
            const targetUser = await userModel.findById(userId)
            if (targetUser && targetUser.role === 'ROOT' && user.role !== 'ROOT') {
                return res.status(403).json({
                    message: "No se puede modificar el rol de un usuario ROOT",
                    error: true,
                    success: false
                })
            }
        }

        // Preparar payload de actualización
        const payload = {
            ...(email && {email : email}),
            ...(name && {name : name}),
            ...(role && {role : role}),
        }

        // ✅ ACTUALIZAR USUARIO Y DEVOLVER DATOS ACTUALIZADOS
        const updatedUser = await userModel.findByIdAndUpdate(
            userId, 
            payload, 
            { new: true, runValidators: true }
        ).select('-password')

        if (!updatedUser) {
            return res.status(404).json({
                message: "Usuario a actualizar no encontrado",
                error: true,
                success: false
            })
        }

        res.json({
            data : updatedUser,
            message: "Usuario actualizado exitosamente",
            success: true,
            error: false
        })
    }catch(err){
        res.status(400).json({
            message : err.message || err,
            error : true,
            success : false
        })
    }
    
}

module.exports = updateUser;