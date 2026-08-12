import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import EmptyState from '../components/EmptyState';
import { SkeletonExpenseCard, SkeletonHeader } from '../components/SkeletonLoader';
import ExpenseCard from '../components/ExpenseCard';
import CategoryDonutChart from '../components/CategoryDonutChart';
import { CATEGORIAS_DE_GASTO } from '../constants/Categories';
import { collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, setDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/Firebase';
import { alterarMes, chaveDoMes, inicioDoMes, rotuloDoMes } from '../utils/Month';
import { useMonth } from '../context/MonthContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { hexToRgba } from '../utils/colors';

const obterTimestamp = (gasto) => {
    if (Number.isFinite(gasto.timestamp)) return gasto.timestamp;
    if (typeof gasto.timestamp?.toMillis === 'function') return gasto.timestamp.toMillis();

    const [dia, mes] = String(gasto.data || '').split('/').map(Number);
    if (dia > 0 && mes > 0 && mes <= 12) {
        return new Date(new Date().getFullYear(), mes - 1, dia).getTime();
    }

    return 0;
};

export default function HomeScreen() {
    const { colors, isDarkMode } = useTheme();
    const { mesSelecionado, setMesSelecionado, mesAnteriorDisponivel, setMesAnteriorDisponivel } = useMonth();
    const { user, userProfile, familyData } = useAuth();
    const insets = useSafeAreaInsets();

    const [atualizando, setAtualizando] = useState(false);
    const [carregando, setCarregando] = useState(true);

    const [modalVisivel, setModalVisivel] = useState(false);
    const [novoValor, setNovoValor] = useState('');
    const [novaLoja, setNovaLoja] = useState('');
    const [novaCategoria, setNovaCategoria] = useState(CATEGORIAS_DE_GASTO[0]);
    const [quemGastou, setQuemGastou] = useState(userProfile?.nome || 'Eu');
    const [gastoEmEdicao, setGastoEmEdicao] = useState(null);

    const [gastosVariaveis, setGastosVariaveis] = useState([]);

    // Estados para Pesquisa e Filtros
    const [textoPesquisa, setTextoPesquisa] = useState('');
    const [filtroPessoa, setFiltroPessoa] = useState('Todos');

    const familyId = familyData?.id;
    const membrosFamilia = familyData?.membros || [];
    const despesasEssenciais = familyData?.despesasFixas || [];
    const limitesCategorias = familyData?.limitesCategorias || {};

    const totalRenda = membrosFamilia.reduce((soma, m) => soma + (Number(m.renda) || 0), 0);

    useEffect(() => {
        if (userProfile?.nome) {
            setQuemGastou(userProfile.nome);
        }
    }, [userProfile]);

    useEffect(() => {
        if (!familyId) return;

        setCarregando(true);
        const gastosDoMes = query(
            collection(db, 'gastos_variaveis'),
            where('familyId', '==', familyId),
            where('mesReferencia', '==', chaveDoMes(mesSelecionado)),
        );

        const unsubGastos = onSnapshot(gastosDoMes, (snapshot) => {
            const listaGastos = snapshot.docs.map(documento => ({
                id: documento.id,
                ...documento.data()
            }));

            listaGastos.sort((a, b) => obterTimestamp(b) - obterTimestamp(a));
            setGastosVariaveis(listaGastos);
            setCarregando(false);
        }, (err) => {
            console.error("Erro ao carregar gastos:", err);
            setCarregando(false);
        });

        return () => { unsubGastos(); };

    }, [mesSelecionado, familyId]);

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
    const despesaFoiPagaNoMes = (despesa) => {
        const val = despesa.pagamentos?.[chaveMesSelecionado];
        if (typeof val === 'boolean') return val;
        if (typeof val === 'object' && val !== null) return Boolean(val.pago);
        return eMesAtual && Boolean(despesa.pago);
    };

    const obterQuemPagouNoMes = (despesa) => {
        const val = despesa.pagamentos?.[chaveMesSelecionado];
        if (typeof val === 'object' && val !== null && val.pago) {
            return val.quem || null;
        }
        return null;
    };

    const totalEssenciais = despesasEssenciais
        .filter(despesaFoiPagaNoMes)
        .reduce((soma, despesa) => soma + (Number(despesa.valor) || 0), 0);
    const totalVariaveis = gastosVariaveis.reduce((soma, despesa) => soma + (Number(despesa.valor) || 0), 0);
    const saldoDisponivel = totalRenda - totalEssenciais - totalVariaveis;
    const podeAvancarMes = mesSelecionado < inicioDoMes(new Date());

    const despesasFixasPagasNoMes = despesasEssenciais.filter(despesaFoiPagaNoMes);

    const todosOsGastosParaGrafico = [
        ...gastosVariaveis,
        ...despesasFixasPagasNoMes.map(f => ({
            valor: Number(f.valor) || 0,
            categoria: f.categoria || 'Casa'
        }))
    ];

    const gastosPorCategoria = Object.values(todosOsGastosParaGrafico.reduce((resultado, gasto) => {
        const valor = Number(gasto.valor) || 0;
        if (valor <= 0) return resultado;

        const categoria = gasto.categoria || 'Outros';
        resultado[categoria] = resultado[categoria] || { categoria, valor: 0 };
        resultado[categoria].valor += valor;
        return resultado;
    }, {})).sort((a, b) => b.valor - a.valor);

    const gastosFiltrados = gastosVariaveis.filter((gasto) => {
        const termo = textoPesquisa.trim().toLowerCase();
        const bateTexto = !termo ||
            gasto.loja?.toLowerCase().includes(termo) ||
            gasto.categoria?.toLowerCase().includes(termo);
        const batePessoa = filtroPessoa === 'Todos' || gasto.quem === filtroPessoa;
        return bateTexto && batePessoa;
    });

    const alternarPagamentoFixo = async (id, estadoAtual) => {
        if (!familyId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const novoEstado = !estadoAtual;
            const nomeQuemPagou = userProfile?.nome || user?.displayName || 'Eu';
            const uidQuemPagou = user?.uid || '';

            const novaLista = despesasEssenciais.map(item => {
                if (item.id !== id) return item;

                const pagamentos = { ...(item.pagamentos || {}) };

                if (novoEstado) {
                    pagamentos[chaveMesSelecionado] = {
                        pago: true,
                        quem: nomeQuemPagou,
                        quemUid: uidQuemPagou,
                        timestamp: Date.now()
                    };
                } else {
                    delete pagamentos[chaveMesSelecionado];
                }

                return {
                    ...item,
                    pagamentos,
                    ...(eMesAtual ? { pago: novoEstado } : {}),
                };
            });

            await updateDoc(doc(db, 'familias', familyId), {
                despesasFixas: novaLista
            });

        } catch (error) {
            Alert.alert("Erro", "Erro ao atualizar o estado da conta.");
        }
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
                await updateDoc(doc(db, 'gastos_variaveis', gastoEmEdicao.id), dadosGasto);
            } else {
                await addDoc(collection(db, 'gastos_variaveis'), dadosGasto);
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setNovaLoja(''); setNovoValor(''); setNovaCategoria(CATEGORIAS_DE_GASTO[0]); setQuemGastou(userProfile?.nome || 'Eu');
            setGastoEmEdicao(null); setModalVisivel(false);

        } catch (error) {
            Alert.alert("Erro", "Erro ao gravar. Verifica a ligação.");
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
                            await deleteDoc(doc(db, 'gastos_variaveis', despesa.id));
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (error) {
                            Alert.alert("Erro", "Erro ao apagar o gasto.");
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

            <View style={[styles.header, { backgroundColor: isDarkMode ? colors.cardBg : colors.headerBg, paddingTop: Math.max(insets.top + 10, 30) }]}>
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
                {/* SECÇÃO DAS DESPESAS FIXAS */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>Despesas Mensais</Text>
                    {despesasEssenciais.map((item) => {
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
                                onPress={() => alternarPagamentoFixo(item.id, estaPaga)}
                            >
                                <View style={styles.essencialInfoRow}>
                                    <Ionicons
                                        name={estaPaga ? "checkmark-circle" : "ellipse-outline"}
                                        size={26}
                                        color={estaPaga ? colors.success : colors.textDisabled}
                                        style={{ marginRight: 12 }}
                                    />
                                    <View>
                                        <Text style={[styles.lojaText, { color: colors.textDark, fontFamily: 'Inter_700Bold' }, estaPaga && styles.textoRiscado]}>{item.nome}</Text>
                                        <Text style={[styles.detalheText, { color: colors.textLight, fontFamily: 'Inter_400Regular' }]}>
                                            {estaPaga ? (quemPagou ? `Pago por ${quemPagou}` : "Pago") : "Pendente"}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[styles.valorFixo, { color: colors.textMuted, fontFamily: 'Inter_700Bold' }, estaPaga && styles.textoRiscado]}>-{item.valor.toFixed(2)} €</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* SECÇÃO DOS GASTOS VARIÁVEIS */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>Para onde vai o dinheiro</Text>
                    <View style={[styles.graficoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                        <CategoryDonutChart dados={gastosPorCategoria} limites={limitesCategorias} />
                    </View>
                </View>

                <View style={[styles.section, { paddingBottom: 100 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>Gastos Variáveis</Text>

                    {/* Barra de Pesquisa e Filtros */}
                    <View style={styles.pesquisaContainer}>
                        <View style={[styles.inputPesquisaBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                            <Ionicons name="search-outline" size={20} color={colors.textDisabled} style={{ marginRight: 8 }} />
                            <TextInput
                                style={[styles.inputPesquisa, { color: colors.textDark, fontFamily: 'Inter_400Regular' }]}
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
                                        { color: colors.textMuted, fontFamily: 'Inter_600SemiBold' },
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
                            <Text style={[styles.semResultadosTexto, { color: colors.textLight, fontFamily: 'Inter_400Regular' }]}>Nenhum gasto encontrado para os filtros aplicados.</Text>
                            <TouchableOpacity
                                style={[styles.btnLimparFiltros, { backgroundColor: hexToRgba(colors.primaryLight, 0.15) }]}
                                onPress={() => { setTextoPesquisa(''); setFiltroPessoa('Todos'); }}
                            >
                                <Text style={[styles.txtLimparFiltros, { color: colors.primaryLight, fontFamily: 'Inter_700Bold' }]}>Limpar Filtros</Text>
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
                            <Text style={[styles.modalTitle, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>{gastoEmEdicao ? "Editar Gasto" : "Adicionar Gasto"}</Text>
                            <TouchableOpacity onPress={() => setModalVisivel(false)}>
                                <Ionicons name="close" size={28} color={colors.textLight} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            <TextInput
                                style={[styles.inputGrande, { color: colors.primaryLight, fontFamily: 'Inter_700Bold' }]}
                                placeholder="0,00 €"
                                placeholderTextColor={colors.textDisabled}
                                keyboardType="decimal-pad"
                                value={novoValor}
                                onChangeText={setNovoValor}
                                autoFocus={true}
                            />

                            <TextInput
                                style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, fontFamily: 'Inter_400Regular' }]}
                                placeholder="Onde foi a compra?"
                                placeholderTextColor={colors.textDisabled}
                                value={novaLoja}
                                onChangeText={setNovaLoja}
                            />

                            <Text style={[styles.labelPessoa, { color: colors.textMuted, fontFamily: 'Inter_700Bold' }]}>Categoria</Text>
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

                            <Text style={[styles.labelPessoa, { color: colors.textMuted, fontFamily: 'Inter_700Bold' }]}>Quem gastou?</Text>
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
                                                { color: colors.textLight, fontFamily: 'Inter_600SemiBold' },
                                                eSelecionado && { color: colors.primaryLight, fontWeight: 'bold' }
                                            ]}>
                                                {nomeMembro}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: colors.success }]} onPress={guardarGasto}>
                                <Text style={[styles.btnGuardarTexto, { fontFamily: 'Inter_700Bold' }]}>Guardar</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 30, paddingTop: 30, alignItems: 'center' },
    headerTitle: { color: '#93C5FD', fontSize: 14, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
    seletorMes: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    botaoMes: { padding: 6 },
    botaoMesDesativado: { opacity: 0.35 },
    rotuloMes: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', minWidth: 155, textAlign: 'center', textTransform: 'capitalize' },
    saldoText: { color: '#FFFFFF', fontSize: 40, fontWeight: 'bold' },
    saldoLabel: { color: '#E0E7FF', fontSize: 14, marginTop: 5, marginBottom: 15 },
    resumoRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10, paddingHorizontal: 20 },
    resumoText: { color: '#93C5FD', fontSize: 12, fontWeight: 'bold' },
    scrollContainer: { flex: 1 },
    section: { padding: 20, paddingBottom: 0 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    graficoCard: { borderRadius: 16, padding: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },

    essencialCard: { padding: 16, borderRadius: 16, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
    essencialInfoRow: { flexDirection: 'row', alignItems: 'center' },
    essencialCardPago: { opacity: 0.6 },
    textoRiscado: { textDecorationLine: 'line-through', opacity: 0.7 },
    lojaText: { fontSize: 16, fontWeight: '700' },
    detalheText: { fontSize: 12, marginTop: 4 },
    valorFixo: { fontSize: 16, fontWeight: 'bold' },

    fab: { position: 'absolute', bottom: 20, right: 20, width: 65, height: 65, borderRadius: 35, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
    fabDesativado: { opacity: 0.4 },
    modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 25, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    inputGrande: { fontSize: 40, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, padding: 10 },
    inputNormal: { padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 15 },
    pickerContainer: { borderRadius: 12, marginBottom: 15, overflow: 'hidden', paddingHorizontal: Platform.OS === 'android' ? 5 : 0 },
    labelPessoa: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, marginTop: 5 },
    quemContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 25 },
    btnQuem: { flex: 1, minWidth: 100, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
    btnQuemTexto: { fontSize: 15, fontWeight: '600' },
    btnGuardar: { padding: 16, borderRadius: 12, alignItems: 'center' },
    btnGuardarTexto: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },

    pesquisaContainer: { marginBottom: 15, gap: 10 },
    inputPesquisaBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1 },
    inputPesquisa: { flex: 1, fontSize: 14 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chipPessoa: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
    chipTexto: { fontSize: 13, fontWeight: '600' },
    semResultadosBox: { alignItems: 'center', padding: 25, borderRadius: 16, marginTop: 10, gap: 8, borderWidth: 1 },
    semResultadosTexto: { fontSize: 14, textAlign: 'center' },
    btnLimparFiltros: { marginTop: 5, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
    txtLimparFiltros: { fontWeight: 'bold', fontSize: 13 }
});
