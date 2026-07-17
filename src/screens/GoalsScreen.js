// ficheiro: src/screens/ObjetivosScreen.js
import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView } from 'react-native';

// Dados fictícios dos vossos objetivos
const mockObjetivos = [
    { id: '1', titulo: 'Viagem a Paris', meta: 1500.00, guardado: 450.00, icone: '✈️' },
    { id: '2', titulo: 'Fundo de Emergência', meta: 5000.00, guardado: 2100.00, icone: '🛡️' },
    { id: '3', titulo: 'PlayStation 5', meta: 550.00, guardado: 550.00, icone: '🎮' }, // Este já está completo!
];

export default function ObjetivosScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Objetivos da Família</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {mockObjetivos.map((objetivo) => {
                    // Matemática da percentagem
                    const percentagemRaw = (objetivo.guardado / objetivo.meta) * 100;
                    // Garante que não passa dos 100% visualmente
                    const percentagem = Math.min(percentagemRaw, 100);
                    const concluido = percentagem === 100;

                    return (
                        <View key={objetivo.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.titulo}>{objetivo.icone} {objetivo.titulo}</Text>
                                <Text style={styles.valores}>
                                    <Text style={styles.guardado}>{objetivo.guardado.toFixed(0)}€</Text> / {objetivo.meta.toFixed(0)}€
                                </Text>
                            </View>

                            {/* A BARRA DE PROGRESSO */}
                            <View style={styles.barraFundo}>
                                <View
                                    style={[
                                        styles.barraProgresso,
                                        { width: `${percentagem}%`, backgroundColor: concluido ? '#10B981' : '#3B82F6' }
                                    ]}
                                />
                            </View>

                            <Text style={styles.percentagemTexto}>
                                {concluido ? '🎉 Objetivo Concluído!' : `${percentagem.toFixed(1)}% alcançado`}
                            </Text>
                        </View>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { padding: 30, paddingTop: 60, alignItems: 'center', backgroundColor: '#F5F7FA' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
    content: { padding: 20 },
    card: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    titulo: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    valores: { fontSize: 14, color: '#6B7280' },
    guardado: { fontWeight: 'bold', color: '#111827' },
    barraFundo: {
        height: 12,
        backgroundColor: '#E5E7EB', // Fundo cinza claro
        borderRadius: 6,
        overflow: 'hidden', // Corta a barra verde se ela tentar sair das bordas arredondadas
    },
    barraProgresso: {
        height: '100%',
        borderRadius: 6,
    },
    percentagemTexto: {
        marginTop: 10,
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'right',
        fontWeight: '500'
    }
});