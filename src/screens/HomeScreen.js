// ficheiro: src/screens/HomeScreen.js
import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const mockDespesas = [
    { id: '1', loja: 'Continente', valor: 45.50, data: '16/07', quem: 'Eu', categoria: 'Supermercado' },
    { id: '2', loja: 'Galp', valor: 30.00, data: '15/07', quem: 'Parceira', categoria: 'Combustível' },
    { id: '3', loja: 'Farmácia', valor: 12.90, data: '14/07', quem: 'Eu', categoria: 'Saúde' },
    { id: '4', loja: 'Netflix', valor: 15.99, data: '10/07', quem: 'Parceira', categoria: 'Subscrições' },
];

export default function HomeScreen() {
    const saldoDisponivel = 1500.00;

    const renderItem = ({ item }) => (
        <View style={styles.despesaCard}>
            <View style={styles.despesaInfo}>
                <Text style={styles.lojaText}>{item.loja}</Text>
                <Text style={styles.detalheText}>{item.categoria} • {item.quem} • {item.data}</Text>
            </View>
            <Text style={styles.valorText}>-{item.valor.toFixed(2)} €</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Orçamento Familiar</Text>
                <Text style={styles.saldoText}>{saldoDisponivel.toFixed(2)} €</Text>
                <Text style={styles.saldoLabel}>Saldo Disponível</Text>
            </View>

            <View style={styles.listaContainer}>
                <Text style={styles.sectionTitle}>Últimos Movimentos</Text>
                <FlatList
                    data={mockDespesas}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </SafeAreaView>
    );
}

// Cola aqui em baixo todos aqueles styles que tínhamos antes (styles = StyleSheet.create({...}))
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { backgroundColor: '#1E3A8A', padding: 30, paddingTop: 60, alignItems: 'center', borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
    headerTitle: { color: '#93C5FD', fontSize: 16, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
    saldoText: { color: '#FFFFFF', fontSize: 42, fontWeight: 'bold' },
    saldoLabel: { color: '#E0E7FF', fontSize: 14, marginTop: 5 },
    listaContainer: { flex: 1, padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 15 },
    despesaCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    despesaInfo: { flex: 1 },
    lojaText: { fontSize: 16, fontWeight: '700', color: '#111827' },
    detalheText: { fontSize: 13, color: '#6B7280', marginTop: 4 },
    valorText: { fontSize: 16, fontWeight: 'bold', color: '#EF4444' }
});