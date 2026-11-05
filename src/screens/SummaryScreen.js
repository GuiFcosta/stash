import React, { useState, useEffect } from 'react';
import { Text, View, SafeAreaView, TouchableOpacity, ScrollView, LayoutAnimation, RefreshControl } from 'react-native';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from '../services/Firebase';
import ExpenseCard from '../components/ExpenseCard';
import { useMonth } from '../context/MonthContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { styles } from './styles/SummaryScreenStyles';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';
import {
    calcularGastoTotal,
    calcularTotalFixasPagas,
    calcularTotalFixasPagasPorMembro,
    agruparGastosPorCategoria,
    despesaFixaFoiPagaNoMes,
    obterQuemPagouFixoNoMes
} from '../utils/Calculations';
import { formatarMoeda } from '../utils/Formatters';

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
    const despesasFixas = familyData?.despesasFixas || [];

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

    // 1. CÁLCULO GERAL DO AGREGADO FAMILIAR (VARIÁVEIS + FIXAS PAGAS)
    const rendaTotalCasal = membros.reduce((soma, m) => soma + (Number(m.renda) || 0), 0);
    const totalFixasPagasCasal = calcularTotalFixasPagas(despesasFixas, chaveMesSelecionado);
    const totalVariavelCasal = calcularGastoTotal(gastosVariaveis.filter(item => (Number(item.valor) || 0) > 0));
    const totalGastoCasal = totalVariavelCasal + totalFixasPagasCasal;
    const pctGastaCasal = rendaTotalCasal > 0 ? Math.min((totalGastoCasal / rendaTotalCasal) * 100, 100) : 0;
    const despesasFixasPagasNoMes = despesasFixas.filter(d => despesaFixaFoiPagaNoMes(d, chaveMesSelecionado));

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[
                styles.header,
                {
                    backgroundColor: colors.cardBg,
                    borderBottomColor: colors.border,
                    paddingTop: Math.max(insets.top + 6, 14),
                }
            ]}>
                <View>
                    <Text style={[styles.headerOverline, { color: colors.textLight }]}>DIVISÃO FAMILIAR</Text>
                    <Text style={[styles.headerTitle, { color: colors.textDark }]}>Resumo por Pessoa</Text>
                </View>
                <View style={[styles.mesBadge, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <Text style={[styles.mesBadgeText, { color: colors.textDark }]}>{chaveMesSelecionado}</Text>
                </View>
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
                {/* 1. CARTÃO RESUMO COMBINADO DO AGREGADO (INCLUI FIXAS PAGAS) */}
                <View style={[styles.resumoCasalCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <View style={[styles.resumoCasalHeader, { borderBottomColor: colors.borderSubtle || colors.border }]}>
                        <View style={styles.rowTitle}>
                            <View style={[styles.iconSquare, { backgroundColor: colors.primary }]}>
                                <Ionicons name="people" size={16} color="#FFFFFF" />
                            </View>
                            <View>
                                <Text style={[styles.overlineSmall, { color: colors.textLight }]}>BALANÇO CONJUNTO</Text>
                                <Text style={[styles.resumoCasalTitulo, { color: colors.textDark }]}>
                                    {familyData?.nome || 'Agregado Familiar'}
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.resumoCasalValor, { color: colors.textDark }]}>
                            -{totalGastoCasal.toFixed(2)} €
                        </Text>
                    </View>

                    <View style={styles.resumoStatsGrid}>
                        <View style={[styles.statCell, { backgroundColor: colors.background, borderColor: colors.borderSubtle || colors.border }]}>
                            <Text style={[styles.statCellLabel, { color: colors.textLight }]}>RENDIMENTO</Text>
                            <Text style={[styles.statCellValue, { color: '#059669' }]}>{rendaTotalCasal.toFixed(2)} €</Text>
                        </View>
                        <View style={[styles.statCell, { backgroundColor: colors.background, borderColor: colors.borderSubtle || colors.border }]}>
                            <Text style={[styles.statCellLabel, { color: colors.textLight }]}>FIXAS PAGAS</Text>
                            <Text style={[styles.statCellValue, { color: colors.textDark }]}>{totalFixasPagasCasal.toFixed(2)} €</Text>
                        </View>
                    </View>

                    <View style={[styles.barraFundo, { backgroundColor: colors.trackBg, borderColor: colors.border }]}>
                        <View style={[
                            styles.barraProgresso,
                            {
                                width: `${pctGastaCasal}%`,
                                backgroundColor: pctGastaCasal > 90 ? colors.danger : '#10B981',
                            }
                        ]} />
                    </View>
                    <Text style={[styles.pctCasalTexto, { color: colors.textMuted }]}>
                        {pctGastaCasal.toFixed(1)}% do rendimento consumido em gastos globais
                    </Text>
                </View>

                {/* 2. CARTÕES INDIVIDUAIS POR MEMBRO */}
                {carregando ? (
                    <View style={{ gap: 12 }}>
                        <SkeletonLoader height={90} borderRadius={4} />
                        <SkeletonLoader height={90} borderRadius={4} />
                    </View>
                ) : membros.length === 0 ? (
                    <EmptyState
                        title="Nenhum membro encontrado"
                        subtitle="Convida familiares no separador Meu Perfil."
                        icon="people-outline"
                    />
                ) : (
                    <View style={{ paddingBottom: 40 }}>
                        <Text style={[styles.sectionHeaderLabel, { color: colors.textDark }]}>
                            QUOTA POR MEMBRO ({membros.length})
                        </Text>
                        {membros.map((membro) => {
                            const rendaPessoa = Number(membro.renda) || 0;
                            const gastosPessoaVariaveis = gastosVariaveis.filter(item => item.quem === membro.nome || item.quemUid === membro.uid);
                            const totalVariavelPessoa = calcularGastoTotal(gastosPessoaVariaveis.filter(item => (Number(item.valor) || 0) > 0));

                            // Contas fixas pagas por esta pessoa
                            const fixasPagasPessoa = despesasFixasPagasNoMes.filter(d => {
                                const quemPagou = obterQuemPagouFixoNoMes(d, chaveMesSelecionado);
                                return quemPagou === membro.nome;
                            });
                            const totalFixasPagaPessoa = calcularTotalFixasPagasPorMembro(despesasFixas, chaveMesSelecionado, membro.nome);

                            const totalGastoPessoa = totalVariavelPessoa + totalFixasPagaPessoa;
                            const percentagemGastaNum = rendaPessoa > 0 ? Math.min((totalGastoPessoa / rendaPessoa) * 100, 100) : 0;
                            const percentagemGasta = rendaPessoa > 0
                                ? ((totalGastoPessoa / rendaPessoa) * 100).toFixed(1)
                                : '0.0';

                            // Agrupar por categoria para esta pessoa (incluindo fixas pagas nas suas categorias reais)
                            const categoriasPessoa = agruparGastosPorCategoria(gastosPessoaVariaveis, fixasPagasPessoa);
                            const estaExpandido = expandidoId === membro.uid;
                            const iniciaisMembro = (membro.nome || 'MB').slice(0, 2).toUpperCase();

                            return (
                                <View key={membro.uid} style={styles.cardContainer}>
                                    <TouchableOpacity
                                        style={[styles.pessoaCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                                        activeOpacity={0.8}
                                        onPress={() => alternarCartao(membro.uid)}
                                    >
                                        <View style={styles.pessoaCardTop}>
                                            <View style={styles.rowTitle}>
                                                <View style={[styles.memberMonogram, { backgroundColor: colors.primary }]}>
                                                    <Text style={styles.memberMonogramText}>{iniciaisMembro}</Text>
                                                </View>
                                                <View>
                                                    <View style={styles.rowTitle}>
                                                        <Text style={[styles.nome, { color: colors.textDark }]}>{membro.nome}</Text>
                                                        <Ionicons name={estaExpandido ? "chevron-up" : "chevron-down"} size={16} color={colors.textDark} style={{ marginLeft: 6 }} />
                                                    </View>
                                                    <Text style={[styles.rendaText, { color: '#059669' }]}>
                                                        Rendimento: {rendaPessoa.toFixed(2)} €
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={[styles.valor, { color: colors.textDark }]}>
                                                    -{totalGastoPessoa.toFixed(2)} €
                                                </Text>
                                                <Text style={[styles.percentagemText, { color: colors.textLight }]}>
                                                    {percentagemGasta}% da renda
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={[styles.barraFundoMini, { backgroundColor: colors.trackBg, borderColor: colors.border }]}>
                                            <View style={[
                                                styles.barraProgresso,
                                                {
                                                    width: `${percentagemGastaNum}%`,
                                                    backgroundColor: percentagemGastaNum > 90 ? colors.danger : '#10B981',
                                                }
                                            ]} />
                                        </View>
                                    </TouchableOpacity>

                                    {estaExpandido && (
                                        <View style={[styles.detalhesContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                            {/* Resumo por Categorias da Pessoa */}
                                            {categoriasPessoa.length > 0 && (
                                                <View style={styles.seccaoCategoriasPessoa}>
                                                    <Text style={[styles.detalhesSubTitle, { color: colors.textMuted }]}>
                                                        CATEGORIAS DE {membro.nome.toUpperCase()}
                                                    </Text>
                                                    <View style={styles.chipsCategoriasRow}>
                                                        {categoriasPessoa.map(catItem => (
                                                            <View key={catItem.categoria} style={[styles.chipCategoriaPessoa, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                                                                <Text style={[styles.chipCatNome, { color: colors.textDark }]}>{catItem.categoria}</Text>
                                                                <Text style={[styles.chipCatValor, { color: '#059669' }]}>{catItem.valor.toFixed(2)}€</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                            )}

                                            <Text style={[styles.detalhesTitle, { color: colors.textDark }]}>
                                                MOVIMENTOS DE {membro.nome.toUpperCase()}
                                            </Text>
                                            
                                            {/* Lista de Contas Fixas Pagas por este Membro */}
                                            {fixasPagasPessoa.map((fixa) => (
                                                <ExpenseCard
                                                    key={`fixa_${fixa.id}`}
                                                    expense={{
                                                        id: fixa.id,
                                                        loja: `${fixa.nome} (Conta Fixa)`,
                                                        valor: Number(fixa.valor) || 0,
                                                        quem: membro.nome,
                                                        categoria: fixa.categoria || 'Casa',
                                                        data: 'Mensal'
                                                    }}
                                                />
                                            ))}

                                            {/* Lista de Gastos Variáveis */}
                                            {gastosPessoaVariaveis.length > 0 ? (
                                                gastosPessoaVariaveis.map((expense) => (
                                                    <ExpenseCard key={expense.id} expense={expense} />
                                                ))
                                            ) : fixasPagasPessoa.length === 0 ? (
                                                <Text style={[styles.semGastos, { color: colors.textLight }]}>
                                                    Nenhum gasto registado ainda este mês.
                                                </Text>
                                            ) : null}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
