import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import ExpenseCard from '../components/ExpenseCard';
import CategoryDonutChart from '../components/CategoryDonutChart';
import { CATEGORIAS_DE_GASTO } from '../constants/Categories';
import { collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, setDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/Firebase';
import { alterarMes, chaveDoMes, inicioDoMes, rotuloDoMes } from '../utils/Month';
import { useMonth } from '../context/MonthContext';
import { useTheme } from '../context/ThemeContext';
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

    const [modalVisivel, setModalVisivel] = useState(false);
    const [novoValor, setNovoValor] = useState('');
    const [novaLoja, setNovaLoja] = useState('');
    const [novaCategoria, setNovaCategoria] = useState(CATEGORIAS_DE_GASTO[0]);
    const [quemGastou, setQuemGastou] = useState('Eu');
    const [gastoEmEdicao, setGastoEmEdicao] = useState(null);

    const [gastosVariaveis, setGastosVariaveis] = useState([]);
    const [rendas, setRendas] = useState({ Eu: 0, Parceira: 0 });
    const [despesasEssenciais, setDespesasEssenciais] = useState([]);
    const [limitesCategorias, setLimitesCategorias] = useState({});

    // Estados para Pesquisa e Filtros
    const [textoPesquisa, setTextoPesquisa] = useState('');
    const [filtroPessoa, setFiltroPessoa] = useState('Todos');

    useEffect(() => {
        const unsubConfig = onSnapshot(doc(db, 'familias', 'nossa_casa'), (docSnap) => {
            if (docSnap.exists()) {
                const dados = docSnap.data();
                setRendas(dados.rendas || { Eu: 0, Parceira: 0 });
                setDespesasEssenciais(dados.despesasFixas || []);
                setLimitesCategorias(dados.limitesCategorias || {});
            }
        });

        const gastosDoMes = query(
            collection(db, 'gastos_variaveis'),
            where('mesReferencia', '==', chaveDoMes(mesSelecionado)),
        );
        const unsubGastos = onSnapshot(gastosDoMes, (snapshot) => {
            const listaGastos = snapshot.docs.map(documento => ({
                id: documento.id,
                ...documento.data()
            }));

            listaGastos.sort((a, b) => obterTimestamp(b) - obterTimestamp(a));
            setGastosVariaveis(listaGastos);
        });

        return () => { unsubConfig(); unsubGastos(); };

    }, [mesSelecionado]);

    useEffect(() => {
        let ativo = true;

        const procurarMesAnterior = async () => {
            const consulta = query(
                collection(db, 'gastos_variaveis'),
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
    }, [mesSelecionado]);

    const totalRenda = (Number(rendas.Eu) || 0) + (Number(rendas.Parceira) || 0);
    const chaveMesSelecionado = chaveDoMes(mesSelecionado);
    const eMesAtual = chaveMesSelecionado === chaveDoMes(new Date());
    const despesaFoiPagaNoMes = (despesa) => (
        despesa.pagamentos?.[chaveMesSelecionado] ?? (eMesAtual && Boolean(despesa.pago))
    );
    const totalEssenciais = despesasEssenciais
        .filter(despesaFoiPagaNoMes)
        .reduce((soma, despesa) => soma + (Number(despesa.valor) || 0), 0);
    const totalVariaveis = gastosVariaveis.reduce((soma, despesa) => soma + (Number(despesa.valor) || 0), 0);
    const saldoDisponivel = totalRenda - totalEssenciais - totalVariaveis;
    const podeAvancarMes = mesSelecionado < inicioDoMes(new Date());

    const gastosPorCategoria = Object.values(gastosVariaveis.reduce((resultado, gasto) => {
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
        try {
            const novaLista = despesasEssenciais.map(item => {
                if (item.id !== id) return item;

                const pagamentos = { ...(item.pagamentos || {}), [chaveMesSelecionado]: !estadoAtual };
                return {
                    ...item,
                    pagamentos,
                    ...(eMesAtual ? { pago: !estadoAtual } : {}),
                };
            });

            await setDoc(doc(db, 'familias', 'nossa_casa'), {
                despesasFixas: novaLista
            }, { merge: true });

        } catch (error) {
            Alert.alert("Erro", "Erro ao atualizar o estado da conta.");
        }
    };

    const guardarGasto = async () => {
        if (!novoValor || !novaLoja || !novaCategoria) {
            Alert.alert("Aviso", "Por favor, preenche todos os campos!");
            return;
        }

        try {
            const valorFormatado = Number(novoValor.trim().replace(',', '.'));
            if (!Number.isFinite(valorFormatado) || valorFormatado <= 0) {
                Alert.alert("Aviso", "Indica um valor superior a zero.");
                return;
            }
            const dataAtual = new Date();
            const diaStr = String(dataAtual.getDate()).padStart(2, '0');
            const mesStr = String(dataAtual.getMonth() + 1).padStart(2, '0');

            const dadosGasto = {
                loja: novaLoja,
                valor: valorFormatado,
                data: gastoEmEdicao?.data || `${diaStr}/${mesStr}`,
                quem: quemGastou,
                categoria: novaCategoria,
                mesReferencia: gastoEmEdicao?.mesReferencia || chaveDoMes(mesSelecionado),
                timestamp: gastoEmEdicao?.timestamp || Date.now(),
            };

            if (gastoEmEdicao) {
                await updateDoc(doc(db, 'gastos_variaveis', gastoEmEdicao.id), dadosGasto);
            } else {
                await addDoc(collection(db, 'gastos_variaveis'), dadosGasto);
            }

            setNovaLoja(''); setNovoValor(''); setNovaCategoria(CATEGORIAS_DE_GASTO[0]); setQuemGastou('Eu');
            setGastoEmEdicao(null); setModalVisivel(false);

        } catch (error) {
            Alert.alert("Erro", "Erro ao gravar. Verifica a ligação.");
        }
    };

    const gerirGasto = (despesa) => {
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
                        } catch (error) {
                            Alert.alert("Erro", "Erro ao apagar o gasto.");
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            <View style={[styles.header, { backgroundColor: isDarkMode ? colors.cardBg : colors.headerBg }]}>
                <Text style={[styles.headerTitle, { color: colors.headerSubtext }]}>Orçamento Familiar</Text>
                <View style={styles.seletorMes}>
                    <TouchableOpacity
                        accessibilityLabel="Ver mês anterior"
                        disabled={!mesAnteriorDisponivel}
                        onPress={() => setMesSelecionado(mesAnteriorDisponivel)}
                        style={[styles.botaoMes, !mesAnteriorDisponivel && styles.botaoMesDesativado]}
                    >
                        <Ionicons name="chevron-back" size={20} color={colors.headerText} />
                    </TouchableOpacity>
                    <Text style={[styles.rotuloMes, { color: colors.headerText }]}>{rotuloDoMes(mesSelecionado)}</Text>
                    <TouchableOpacity
                        accessibilityLabel="Ver mês seguinte"
                        disabled={!podeAvancarMes}
                        onPress={() => setMesSelecionado((mes) => alterarMes(mes, 1))}
                        style={[styles.botaoMes, !podeAvancarMes && styles.botaoMesDesativado]}
                    >
                        <Ionicons name="chevron-forward" size={20} color={colors.headerText} />
                    </TouchableOpacity>
                </View>
                <Text style={[styles.saldoText, { color: saldoDisponivel < 0 ? colors.danger : colors.headerText }]}>{saldoDisponivel.toFixed(2)} €</Text>
                <Text style={[styles.saldoLabel, { color: colors.headerAccent }]}>Disponível este Mês</Text>
                <View style={styles.resumoRow}>
                    <Text style={[styles.resumoText, { color: colors.headerSubtext }]}>Ganhos: +{totalRenda.toFixed(0)}€</Text>
                    <Text style={[styles.resumoText, { color: colors.headerSubtext }]}>Fixo: -{totalEssenciais.toFixed(0)}€</Text>
                </View>
            </View>

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {/* SECÇÃO DAS DESPESAS FIXAS */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Despesas Mensais</Text>
                    {despesasEssenciais.map((item) => {
                        const estaPaga = despesaFoiPagaNoMes(item);
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[
                                    styles.essencialCard,
                                    { backgroundColor: colors.cardBg },
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
                                        <Text style={[styles.lojaText, { color: colors.textDark }, estaPaga && styles.textoRiscado]}>{item.nome}</Text>
                                        <Text style={[styles.detalheText, { color: colors.textLight }]}>{estaPaga ? "Pago" : "Pendente"}</Text>
                                    </View>
                                </View>
                                <Text style={[styles.valorFixo, { color: colors.textMuted }, estaPaga && styles.textoRiscado]}>-{item.valor.toFixed(2)} €</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* SECÇÃO DOS GASTOS VARIÁVEIS */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Para onde vai o dinheiro</Text>
                    <View style={[styles.graficoCard, { backgroundColor: colors.cardBg }]}>
                        <CategoryDonutChart dados={gastosPorCategoria} limites={limitesCategorias} />
                    </View>
                </View>

                <View style={[styles.section, { paddingBottom: 100 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Gastos Variáveis</Text>

                    {/* Barra de Pesquisa e Filtros */}
                    <View style={styles.pesquisaContainer}>
                        <View style={[styles.inputPesquisaBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                            <Ionicons name="search-outline" size={20} color={colors.textDisabled} style={{ marginRight: 8 }} />
                            <TextInput
                                style={[styles.inputPesquisa, { color: colors.textDark }]}
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
                            {['Todos', 'Eu', 'Parceira'].map((pessoa) => (
                                <TouchableOpacity
                                    key={pessoa}
                                    style={[
                                        styles.chipPessoa,
                                        { backgroundColor: colors.chipBg },
                                        filtroPessoa === pessoa && { backgroundColor: colors.primary }
                                    ]}
                                    onPress={() => setFiltroPessoa(pessoa)}
                                >
                                    <Text style={[
                                        styles.chipTexto,
                                        { color: colors.textMuted },
                                        filtroPessoa === pessoa && { color: colors.headerText }
                                    ]}>
                                        {pessoa}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {gastosVariaveis.length === 0 ? (
                        <Text style={{ color: colors.textLight, fontStyle: 'italic', marginTop: 10 }}>
                            Ainda não há gastos registados este mês.
                        </Text>
                    ) : gastosFiltrados.length === 0 ? (
                        <View style={[styles.semResultadosBox, { backgroundColor: colors.cardBg }]}>
                            <Ionicons name="filter-outline" size={32} color={colors.textDisabled} />
                            <Text style={[styles.semResultadosTexto, { color: colors.textLight }]}>Nenhum gasto encontrado para os filtros aplicados.</Text>
                            <TouchableOpacity
                                style={[styles.btnLimparFiltros, { backgroundColor: hexToRgba(colors.primaryLight, 0.08) }]}
                                onPress={() => { setTextoPesquisa(''); setFiltroPessoa('Todos'); }}
                            >
                                <Text style={[styles.txtLimparFiltros, { color: colors.primaryLight }]}>Limpar Filtros</Text>
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
                    setGastoEmEdicao(null); setNovaLoja(''); setNovoValor(''); setNovaCategoria(CATEGORIAS_DE_GASTO[0]); setModalVisivel(true);
                }}
            >
                <Ionicons name="add" size={32} color="#FFFFFF" />
            </TouchableOpacity>

            <Modal animationType="fade" transparent={true} visible={modalVisivel} onRequestClose={() => setModalVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.modalFundo, { backgroundColor: colors.modalFundo }]}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent, maxHeight: '90%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textDark }]}>{gastoEmEdicao ? "Editar Gasto" : "Adicionar Gasto"}</Text>
                            <TouchableOpacity onPress={() => setModalVisivel(false)}>
                                <Ionicons name="close" size={28} color={colors.textLight} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            <TextInput
                                style={[styles.inputGrande, { color: colors.primaryLight }]}
                                placeholder="0,00 €"
                                placeholderTextColor={colors.textDisabled}
                                keyboardType="decimal-pad"
                                value={novoValor}
                                onChangeText={setNovoValor}
                                autoFocus={true}
                            />

                            <TextInput
                                style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark }]}
                                placeholder="Onde foi a compra?"
                                placeholderTextColor={colors.textDisabled}
                                value={novaLoja}
                                onChangeText={setNovaLoja}
                            />

                            <Text style={[styles.labelPessoa, { color: colors.textMuted }]}>Categoria</Text>
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

                            <Text style={[styles.labelPessoa, { color: colors.textMuted }]}>Quem gastou?</Text>
                            <View style={styles.quemContainer}>
                                <TouchableOpacity style={[styles.btnQuem, { backgroundColor: colors.inputBg }, quemGastou === 'Eu' && { backgroundColor: hexToRgba(colors.primaryLight, 0.19), borderColor: colors.primaryLight }]} onPress={() => setQuemGastou('Eu')}>
                                    <Text style={[styles.btnQuemTexto, { color: colors.textLight }, quemGastou === 'Eu' && { color: colors.primaryLight, fontWeight: 'bold' }]}>Eu</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.btnQuem, { backgroundColor: colors.inputBg }, quemGastou === 'Parceira' && { backgroundColor: hexToRgba(colors.primaryLight, 0.19), borderColor: colors.primaryLight }]} onPress={() => setQuemGastou('Parceira')}>
                                    <Text style={[styles.btnQuemTexto, { color: colors.textLight }, quemGastou === 'Parceira' && { color: colors.primaryLight, fontWeight: 'bold' }]}>Parceira</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: colors.success }]} onPress={guardarGasto}>
                                <Text style={styles.btnGuardarTexto}>Guardar</Text>
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
    headerTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
    seletorMes: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    botaoMes: { padding: 6 },
    botaoMesDesativado: { opacity: 0.35 },
    rotuloMes: { fontSize: 16, fontFamily: 'Inter_700Bold', minWidth: 155, textAlign: 'center', textTransform: 'capitalize' },
    saldoText: { fontSize: 40, fontFamily: 'Inter_800ExtraBold' },
    saldoLabel: { fontSize: 14, marginTop: 5, marginBottom: 15 },
    resumoRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10, paddingHorizontal: 20 },
    resumoText: { fontSize: 12, fontWeight: 'bold' },
    scrollContainer: { flex: 1 },
    section: { padding: 20, paddingBottom: 0 },
    sectionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 15 },
    graficoCard: { borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },

    essencialCard: { padding: 16, borderRadius: 16, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
    essencialInfoRow: { flexDirection: 'row', alignItems: 'center' },
    essencialCardPago: { opacity: 0.6 },
    textoRiscado: { textDecorationLine: 'line-through', opacity: 0.7 },
    lojaText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
    detalheText: { fontSize: 12, marginTop: 4 },
    valorFixo: { fontSize: 16, fontWeight: 'bold' },

    fab: { position: 'absolute', bottom: 20, right: 20, width: 65, height: 65, borderRadius: 35, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
    fabDesativado: { opacity: 0.4 },
    modalFundo: { flex: 1, justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 25, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
    inputGrande: { fontSize: 40, fontFamily: 'Inter_700Bold', textAlign: 'center', marginBottom: 20, padding: 10 },
    inputNormal: { padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 15 },
    pickerContainer: { borderRadius: 12, marginBottom: 15, overflow: 'hidden', paddingHorizontal: Platform.OS === 'android' ? 5 : 0 },
    labelPessoa: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, marginTop: 5 },
    quemContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    btnQuem: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: 'transparent' },
    btnQuemTexto: { fontSize: 16, fontWeight: '600' },
    btnGuardar: { padding: 16, borderRadius: 12, alignItems: 'center' },
    btnGuardarTexto: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },

    pesquisaContainer: { marginBottom: 15, gap: 10 },
    inputPesquisaBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1 },
    inputPesquisa: { flex: 1, fontSize: 14 },
    chipsRow: { flexDirection: 'row', gap: 8 },
    chipPessoa: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
    chipTexto: { fontSize: 13, fontWeight: '600' },
    semResultadosBox: { alignItems: 'center', padding: 25, borderRadius: 16, marginTop: 10, gap: 8 },
    semResultadosTexto: { fontSize: 14, textAlign: 'center' },
    btnLimparFiltros: { marginTop: 5, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
    txtLimparFiltros: { fontWeight: 'bold', fontSize: 13 }
});
