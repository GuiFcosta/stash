export const CATEGORIAS_DE_GASTO = [
    'Mercado',
    'Restaurantes',
    'Casa',
    'Subscrições',
    'Saúde',
    'Transportes',
    'Lazer',
    'Compras',
    'Educação',
    'Animais',
    'Presentes',
    'Outros',
];

export const CATEGORIA_META = {
    Mercado: {
        icone: 'basket-outline',
        cor: '#047857',
        fundo: '#D1FAE5',
        borda: '#A7F3D0',
    },
    Restaurantes: {
        icone: 'restaurant-outline',
        cor: '#B45309',
        fundo: '#FEF3C7',
        borda: '#FDE68A',
    },
    Casa: {
        icone: 'home-outline',
        cor: '#0F766E',
        fundo: '#CCFBF1',
        borda: '#99F6E4',
    },
    Subscrições: {
        icone: 'repeat-outline',
        cor: '#4338CA',
        fundo: '#E0E7FF',
        borda: '#C7D2FE',
    },
    Saúde: {
        icone: 'medkit-outline',
        cor: '#BE123C',
        fundo: '#FFE4E6',
        borda: '#FECDD3',
    },
    Transportes: {
        icone: 'car-outline',
        cor: '#1D4ED8',
        fundo: '#DBEAFE',
        borda: '#BFDBFE',
    },
    Lazer: {
        icone: 'ticket-outline',
        cor: '#6D28D9',
        fundo: '#EDE9FE',
        borda: '#DDD6FE',
    },
    Compras: {
        icone: 'bag-handle-outline',
        cor: '#A21CAF',
        fundo: '#FAE8FF',
        borda: '#F5D0FE',
    },
    Educação: {
        icone: 'school-outline',
        cor: '#0369A1',
        fundo: '#E0F2FE',
        borda: '#BAE6FD',
    },
    Animais: {
        icone: 'paw-outline',
        cor: '#9A3412',
        fundo: '#FFEDD5',
        borda: '#FED7AA',
    },
    Presentes: {
        icone: 'gift-outline',
        cor: '#BE185D',
        fundo: '#FCE7F3',
        borda: '#FBCFE8',
    },
    Outros: {
        icone: 'grid-outline',
        cor: '#374151',
        fundo: '#F3F4F6',
        borda: '#E5E7EB',
    },
    Poupança: {
        icone: 'wallet-outline',
        cor: '#047857',
        fundo: '#ECFDF5',
        borda: '#6EE7B7',
    },
};

export function obterMetaCategoria(categoria) {
    return CATEGORIA_META[categoria] || CATEGORIA_META.Outros;
}
