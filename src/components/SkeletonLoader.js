import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * Componente de loading skeleton com animação de shimmer.
 * Substitui conteúdo durante o carregamento de dados.
 *
 * @param {number} width - Largura do bloco (default: '100%')
 * @param {number} height - Altura do bloco (default: 16)
 * @param {number} borderRadius - Raio dos cantos (default: 8)
 * @param {object} style - Estilos adicionais
 */
export default function SkeletonLoader({ width = '100%', height = 16, borderRadius = 8, style }) {
    const { colors } = useTheme();
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: colors.chipBg,
                    opacity: pulseAnim,
                },
                style,
            ]}
        />
    );
}

/**
 * Skeleton pré-configurado para simular um card de despesa.
 */
export function SkeletonExpenseCard() {
    const { colors } = useTheme();

    return (
        <View style={[skeletonStyles.card, { backgroundColor: colors.cardBg }]}>
            <SkeletonLoader width={46} height={46} borderRadius={12} />
            <View style={skeletonStyles.info}>
                <SkeletonLoader width={120} height={14} />
                <SkeletonLoader width={180} height={10} style={{ marginTop: 8 }} />
            </View>
            <SkeletonLoader width={60} height={14} />
        </View>
    );
}

/**
 * Skeleton pré-configurado para simular um card de objetivo.
 */
export function SkeletonGoalCard() {
    const { colors } = useTheme();

    return (
        <View style={[skeletonStyles.goalCard, { backgroundColor: colors.cardBg }]}>
            <View style={skeletonStyles.goalHeader}>
                <SkeletonLoader width={140} height={16} />
                <SkeletonLoader width={80} height={14} />
            </View>
            <SkeletonLoader width="100%" height={12} borderRadius={6} style={{ marginTop: 15 }} />
        </View>
    );
}

/**
 * Skeleton para o header principal do HomeScreen.
 */
export function SkeletonHeader() {
    const { colors, isDarkMode } = useTheme();

    return (
        <View style={[skeletonStyles.header, { backgroundColor: isDarkMode ? colors.cardBg : colors.headerBg }]}>
            <SkeletonLoader width={140} height={12} style={{ marginBottom: 10, opacity: 0.3 }} />
            <SkeletonLoader width={120} height={14} style={{ marginBottom: 10, opacity: 0.3 }} />
            <SkeletonLoader width={180} height={40} borderRadius={12} style={{ marginBottom: 8, opacity: 0.3 }} />
            <SkeletonLoader width={160} height={12} style={{ opacity: 0.3 }} />
        </View>
    );
}

const skeletonStyles = StyleSheet.create({
    card: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    info: {
        flex: 1,
    },
    goalCard: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
    },
    goalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    header: {
        padding: 30,
        paddingTop: 30,
        alignItems: 'center',
    },
});
