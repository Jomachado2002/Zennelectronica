async function userLogout(req, res){
    try{
        res.clearCookie("token")

        res.json({
            message: "Cierre de sesión exitoso",
            error: false,
            success: true,
            data : []
        })
        
    }catch(err){
        res.json({
            message: err.message || err,
            error: true,
            success: false, // Corregido: 'success' en lugar de 'succes'
          });

    }
}

module.exports = userLogout