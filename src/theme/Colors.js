// ── Paleta de cores do Stash (Variação 3: Ultra-Clean Swiss Grid & High-Contrast) ──
// Tema claro e escuro com tokens semânticos para toda a aplicação.

export const lightColors = {
    // Fundos
    background: '#F8FAFC',
    cardBg: '#FFFFFF',
    inputBg: '#F1F5F9',
    chipBg: '#E2E8F0',

    // Texto
    textDark: '#111827',
    textMuted: '#4B5563',
    textLight: '#6B7280',
    textDisabled: '#9CA3AF',

    // Marca / Acento (Swiss Carbon & Emerald)
    primary: '#111827',
    primaryLight: '#10B981',
    primarySoft: '#D1FAE5',

    // Semânticos
    danger: '#EF4444',
    dangerSoft: '#FEE2E2',
    success: '#10B981',
    successSoft: '#D1FAE5',
    warning: '#F59E0B',
    warningSoft: '#FEF3C7',

    // Bordas e separadores (Swiss Grid High-Contrast)
    border: '#111827',
    borderSubtle: '#E5E7EB',
    shadowColor: '#111827',
    trackBg: '#F1F5F9',      // Fundo de barras de progresso

    // Header
    headerBg: '#FFFFFF',
    headerText: '#111827',
    headerSubtext: '#6B7280',
    headerAccent: '#10B981',

    // Modal
    modalFundo: 'rgba(17, 24, 39, 0.6)',
    modalContent: '#FFFFFF',

    // Cores para cards especiais (poupança / resgate)
    savingsBorder: '#10B981',
    savingsBg: '#ECFDF5',
    refundBorder: '#059669',
    refundBg: '#F0FDF4',

    // Ícones com fundo translúcido
    iconExpenseBg: 'rgba(17, 24, 39, 0.08)',
    iconSavingsBg: 'rgba(16, 185, 129, 0.15)',
    iconRefundBg: 'rgba(5, 150, 105, 0.15)',
};

export const darkColors = {
    // Fundos
    background: '#0B0F19',
    cardBg: '#111827',
    inputBg: '#1F2937',
    chipBg: '#1F2937',

    // Texto
    textDark: '#F9FAFB',
    textMuted: '#D1D5DB',
    textLight: '#9CA3AF',
    textDisabled: '#6B7280',

    // Marca / Acento
    primary: '#10B981',
    primaryLight: '#34D399',
    primarySoft: '#064E3B',

    // Semânticos
    danger: '#F87171',
    dangerSoft: '#451A03',
    success: '#34D399',
    successSoft: '#064E3B',
    warning: '#FBBF24',
    warningSoft: '#78350F',

    // Bordas e separadores
    border: '#374151',
    borderSubtle: '#1F2937',
    shadowColor: '#000000',
    trackBg: '#1F2937',        // Fundo de barras de progresso (visível em dark)

    // Header
    headerBg: '#111827',
    headerText: '#F9FAFB',
    headerSubtext: '#9CA3AF',
    headerAccent: '#34D399',

    // Modal
    modalFundo: 'rgba(0,0,0,0.8)',
    modalContent: '#111827',

    // Cores para cards especiais (poupança / resgate)
    savingsBorder: '#059669',
    savingsBg: '#064E3B',
    refundBorder: '#10B981',
    refundBg: '#022C22',

    // Ícones com fundo translúcido
    iconExpenseBg: 'rgba(248, 113, 113, 0.15)',
    iconSavingsBg: 'rgba(52, 211, 153, 0.15)',
    iconRefundBg: 'rgba(16, 185, 129, 0.15)',
};

// ── Cores de categorias (partilhadas, bom contraste em ambos os modos) ──
export const CATEGORY_COLORS = [
    '#059669', '#0D9488', '#D97706', '#4F46E5',
    '#E11D48', '#2563EB', '#7C3AED', '#475569',
];

// Exportação para compatibilidade com imports diretos (evitar)
// Usar sempre useTheme() nos componentes.
export const Colors = lightColors;
