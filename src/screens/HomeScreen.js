import React, { useState, useEffect } from 'react';
import { Text, View, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, RefreshControl, LayoutAnimation } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import EmptyState from '../components/EmptyState';
import { SkeletonExpenseCard, SkeletonHeader } from '../components/SkeletonLoader';
import ExpenseCard from '../components/ExpenseCard';
import CategoryDonutChart from '../components/CategoryDonutChart';
import { CATEGORIAS_DE_GASTO, obterMetaCategoria } from '../constants/Categories';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/Firebase';
import { alterarMes, chaveDoMes, inicioDoMes, rotuloDoMes } from '../utils/Month';
import { useMonth } from '../context/MonthContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { hexToRgba } from '../utils/colors';
import { useExpenses } from '../hooks/useExpenses';
import { useFixedExpenses } from '../hooks/useFixedExpenses';
import {
    calcularGastoTotal,
    calcularTotalFixasPagas,
    agruparGastosPorCategoria,
    despesaFixaFoiPagaNoMes,
    obterQuemPagouFixoNoMes
} from '../utils/calculations';
import { formatarMoeda } from '../utils/formatters';
import { styles } from "./styles/HomeScreenStyles";

export default function HomeScreen() {
    const { colors, isDarkMode } = useTheme();
    const { mesSelecionado, setMesSelecionado, mesAnteriorDisponivel, setMesAnteriorDisponivel } = useMonth();
    const { user, userProfile, familyData } = useAuth();
    const insets = useSafeAreaInsets();

    const [atualizando, setAtualizando] = useState(false);
    const [saldoOculto, setSaldoOculto] = useState(false);

    const [modalVisivel, setModalVisivel] = useState(false);
    const [novoValor, setNovoValor] = useState('');
    const [novaLoja, setNovaLoja] = useState('');
    const [novaCategoria, setNovaCategoria] = useState(CATEGORIAS_DE_GASTO[0]);
    const [quemGastou, setQuemGastou] = useState(userProfile?.nome || 'Eu');
    const [gastoEmEdicao, setGastoEmEdicao] = useState(null);

    const [despesasFixasExpandidas, setDespesasFixasExpandidas] = useState(true);

    // Estados para Pesquisa e Filtros
    const [textoPesquisa, setTextoPesquisa] = useState('');
    const [filtroPessoa, setFiltroPessoa] = useState('Todos');

    const familyId = familyData?.id;
    const membrosFamilia = familyData?.membros || [];
    const despesasEssenciais = familyData?.despesasFixas || [];
    const limitesCategorias = familyData?.limitesCategorias || {};

    const {
        gastos: gastosVariaveis,
        carregando: carregandoExpenses,
        adicionarGasto,
        editarGasto,
        eliminarGasto
    } = useExpenses(familyId, mesSelecionado);

    const { alternarPagamentoFixo } = useFixedExpenses(familyId, despesasEssenciais);

    const carregando = carregandoExpenses;

    const totalRenda = membrosFamilia.reduce((soma, m) => soma + (Number(m.renda) || 0), 0);

    useEffect(() => {
        if (userProfile?.nome) {
            setQuemGastou(userProfile.nome);
        }
    }, [userProfile]);

    useEffect(() => {
        if (!familyId) return;
        let ativo = true;

        const procurarMesAnterior = async () => {
            const consulta = query(
                collection(db, 'gastos_variaveis'),
                where('familyId', '==', familyId),
                where('mesReferencia', '<', chaveDoMes(mesSelecionado)),
                orderBy('mesReferencia', 'desc'),
                limit(1),
            );

            try {
                const resultado = await getDocs(consulta);
                if (!ativo) return;

                if (resultado.empty) {
                    setMesAnteriorDisponivel(null);
                    return;
                }

                const [ano, mes] = resultado.docs[0].data().mesReferencia.split('-').map(Number);
                setMesAnteriorDisponivel(new Date(ano, mes - 1, 1));
            } catch (error) {
                if (ativo) setMesAnteriorDisponivel(null);
            }
        };

        procurarMesAnterior();
        return () => { ativo = false; };
    }, [mesSelecionado, familyId]);

    const aoAtualizar = () => {
        setAtualizando(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => setAtualizando(false), 1000);
    };

    const chaveMesSelecionado = chaveDoMes(mesSelecionado);
    const eMesAtual = chaveMesSelecionado === chaveDoMes(new Date());
    const despesaFoiPagaNoMes = (despesa) => despesaFixaFoiPagaNoMes(despesa, chaveMesSelecionado);
    const obterQuemPagouNoMes = (despesa) => obterQuemPagouFixoNoMes(despesa, chaveMesSelecionado);

    const totalEssenciais = calcularTotalFixasPagas(despesasEssenciais, chaveMesSelecionado);
    const totalVariaveis = calcularGastoTotal(gastosVariaveis);
    const totalConsumido = totalEssenciais + totalVariaveis;
    const saldoDisponivel = totalRenda - totalConsumido;
    const pctConsumida = totalRenda > 0 ? Math.min(Math.max((totalConsumido / totalRenda) * 100, 0), 100) : 0;
    const podeAvancarMes = mesSelecionado < inicioDoMes(new Date());

    const despesasFixasPagasNoMes = despesasEssenciais.filter(despesaFoiPagaNoMes);
    const gastosPorCategoria = agruparGastosPorCategoria(gastosVariaveis, despesasFixasPagasNoMes);

    const gastosFiltrados = gastosVariaveis.filter((gasto) => {
        const termo = textoPesquisa.trim().toLowerCase();
        const bateTexto = !termo ||
            gasto.loja?.toLowerCase().includes(termo) ||
            gasto.categoria?.toLowerCase().includes(termo);
        const batePessoa = filtroPessoa === 'Todos' || gasto.quem === filtroPessoa;
        return bateTexto && batePessoa;
    });

    const handleAlternarPagamentoFixo = async (id, estadoAtual) => {
        await alternarPagamentoFixo(
            id,
            estadoAtual,
            chaveMesSelecionado,
            eMesAtual,
            userProfile?.nome || user?.displayName || 'Eu',
            user?.uid || ''
        );
    };

    const abrirModalNovoGasto = () => {
        if (!eMesAtual) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setGastoEmEdicao(null);
        setNovaLoja('');
        setNovoValor('');
        setNovaCategoria(CATEGORIAS_DE_GASTO[0]);
        setModalVisivel(true);
    };

    const guardarGasto = async () => {
        if (!novoValor || !novaLoja || !novaCategoria) {
            Alert.alert("Aviso", "Por favor, preenche todos os campos!");
            return;
        }
        if (!familyId) return;

        try {
            const valorFormatado = Number(novoValor.trim().replace(',', '.'));
            if (!Number.isFinite(valorFormatado) || valorFormatado <= 0) {
                Alert.alert("Aviso", "Indica um valor superior a zero.");
                return;
            }
            const dataAtual = new Date();
            const diaStr = String(dataAtual.getDate()).padStart(2, '0');
            const mesStr = String(dataAtual.getMonth() + 1).padStart(2, '0');

            const membroObj = membrosFamilia.find(m => m.nome === quemGastou);

            const dadosGasto = {
                familyId: familyId,
                loja: novaLoja,
                valor: valorFormatado,
                data: gastoEmEdicao?.data || `${diaStr}/${mesStr}`,
                quem: quemGastou,
                quemUid: membroObj?.uid || user?.uid || '',
                categoria: novaCategoria,
                mesReferencia: gastoEmEdicao?.mesReferencia || chaveDoMes(mesSelecionado),
                timestamp: gastoEmEdicao?.timestamp || Date.now(),
            };

            if (gastoEmEdicao) {
                await editarGasto(gastoEmEdicao.id, dadosGasto);
            } else {
                await adicionarGasto(dadosGasto);
            }

            setNovaLoja(''); setNovoValor(''); setNovaCategoria(CATEGORIAS_DE_GASTO[0]); setQuemGastou(userProfile?.nome || 'Eu');
            setGastoEmEdicao(null); setModalVisivel(false);

        } catch (error) {
            // Tratado no hook
        }
    };

    const gerirGasto = (despesa) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert(
            "Gerir Gasto",
            `O que desejas fazer com a despesa de ${despesa.loja}?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Editar",
                    onPress: () => {
                        setNovoValor(despesa.valor.toString().replace('.', ','));
                        setNovaLoja(despesa.loja);
                        setNovaCategoria(CATEGORIAS_DE_GASTO.includes(despesa.categoria) ? despesa.categoria : 'Outros');
                        setQuemGastou(despesa.quem);
                        setGastoEmEdicao(despesa);
                        setModalVisivel(true);
                    }
                },
                {
                    text: "Apagar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await eliminarGasto(despesa.id);
                        } catch (error) {
                            // Tratado no hook
                        }
                    }
                }
            ]
        );
    };

    const nomesMembros = membrosFamilia.map(m => m.nome);
    const listaFiltrosPessoa = ['Todos', ...nomesMembros];
    const nomeFamilia = familyData?.nome || 'Orçamento Familiar';
    const iniciaisFamilia = nomeFamilia
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0].toUpperCase())
        .join('') || 'ST';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            {/* TOP APP BAR: Swiss Minimal Header */}
            <View style={[
                styles.header,
                {
                    backgroundColor: colors.cardBg,
                    borderBottomColor: colors.border,
                    paddingTop: Math.max(insets.top + 6, 14),
                }
            ]}>
                <View style={styles.headerBrandRow}>
                    <View style={[styles.monogramBox, { backgroundColor: colors.primary }]}>
                        <Text style={styles.monogramText}>{iniciaisFamilia}</Text>
                    </View>
                    <View>
                        <Text style={[styles.headerOverline, { color: colors.textLight }]}>
                            ORÇAMENTO PARTILHADO
                        </Text>
                        <Text style={[styles.headerTitle, { color: colors.textDark }]} numberOfLines={1}>
                            {nomeFamilia}
                        </Text>
                    </View>
                </View>

                <View style={[styles.seletorMes, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <TouchableOpacity
                        accessibilityLabel="Ver mês anterior"
                        disabled={!mesAnteriorDisponivel}
                        onPress={() => {
                            Haptics.selectionAsync();
                            setMesSelecionado(mesAnteriorDisponivel);
                        }}
                        style={[styles.botaoMes, !mesAnteriorDisponivel && styles.botaoMesDesativado]}
                    >
                        <Ionicons name="chevron-back" size={16} color={colors.textDark} />
                    </TouchableOpacity>
                    <Text style={[styles.rotuloMes, { color: colors.textDark }]}>
                        {rotuloDoMes(mesSelecionado)}
                    </Text>
                    <TouchableOpacity
                        accessibilityLabel="Ver mês seguinte"
                        disabled={!podeAvancarMes}
                        onPress={() => {
                            Haptics.selectionAsync();
                            setMesSelecionado((mes) => alterarMes(mes, 1));
                        }}
                        style={[styles.botaoMes, !podeAvancarMes && styles.botaoMesDesativado]}
                    >
                        <Ionicons name="chevron-forward" size={16} color={colors.textDark} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={atualizando}
                        onRefresh={aoAtualizar}
                        tintColor={colors.primaryLight}
                    />
                }
            >
                {/* BARRA DE AÇÃO RÁPIDA NO TOPO (Swiss Grid High-Contrast) */}
                <View style={styles.topSection}>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={!eMesAtual}
                        onPress={abrirModalNovoGasto}
                        style={[
                            styles.quickActionBanner,
                            {
                                backgroundColor: isDarkMode ? colors.cardBg : '#111827',
                                borderColor: colors.border,
                            },
                            !eMesAtual && styles.fabDesativado
                        ]}
                    >
                        <View style={styles.quickActionLeft}>
                            <View style={[styles.quickActionIconBox, { backgroundColor: '#10B981' }]}>
                                <Ionicons name="flash" size={20} color="#FFFFFF" />
                            </View>
                            <View>
                                <Text style={styles.quickActionOverline}>AÇÃO RÁPIDA</Text>
                                <Text style={styles.quickActionTitle}>Adicionar Movimento</Text>
                            </View>
                        </View>

                        <View style={styles.quickActionBtn}>
                            <Ionicons name="add" size={16} color="#FFFFFF" />
                            <Text style={styles.quickActionBtnText}>NOVA DESPESA</Text>
                        </View>
                    </TouchableOpacity>

                    {/* 1. HERO CARD SWISS BENTO */}
                    {carregando ? (
                        <SkeletonHeader />
                    ) : (
                        <View style={[
                            styles.heroBentoCard,
                            {
                                backgroundColor: colors.cardBg,
                                borderColor: colors.border,
                            }
                        ]}>
                            <View style={[styles.heroTopRow, { borderBottomColor: colors.borderSubtle || colors.border }]}>
                                <View style={styles.heroLabelGroup}>
                                    <Text style={[styles.heroLabel, { color: colors.textLight }]}>
                                        SALDO DISPONÍVEL FAMILIAR
                                    </Text>
                                    <View style={styles.liveBadge}>
                                        <Text style={styles.liveBadgeText}>AO VIVO</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    accessibilityLabel={saldoOculto ? "Mostrar saldo" : "Ocultar saldo"}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setSaldoOculto(!saldoOculto);
                                    }}
                                    style={{ padding: 4 }}
                                >
                                    <Ionicons
                                        name={saldoOculto ? "eye-off-outline" : "eye-outline"}
                                        size={18}
                                        color={colors.textDark}
                                    />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.saldoBaselineRow}>
                                <Text style={[
                                    styles.saldoText,
                                    { color: saldoDisponivel < 0 ? colors.danger : colors.textDark }
                                ]}>
                                    {saldoOculto ? '••••••••' : `${saldoDisponivel.toFixed(2)} €`}
                                </Text>
                                <Text style={[styles.saldoSubMeta, { color: colors.textLight }]}>
                                    de {totalRenda.toFixed(0)} € previstos
                                </Text>
                            </View>

                            {/* Indicador de Consumo */}
                            <View style={styles.consumoBlock}>
                                <View style={styles.consumoRowText}>
                                    <Text style={[styles.consumoInfoText, { color: colors.textMuted }]}>
                                        {pctConsumida.toFixed(0)}% consumido • ritmo mensal
                                    </Text>
                                    <Text style={[
                                        styles.consumoRestanteText,
                                        { color: saldoDisponivel >= 0 ? '#047857' : colors.danger }
                                    ]}>
                                        {saldoOculto ? '•••• €' : `${Math.max(saldoDisponivel, 0).toFixed(0)} € restantes`}
                                    </Text>
                                </View>
                                <View style={[
                                    styles.consumoTrack,
                                    {
                                        backgroundColor: colors.trackBg,
                                        borderColor: colors.border,
                                    }
                                ]}>
                                    <View style={[
                                        styles.consumoFill,
                                        {
                                            width: `${pctConsumida}%`,
                                            backgroundColor: pctConsumida > 90 ? colors.danger : '#10B981',
                                        }
                                    ]} />
                                </View>
                            </View>

                            {/* Grid de 2 Mini-Cards Bento */}
                            <View style={styles.bentoMiniRow}>
                                <View style={[
                                    styles.bentoMiniCard,
                                    {
                                        backgroundColor: colors.background,
                                        borderColor: colors.borderSubtle || colors.border,
                                    }
                                ]}>
                                    <View style={styles.bentoMiniHeader}>
                                        <Text style={[styles.bentoMiniLabel, { color: colors.textLight }]}>
                                            RENDIMENTO
                                        </Text>
                                        <Ionicons name="arrow-up" size={14} color="#059669" />
                                    </View>
                                    <Text style={[styles.bentoMiniValue, { color: colors.textDark }]}>
                                        +{totalRenda.toFixed(2)} €
                                    </Text>
                                    <Text style={[styles.bentoMiniFoot, { color: '#059669' }]}>
                                        {membrosFamilia.length} {membrosFamilia.length === 1 ? 'membro' : 'membros'}
                                    </Text>
                                </View>

                                <View style={[
                                    styles.bentoMiniCard,
                                    {
                                        backgroundColor: colors.background,
                                        borderColor: colors.borderSubtle || colors.border,
                                    }
                                ]}>
                                    <View style={styles.bentoMiniHeader}>
                                        <Text style={[styles.bentoMiniLabel, { color: colors.textLight }]}>
                                            FIXAS PAGAS
                                        </Text>
                                        <Ionicons name="lock-closed-outline" size={14} color={colors.textDark} />
                                    </View>
                                    <Text style={[styles.bentoMiniValue, { color: colors.textDark }]}>
                                        -{totalEssenciais.toFixed(2)} €
                                    </Text>
                                    <Text style={[styles.bentoMiniFoot, { color: colors.textLight }]}>
                                        {despesasFixasPagasNoMes.length}/{despesasEssenciais.length} liquidadas
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                {/* 2. SECÇÃO DAS DESPESAS FIXAS (CARROSSEL HORIZONTAL SWISS GRID) */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.sectionHeaderClickable}
                        activeOpacity={0.7}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (Platform.OS !== 'web') {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            }
                            setDespesasFixasExpandidas(!despesasFixasExpandidas);
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={[styles.sectionTitle, { color: colors.textDark, marginBottom: 0 }]}>
                                DESPESAS MENSAIS FIXAS
                            </Text>
                            {despesasEssenciais.length > 0 && (
                                <View style={[
                                    styles.badgeContagemFixas,
                                    {
                                        backgroundColor: colors.primarySoft,
                                        borderColor: colors.primaryLight,
                                    }
                                ]}>
                                    <Text style={[styles.badgeContagemFixasTexto, { color: '#065F46' }]}>
                                        {despesasFixasPagasNoMes.length} de {despesasEssenciais.length}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={[styles.verTodasLink, { color: colors.textDark }]}>
                                {despesasFixasExpandidas ? 'Ocultar' : 'Ver todas'}
                            </Text>
                            <Ionicons
                                name={despesasFixasExpandidas ? "chevron-up" : "chevron-down"}
                                size={16}
                                color={colors.textDark}
                            />
                        </View>
                    </TouchableOpacity>

                    {despesasFixasExpandidas && (
                        <View style={{ marginTop: 10 }}>
                            {despesasEssenciais.length === 0 ? (
                                <View style={[styles.emptyFixasBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                                    <Text style={{ color: colors.textLight, fontSize: 13, textAlign: 'center', fontFamily: 'SpaceGrotesk_500Medium' }}>
                                        Nenhuma despesa mensal configurada no Perfil.
                                    </Text>
                                </View>
                            ) : (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.fixasCarouselContent}
                                >
                                    {despesasEssenciais.map((item) => {
                                        const estaPaga = despesaFoiPagaNoMes(item);
                                        const quemPagou = obterQuemPagouNoMes(item);
                                        const metaCat = obterMetaCategoria(item.categoria || 'Casa');

                                        return (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={[
                                                    styles.essencialCard,
                                                    {
                                                        backgroundColor: colors.cardBg,
                                                        borderColor: colors.border,
                                                    },
                                                    !estaPaga && styles.essencialCardPendente,
                                                ]}
                                                activeOpacity={0.75}
                                                onPress={() => handleAlternarPagamentoFixo(item.id, estaPaga)}
                                            >
                                                <View style={styles.essencialTopRow}>
                                                    <View style={[
                                                        styles.essencialIconBox,
                                                        {
                                                            backgroundColor: estaPaga ? '#D1FAE5' : '#FEF3C7',
                                                        }
                                                    ]}>
                                                        <Ionicons
                                                            name={metaCat.icone}
                                                            size={18}
                                                            color={estaPaga ? '#065F46' : '#92400E'}
                                                        />
                                                    </View>

                                                    <View style={[
                                                        styles.statusPill,
                                                        estaPaga
                                                            ? { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }
                                                            : { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }
                                                    ]}>
                                                        <Text style={[
                                                            styles.statusPillText,
                                                            { color: estaPaga ? '#065F46' : '#92400E' }
                                                        ]}>
                                                            {estaPaga ? 'PAGO' : 'PENDENTE'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={styles.essencialBottomGroup}>
                                                    <Text
                                                        style={[
                                                            styles.lojaText,
                                                            { color: colors.textMuted },
                                                            estaPaga && styles.textoRiscado
                                                        ]}
                                                        numberOfLines={1}
                                                    >
                                                        {item.nome}
                                                    </Text>

                                                    <View style={styles.essencialValorRow}>
                                                        <Text style={[
                                                            styles.valorFixo,
                                                            { color: colors.textDark },
                                                            estaPaga && styles.textoRiscado
                                                        ]}>
                                                            {Number(item.valor).toFixed(2)} €
                                                        </Text>

                                                        {!estaPaga && (
                                                            <View style={[styles.btnPagarMini, { backgroundColor: colors.primary }]}>
                                                                <Text style={styles.btnPagarMiniText}>PAGAR</Text>
                                                            </View>
                                                        )}
                                                    </View>

                                                    <Text style={[
                                                        styles.detalheText,
                                                        { color: estaPaga ? colors.textLight : '#B45309' }
                                                    ]} numberOfLines={1}>
                                                        {item.diaVencimento ? `Dia ${item.diaVencimento} • ` : ''}
                                                        {estaPaga ? (quemPagou ? `Por ${quemPagou}` : 'Liquidado') : 'Toque p/ liquidar'}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>
                    )}
                </View>

                {/* 3. SECÇÃO PARA ONDE VAI O DINHEIRO */}
                <View style={styles.section}>
                    <View style={[styles.graficoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                        <View style={[styles.graficoHeaderRow, { borderBottomColor: colors.borderSubtle || colors.border }]}>
                            <View>
                                <Text style={[styles.sectionTitle, { color: colors.textDark, marginBottom: 2 }]}>
                                    PARA ONDE VAI O DINHEIRO
                                </Text>
                                <Text style={[styles.graficoSubtitle, { color: colors.textLight }]}>
                                    Distribuição de consumo no ciclo atual
                                </Text>
                            </View>
                            <View style={[styles.esteMesTag, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                <Text style={[styles.esteMesTagText, { color: colors.textDark }]}>ESTE MÊS</Text>
                            </View>
                        </View>

                        <CategoryDonutChart dados={gastosPorCategoria} limites={limitesCategorias} />
                    </View>
                </View>

                {/* 4. SECÇÃO DOS GASTOS VARIÁVEIS */}
                <View style={[styles.section, { paddingBottom: 100 }]}>
                    <View style={styles.gastosHeaderRow}>
                        <View>
                            <Text style={[styles.sectionTitle, { color: colors.textDark, marginBottom: 2 }]}>
                                GASTOS RECENTES
                            </Text>
                            <Text style={[styles.graficoSubtitle, { color: colors.textLight }]}>
                                Movimentos combinados da família
                            </Text>
                        </View>
                    </View>

                    {/* Barra de Pesquisa e Filtros */}
                    <View style={styles.pesquisaContainer}>
                        <View style={[styles.inputPesquisaBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                            <Ionicons name="search-outline" size={18} color={colors.textLight} style={{ marginRight: 8 }} />
                            <TextInput
                                style={[styles.inputPesquisa, { color: colors.textDark }]}
                                placeholder="Pesquisar transação ou categoria..."
                                placeholderTextColor={colors.textDisabled}
                                value={textoPesquisa}
                                onChangeText={setTextoPesquisa}
                            />
                            {textoPesquisa !== '' && (
                                <TouchableOpacity onPress={() => setTextoPesquisa('')}>
                                    <Ionicons name="close-circle" size={18} color={colors.textDisabled} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                            {listaFiltrosPessoa.map((pessoa) => {
                                const ativo = filtroPessoa === pessoa;
                                const contagem = pessoa === 'Todos'
                                    ? gastosVariaveis.length
                                    : gastosVariaveis.filter(g => g.quem === pessoa).length;

                                return (
                                    <TouchableOpacity
                                        key={pessoa}
                                        style={[
                                            styles.chipPessoa,
                                            {
                                                backgroundColor: ativo ? colors.primary : colors.cardBg,
                                                borderColor: colors.border,
                                            }
                                        ]}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setFiltroPessoa(pessoa);
                                        }}
                                    >
                                        <Text style={[
                                            styles.chipTexto,
                                            { color: ativo ? '#FFFFFF' : colors.textDark }
                                        ]}>
                                            {pessoa} ({contagem})
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {carregando ? (
                        <View style={{ gap: 10 }}>
                            <SkeletonExpenseCard />
                            <SkeletonExpenseCard />
                            <SkeletonExpenseCard />
                        </View>
                    ) : gastosVariaveis.length === 0 ? (
                        <EmptyState
                            title="Sem gastos registados"
                            subtitle="Usa o botão Nova Despesa para adicionar a primeira compra deste mês."
                            icon="cart-outline"
                        />
                    ) : gastosFiltrados.length === 0 ? (
                        <View style={[styles.semResultadosBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                            <Ionicons name="filter-outline" size={32} color={colors.textDisabled} />
                            <Text style={[styles.semResultadosTexto, { color: colors.textLight }]}>
                                Nenhum gasto encontrado para os filtros aplicados.
                            </Text>
                            <TouchableOpacity
                                style={[styles.btnLimparFiltros, { backgroundColor: colors.primary }]}
                                onPress={() => { setTextoPesquisa(''); setFiltroPessoa('Todos'); }}
                            >
                                <Text style={[styles.txtLimparFiltros, { color: '#FFFFFF' }]}>LIMPAR FILTROS</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        gastosFiltrados.map((item) => (
                            <ExpenseCard key={item.id} expense={item} onTouch={gerirGasto} />
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Botão Flutuante Swiss Grid */}
            <TouchableOpacity
                disabled={!eMesAtual}
                style={[
                    styles.fab,
                    {
                        backgroundColor: '#10B981',
                        borderColor: colors.border,
                    },
                    !eMesAtual && styles.fabDesativado
                ]}
                activeOpacity={0.85}
                onPress={abrirModalNovoGasto}
            >
                <Ionicons name="add" size={30} color="#FFFFFF" />
            </TouchableOpacity>

            {/* MODAL ADICIONAR / EDITAR GASTO */}
            <Modal animationType="fade" transparent={true} visible={modalVisivel} onRequestClose={() => setModalVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent, borderColor: colors.border, maxHeight: '90%' }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle || colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.textDark }]}>
                                {gastoEmEdicao ? "EDITAR GASTO" : "ADICIONAR GASTO"}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisivel(false)}>
                                <Ionicons name="close" size={26} color={colors.textDark} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            <TextInput
                                style={[styles.inputGrande, { color: colors.textDark, borderBottomColor: colors.border }]}
                                placeholder="0,00 €"
                                placeholderTextColor={colors.textDisabled}
                                keyboardType="decimal-pad"
                                value={novoValor}
                                onChangeText={setNovoValor}
                                autoFocus={true}
                            />

                            <Text style={[styles.labelPessoa, { color: colors.textMuted }]}>DESCRIÇÃO / LOJA</Text>
                            <TextInput
                                style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, borderColor: colors.border }]}
                                placeholder="Onde foi a compra? (Ex: Continente)"
                                placeholderTextColor={colors.textDisabled}
                                value={novaLoja}
                                onChangeText={setNovaLoja}
                            />

                            <Text style={[styles.labelPessoa, { color: colors.textMuted }]}>CATEGORIA</Text>
                            <View style={styles.categoriasGrid}>
                                {CATEGORIAS_DE_GASTO.map((categoria) => {
                                    const selecionada = novaCategoria === categoria;
                                    const meta = obterMetaCategoria(categoria);
                                    return (
                                        <TouchableOpacity
                                            key={categoria}
                                            style={[
                                                styles.chipCategoriaModal,
                                                {
                                                    backgroundColor: selecionada ? colors.primary : colors.inputBg,
                                                    borderColor: selecionada ? colors.primary : colors.borderSubtle || colors.border,
                                                }
                                            ]}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setNovaCategoria(categoria);
                                            }}
                                        >
                                            <Ionicons
                                                name={meta.icone}
                                                size={15}
                                                color={selecionada ? '#10B981' : colors.textMuted}
                                            />
                                            <Text style={[
                                                styles.chipCategoriaModalTexto,
                                                { color: selecionada ? '#FFFFFF' : colors.textDark }
                                            ]}>
                                                {categoria}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={[styles.labelPessoa, { color: colors.textMuted }]}>QUEM GASTOU?</Text>
                            <View style={styles.quemContainer}>
                                {nomesMembros.map((nomeMembro) => {
                                    const eSelecionado = quemGastou === nomeMembro;
                                    return (
                                        <TouchableOpacity
                                            key={nomeMembro}
                                            style={[
                                                styles.btnQuem,
                                                {
                                                    backgroundColor: eSelecionado ? colors.primary : colors.inputBg,
                                                    borderColor: colors.border,
                                                }
                                            ]}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setQuemGastou(nomeMembro);
                                            }}
                                        >
                                            <Text style={[
                                                styles.btnQuemTexto,
                                                { color: eSelecionado ? '#FFFFFF' : colors.textDark }
                                            ]}>
                                                {nomeMembro}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <TouchableOpacity
                                style={[styles.btnGuardar, { backgroundColor: '#10B981', borderColor: colors.border }]}
                                onPress={guardarGasto}
                            >
                                <Text style={styles.btnGuardarTexto}>GUARDAR MOVIMENTO</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}
