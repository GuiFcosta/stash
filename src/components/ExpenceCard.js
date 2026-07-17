import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// O componente recebe "despesa" como propriedade (prop)
export default function ExpenseCard({ expense }) {
    return (
        <View style={styles.card}>
            <View style={styles.info}>
                <Text style={styles.loja}>{expense.loja}</Text>
                <Text style={styles.detalhe}>
                    {expense.categoria} • {expense.quem} • {expense.data}
                </Text>
            </View>
            <Text style={styles.valor}>-{expense.valor.toFixed(2)} €</Text>
        </View>
    );
}

// Estilos exclusivos deste componente
const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    info: {
        flex: 1,
    },
    loja: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    detalhe: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 4,
    },
    valor: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#EF4444',
    }
});