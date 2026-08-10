import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from '../services/Firebase';
import ExpenseCard from '../components/ExpenseCard';
import { useMonth } from '../context/MonthContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function SummaryScreen() {
    const { colors } = useTheme();
    const { chaveMesSelecionado } = useMonth();

    const [expandidoId, setExpandidoId] = useState(null);
    const [gastosVariaveis, setGastosVariaveis] = useState([]);
    const [rendas, setRendas] = useState({ Eu: 0, Parceira: 0 });

    useEffect(() => {
        const unsubConfig = onSnapshot(doc(db, 'familias', 'nossa_casa'), (docSnap) => {
            if (docSnap.exists()) {
                const dados = docSnap.data();
                setRendas(dados.rendas || { Eu: 0, Parceira: 0 });
            }
        });

        const gastosDoMes = query(
            collection(db, 'gastos_variaveis'),
            where('mesReferencia', '==', chaveMesSelecionado),
        );
        const unsubGastos = onSnapshot(gastosDoMes, (snapshot) => {
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
    }, [chaveMesSelecionado]);

    const alternarCartao = (id) => {
        setExpandidoId(expandidoId === id ? null : id);
    };

    const rendaTotalCasal = (Number(rendas.Eu) || 0) + (Number(rendas.Parceira) || 0);
    const totalGastoCasal = gastosVariaveis
        .filter(item => (Number(item.valor) || 0) > 0)
        .reduce((soma, item) => soma + Number(item.valor), 0);
    const pctGastaCasal = rendaTotalCasal > 0 ? Math.min((totalGastoCasal / rendaTotalCasal) * 100, 100) : 0;

    const familiaFirebase = [
        { id: '1', nome: 'Eu', rendaMensal: Number(rendas.Eu) || 0 },
        { id: '2', nome: 'Parceira', rendaMensal: Number(rendas.Parceira) || 0 },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <Text style={[styles.headerTitle, { color: colors.textDark }]}>Resumo por Pessoa</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* 1. CARTÃO RESUMO COMBINADO DO AGREGADO */}
                <View style={[styles.resumoCasalCard, { backgroundColor: colors.cardBg }]}>
                    <View style={styles.resumoCasalHeader}>
                        <View style={styles.rowTitle}>
                            <Ionicons name="people-outline" size={22} color={colors.primaryLight} style={{ marginRight: 8 }} />
                            <Text style={[styles.resumoCasalTitulo, { color: colors.textDark }]}>Agregado Familiar</Text>
                        </View>
                        <Text style={[styles.resumoCasalValor, { color: colors.danger }]}>-{totalGastoCasal.toFixed(2)} €</Text>
                    </View>

                    <Text style={[styles.resumoCasalSub, { color: colors.textLight }]}>
                        Rendimento Total: {rendaTotalCasal.toFixed(2)} €
                    </Text>

                    <View style={[styles.barraFundo, { backgroundColor: colors.trackBg }]}>
                        <View style={[styles.barraProgresso, { width: `${pctGastaCasal}%`, backgroundColor: pctGastaCasal > 90 ? colors.danger : colors.primaryLight }]} />
                    </View>
                    <Text style={[styles.pctCasalTexto, { color: colors.textLight }]}>
                        {pctGastaCasal.toFixed(1)}% do orçamento de despesas variáveis consumido
                    </Text>
                </View>

                {/* 2. CARTÕES POR PESSOA */}
                {familiaFirebase.map((pessoa) => {
                    const gastosPessoa = gastosVariaveis.filter(item => item.quem === pessoa.nome);
                    const totalGasto = gastosPessoa
                        .filter(item => (Number(item.valor) || 0) > 0)
                        .reduce((soma, item) => soma + Number(item.valor), 0);
                    const percentagemGasta = pessoa.rendaMensal > 0
                        ? ((totalGasto / pessoa.rendaMensal) * 100).toFixed(1)
                        : '0.0';

                    // Agrupar por categoria para esta pessoa
                    const categoriasPessoa = Object.values(gastosPessoa.reduce((acc, item) => {
                        const val = Number(item.valor) || 0;
                        if (val <= 0) return acc;
                        const cat = item.categoria || 'Outros';
                        acc[cat] = acc[cat] || { categoria: cat, valor: 0 };
                        acc[cat].valor += val;
                        return acc;
                    }, {})).sort((a, b) => b.valor - a.valor);

                    const estaExpandido = expandidoId === pessoa.id;

                    return (
                        <View key={pessoa.id} style={styles.cardContainer}>
                            <TouchableOpacity
                                style={[styles.pessoaCard, { backgroundColor: colors.cardBg }]}
                                activeOpacity={0.8}
                                onPress={() => alternarCartao(pessoa.id)}
                            >
                                <View>
                                    <View style={styles.rowTitle}>
                                        <Text style={[styles.nome, { color: colors.textDark }]}>{pessoa.nome}</Text>
                                        <Ionicons name={estaExpandido ? "chevron-up" : "chevron-down"} size={18} color={colors.textLight} style={{ marginLeft: 6 }} />
                                    </View>
                                    <Text style={[styles.rendaText, { color: colors.success }]}>Ganha: {pessoa.rendaMensal.toFixed(2)} €</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[styles.valor, { color: colors.danger }]}>-{totalGasto.toFixed(2)} €</Text>
                                    <Text style={[styles.percentagemText, { color: colors.textLight }]}>{percentagemGasta}% da renda</Text>
                                </View>
                            </TouchableOpacity>

                            {estaExpandido && (
                                <View style={[styles.detalhesContainer, { backgroundColor: colors.inputBg }]}>
                                    {/* Resumo por Categorias da Pessoa */}
                                    {categoriasPessoa.length > 0 && (
                                        <View style={styles.seccaoCategoriasPessoa}>
                                            <Text style={[styles.detalhesSubTitle, { color: colors.textMuted }]}>Categorias de {pessoa.nome}</Text>
                                            <View style={styles.chipsCategoriasRow}>
                                                {categoriasPessoa.map(catItem => (
                                                    <View key={catItem.categoria} style={[styles.chipCategoriaPessoa, { backgroundColor: colors.cardBg }]}>
                                                        <Text style={[styles.chipCatNome, { color: colors.textDark }]}>{catItem.categoria}</Text>
                                                        <Text style={[styles.chipCatValor, { color: colors.danger }]}>{catItem.valor.toFixed(2)}€</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    )}

                                    <Text style={[styles.detalhesTitle, { color: colors.textDark }]}>Movimentos de {pessoa.nome}</Text>
                                    {gastosPessoa.length > 0 ? (
                                        gastosPessoa.map((expense) => (
                                            <ExpenseCard key={expense.id} expense={expense} />
                                        ))
                                    ) : (
                                        <Text style={[styles.semGastos, { color: colors.textLight }]}>Nenhum gasto registado ainda este mês.</Text>
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
    container: { flex: 1 },
    header: { padding: 30, paddingTop: 60, alignItems: 'center' },
    headerTitle: { fontSize: 22, fontFamily: 'Inter_700Bold' },
    content: { padding: 20 },

    // Resumo Casal
    resumoCasalCard: { padding: 20, borderRadius: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    resumoCasalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowTitle: { flexDirection: 'row', alignItems: 'center' },
    resumoCasalTitulo: { fontSize: 18, fontFamily: 'Inter_700Bold' },
    resumoCasalValor: { fontSize: 20, fontFamily: 'Inter_700Bold' },
    resumoCasalSub: { fontSize: 13, marginTop: 4, marginBottom: 12 },
    barraFundo: { height: 8, borderRadius: 4, overflow: 'hidden' },
    barraProgresso: { height: '100%', borderRadius: 4 },
    pctCasalTexto: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },

    // Cartões Individuais
    cardContainer: { marginBottom: 16 },
    pessoaCard: { padding: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    nome: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
    rendaText: { fontSize: 13, marginTop: 4, fontWeight: '600' },
    valor: { fontSize: 20, fontFamily: 'Inter_700Bold' },
    percentagemText: { fontSize: 12, marginTop: 4 },
    detalhesContainer: { padding: 16, marginTop: 8, borderRadius: 16 },
    detalhesTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', marginBottom: 10, marginTop: 5 },
    detalhesSubTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
    seccaoCategoriasPessoa: { marginBottom: 15 },
    chipsCategoriasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chipCategoriaPessoa: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, gap: 6, alignItems: 'center' },
    chipCatNome: { fontSize: 12, fontWeight: '500' },
    chipCatValor: { fontSize: 12, fontWeight: 'bold' },
    semGastos: { fontStyle: 'italic', paddingVertical: 10 },
});
