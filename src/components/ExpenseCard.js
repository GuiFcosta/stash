import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function ExpenseCard({ expense, onTouch }) {
    const { colors } = useTheme();

    const ePoupanca = expense.categoria === 'Poupança';
    const eResgate = expense.valor < 0;

    return (
        <TouchableOpacity
            style={[
                styles.card,
                { backgroundColor: colors.cardBg },
                ePoupanca && { borderWidth: 1, borderColor: colors.savingsBorder, backgroundColor: colors.savingsBg },
                eResgate && { borderWidth: 1, borderColor: colors.refundBorder, backgroundColor: colors.refundBg }
            ]}
            activeOpacity={0.7}
            disabled={!onTouch}
            onPress={onTouch ? () => onTouch(expense) : undefined}
        >
            <View style={[styles.iconContainer, { backgroundColor: ePoupanca ? colors.iconSavingsBg : colors.iconExpenseBg }, eResgate && { backgroundColor: colors.iconRefundBg }]}>
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
    iconContainer: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    info: { flex: 1 },
    loja: { fontSize: 16, fontFamily: 'Inter_700Bold' },
    detalhe: { fontSize: 13, marginTop: 4 },
    valor: { fontSize: 16, fontFamily: 'Inter_700Bold' }
});
