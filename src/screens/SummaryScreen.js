import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from '../services/Firebase';
import ExpenseCard from '../components/ExpenceCard';

export default function SummaryScreen() {
    const [expandidoId, setExpandidoId] = useState(null);

    const [gastosVariaveis, setGastosVariaveis] = useState([]);
    const [rendas, setRendas] = useState({Eu: 0, Parceira: 0});

    useEffect(() => {
        // Escuta as Configurações (Ordenados)
        const unsubConfig = onSnapshot(doc(db, 'familias', 'nossa_casa'), (docSnap) => {
            if (docSnap.exists()) {
                const dados = docSnap.data();
                setRendas(dados.rendas || { Eu: 0, Parceira: 0 });
            }
        });

        // Escuta os Gastos do dia a dia
        const unsubGastos = onSnapshot(collection(db, 'gastos_variaveis'), (snapshot) => {
            const listaGastos = snapshot.docs.map(documento => ({
                id: documento.id,
                ...documento.data()
            }));
            setGastosVariaveis(listaGastos);
        });

        return () => {
            unsubConfig();
            unsubGastos();
        };
    }, []);

    const alternarCartao = (id) => {
        setExpandidoId(expandidoId === id ? null : id);
    };

    const familiaFirebase = [
        { id: '1', nome: 'Eu', rendaMensal: Number(rendas.Eu) || 0 },
        { id: '2', nome: 'Parceira', rendaMensal: Number(rendas.Parceira) || 0 },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Resumo por Pessoa</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {familiaFirebase.map((pessoa) => {
                    // Filtra os gastos apenas desta pessoa
                    const gastosPessoa = gastosVariaveis.filter(item => item.quem === pessoa.nome);
                    const totalGasto = gastosPessoa.reduce((soma, item) => soma + (Number(item.valor) || 0), 0);
                    const percentagemGasta = pessoa.rendaMensal > 0
                        ? ((totalGasto / pessoa.rendaMensal) * 100).toFixed(1)
                        : '0.0';

                    return (
                        <View key={pessoa.id} style={styles.cardContainer}>
                            {/* O Cartão Clicável */}
                            <TouchableOpacity
                                style={styles.pessoaCard}
                                activeOpacity={0.7}
                                onPress={() => alternarCartao(pessoa.id)}
                            >
                                <View>
                                    <Text style={styles.nome}>{pessoa.nome}</Text>
                                    <Text style={styles.rendaText}>Ganha: {pessoa.rendaMensal.toFixed(2)} €</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.valor}>-{totalGasto.toFixed(2)} €</Text>
                                    <Text style={styles.percentagemText}>{percentagemGasta}% da renda</Text>
                                </View>
                            </TouchableOpacity>

                            {/* A Lista Expandida (Só aparece se expandidoId for igual ao id desta pessoa) */}
                            {expandidoId === pessoa.id && (
                                <View style={styles.detalhesContainer}>
                                    <Text style={styles.detalhesTitle}>Movimentos de {pessoa.nome}</Text>
                                    {gastosPessoa.length > 0 ? (
                                        gastosPessoa.map((expense) => (
                                            <ExpenseCard key={expense.id} expense={expense} />
                                        ))
                                    ) : (
                                        <Text style={styles.semGastos}>Nenhum gasto registado ainda.</Text>
                                    )}
                                </View>
                            )}
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
    cardContainer: { marginBottom: 16 },
    pessoaCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, zIndex: 2 },
    nome: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
    rendaText: { fontSize: 13, color: '#10B981', marginTop: 4, fontWeight: '600' },
    valor: { fontSize: 20, fontWeight: 'bold', color: '#EF4444' },
    percentagemText: { fontSize: 12, color: '#6B7280', marginTop: 4 },
    detalhesContainer: { backgroundColor: '#E5E7EB', padding: 16, paddingTop: 30, marginTop: -15, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, zIndex: 1 },
    detalhesTitle: { fontSize: 14, fontWeight: 'bold', color: '#4B5563', marginBottom: 10, marginLeft: 5 },
    semGastos: { color: '#6B7280', fontStyle: 'italic', marginLeft: 5 },
});
