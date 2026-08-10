/**
 * Converte uma cor hexadecimal para RGBA com opacidade.
 * Suporta hex de 3 ou 6 dígitos (com ou sem #).
 *
 * @param {string} hex - Cor em formato hexadecimal (ex: '#3B82F6' ou '3B82F6')
 * @param {number} opacity - Opacidade entre 0 e 1
 * @returns {string} Cor no formato 'rgba(r, g, b, opacity)'
 */
export function hexToRgba(hex, opacity = 1) {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
        clean = clean.split('').map(c => c + c).join('');
    }
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
