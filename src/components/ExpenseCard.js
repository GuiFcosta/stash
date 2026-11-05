import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { obterMetaCategoria } from '../constants/Categories';
import { hexToRgba } from '../utils/colors';
import { styles } from './styles/ExpenseCardStyles';

export default function ExpenseCard({ expense, onTouch }) {
    const { colors, isDarkMode } = useTheme();

    const ePoupanca = expense.categoria === 'Poupança';
    const eResgate = expense.valor < 0;
    const metaCat = obterMetaCategoria(expense.categoria);

    const iconeNome = eResgate
        ? 'cash-outline'
        : ePoupanca
            ? 'wallet-outline'
            : metaCat.icone;

    const iconeCor = eResgate
        ? colors.success
        : ePoupanca
            ? colors.primaryLight
            : isDarkMode
                ? colors.textDark
                : metaCat.cor;

    const iconeFundo = eResgate
        ? colors.iconRefundBg
        : ePoupanca
            ? colors.iconSavingsBg
            : isDarkMode
                ? hexToRgba(metaCat.cor, 0.25)
                : metaCat.fundo;

    return (
        <TouchableOpacity
            style={[
                styles.card,
                {
                    backgroundColor: colors.cardBg,
                    borderColor: colors.border,
                },
                ePoupanca && { borderColor: colors.savingsBorder, backgroundColor: colors.savingsBg },
                eResgate && { borderColor: colors.refundBorder, backgroundColor: colors.refundBg }
            ]}
            activeOpacity={0.75}
            disabled={!onTouch}
            onPress={onTouch ? () => onTouch(expense) : undefined}
        >
            <View style={[
                styles.iconContainer,
                {
                    backgroundColor: iconeFundo,
                    borderColor: isDarkMode ? colors.border : metaCat.borda,
                }
            ]}>
                <Ionicons
                    name={iconeNome}
                    size={20}
                    color={iconeCor}
                />
            </View>

            <View style={styles.info}>
                <Text style={[styles.loja, { color: colors.textDark }]} numberOfLines={1}>
                    {expense.loja}
                </Text>
                <View style={styles.metaRow}>
                    <View style={[
                        styles.categoriaBadge,
                        {
                            backgroundColor: isDarkMode ? hexToRgba(metaCat.cor, 0.2) : metaCat.fundo,
                            borderColor: isDarkMode ? hexToRgba(metaCat.cor, 0.4) : metaCat.borda,
                        }
                    ]}>
                        <Text style={[
                            styles.categoriaBadgeText,
                            { color: isDarkMode ? colors.textDark : metaCat.cor }
                        ]}>
                            {expense.categoria || 'Outros'}
                        </Text>
                    </View>
                    <Text style={[styles.detalhe, { color: colors.textLight }]} numberOfLines={1}>
                        • {expense.quem} • {expense.data}
                    </Text>
                </View>
            </View>

            <View style={styles.valorBox}>
                <Text style={[
                    styles.valor,
                    { color: colors.textDark },
                    ePoupanca && { color: colors.primaryLight },
                    eResgate && { color: colors.success }
                ]}>
                    {eResgate ? '+' : '-'}{Math.abs(expense.valor).toFixed(2)} €
                </Text>
                <Text style={[styles.metodoLabel, { color: colors.textDisabled }]}>
                    {eResgate ? 'RESGATE' : ePoupanca ? 'META' : 'REGISTADO'}
                </Text>
            </View>
        </TouchableOpacity>
    );
}
