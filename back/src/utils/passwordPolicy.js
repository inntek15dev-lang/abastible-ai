// Política de contraseña para el flujo de recuperación autónoma de contratista_user:
// mínimo 8 caracteres, 4 letras, 4 números, 1 carácter especial, 1 mayúscula, 1 minúscula.
// Validado SIEMPRE en el backend (esto), independientemente de lo que valide el frontend.
const SPECIAL_CHARS_REGEX = /[!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~\\]/;

const validatePasswordPolicy = (password) => {
    const errors = [];
    const value = password || '';

    if (value.length < 8) errors.push('Debe tener al menos 8 caracteres');
    if ((value.match(/[A-Za-z]/g) || []).length < 4) errors.push('Debe tener al menos 4 letras');
    if ((value.match(/[0-9]/g) || []).length < 4) errors.push('Debe tener al menos 4 números');
    if (!SPECIAL_CHARS_REGEX.test(value)) errors.push('Debe tener al menos 1 carácter especial');
    if (!/[A-Z]/.test(value)) errors.push('Debe tener al menos 1 letra mayúscula');
    if (!/[a-z]/.test(value)) errors.push('Debe tener al menos 1 letra minúscula');

    return { valid: errors.length === 0, errors };
};

module.exports = { validatePasswordPolicy };
