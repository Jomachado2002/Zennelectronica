import React from 'react';

const SecurityInfoBanner = () => {
  return (
    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">i</span>
        </div>
        <div>
          <h3 className="font-medium text-blue-800 mb-1">Información de Seguridad</h3>
          <p className="text-blue-700 text-sm">
            Tu información personal está protegida y encriptada. Solo tú puedes ver y modificar estos datos.
            Para cambiar tu contraseña, utiliza la opción "Configuración" en el menú.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SecurityInfoBanner;