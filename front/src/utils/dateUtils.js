/**
 * Formats a period string (e.g. "2026-09", "2026-09-01", "2026-09-01T00:00:00.000Z")
 * or Date into a localized month and year string in Chilean Spanish (es-CL),
 * avoiding UTC-to-local timezone shifting bugs.
 *
 * @param {string|Date} periodo - The period string or Date object
 * @param {Object} [options] - Formatting options
 * @param {'long'|'short'|'narrow'} [options.monthFormat='long'] - Month format for toLocaleDateString
 * @param {boolean} [options.capitalize=true] - Whether to capitalize the first letter of the month
 * @returns {string} Formatted period string (e.g., "Septiembre de 2026")
 */
export const formatPeriodo = (periodo, options = {}) => {
    if (!periodo) return '-';
    const { monthFormat = 'long', capitalize = true } = options;

    let dateObj = null;

    if (typeof periodo === 'string') {
        const cleanStr = periodo.trim();
        if (cleanStr.includes('-')) {
            const parts = cleanStr.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
                // Construct Date in UTC to avoid local timezone offset shifting the month
                dateObj = new Date(Date.UTC(year, month - 1, 1));
            }
        }
    }

    if (!dateObj) {
        dateObj = new Date(periodo);
    }

    if (isNaN(dateObj.getTime())) return String(periodo);

    const formatted = dateObj.toLocaleDateString('es-CL', {
        month: monthFormat,
        year: 'numeric',
        timeZone: 'UTC'
    });

    return capitalize ? formatted.replace(/^\w/, c => c.toUpperCase()) : formatted;
};
