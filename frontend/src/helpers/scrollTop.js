const scrollTop = () => {
  // Verificar si el navegador soporta el comportamiento 'smooth'
  if ('scrollBehavior' in document.documentElement.style) {
    // Método moderno con comportamiento suave
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  } else {
    // Fallback para navegadores que no soportan scrollBehavior
    const scrollToTop = () => {
      const currentPosition = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;

      if (currentPosition > 0) {
        // Usar requestAnimationFrame para un scroll suave
        window.requestAnimationFrame(scrollToTop);
        window.scrollTo(0, currentPosition - currentPosition / 8); // Ajusta la velocidad del scroll
      }
    };

    scrollToTop();
  }

  // Manejo adicional para iOS (Safari móvil)
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    // Intentar con document.body.scrollTop y document.documentElement.scrollTop
    document.body.scrollTop = 0; // Para Safari en iOS
    document.documentElement.scrollTop = 0; // Alternativa

    // Forzar un redibujado en caso de que el scroll no se actualice
    setTimeout(() => {
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    }, 100); // Timeout para asegurar que se ejecute después de cualquier operación pendiente
  }

  // Respaldar con un timeout para asegurar que el scroll se complete
  setTimeout(() => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, 200); // Timeout adicional como respaldo
};

export default scrollTop;