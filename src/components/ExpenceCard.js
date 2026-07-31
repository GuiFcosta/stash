import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// O componente recebe "despesa" como propriedade (prop)
export default function ExpenseCard({ expense, onTouch }) {
    const ePoupanca = expense.categoria === 'Poupança';
    const eResgate = expense.valor < 0;

    return (
        <TouchableOpacity
            style={[styles.card, ePoupanca && styles.cardPoupanca, eResgate && styles.cardResgate]}
            activeOpacity={0.7}
            disabled={!onTouch}
            onPress={onTouch ? () => onTouch(expense) : undefined}
        >
            <View style={[styles.iconContainer, ePoupanca ? styles.iconPoupanca : styles.iconGasto, eResgate && styles.iconResgate]}>
                <Ionicons
                    name={eResgate ? "cash-outline" : (ePoupanca ? "wallet" : "cart-outline")}
                    size={24}
                    color={eResgate ? "#10B981" : (ePoupanca ? "#3B82F6" : "#EF4444")}
                />
            </View>

            <View style={styles.info}>
                <Text style={styles.loja}>{expense.loja}</Text>
                <Text style={styles.detalhe}>
                    {expense.categoria} • {expense.quem} • {expense.data}
                </Text>
            </View>

            <Text style={[styles.valor, ePoupanca && styles.valorPoupanca, eResgate && styles.valorResgate]}>
                {eResgate ? '+' : '-'}{Math.abs(expense.valor).toFixed(2)} €
            </Text>
        </TouchableOpacity>
    );
}

// Estilos exclusivos deste componente
const styles = StyleSheet.create({
    card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    cardPoupanca: { borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#F8FAFC' },
    cardResgate: { borderWidth: 1, borderColor: '#A7F3D0', backgroundColor: '#F0FDF4' }, // Fundo esverdeado
    iconContainer: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    iconGasto: { backgroundColor: '#FEE2E2' },
    iconPoupanca: { backgroundColor: '#DBEAFE' },
    iconResgate: { backgroundColor: '#D1FAE5' }, // Verde claro
    info: { flex: 1 },
    loja: { fontSize: 16, fontWeight: '700', color: '#111827' },
    detalhe: { fontSize: 13, color: '#6B7280', marginTop: 4 },
    valor: { fontSize: 16, fontWeight: 'bold', color: '#EF4444' },
    valorPoupanca: { color: '#3B82F6' },
    valorResgate: { color: '#10B981' } // Texto a Verde
});
