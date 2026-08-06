import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function ExpenseCard({ expense, onTouch }) {
    const { colors, isDarkMode } = useTheme();

    const ePoupanca = expense.categoria === 'Poupança';
    const eResgate = expense.valor < 0;

    return (
        <TouchableOpacity
            style={[
                styles.card,
                { backgroundColor: colors.cardBg },
                ePoupanca && (isDarkMode ? styles.cardPoupancaEscuro : styles.cardPoupanca),
                eResgate && (isDarkMode ? styles.cardResgateEscuro : styles.cardResgate)
            ]}
            activeOpacity={0.7}
            disabled={!onTouch}
            onPress={onTouch ? () => onTouch(expense) : undefined}
        >
            <View style={[styles.iconContainer, ePoupanca ? styles.iconPoupanca : styles.iconGasto, eResgate && styles.iconResgate]}>
                <Ionicons
                    name={eResgate ? "cash-outline" : (ePoupanca ? "wallet" : "cart-outline")}
                    size={24}
                    color={eResgate ? colors.success : (ePoupanca ? colors.primaryLight : colors.danger)}
                />
            </View>

            <View style={styles.info}>
                <Text style={[styles.loja, { color: colors.textDark }]}>{expense.loja}</Text>
                <Text style={[styles.detalhe, { color: colors.textLight }]}>
                    {expense.categoria} • {expense.quem} • {expense.data}
                </Text>
            </View>

            <Text style={[
                styles.valor,
                { color: colors.danger },
                ePoupanca && { color: colors.primaryLight },
                eResgate && { color: colors.success }
            ]}>
                {eResgate ? '+' : '-'}{Math.abs(expense.valor).toFixed(2)} €
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: { padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    cardPoupanca: { borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#F8FAFC' },
    cardPoupancaEscuro: { borderWidth: 1, borderColor: '#1E3A8A', backgroundColor: '#172554' },
    cardResgate: { borderWidth: 1, borderColor: '#A7F3D0', backgroundColor: '#F0FDF4' },
    cardResgateEscuro: { borderWidth: 1, borderColor: '#064E3B', backgroundColor: '#022C22' },
    iconContainer: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    iconGasto: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
    iconPoupanca: { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
    iconResgate: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
    info: { flex: 1 },
    loja: { fontSize: 16, fontWeight: '700' },
    detalhe: { fontSize: 13, marginTop: 4 },
    valor: { fontSize: 16, fontWeight: 'bold' }
});
