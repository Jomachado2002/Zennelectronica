// Polyfill for gopd
module.exports = function getOwnPropertyDescriptor(obj, prop) {
    if (obj === null || obj === undefined) {
      throw new TypeError('Cannot convert undefined or null to object');
    }
    return Object.getOwnPropertyDescriptor(Object(obj), prop);
  };