import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../services/Firebase';
import { chaveDoMes } from '../utils/Month';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { hexToRgba } from '../utils/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import EmptyState from '../components/EmptyState';
import { SkeletonGoalCard } from '../components/SkeletonLoader';

export default function GoalsScreen() {
    const { colors } = useTheme();
    const { user, userProfile, familyData } = useAuth();
    const insets = useSafeAreaInsets();

    const [objetivos, setObjetivos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [objetivoSelecionado, setObjetivoSelecionado] = useState(null);

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

    const familyId = familyData?.id;

    useEffect(() => {
        if (!familyId) return;

        setCarregando(true);
        const q = query(collection(db, 'objetivos'), where('familyId', '==', familyId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const listaObjetivos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setObjetivos(listaObjetivos);
            setCarregando(false);
        }, (err) => {
            console.error("Erro ao carregar objetivos:", err);
            setCarregando(false);
        });

        return () => unsubscribe();
    }, [familyId]);

    const guardarNovoObjetivo = async () => {
        if (!novoTitulo || !novaMeta) { Alert.alert("Aviso", "Preenche o título e a meta!"); return; }
        if (!familyId) return;

        const meta = Number(novaMeta.trim().replace(',', '.'));
        const guardado = novoGuardado ? Number(novoGuardado.trim().replace(',', '.')) : 0;
        if (!Number.isFinite(meta) || !Number.isFinite(guardado) || meta <= 0 || guardado < 0) {
            Alert.alert("Aviso", "Indica valores válidos para a meta e o montante guardado.");
            return;
        }
        try {
            await addDoc(collection(db, 'objetivos'), {
                familyId: familyId,
                titulo: novoTitulo,
                meta,
                guardado,
                icone: novoIcone.trim() === '' ? '🎯' : novoIcone
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setNovoTitulo(''); setNovaMeta(''); setNovoGuardado(''); setNovoIcone('');
            setModalCriarVisivel(false);
        } catch (error) { Alert.alert("Erro", "Erro ao criar meta."); }
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
            Alert.alert("Aviso", "Indica uma meta válida superior a zero.");
            return;
        }
        try {
            await updateDoc(doc(db, 'objetivos', objetivoSelecionado.id), {
                titulo: editTitulo,
                icone: editIcone.trim() === '' ? '🎯' : editIcone,
                meta
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setModalEditarVisivel(false);
            setObjetivoSelecionado(null);
        } catch (error) { Alert.alert("Erro", "Erro ao editar."); }
    };

    const realizarMovimento = async (tipo) => {
        if (!valorMovimento || !objetivoSelecionado || !familyId) return;

        try {
            const valorAcao = Number(valorMovimento.trim().replace(',', '.'));
            if (!Number.isFinite(valorAcao) || valorAcao <= 0) {
                Alert.alert("Aviso", "Indica um valor superior a zero.");
                return;
            }

            let novoTotalGuardado;
            let valorParaHome;

            if (tipo === 'depositar') {
                novoTotalGuardado = objetivoSelecionado.guardado + valorAcao;
                valorParaHome = valorAcao;
            } else {
                if (valorAcao > objetivoSelecionado.guardado) {
                    Alert.alert("Aviso", "Não podes retirar mais do que tens guardado!");
                    return;
                }
                novoTotalGuardado = objetivoSelecionado.guardado - valorAcao;
                valorParaHome = -valorAcao;
            }

            await updateDoc(doc(db, 'objetivos', objetivoSelecionado.id), { guardado: novoTotalGuardado });

            const dataAtual = new Date();
            const diaStr = String(dataAtual.getDate()).padStart(2, '0');
            const mesStr = String(dataAtual.getMonth() + 1).padStart(2, '0');

            await addDoc(collection(db, 'gastos_variaveis'), {
                familyId: familyId,
                loja: tipo === 'depositar' ? `Poupança: ${objetivoSelecionado.titulo}` : `Resgate: ${objetivoSelecionado.titulo}`,
                valor: valorParaHome,
                data: `${diaStr}/${mesStr}`,
                quem: userProfile?.nome || 'Eu',
                quemUid: user?.uid || '',
                categoria: 'Poupança',
                mesReferencia: chaveDoMes(dataAtual),
                timestamp: Date.now()
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setValorMovimento('');
            setObjetivoSelecionado(null);
            setModalMovimentoVisivel(false);

            Alert.alert(
                "Sucesso!",
                tipo === 'depositar'
                    ? `Guardaste ${valorAcao}€.`
                    : `Retiraste ${valorAcao}€. O valor voltou ao Saldo Disponível.`
            );

        } catch (error) { Alert.alert("Erro", "Erro ao movimentar dinheiro."); }
    };

    const gerirObjetivo = (objetivo) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (error) {
                            Alert.alert("Erro", "Erro ao apagar a meta.");
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.background, paddingTop: Math.max(insets.top + 10, 30) }]}>
                <Text style={[styles.headerTitle, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>Objetivos da Família</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {carregando ? (
                    <View style={{ gap: 12 }}>
                        <SkeletonGoalCard />
                        <SkeletonGoalCard />
                    </View>
                ) : objetivos.length === 0 ? (
                    <EmptyState
                        titulo="Sem metas definidas"
                        subtitulo="Cria objetivos de poupança como viagens, fundo de emergência ou compras."
                        icone="flag-outline"
                    />
                ) : (
                    objetivos.map((objetivo) => {
                        const percentagem = Math.min(objetivo.meta > 0 ? (objetivo.guardado / objetivo.meta) * 100 : 0, 100);
                        const concluido = percentagem >= 100;

                        return (
                            <TouchableOpacity key={objetivo.id} style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]} activeOpacity={0.8} onPress={() => gerirObjetivo(objetivo)}>
                                <View style={styles.cardHeader}>
                                    <Text style={[styles.titulo, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>{objetivo.icone} {objetivo.titulo}</Text>
                                    <Text style={[styles.valores, { color: colors.textLight, fontFamily: 'Inter_400Regular' }]}>
                                        <Text style={[styles.guardado, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>{objetivo.guardado.toFixed(0)}€</Text> / {objetivo.meta.toFixed(0)}€
                                    </Text>
                                </View>
                                <View style={[styles.barraFundo, { backgroundColor: colors.inputBg }]}>
                                    <View style={[styles.barraProgresso, { width: `${percentagem}%`, backgroundColor: concluido ? colors.success : colors.primaryLight }]} />
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primaryLight }]} activeOpacity={0.8} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setModalCriarVisivel(true); }}>
                <Ionicons name="add" size={32} color="#FFFFFF" />
            </TouchableOpacity>

            {/* MODAL 1: CRIAR NOVA META */}
            <Modal animationType="fade" transparent={true} visible={modalCriarVisivel} onRequestClose={() => setModalCriarVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>Novo Objetivo</Text>
                            <TouchableOpacity onPress={() => setModalCriarVisivel(false)}><Ionicons name="close" size={28} color={colors.textLight} /></TouchableOpacity>
                        </View>
                        <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, fontFamily: 'Inter_400Regular' }]} placeholder="Título (Ex: Viagem)" placeholderTextColor={colors.textDisabled} value={novoTitulo} onChangeText={setNovoTitulo} />
                        <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, fontFamily: 'Inter_400Regular' }]} placeholder="Emoji (Ex: ✈️)" placeholderTextColor={colors.textDisabled} value={novoIcone} onChangeText={setNovoIcone} />
                        <View style={styles.rowInputs}>
                            <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, flex: 1, marginRight: 10, fontFamily: 'Inter_400Regular' }]} placeholder="Meta (€)" placeholderTextColor={colors.textDisabled} keyboardType="decimal-pad" value={novaMeta} onChangeText={setNovaMeta} />
                            <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, flex: 1, fontFamily: 'Inter_400Regular' }]} placeholder="Já guardado (€)" placeholderTextColor={colors.textDisabled} keyboardType="decimal-pad" value={novoGuardado} onChangeText={setNovoGuardado} />
                        </View>
                        <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: colors.primaryLight }]} onPress={guardarNovoObjetivo}><Text style={[styles.btnGuardarTexto, { fontFamily: 'Inter_700Bold' }]}>Criar Objetivo</Text></TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* MODAL 2: EDITAR META EXISTENTE */}
            <Modal animationType="fade" transparent={true} visible={modalEditarVisivel} onRequestClose={() => setModalEditarVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>Editar Objetivo</Text>
                            <TouchableOpacity onPress={() => setModalEditarVisivel(false)}><Ionicons name="close" size={28} color={colors.textLight} /></TouchableOpacity>
                        </View>
                        <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, fontFamily: 'Inter_400Regular' }]} placeholder="Título" placeholderTextColor={colors.textDisabled} value={editTitulo} onChangeText={setEditTitulo} />
                        <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, fontFamily: 'Inter_400Regular' }]} placeholder="Emoji" placeholderTextColor={colors.textDisabled} value={editIcone} onChangeText={setEditIcone} />
                        <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, fontFamily: 'Inter_400Regular' }]} placeholder="Valor da Meta (€)" placeholderTextColor={colors.textDisabled} keyboardType="decimal-pad" value={editMeta} onChangeText={setEditMeta} />
                        <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: colors.primaryLight }]} onPress={guardarEdicao}><Text style={[styles.btnGuardarTexto, { fontFamily: 'Inter_700Bold' }]}>Guardar Alterações</Text></TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* MODAL 3: DEPOSITAR OU RETIRAR DINHEIRO */}
            <Modal animationType="fade" transparent={true} visible={modalMovimentoVisivel} onRequestClose={() => setModalMovimentoVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>Movimentar Dinheiro</Text>
                            <TouchableOpacity onPress={() => setModalMovimentoVisivel(false)}><Ionicons name="close" size={28} color={colors.textLight} /></TouchableOpacity>
                        </View>
                        <Text style={{ color: colors.textLight, marginBottom: 20, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>Valor a movimentar em: {objetivoSelecionado?.titulo}</Text>

                        <TextInput style={[styles.inputGrande, { color: colors.primaryLight, fontFamily: 'Inter_700Bold' }]} placeholder="0,00 €" placeholderTextColor={colors.textDisabled} keyboardType="decimal-pad" value={valorMovimento} onChangeText={setValorMovimento} autoFocus={true} />

                        <View style={styles.rowInputs}>
                            <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: colors.primaryLight, flex: 1, marginRight: 10 }]} onPress={() => realizarMovimento('depositar')}>
                                <Text style={[styles.btnGuardarTexto, { fontFamily: 'Inter_700Bold' }]}>Depositar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btnRetirar, { flex: 1, backgroundColor: hexToRgba(colors.danger, 0.15) }]} onPress={() => realizarMovimento('retirar')}>
                                <Text style={[styles.btnRetirarTexto, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>Retirar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingBottom: 16, alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: 'bold' },
    content: { padding: 20 },
    card: { padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    titulo: { fontSize: 18, fontWeight: 'bold' },
    valores: { fontSize: 14 },
    guardado: { fontWeight: 'bold' },
    barraFundo: { height: 12, borderRadius: 6, overflow: 'hidden' },
    barraProgresso: { height: '100%', borderRadius: 6 },
    fab: { position: 'absolute', bottom: 20, right: 20, width: 65, height: 65, borderRadius: 35, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
    modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 25, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    inputNormal: { padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 15 },
    inputGrande: { fontSize: 40, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, padding: 10 },
    rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
    btnGuardar: { padding: 16, borderRadius: 12, alignItems: 'center' },
    btnGuardarTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    btnRetirar: { padding: 16, borderRadius: 12, alignItems: 'center' },
    btnRetirarTexto: { fontSize: 16, fontWeight: 'bold' }
});
