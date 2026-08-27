export const formatarMoeda = (valor) => {
    const num = Number(valor);
    if (isNaN(num)) return '0,00 €';
    return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR'
    }).format(num);
};

export const obterIniciais = (nome) => {
    if (!nome) return 'EU';
    return nome.trim().slice(0, 2).toUpperCase();
};
