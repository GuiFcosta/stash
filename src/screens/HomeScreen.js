// ficheiro: src/screens/HomeScreen.js
import React, {useState, useEffect} from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import ExpenseCard from '../components/ExpenceCard';
import { collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/Firebase';

export default function HomeScreen() {
    // Estado para controlar a visibilidade da janela de novo gasto
    const [modalVisivel, setModalVisivel] = useState(false);
    const [novoValor, setNovoValor] = useState('');
    const [novaLoja, setNovaLoja] = useState('');

    const [novaCategoria, setNovaCategoria] = useState('');
    const [quemGastou, setQuemGastou] = useState('Eu');

    const [gastosVariaveis, setGastosVariaveis] = useState([]);
    const [rendas, setRendas] = useState({ Eu: 0, Parceira: 0 });
    const [despesasEssenciais, setDespesasEssenciais] = useState([]);

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

    // Cálculos Automáticos
    const totalRenda = rendas.Eu + rendas.Parceira;
    const totalEssenciais = despesasEssenciais.reduce((soma, despesa) => soma + despesa.valor, 0);
    const totalVariaveis = gastosVariaveis.reduce((soma, despesa) => soma + despesa.valor, 0);
    const saldoDisponivel = totalRenda - totalEssenciais - totalVariaveis;

    // NOVO: Guarda o ID do gasto que estamos a editar (null significa que estamos a criar um novo)
    const [gastoEmEdicao, setGastoEmEdicao] = useState(null);

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
                        setNovaCategoria(despesa.categoria);
                        setQuemGastou(despesa.quem);
                        setGastoEmEdicao(despesa.id); // Avisa que estamos a editar!
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

    const guardarGasto = async () => {
        if (!novoValor || !novaLoja || !novaCategoria) {
            alert("Por favor, preenche o valor, a loja e a categoria!");
            return;
        }
        try {
            const valorFormatado = parseFloat(novoValor.replace(',', '.'));
            const dataAtual = new Date();
            const diaStr = String(dataAtual.getDate()).padStart(2, '0');
            const mesStr = String(dataAtual.getMonth() + 1).padStart(2, '0');

            const dadosGasto = {
                loja: novaLoja,
                valor: valorFormatado,
                data: `${diaStr}/${mesStr}`,
                quem: quemGastou,
                categoria: novaCategoria
            };

            if (gastoEmEdicao) {
                // Se temos um ID guardado, ATUALIZA
                await updateDoc(doc(db, 'gastos_variaveis', gastoEmEdicao), dadosGasto);
            } else {
                // Se não temos ID, CRIA NOVO
                await addDoc(collection(db, 'gastos_variaveis'), dadosGasto);
            }

            console.log("🔥 Sucesso! Gasto gravado no Firebase.");

            // 4. Limpar e fechar
            setNovaLoja('');
            setNovoValor('');
            setNovaCategoria('');
            setQuemGastou('Eu');
            setGastoEmEdicao(null);
            setModalVisivel(false);

        } catch (error) {
            alert("Erro ao gravar. Verifica o terminal do WebStorm.");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            {/* Cabeçalho do Orçamento */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Orçamento Familiar</Text>
                <Text style={styles.saldoText}>{saldoDisponivel.toFixed(2)} €</Text>
                <Text style={styles.saldoLabel}>Disponível este Mês</Text>

                <View style={styles.resumoRow}>
                    <Text style={styles.resumoText}>Ganhos: +{totalRenda.toFixed(0)}€</Text>
                    <Text style={styles.resumoText}>Fixo/Essencial: -{totalEssenciais.toFixed(0)}€</Text>
                </View>
            </View>

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {/* Secção 1: Despesas Essenciais */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Despesas Essenciais</Text>
                    {despesasEssenciais.map((item) => (
                        <View key={item.id} style={styles.essencialCard}>
                            <View>
                                <Text style={styles.lojaText}>{item.nome}</Text>
                                <Text style={styles.detalheText}>{item.tipo}</Text>
                            </View>
                            <Text style={styles.valorFixo}>-{item.valor.toFixed(2)} €</Text>
                        </View>
                    ))}
                </View>

                {/* Secção 2: Últimos Movimentos */}
                <View style={[styles.section, { paddingBottom: 100 }]}>
                    <Text style={styles.sectionTitle}>Gastos Variáveis</Text>
                    {/* Se não houver gastos, mostra uma mensagem amigável */}
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
            {/* O NOSSO BOTÃO FLUTUANTE (FAB) */}
            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.8}
                onPress={() => setModalVisivel(true)}
            >
                <Ionicons name="add" size={32} color="#FFFFFF" />
            </TouchableOpacity>

            {/* A JANELA MODAL PARA ADICIONAR GASTO */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisivel}
                onRequestClose={() => setModalVisivel(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalFundo}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Adicionar Gasto Manual</Text>
                            <TouchableOpacity onPress={() => setModalVisivel(false)}>
                                <Ionicons name="close" size={28} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.inputGrande}
                            placeholder="0,00 €"
                            keyboardType="decimal-pad"
                            placeholderTextColor="#9CA3AF"
                            value={novoValor}
                            onChangeText={setNovoValor}
                            autoFocus={true}
                        />

                        <TextInput
                            style={styles.inputNormal}
                            placeholder="Onde foi a compra? (ex: Padaria)"
                            placeholderTextColor="#9CA3AF"
                            value={novaLoja}
                            onChangeText={setNovaLoja}
                        />

                        <TextInput
                            style={styles.inputNormal}
                            placeholder="Categoria (ex: Alimentação, Saúde)"
                            placeholderTextColor="#9CA3AF"
                            value={novaCategoria}
                            onChangeText={setNovaCategoria}
                        />

                        <Text style={styles.labelPessoa}>Quem gastou?</Text>
                        <View style={styles.quemContainer}>
                            <TouchableOpacity
                                style={[styles.btnQuem, quemGastou === 'Eu' && styles.btnQuemAtivo]}
                                onPress={() => setQuemGastou('Eu')}
                            >
                                <Text style={[styles.btnQuemTexto, quemGastou === 'Eu' && styles.btnQuemTextoAtivo]}>Eu</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.btnQuem, quemGastou === 'Parceira' && styles.btnQuemAtivo]}
                                onPress={() => setQuemGastou('Parceira')}
                            >
                                <Text style={[styles.btnQuemTexto, quemGastou === 'Parceira' && styles.btnQuemTextoAtivo]}>Parceira</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.btnGuardar} onPress={guardarGasto}>
                            <Text style={styles.btnGuardarTexto}>Guardar Gasto</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { backgroundColor: '#1E3A8A', padding: 30, paddingTop: 60, alignItems: 'center', borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
    headerTitle: { color: '#93C5FD', fontSize: 14, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
    saldoText: { color: '#FFFFFF', fontSize: 40, fontWeight: 'bold' },
    saldoLabel: { color: '#E0E7FF', fontSize: 14, marginTop: 5, marginBottom: 15 },
    resumoRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10, paddingHorizontal: 20 },
    resumoText: { color: '#93C5FD', fontSize: 12, fontWeight: 'bold' },
    scrollContainer: { flex: 1 },
    section: { padding: 20, paddingBottom: 0 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 15 },
    essencialCard: { backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
    lojaText: { fontSize: 16, fontWeight: '700', color: '#111827' },
    detalheText: { fontSize: 12, color: '#6B7280', marginTop: 4 },
    valorFixo: { fontSize: 16, fontWeight: 'bold', color: '#374151' },

    fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#1E3A8A', width: 65, height: 65, borderRadius: 35, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },

    modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 25, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },

    inputGrande: { fontSize: 40, fontWeight: 'bold', color: '#1E3A8A', textAlign: 'center', marginBottom: 20, padding: 10 },
    inputNormal: { backgroundColor: '#F3F4F6', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 15 }, // Reduzi um pouco a margem inferior

    // Estilos para os novos botões "Quem"
    labelPessoa: { fontSize: 14, fontWeight: 'bold', color: '#4B5563', marginBottom: 10, marginTop: 5 },
    quemContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    btnQuem: { flex: 1, backgroundColor: '#F3F4F6', padding: 15, borderRadius: 12, alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: 'transparent' },
    btnQuemAtivo: { backgroundColor: '#E0E7FF', borderColor: '#1E3A8A' },
    btnQuemTexto: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
    btnQuemTextoAtivo: { color: '#1E3A8A', fontWeight: 'bold' },

    btnGuardar: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center' },
    btnGuardarTexto: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }
});