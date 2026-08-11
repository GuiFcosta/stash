import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView, LayoutAnimation, RefreshControl } from 'react-native';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from '../services/Firebase';
import ExpenseCard from '../components/ExpenseCard';
import { useMonth } from '../context/MonthContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';

export default function SummaryScreen() {
    const { colors } = useTheme();
    const { chaveMesSelecionado } = useMonth();
    const { familyData } = useAuth();
    const insets = useSafeAreaInsets();

    const [expandidoId, setExpandidoId] = useState(null);
    const [gastosVariaveis, setGastosVariaveis] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [atualizando, setAtualizando] = useState(false);

    const familyId = familyData?.id;
    const membros = familyData?.membros || [];

    useEffect(() => {
        if (!familyId) return;

        setCarregando(true);
        const gastosDoMes = query(
            collection(db, 'gastos_variaveis'),
            where('familyId', '==', familyId),
            where('mesReferencia', '==', chaveMesSelecionado),
        );
        const unsubGastos = onSnapshot(gastosDoMes, (snapshot) => {
            const listaGastos = snapshot.docs.map(documento => ({
                id: documento.id,
                ...documento.data()
            }));
            setGastosVariaveis(listaGastos);
            setCarregando(false);
        }, (err) => {
            console.error("Erro ao carregar resumo:", err);
            setCarregando(false);
        });

        return () => {
            unsubGastos();
        };
    }, [chaveMesSelecionado, familyId]);

    const alternarCartao = (id) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandidoId(expandidoId === id ? null : id);
    };

    const aoAtualizar = () => {
        setAtualizando(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => setAtualizando(false), 1000);
    };

    const rendaTotalCasal = membros.reduce((soma, m) => soma + (Number(m.renda) || 0), 0);
    const totalGastoCasal = gastosVariaveis
        .filter(item => (Number(item.valor) || 0) > 0)
        .reduce((soma, item) => soma + Number(item.valor), 0);
    const pctGastaCasal = rendaTotalCasal > 0 ? Math.min((totalGastoCasal / rendaTotalCasal) * 100, 100) : 0;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.background, paddingTop: Math.max(insets.top + 10, 30) }]}>
                <Text style={[styles.headerTitle, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>Resumo por Pessoa</Text>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={atualizando}
                        onRefresh={aoAtualizar}
                        tintColor={colors.primaryLight}
                    />
                }
            >
                {/* 1. CARTÃO RESUMO COMBINADO DO AGREGADO */}
                <View style={[styles.resumoCasalCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <View style={styles.resumoCasalHeader}>
                        <View style={styles.rowTitle}>
                            <Ionicons name="people-outline" size={22} color={colors.primaryLight} style={{ marginRight: 8 }} />
                            <Text style={[styles.resumoCasalTitulo, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>
                                {familyData?.nome || 'Agregado Familiar'}
                            </Text>
                        </View>
                        <Text style={[styles.resumoCasalValor, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>-{totalGastoCasal.toFixed(2)} €</Text>
                    </View>

                    <Text style={[styles.resumoCasalSub, { color: colors.textLight, fontFamily: 'Inter_400Regular' }]}>
                        Rendimento Total: {rendaTotalCasal.toFixed(2)} €
                    </Text>

                    <View style={styles.barraFundo}>
                        <View style={[styles.barraProgresso, { width: `${pctGastaCasal}%`, backgroundColor: pctGastaCasal > 90 ? colors.danger : colors.primaryLight }]} />
                    </View>
                    <Text style={[styles.pctCasalTexto, { color: colors.textLight, fontFamily: 'Inter_400Regular' }]}>
                        {pctGastaCasal.toFixed(1)}% do orçamento de despesas variáveis consumido
                    </Text>
                </View>

                {/* 2. CARTÕES POR MEMBRO */}
                {carregando ? (
                    <View style={{ gap: 12 }}>
                        <SkeletonLoader height={90} borderRadius={16} />
                        <SkeletonLoader height={90} borderRadius={16} />
                    </View>
                ) : membros.length === 0 ? (
                    <EmptyState
                        titulo="Nenhum membro encontrado"
                        subtitulo="Convida familiares no separador Meu Perfil."
                        icone="people-outline"
                    />
                ) : (
                    membros.map((membro) => {
                        const rendaPessoa = Number(membro.renda) || 0;
                        const gastosPessoa = gastosVariaveis.filter(item => item.quem === membro.nome || item.quemUid === membro.uid);
                        const totalGasto = gastosPessoa
                            .filter(item => (Number(item.valor) || 0) > 0)
                            .reduce((soma, item) => soma + Number(item.valor), 0);
                        const percentagemGasta = rendaPessoa > 0
                            ? ((totalGasto / rendaPessoa) * 100).toFixed(1)
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

                        const estaExpandido = expandidoId === membro.uid;

                        return (
                            <View key={membro.uid} style={styles.cardContainer}>
                                <TouchableOpacity
                                    style={[styles.pessoaCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                                    activeOpacity={0.8}
                                    onPress={() => alternarCartao(membro.uid)}
                                >
                                    <View>
                                        <View style={styles.rowTitle}>
                                            <Text style={[styles.nome, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>{membro.nome}</Text>
                                            <Ionicons name={estaExpandido ? "chevron-up" : "chevron-down"} size={18} color={colors.textLight} style={{ marginLeft: 6 }} />
                                        </View>
                                        <Text style={[styles.rendaText, { color: colors.success, fontFamily: 'Inter_600SemiBold' }]}>Ganha: {rendaPessoa.toFixed(2)} €</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[styles.valor, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>-{totalGasto.toFixed(2)} €</Text>
                                        <Text style={[styles.percentagemText, { color: colors.textLight, fontFamily: 'Inter_400Regular' }]}>{percentagemGasta}% da renda</Text>
                                    </View>
                                </TouchableOpacity>

                                {estaExpandido && (
                                    <View style={[styles.detalhesContainer, { backgroundColor: colors.inputBg }]}>
                                        {/* Resumo por Categorias da Pessoa */}
                                        {categoriasPessoa.length > 0 && (
                                            <View style={styles.seccaoCategoriasPessoa}>
                                                <Text style={[styles.detalhesSubTitle, { color: colors.textMuted, fontFamily: 'Inter_600SemiBold' }]}>Categorias de {membro.nome}</Text>
                                                <View style={styles.chipsCategoriasRow}>
                                                    {categoriasPessoa.map(catItem => (
                                                        <View key={catItem.categoria} style={[styles.chipCategoriaPessoa, { backgroundColor: colors.cardBg }]}>
                                                            <Text style={[styles.chipCatNome, { color: colors.textDark, fontFamily: 'Inter_500Medium' }]}>{catItem.categoria}</Text>
                                                            <Text style={[styles.chipCatValor, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>{catItem.valor.toFixed(2)}€</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}

                                        <Text style={[styles.detalhesTitle, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>Movimentos de {membro.nome}</Text>
                                        {gastosPessoa.length > 0 ? (
                                            gastosPessoa.map((expense) => (
                                                <ExpenseCard key={expense.id} expense={expense} />
                                            ))
                                        ) : (
                                            <Text style={[styles.semGastos, { color: colors.textLight, fontFamily: 'Inter_400Regular' }]}>Nenhum gasto registado ainda este mês.</Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingBottom: 16, alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: 'bold' },
    content: { padding: 20 },

    resumoCasalCard: { padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    resumoCasalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowTitle: { flexDirection: 'row', alignItems: 'center' },
    resumoCasalTitulo: { fontSize: 18, fontWeight: 'bold' },
    resumoCasalValor: { fontSize: 20, fontWeight: 'bold' },
    resumoCasalSub: { fontSize: 13, marginTop: 4, marginBottom: 12 },
    barraFundo: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
    barraProgresso: { height: '100%', borderRadius: 4 },
    pctCasalTexto: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },

    cardContainer: { marginBottom: 16 },
    pessoaCard: { padding: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    nome: { fontSize: 18, fontWeight: '600' },
    rendaText: { fontSize: 13, marginTop: 4, fontWeight: '600' },
    valor: { fontSize: 20, fontWeight: 'bold' },
    percentagemText: { fontSize: 12, marginTop: 4 },
    detalhesContainer: { padding: 16, marginTop: 8, borderRadius: 16 },
    detalhesTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 10, marginTop: 5 },
    detalhesSubTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
    seccaoCategoriasPessoa: { marginBottom: 15 },
    chipsCategoriasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chipCategoriaPessoa: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, gap: 6, alignItems: 'center' },
    chipCatNome: { fontSize: 12 },
    chipCatValor: { fontSize: 12, fontWeight: 'bold' },
    semGastos: { fontStyle: 'italic', paddingVertical: 10 },
});
