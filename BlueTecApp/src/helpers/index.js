// src/helpers/index.js
// 🛠️ HELPERS - IGUAL QUE TU FRONTEND WEB

export const formatPrice = (price) => {
  if (!price) return 'Gs. 0';
  return `Gs. ${parseInt(price).toLocaleString('es-PY')}`;
};

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('es-PY');
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 8;
};

export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// 📱 HELPER ESPECÍFICO PARA MÓVIL
export const showAlert = (title, message) => {
  // En web usarías toast, en móvil usamos Alert
  if (typeof Alert !== 'undefined') {
    Alert.alert(title, message);
  } else {
    console.log(`${title}: ${message}`);
  }
};