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
import { CATEGORIAS_DE_GASTO } from '../constants/Categories';
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
    const saldoDisponivel = totalRenda - totalEssenciais - totalVariaveis;
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

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "light"} />

            <View style={[styles.header, { backgroundColor: isDarkMode ? colors.cardBg : colors.headerBg, paddingTop: Math.max(insets.top + 4, 12) }]}>
                <Text style={styles.headerTitle}>{familyData?.nome || 'Orçamento Familiar'}</Text>
                <View style={styles.seletorMes}>
                    <TouchableOpacity
                        accessibilityLabel="Ver mês anterior"
                        disabled={!mesAnteriorDisponivel}
                        onPress={() => {
                            Haptics.selectionAsync();
                            setMesSelecionado(mesAnteriorDisponivel);
                        }}
                        style={[styles.botaoMes, !mesAnteriorDisponivel && styles.botaoMesDesativado]}
                    >
                        <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.rotuloMes}>{rotuloDoMes(mesSelecionado)}</Text>
                    <TouchableOpacity
                        accessibilityLabel="Ver mês seguinte"
                        disabled={!podeAvancarMes}
                        onPress={() => {
                            Haptics.selectionAsync();
                            setMesSelecionado((mes) => alterarMes(mes, 1));
                        }}
                        style={[styles.botaoMes, !podeAvancarMes && styles.botaoMesDesativado]}
                    >
                        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {carregando ? (
                    <SkeletonHeader />
                ) : (
                    <>
                        <Text style={styles.saldoText}>{saldoDisponivel.toFixed(2)} €</Text>
                        <Text style={styles.saldoLabel}>Disponível este Mês</Text>
                        <View style={styles.resumoRow}>
                            <Text style={styles.resumoText}>Ganhos: +{totalRenda.toFixed(0)}€</Text>
                            <Text style={styles.resumoText}>Fixo: -{totalEssenciais.toFixed(0)}€</Text>
                        </View>
                    </>
                )}
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
                {/* SECÇÃO DAS DESPESAS FIXAS (COM ACORDEÃO) */}
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
                            <Text style={[styles.sectionTitle, { color: colors.textDark, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 0 }]}>
                                Despesas Mensais
                            </Text>
                            {despesasEssenciais.length > 0 && (
                                <View style={[
                                    styles.badgeContagemFixas,
                                    { backgroundColor: hexToRgba(despesasEssenciais.filter(item => despesaFoiPagaNoMes(item)).length === despesasEssenciais.length ? colors.success : colors.primaryLight, 0.15) }
                                ]}>
                                    <Text style={[
                                        styles.badgeContagemFixasTexto,
                                        { color: despesasEssenciais.filter(item => despesaFoiPagaNoMes(item)).length === despesasEssenciais.length ? colors.success : colors.primaryLight }
                                    ]}>
                                        {despesasEssenciais.filter(item => despesaFoiPagaNoMes(item)).length}/{despesasEssenciais.length}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ color: colors.textLight, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' }}>
                                {totalEssenciais.toFixed(0)}€
                            </Text>
                            <Ionicons
                                name={despesasFixasExpandidas ? "chevron-up" : "chevron-down"}
                                size={20}
                                color={colors.textLight}
                            />
                        </View>
                    </TouchableOpacity>

                    {despesasFixasExpandidas && (
                        <View style={{ marginTop: 12 }}>
                            {despesasEssenciais.length === 0 ? (
                                <Text style={{ color: colors.textLight, fontSize: 13, textAlign: 'center', paddingVertical: 12, fontFamily: 'SpaceGrotesk_400Regular' }}>
                                    Nenhuma despesa mensal configurada.
                                </Text>
                            ) : (
                                despesasEssenciais.map((item) => {
                                    const estaPaga = despesaFoiPagaNoMes(item);
                                    const quemPagou = obterQuemPagouNoMes(item);
                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={[
                                                styles.essencialCard,
                                                { backgroundColor: colors.cardBg, borderColor: colors.border },
                                                estaPaga && styles.essencialCardPago
                                            ]}
                                            activeOpacity={0.7}
                                            onPress={() => handleAlternarPagamentoFixo(item.id, estaPaga)}
                                        >
                                            <View style={styles.essencialInfoRow}>
                                                <Ionicons
                                                    name={estaPaga ? "checkmark-circle" : "ellipse-outline"}
                                                    size={26}
                                                    color={estaPaga ? colors.success : colors.textDisabled}
                                                    style={{ marginRight: 12 }}
                                                />
                                                <View>
                                                    <Text style={[styles.lojaText, { color: colors.textDark, fontFamily: 'SpaceGrotesk_700Bold' }, estaPaga && styles.textoRiscado]}>{item.nome}</Text>
                                                    <Text style={[styles.detalheText, { color: colors.textLight, fontFamily: 'SpaceGrotesk_400Regular' }]}>
                                                        {item.diaVencimento ? `Dia ${item.diaVencimento} • ` : ''}{estaPaga ? (quemPagou ? `Pago por ${quemPagou}` : "Pago") : "Pendente"}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={[styles.valorFixo, { color: colors.textMuted, fontFamily: 'SpaceGrotesk_700Bold' }, estaPaga && styles.textoRiscado]}>-{item.valor.toFixed(2)} €</Text>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </View>
                    )}
                </View>

                {/* SECÇÃO DOS GASTOS VARIÁVEIS */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark, fontFamily: 'SpaceGrotesk_700Bold' }]}>Para onde vai o dinheiro</Text>
                    <View style={[styles.graficoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                        <CategoryDonutChart dados={gastosPorCategoria} limites={limitesCategorias} />
                    </View>
                </View>

                <View style={[styles.section, { paddingBottom: 100 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark, fontFamily: 'SpaceGrotesk_700Bold' }]}>Gastos Variáveis</Text>

                    {/* Barra de Pesquisa e Filtros */}
                    <View style={styles.pesquisaContainer}>
                        <View style={[styles.inputPesquisaBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                            <Ionicons name="search-outline" size={20} color={colors.textDisabled} style={{ marginRight: 8 }} />
                            <TextInput
                                style={[styles.inputPesquisa, { color: colors.textDark, fontFamily: 'SpaceGrotesk_400Regular' }]}
                                placeholder="Pesquisar loja ou categoria..."
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

                        <View style={styles.chipsRow}>
                            {listaFiltrosPessoa.map((pessoa) => (
                                <TouchableOpacity
                                    key={pessoa}
                                    style={[
                                        styles.chipPessoa,
                                        { backgroundColor: colors.chipBg },
                                        filtroPessoa === pessoa && { backgroundColor: colors.primary }
                                    ]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setFiltroPessoa(pessoa);
                                    }}
                                >
                                    <Text style={[
                                        styles.chipTexto,
                                        { color: colors.textMuted, fontFamily: 'SpaceGrotesk_600SemiBold' },
                                        filtroPessoa === pessoa && { color: '#FFFFFF' }
                                    ]}>
                                        {pessoa}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {carregando ? (
                        <View style={{ gap: 10 }}>
                            <SkeletonExpenseCard />
                            <SkeletonExpenseCard />
                            <SkeletonExpenseCard />
                        </View>
                    ) : gastosVariaveis.length === 0 ? (
                        <EmptyState
                            titulo="Sem gastos registados"
                            subtitulo="Clica no botão + para adicionar a tua primeira compra deste mês."
                            icone="cart-outline"
                        />
                    ) : gastosFiltrados.length === 0 ? (
                        <View style={[styles.semResultadosBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                            <Ionicons name="filter-outline" size={32} color={colors.textDisabled} />
                            <Text style={[styles.semResultadosTexto, { color: colors.textLight, fontFamily: 'SpaceGrotesk_400Regular' }]}>Nenhum gasto encontrado para os filtros aplicados.</Text>
                            <TouchableOpacity
                                style={[styles.btnLimparFiltros, { backgroundColor: hexToRgba(colors.primaryLight, 0.15) }]}
                                onPress={() => { setTextoPesquisa(''); setFiltroPessoa('Todos'); }}
                            >
                                <Text style={[styles.txtLimparFiltros, { color: colors.primaryLight, fontFamily: 'SpaceGrotesk_700Bold' }]}>Limpar Filtros</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        gastosFiltrados.map((item) => (
                            <ExpenseCard key={item.id} expense={item} onTouch={gerirGasto} />
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Botão Flutuante */}
            <TouchableOpacity
                disabled={!eMesAtual}
                style={[styles.fab, { backgroundColor: colors.primary }, !eMesAtual && styles.fabDesativado]}
                activeOpacity={0.8}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setGastoEmEdicao(null); setNovaLoja(''); setNovoValor(''); setNovaCategoria(CATEGORIAS_DE_GASTO[0]); setModalVisivel(true);
                }}
            >
                <Ionicons name="add" size={32} color="#FFFFFF" />
            </TouchableOpacity>

            {/* MODAL ADICIONAR / EDITAR GASTO */}
            <Modal animationType="fade" transparent={true} visible={modalVisivel} onRequestClose={() => setModalVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent, maxHeight: '90%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textDark, fontFamily: 'SpaceGrotesk_700Bold' }]}>{gastoEmEdicao ? "Editar Gasto" : "Adicionar Gasto"}</Text>
                            <TouchableOpacity onPress={() => setModalVisivel(false)}>
                                <Ionicons name="close" size={28} color={colors.textLight} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            <TextInput
                                style={[styles.inputGrande, { color: colors.primaryLight, fontFamily: 'SpaceGrotesk_700Bold' }]}
                                placeholder="0,00 €"
                                placeholderTextColor={colors.textDisabled}
                                keyboardType="decimal-pad"
                                value={novoValor}
                                onChangeText={setNovoValor}
                                autoFocus={true}
                            />

                            <TextInput
                                style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, fontFamily: 'SpaceGrotesk_400Regular' }]}
                                placeholder="Onde foi a compra?"
                                placeholderTextColor={colors.textDisabled}
                                value={novaLoja}
                                onChangeText={setNovaLoja}
                            />

                            <Text style={[styles.labelPessoa, { color: colors.textMuted, fontFamily: 'SpaceGrotesk_700Bold' }]}>Categoria</Text>
                            <View style={[styles.pickerContainer, { backgroundColor: colors.inputBg }]}>
                                <Picker
                                    selectedValue={novaCategoria}
                                    onValueChange={setNovaCategoria}
                                    style={{ color: colors.textDark }}
                                    itemStyle={Platform.OS === 'ios' ? { height: 120, fontSize: 16, color: colors.textDark } : {}}
                                >
                                    {CATEGORIAS_DE_GASTO.map((categoria) => (
                                        <Picker.Item
                                            key={categoria}
                                            label={categoria}
                                            value={categoria}
                                            color={colors.textDark}
                                        />
                                    ))}
                                </Picker>
                            </View>

                            <Text style={[styles.labelPessoa, { color: colors.textMuted, fontFamily: 'SpaceGrotesk_700Bold' }]}>Quem gastou?</Text>
                            <View style={styles.quemContainer}>
                                {nomesMembros.map((nomeMembro) => {
                                    const eSelecionado = quemGastou === nomeMembro;
                                    return (
                                        <TouchableOpacity
                                            key={nomeMembro}
                                            style={[
                                                styles.btnQuem,
                                                { backgroundColor: colors.inputBg },
                                                eSelecionado && { backgroundColor: hexToRgba(colors.primaryLight, 0.2), borderColor: colors.primaryLight }
                                            ]}
                                            onPress={() => setQuemGastou(nomeMembro)}
                                        >
                                            <Text style={[
                                                styles.btnQuemTexto,
                                                { color: colors.textLight, fontFamily: 'SpaceGrotesk_600SemiBold' },
                                                eSelecionado && { color: colors.primaryLight, fontWeight: 'bold' }
                                            ]}>
                                                {nomeMembro}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: colors.success }]} onPress={guardarGasto}>
                                <Text style={[styles.btnGuardarTexto, { fontFamily: 'SpaceGrotesk_700Bold' }]}>Guardar</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}
