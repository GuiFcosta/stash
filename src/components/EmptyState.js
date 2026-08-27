import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { styles } from './styles/EmptyStateStyles';

/**
 * Componente de estado vazio reutilizável.
 * Mostra um ícone, título e subtítulo quando não há dados.
 *
 * @param {string} icon - Nome do ícone Ionicons (default: 'folder-open-outline')
 * @param {string} title - Texto principal
 * @param {string} subtitle - Texto secundário (opcional)
 * @param {React.ReactNode} action - Componente de ação (ex: botão) (opcional)
 */
export default function EmptyState({ icon = 'folder-open-outline', title, subtitle, action }) {
    const { colors } = useTheme();

    return (
        <View style={styles.container} accessibilityRole="text" accessibilityLabel={`${title}. ${subtitle || ''}`}>
            <View style={[styles.iconCircle, { backgroundColor: colors.chipBg }]}>
                <Ionicons name={icon} size={40} color={colors.textDisabled} />
            </View>
            <Text style={[styles.title, { color: colors.textDark }]}>{title}</Text>
            {subtitle && <Text style={[styles.subtitle, { color: colors.textLight }]}>{subtitle}</Text>}
            {action && <View style={styles.actionContainer}>{action}</View>}
        </View>
    );
}