// ficheiro: src/screens/HomeScreen.js
import React, {useState, useEffect} from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import ExpenseCard from '../components/ExpenceCard';
import CategoryDonutChart from '../components/CategoryDonutChart';
import { CATEGORIAS_DE_GASTO } from '../constants/Categories';
import { collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, setDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/Firebase';
import { alterarMes, chaveDoMes, inicioDoMes, rotuloDoMes } from '../utils/Month';

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
    // Estado para controlar a visibilidade da janela de novo gasto
    const [modalVisivel, setModalVisivel] = useState(false);
    const [novoValor, setNovoValor] = useState('');
    const [novaLoja, setNovaLoja] = useState('');
    const [novaCategoria, setNovaCategoria] = useState(CATEGORIAS_DE_GASTO[0]);
    const [quemGastou, setQuemGastou] = useState('Eu');
    const [gastoEmEdicao, setGastoEmEdicao] = useState(null);

    const [gastosVariaveis, setGastosVariaveis] = useState([]);
    const [rendas, setRendas] = useState({ Eu: 0, Parceira: 0 });
    const [despesasEssenciais, setDespesasEssenciais] = useState([]);
    const [mesSelecionado, setMesSelecionado] = useState(() => inicioDoMes(new Date()));
    const [mesAnteriorDisponivel, setMesAnteriorDisponivel] = useState(null);

    useEffect(() => {
        // Escuta 1: As Configurações (Ordenados e Contas Fixas)
        const unsubConfig = onSnapshot(doc(db, 'familias', 'nossa_casa'), (docSnap) => {
            if (docSnap.exists()) {
                const dados = docSnap.data();
                setRendas(dados.rendas || { Eu: 0, Parceira: 0 });
                setDespesasEssenciais(dados.despesasFixas || []);
            }
        });

        // Escuta 2: Os Gastos do dia a dia
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

    // Cálculos Automáticos
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

            // Envia a lista atualizada para o Firebase
            await setDoc(doc(db, 'familias', 'nossa_casa'), {
                despesasFixas: novaLista
            }, { merge: true });

        } catch (error) {
            alert("Erro ao atualizar o estado da conta.");
        }
    };

    const guardarGasto = async () => {
        if (!novoValor || !novaLoja || !novaCategoria) {
            alert("Por favor, preenche todos os campos!");
            return;
        }

        try {
            const valorFormatado = Number(novoValor.trim().replace(',', '.'));
            if (!Number.isFinite(valorFormatado) || valorFormatado <= 0) {
                alert("Indica um valor superior a zero.");
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
                timestamp: Date.now(), // <-- CARIMBO DE TEMPO PARA ORDENAÇÃO
            };

            if (gastoEmEdicao) {
                const dadosAtualizados = { ...dadosGasto };
                delete dadosAtualizados.timestamp;
                await updateDoc(doc(db, 'gastos_variaveis', gastoEmEdicao.id), dadosAtualizados);
            } else {
                await addDoc(collection(db, 'gastos_variaveis'), dadosGasto);
            }

            setNovaLoja(''); setNovoValor(''); setNovaCategoria(CATEGORIAS_DE_GASTO[0]); setQuemGastou('Eu');
            setGastoEmEdicao(null); setModalVisivel(false);

        } catch (error) {
            alert("Erro ao gravar. Verifica a ligação.");
        }
    };

    // Função que abre quando clicas num cartão
    const gerirGasto = (despesa) => {
        Alert.alert(
            "Gerir Gasto",
            `O que desejas fazer com a despesa de ${despesa.loja}?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Editar",
                    onPress: () => {
                        // Preenche o formulário com os dados antigos e abre a janela
                        setNovoValor(despesa.valor.toString().replace('.', ','));
                        setNovaLoja(despesa.loja);
                        setNovaCategoria(CATEGORIAS_DE_GASTO.includes(despesa.categoria) ? despesa.categoria : 'Outros');
                        setQuemGastou(despesa.quem);
                        setGastoEmEdicao(despesa); // Avisa que estamos a editar!
                        setModalVisivel(true);
                    }
                },
                {
                    text: "Apagar",
                    style: "destructive", // Fica a vermelho no iPhone
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'gastos_variaveis', despesa.id));
                        } catch (error) {
                            alert("Erro ao apagar o gasto.");
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Orçamento Familiar</Text>
                <View style={styles.seletorMes}>
                    <TouchableOpacity
                        accessibilityLabel="Ver mês anterior"
                        disabled={!mesAnteriorDisponivel}
                        onPress={() => setMesSelecionado(mesAnteriorDisponivel)}
                        style={[styles.botaoMes, !mesAnteriorDisponivel && styles.botaoMesDesativado]}
                    >
                        <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.rotuloMes}>{rotuloDoMes(mesSelecionado)}</Text>
                    <TouchableOpacity
                        accessibilityLabel="Ver mês seguinte"
                        disabled={!podeAvancarMes}
                        onPress={() => setMesSelecionado((mes) => alterarMes(mes, 1))}
                        style={[styles.botaoMes, !podeAvancarMes && styles.botaoMesDesativado]}
                    >
                        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.saldoText}>{saldoDisponivel.toFixed(2)} €</Text>
                <Text style={styles.saldoLabel}>Disponível este Mês</Text>
                <View style={styles.resumoRow}>
                    <Text style={styles.resumoText}>Ganhos: +{totalRenda.toFixed(0)}€</Text>
                    <Text style={styles.resumoText}>Fixo: -{totalEssenciais.toFixed(0)}€</Text>
                </View>
            </View>

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {/* SECÇÃO DAS DESPESAS FIXAS */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Despesas Mensais</Text>
                    {despesasEssenciais.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            // Se estiver pago, aplica o estilo de opacidade
                            style={[styles.essencialCard, item.pago && styles.essencialCardPago]}
                            activeOpacity={0.7}
                            onPress={() => alternarPagamentoFixo(item.id, item.pago)}
                        >
                            <View style={styles.essencialInfoRow}>
                                {/* Ícone dinâmico: Visto verde se pago, Círculo vazio se não pago */}
                                <Ionicons
                                    name={item.pago ? "checkmark-circle" : "ellipse-outline"}
                                    size={26}
                                    color={item.pago ? "#10B981" : "#D1D5DB"}
                                    style={{ marginRight: 12 }}
                                />
                                <View>
                                    <Text style={[styles.lojaText, item.pago && styles.textoRiscado]}>{item.nome}</Text>
                                    <Text style={styles.detalheText}>{item.pago ? "Pago" : "Pendente"}</Text>
                                </View>
                            </View>
                            <Text style={[styles.valorFixo, item.pago && styles.textoRiscado]}>-{item.valor.toFixed(2)} €</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* SECÇÃO DOS GASTOS VARIÁVEIS (AGORA ORDENADOS) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Para onde vai o dinheiro</Text>
                    <View style={styles.graficoCard}>
                        <CategoryDonutChart dados={gastosPorCategoria} />
                    </View>
                </View>

                <View style={[styles.section, { paddingBottom: 100 }]}>
                    <Text style={styles.sectionTitle}>Gastos Variáveis</Text>
                    {gastosVariaveis.length === 0 ? (
                        <Text style={{ color: '#6B7280', fontStyle: 'italic', marginTop: 10 }}>
                            Ainda não há gastos registados este mês.
                        </Text>
                    ) : (
                        gastosVariaveis.map((item) => (
                            <ExpenseCard key={item.id} expense={item} onTouch={gerirGasto} />
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Botão Flutuante e Modal... (Mantém-se inalterado) */}
            <TouchableOpacity
                disabled={!eMesAtual}
                style={[styles.fab, !eMesAtual && styles.fabDesativado]}
                activeOpacity={0.8}
                onPress={() => {
                setGastoEmEdicao(null); setNovaLoja(''); setNovoValor(''); setNovaCategoria(CATEGORIAS_DE_GASTO[0]); setModalVisivel(true);
                }}
            >
                <Ionicons name="add" size={32} color="#FFFFFF" />
            </TouchableOpacity>

            <Modal animationType="fade" transparent={true} visible={modalVisivel} onRequestClose={() => setModalVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { maxHeight: '90%' }]}> {/* Limitamos a altura máxima para garantir que não sai do ecrã */}

                        {/* CABEÇALHO FIXO - Fica de fora do ScrollView para estar sempre visível */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{gastoEmEdicao ? "Editar Gasto" : "Adicionar Gasto"}</Text>
                            <TouchableOpacity onPress={() => setModalVisivel(false)}>
                                <Ionicons name="close" size={28} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* FORMULÁRIO ROLÁVEL - Se o teclado subir, podes fazer scroll no formulário */}
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            <TextInput
                                style={styles.inputGrande}
                                placeholder="0,00 €"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="decimal-pad"
                                value={novoValor}
                                onChangeText={setNovoValor}
                                autoFocus={true}
                            />

                            <TextInput
                                style={styles.inputNormal}
                                placeholder="Onde foi a compra?"
                                placeholderTextColor="#9CA3AF"
                                value={novaLoja}
                                onChangeText={setNovaLoja}
                            />

                            <Text style={styles.labelPessoa}>Categoria</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={novaCategoria}
                                    onValueChange={setNovaCategoria}
                                    style={Platform.OS === 'android' ? { color: '#1F2937' } : {}}
                                    itemStyle={Platform.OS === 'ios' ? { height: 120, fontSize: 16, color: '#1F2937' } : {}}
                                >
                                    {CATEGORIAS_DE_GASTO.map((categoria) => (
                                        <Picker.Item
                                            key={categoria}
                                            label={categoria}
                                            value={categoria}
                                            color={Platform.OS === 'android' ? '#1F2937' : undefined}
                                        />
                                    ))}
                                </Picker>
                            </View>

                            <Text style={styles.labelPessoa}>Quem gastou?</Text>
                            <View style={styles.quemContainer}>
                                <TouchableOpacity style={[styles.btnQuem, quemGastou === 'Eu' && styles.btnQuemAtivo]} onPress={() => setQuemGastou('Eu')}>
                                    <Text style={[styles.btnQuemTexto, quemGastou === 'Eu' && styles.btnQuemTextoAtivo]}>Eu</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.btnQuem, quemGastou === 'Parceira' && styles.btnQuemAtivo]} onPress={() => setQuemGastou('Parceira')}>
                                    <Text style={[styles.btnQuemTexto, quemGastou === 'Parceira' && styles.btnQuemTextoAtivo]}>Parceira</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={styles.btnGuardar} onPress={guardarGasto}>
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
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { backgroundColor: '#1E3A8A', padding: 30, paddingTop: 30, alignItems: 'center' },
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
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 15 },
    graficoCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },

    // Estilos das Despesas Fixas
    essencialCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
    essencialInfoRow: { flexDirection: 'row', alignItems: 'center' },
    essencialCardPago: { opacity: 0.6, backgroundColor: '#F3F4F6' }, // Estilo quando está pago
    textoRiscado: { textDecorationLine: 'line-through', color: '#9CA3AF' }, // Risca o texto
    lojaText: { fontSize: 16, fontWeight: '700', color: '#111827' },
    detalheText: { fontSize: 12, color: '#6B7280', marginTop: 4 },
    valorFixo: { fontSize: 16, fontWeight: 'bold', color: '#374151' },

    fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#1E3A8A', width: 65, height: 65, borderRadius: 35, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
    fabDesativado: { opacity: 0.4 },
    modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 25, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    inputGrande: { fontSize: 40, fontWeight: 'bold', color: '#1E3A8A', textAlign: 'center', marginBottom: 20, padding: 10 },
    inputNormal: { backgroundColor: '#F3F4F6', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 15, color: '#1F2937' },
    pickerContainer: { backgroundColor: '#F3F4F6', borderRadius: 12, marginBottom: 15, overflow: 'hidden', paddingHorizontal: Platform.OS === 'android' ? 5 : 0 },
    labelPessoa: { fontSize: 14, fontWeight: 'bold', color: '#4B5563', marginBottom: 10, marginTop: 5 },
    quemContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    btnQuem: { flex: 1, backgroundColor: '#F3F4F6', padding: 15, borderRadius: 12, alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: 'transparent' },
    btnQuemAtivo: { backgroundColor: '#E0E7FF', borderColor: '#1E3A8A' },
    btnQuemTexto: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
    btnQuemTextoAtivo: { color: '#1E3A8A', fontWeight: 'bold' },
    btnGuardar: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center' },
    btnGuardarTexto: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }
});
