// ── Paleta de cores do Stash ──
// Tema claro e escuro com tokens semânticos para toda a aplicação.

export const lightColors = {
    // Fundos
    background: '#F5F7FA',
    cardBg: '#FFFFFF',
    inputBg: '#F3F4F6',
    chipBg: '#E5E7EB',

    // Texto
    textDark: '#111827',
    textMuted: '#4B5563',
    textLight: '#6B7280',
    textDisabled: '#9CA3AF',

    // Marca / Acento
    primary: '#1E3A8A',
    primaryLight: '#3B82F6',
    primarySoft: '#E0E7FF',

    // Semânticos
    danger: '#EF4444',
    dangerSoft: '#FEE2E2',
    success: '#10B981',
    successSoft: '#D1FAE5',
    warning: '#F59E0B',
    warningSoft: '#FEF3C7',

    // Bordas e separadores
    border: '#E5E7EB',
    trackBg: '#E5E7EB',      // Fundo de barras de progresso

    // Header
    headerBg: '#1E3A8A',
    headerText: '#FFFFFF',
    headerSubtext: '#93C5FD',
    headerAccent: '#E0E7FF',

    // Modal
    modalFundo: 'rgba(0,0,0,0.5)',
    modalContent: '#FFFFFF',

    // Cores para cards especiais (poupança / resgate)
    savingsBorder: '#BFDBFE',
    savingsBg: '#F8FAFC',
    refundBorder: '#A7F3D0',
    refundBg: '#F0FDF4',

    // Ícones com fundo translúcido
    iconExpenseBg: 'rgba(239, 68, 68, 0.15)',
    iconSavingsBg: 'rgba(59, 130, 246, 0.15)',
    iconRefundBg: 'rgba(16, 185, 129, 0.15)',
};

export const darkColors = {
    // Fundos
    background: '#0F172A',
    cardBg: '#1E293B',
    inputBg: '#334155',
    chipBg: '#334155',

    // Texto
    textDark: '#F8FAFC',
    textMuted: '#CBD5E1',
    textLight: '#94A3B8',
    textDisabled: '#64748B',

    // Marca / Acento
    primary: '#3B82F6',
    primaryLight: '#60A5FA',
    primarySoft: '#1E3A8A',

    // Semânticos
    danger: '#F87171',
    dangerSoft: '#451A03',
    success: '#34D399',
    successSoft: '#064E3B',
    warning: '#FBBF24',
    warningSoft: '#78350F',

    // Bordas e separadores
    border: '#334155',
    trackBg: '#475569',        // Fundo de barras de progresso (visível em dark)

    // Header
    headerBg: '#1E293B',
    headerText: '#F8FAFC',
    headerSubtext: '#93C5FD',
    headerAccent: '#CBD5E1',

    // Modal
    modalFundo: 'rgba(0,0,0,0.75)',
    modalContent: '#1E293B',

    // Cores para cards especiais (poupança / resgate)
    savingsBorder: '#1E3A8A',
    savingsBg: '#172554',
    refundBorder: '#064E3B',
    refundBg: '#022C22',

    // Ícones com fundo translúcido
    iconExpenseBg: 'rgba(248, 113, 113, 0.15)',
    iconSavingsBg: 'rgba(96, 165, 250, 0.15)',
    iconRefundBg: 'rgba(52, 211, 153, 0.15)',
};

// ── Cores de categorias (partilhadas, bom contraste em ambos os modos) ──
export const CATEGORY_COLORS = [
    '#2563EB', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#14B8A6', '#64748B',
];

// Exportação para compatibilidade com imports diretos (evitar)
// Usar sempre useTheme() nos componentes.
export const Colors = lightColors;