import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/Firebase';
import { chaveDoMes } from '../utils/Month';

export default function GoalsScreen() {
    // Estados da Base de Dados
    const [objetivos, setObjetivos] = useState([]);
    const [objetivoSelecionado, setObjetivoSelecionado] = useState(null);

    // Estados do Modal de Novo Objetivo
    const [modalCriarVisivel, setModalCriarVisivel] = useState(false);
    const [novoTitulo, setNovoTitulo] = useState('');
    const [novaMeta, setNovaMeta] = useState('');
    const [novoGuardado, setNovoGuardado] = useState('');
    const [novoIcone, setNovoIcone] = useState('');

    const [modalEditarVisivel, setModalEditarVisivel] = useState(false);
    const [editTitulo, setEditTitulo] = useState('');
    const [editIcone, setEditIcone] = useState('');
    const [editMeta, setEditMeta] = useState('');

    const [modalMovimentoVisivel, setModalMovimentoVisivel] = useState(false);
    const [valorMovimento, setValorMovimento] = useState('');

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'objetivos'), (snapshot) => {
            const listaObjetivos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setObjetivos(listaObjetivos);
        });
        return () => unsubscribe();
    }, []);

    const guardarNovoObjetivo = async () => {
        if (!novoTitulo || !novaMeta) { alert("Preenche o título e a meta!"); return; }
        const meta = Number(novaMeta.trim().replace(',', '.'));
        const guardado = novoGuardado ? Number(novoGuardado.trim().replace(',', '.')) : 0;
        if (!Number.isFinite(meta) || !Number.isFinite(guardado) || meta <= 0 || guardado < 0) {
            alert("Indica valores válidos para a meta e o montante guardado.");
            return;
        }
        try {
            await addDoc(collection(db, 'objetivos'), {
                titulo: novoTitulo,
                meta,
                guardado,
                icone: novoIcone.trim() === '' ? '🎯' : novoIcone
            });
            setNovoTitulo(''); setNovaMeta(''); setNovoGuardado(''); setNovoIcone('');
            setModalCriarVisivel(false);
        } catch (error) { alert("Erro ao criar meta."); }
    };

    const abrirEdicao = (objetivo) => {
        setObjetivoSelecionado(objetivo);
        setEditTitulo(objetivo.titulo);
        setEditIcone(objetivo.icone);
        setEditMeta(objetivo.meta.toString().replace('.', ','));
        setModalEditarVisivel(true);
    };

    const guardarEdicao = async () => {
        if (!editTitulo || !editMeta) return;
        const meta = Number(editMeta.trim().replace(',', '.'));
        if (!Number.isFinite(meta) || meta <= 0) {
            alert("Indica uma meta válida superior a zero.");
            return;
        }
        try {
            await updateDoc(doc(db, 'objetivos', objetivoSelecionado.id), {
                titulo: editTitulo,
                icone: editIcone.trim() === '' ? '🎯' : editIcone,
                meta
            });
            setModalEditarVisivel(false);
            setObjetivoSelecionado(null);
        } catch (error) { alert("Erro ao editar."); }
    };

    const realizarMovimento = async (tipo) => {
        if (!valorMovimento || !objetivoSelecionado) return;

        try {
            const valorAcao = Number(valorMovimento.trim().replace(',', '.'));
            if (!Number.isFinite(valorAcao) || valorAcao <= 0) {
                alert("Indica um valor superior a zero.");
                return;
            }

            let novoTotalGuardado;
            let valorParaHome;

            if (tipo === 'depositar') {
                novoTotalGuardado = objetivoSelecionado.guardado + valorAcao;
                valorParaHome = valorAcao; // Positivo (Subtrai ao orçamento)
            } else {
                if (valorAcao > objetivoSelecionado.guardado) {
                    alert("Não podes retirar mais do que tens guardado!");
                    return;
                }
                novoTotalGuardado = objetivoSelecionado.guardado - valorAcao;
                valorParaHome = -valorAcao; // Negativo (Devolve ao orçamento)
            }

            // 1. Atualiza a barra do Objetivo
            await updateDoc(doc(db, 'objetivos', objetivoSelecionado.id), { guardado: novoTotalGuardado });

            // 2. Cria o movimento na Home
            const dataAtual = new Date();
            const diaStr = String(dataAtual.getDate()).padStart(2, '0');
            const mesStr = String(dataAtual.getMonth() + 1).padStart(2, '0');

            await addDoc(collection(db, 'gastos_variaveis'), {
                loja: tipo === 'depositar' ? `Poupança: ${objetivoSelecionado.titulo}` : `Resgate: ${objetivoSelecionado.titulo}`,
                valor: valorParaHome,
                data: `${diaStr}/${mesStr}`,
                quem: 'Eu',
                categoria: 'Poupança',
                mesReferencia: chaveDoMes(dataAtual),
                timestamp: Date.now() // <-- Adiciona só esta linha aqui!
            });

            setValorMovimento('');
            setObjetivoSelecionado(null);
            setModalMovimentoVisivel(false);

            Alert.alert(
                "Sucesso!",
                tipo === 'depositar'
                    ? `Guardaste ${valorAcao}€.`
                    : `Retiraste ${valorAcao}€. O valor voltou à tua carteira (Saldo Disponível).`
            );

        } catch (error) { alert("Erro ao movimentar dinheiro."); }
    };

    const gerirObjetivo = (objetivo) => {
        Alert.alert(
            "Gerir Objetivo",
            `O que desejas fazer com "${objetivo.titulo}"?`,
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Editar Info", onPress: () => abrirEdicao(objetivo) },
                { text: "Movimentar Dinheiro", onPress: () => { setObjetivoSelecionado(objetivo); setModalMovimentoVisivel(true); } },
                {
                    text: "Apagar Meta",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'objetivos', objetivo.id));
                        } catch (error) {
                            alert("Erro ao apagar a meta.");
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Objetivos da Família</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {objetivos.map((objetivo) => {
                    const percentagem = Math.min(objetivo.meta > 0 ? (objetivo.guardado / objetivo.meta) * 100 : 0, 100);
                    const concluido = percentagem >= 100;

                    return (
                        <TouchableOpacity key={objetivo.id} style={styles.card} activeOpacity={0.8} onPress={() => gerirObjetivo(objetivo)}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.titulo}>{objetivo.icone} {objetivo.titulo}</Text>
                                <Text style={styles.valores}><Text style={styles.guardado}>{objetivo.guardado.toFixed(0)}€</Text> / {objetivo.meta.toFixed(0)}€</Text>
                            </View>
                            <View style={styles.barraFundo}>
                                <View style={[styles.barraProgresso, { width: `${percentagem}%`, backgroundColor: concluido ? '#10B981' : '#3B82F6' }]} />
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* FAB para Criar Nova Meta */}
            <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={() => setModalCriarVisivel(true)}>
                <Ionicons name="add" size={32} color="#FFFFFF" />
            </TouchableOpacity>

            {/* MODAL 1: CRIAR NOVA META */}
            <Modal animationType="fade" transparent={true} visible={modalCriarVisivel} onRequestClose={() => setModalCriarVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Novo Objetivo</Text>
                            <TouchableOpacity onPress={() => setModalCriarVisivel(false)}><Ionicons name="close" size={28} color="#6B7280" /></TouchableOpacity>
                        </View>
                        <TextInput style={styles.inputNormal} placeholder="Título (Ex: Viagem)" placeholderTextColor="#9CA3AF" value={novoTitulo} onChangeText={setNovoTitulo} />
                        <TextInput style={styles.inputNormal} placeholder="Emoji (Ex: ✈️)" placeholderTextColor="#9CA3AF" value={novoIcone} onChangeText={setNovoIcone} />
                        <View style={styles.rowInputs}>
                            <TextInput style={[styles.inputNormal, { flex: 1, marginRight: 10 }]} placeholder="Meta (€)" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" value={novaMeta} onChangeText={setNovaMeta} />
                            <TextInput style={[styles.inputNormal, { flex: 1 }]} placeholder="Já guardado (€)" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" value={novoGuardado} onChangeText={setNovoGuardado} />
                        </View>
                        <TouchableOpacity style={styles.btnGuardar} onPress={guardarNovoObjetivo}><Text style={styles.btnGuardarTexto}>Criar Objetivo</Text></TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* MODAL 2: EDITAR META EXISTENTE */}
            <Modal animationType="fade" transparent={true} visible={modalEditarVisivel} onRequestClose={() => setModalEditarVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Editar Objetivo</Text>
                            <TouchableOpacity onPress={() => setModalEditarVisivel(false)}><Ionicons name="close" size={28} color="#6B7280" /></TouchableOpacity>
                        </View>
                        <TextInput style={styles.inputNormal} placeholder="Título" placeholderTextColor="#9CA3AF" value={editTitulo} onChangeText={setEditTitulo} />
                        <TextInput style={styles.inputNormal} placeholder="Emoji" placeholderTextColor="#9CA3AF" value={editIcone} onChangeText={setEditIcone} />
                        <TextInput style={styles.inputNormal} placeholder="Valor da Meta (€)" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" value={editMeta} onChangeText={setEditMeta} />
                        <TouchableOpacity style={styles.btnGuardar} onPress={guardarEdicao}><Text style={styles.btnGuardarTexto}>Guardar Alterações</Text></TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* MODAL 3: DEPOSITAR OU RETIRAR DINHEIRO */}
            <Modal animationType="fade" transparent={true} visible={modalMovimentoVisivel} onRequestClose={() => setModalMovimentoVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Movimentar Dinheiro</Text>
                            <TouchableOpacity onPress={() => setModalMovimentoVisivel(false)}><Ionicons name="close" size={28} color="#6B7280" /></TouchableOpacity>
                        </View>
                        <Text style={{color: '#6B7280', marginBottom: 20, textAlign: 'center'}}>Valor a movimentar em: {objetivoSelecionado?.titulo}</Text>

                        <TextInput style={styles.inputGrande} placeholder="0,00 €" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" value={valorMovimento} onChangeText={setValorMovimento} autoFocus={true} />

                        <View style={styles.rowInputs}>
                            <TouchableOpacity style={[styles.btnGuardar, { flex: 1, marginRight: 10 }]} onPress={() => realizarMovimento('depositar')}>
                                <Text style={styles.btnGuardarTexto}>Depositar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btnRetirar, { flex: 1 }]} onPress={() => realizarMovimento('retirar')}>
                                <Text style={styles.btnRetirarTexto}>Retirar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { padding: 30, paddingTop: 60, alignItems: 'center', backgroundColor: '#F5F7FA' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
    content: { padding: 20 },
    card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    titulo: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    valores: { fontSize: 14, color: '#6B7280' },
    guardado: { fontWeight: 'bold', color: '#111827' },
    barraFundo: { height: 12, backgroundColor: '#E5E7EB', borderRadius: 6, overflow: 'hidden' },
    barraProgresso: { height: '100%', borderRadius: 6 },
    fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#3B82F6', width: 65, height: 65, borderRadius: 35, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
    modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 25, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    inputNormal: { backgroundColor: '#F3F4F6', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 15, color: '#1F2937' },
    inputGrande: { fontSize: 40, fontWeight: 'bold', color: '#3B82F6', textAlign: 'center', marginBottom: 20, padding: 10 },
    rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
    btnGuardar: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center' },
    btnGuardarTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    btnRetirar: { backgroundColor: '#FEE2E2', padding: 16, borderRadius: 12, alignItems: 'center' },
    btnRetirarTexto: { color: '#EF4444', fontSize: 16, fontWeight: 'bold' }
});
