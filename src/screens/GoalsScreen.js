import React, { useState, useEffect } from 'react';
import { Text, View, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { hexToRgba } from '../utils/colors';
import { useGoals } from '../hooks/useGoals';
import { styles } from './styles/GoalsScreenStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import EmptyState from '../components/EmptyState';
import { SkeletonGoalCard } from '../components/SkeletonLoader';

export default function GoalsScreen() {
    const { colors } = useTheme();
    const { user, userProfile, familyData } = useAuth();
    const insets = useSafeAreaInsets();

    const [objetivoSelecionado, setObjetivoSelecionado] = useState(null);

    const [modalCriarVisivel, setModalCriarVisivel] = useState(false);
    const [novoTitulo, setNovoTitulo] = useState('');
    const [novaMeta, setNovaMeta] = useState('');
    const [novoGuardado, setNovoGuardado] = useState('');
    const [novoIcone, setNovoIcone] = useState('');
    const [tipoObjetivo, setTipoObjetivo] = useState('familiar'); // 'familiar' ou 'individual'
    const [donoObjetivo, setDonoObjetivo] = useState(userProfile?.nome || 'Eu');

    const [modalEditarVisivel, setModalEditarVisivel] = useState(false);
    const [editTitulo, setEditTitulo] = useState('');
    const [editIcone, setEditIcone] = useState('');
    const [editMeta, setEditMeta] = useState('');
    const [editTipo, setEditTipo] = useState('familiar');
    const [editDono, setEditDono] = useState('');

    const [modalMovimentoVisivel, setModalMovimentoVisivel] = useState(false);
    const [valorMovimento, setValorMovimento] = useState('');

    const familyId = familyData?.id;
    const membrosFamilia = familyData?.membros || [];

    const {
        objetivos,
        carregando,
        criarObjetivo,
        editarObjetivo,
        excluirObjetivo,
        movimentarFundo
    } = useGoals(familyId);

    useEffect(() => {
        if (userProfile?.nome) {
            setDonoObjetivo(userProfile.nome);
        }
    }, [userProfile]);

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
            const membroDono = tipoObjetivo === 'individual' ? membrosFamilia.find(m => m.nome === donoObjetivo) : null;
            await criarObjetivo({
                titulo: novoTitulo,
                meta,
                guardado,
                icone: novoIcone.trim() === '' ? '🎯' : novoIcone,
                tipo: tipoObjetivo,
                dono: tipoObjetivo === 'individual' ? donoObjetivo : null,
                donoUid: tipoObjetivo === 'individual' ? (membroDono?.uid || user?.uid || '') : null
            });
            setNovoTitulo(''); setNovaMeta(''); setNovoGuardado(''); setNovoIcone('');
            setTipoObjetivo('familiar');
            setDonoObjetivo(userProfile?.nome || 'Eu');
            setModalCriarVisivel(false);
        } catch (error) {
            // Tratado no hook
        }
    };

    const abrirEdicao = (objetivo) => {
        setObjetivoSelecionado(objetivo);
        setEditTitulo(objetivo.titulo);
        setEditIcone(objetivo.icone);
        setEditMeta(objetivo.meta.toString().replace('.', ','));
        setEditTipo(objetivo.tipo || 'familiar');
        setEditDono(objetivo.dono || userProfile?.nome || 'Eu');
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
            const membroDonoEdit = editTipo === 'individual' ? membrosFamilia.find(m => m.nome === editDono) : null;
            await editarObjetivo(objetivoSelecionado.id, {
                titulo: editTitulo,
                icone: editIcone.trim() === '' ? '🎯' : editIcone,
                meta,
                tipo: editTipo,
                dono: editTipo === 'individual' ? editDono : null,
                donoUid: editTipo === 'individual' ? (membroDonoEdit?.uid || objetivoSelecionado.donoUid || '') : null
            });
            setModalEditarVisivel(false);
            setObjetivoSelecionado(null);
        } catch (error) {
            // Tratado no hook
        }
    };

    const realizarMovimento = async (tipo) => {
        if (!valorMovimento || !objetivoSelecionado || !familyId) return;

        try {
            const valorAcao = Number(valorMovimento.trim().replace(',', '.'));
            if (!Number.isFinite(valorAcao) || valorAcao <= 0) {
                Alert.alert("Aviso", "Indica um valor superior a zero.");
                return;
            }

            const sucesso = await movimentarFundo(
                objetivoSelecionado,
                valorAcao,
                tipo,
                userProfile?.nome || 'Eu',
                user?.uid || ''
            );

            if (sucesso) {
                setValorMovimento('');
                setObjetivoSelecionado(null);
                setModalMovimentoVisivel(false);
            }
        } catch (error) {
            // Tratado no hook
        }
    };

    const gerirObjetivo = (objetivo) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert(
            "Gerir Gasto", // Mantem consistência com título original/novo
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
                            await excluirObjetivo(objetivo.id);
                        } catch (error) {
                            // Tratado no hook
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top + 4, 12) }]}>
                <Text style={[styles.headerTitle, { color: colors.textDark }]}>Objetivos</Text>
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
                    <View style={{ gap: 20 }}>
                        {/* SECÇÃO FAMILIAR */}
                        {objetivos.filter(obj => obj.tipo === 'familiar' || !obj.tipo).length > 0 && (
                            <View style={styles.seccao}>
                                <Text style={[styles.seccaoTitulo, { color: colors.textLight, fontFamily: 'SpaceGrotesk_700Bold' }]}>Objetivos da Família</Text>
                                {objetivos.filter(obj => obj.tipo === 'familiar' || !obj.tipo).map((objetivo) => {
                                    const percentagem = Math.min(objetivo.meta > 0 ? (objetivo.guardado / objetivo.meta) * 100 : 0, 100);
                                    const concluido = percentagem >= 100;

                                    return (
                                        <TouchableOpacity key={objetivo.id} style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]} activeOpacity={0.8} onPress={() => gerirObjetivo(objetivo)}>
                                            <View style={styles.cardHeader}>
                                                <Text style={[styles.titulo, { color: colors.textDark, fontFamily: 'SpaceGrotesk_700Bold' }]}>{objetivo.icone} {objetivo.titulo}</Text>
                                                <Text style={[styles.valores, { color: colors.textLight, fontFamily: 'SpaceGrotesk_400Regular' }]}>
                                                    <Text style={[styles.guardado, { color: colors.textDark, fontFamily: 'SpaceGrotesk_700Bold' }]}>{objetivo.guardado.toFixed(0)}€</Text> / {objetivo.meta.toFixed(0)}€
                                                </Text>
                                            </View>
                                            <View style={[styles.barraFundo, { backgroundColor: colors.inputBg }]}>
                                                <View style={[styles.barraProgresso, { width: `${percentagem}%`, backgroundColor: concluido ? colors.success : colors.primaryLight }]} />
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        {/* SECÇÃO INDIVIDUAL */}
                        {objetivos.filter(obj => obj.tipo === 'individual').length > 0 && (
                            <View style={styles.seccao}>
                                <Text style={[styles.seccaoTitulo, { color: colors.textLight, fontFamily: 'SpaceGrotesk_700Bold' }]}>Objetivos Individuais</Text>
                                {objetivos.filter(obj => obj.tipo === 'individual').map((objetivo) => {
                                    const percentagem = Math.min(objetivo.meta > 0 ? (objetivo.guardado / objetivo.meta) * 100 : 0, 100);
                                    const concluido = percentagem >= 100;

                                    return (
                                        <TouchableOpacity key={objetivo.id} style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]} activeOpacity={0.8} onPress={() => gerirObjetivo(objetivo)}>
                                            <View style={styles.cardHeader}>
                                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                    <Text style={[styles.titulo, { color: colors.textDark, fontFamily: 'SpaceGrotesk_700Bold' }]}>{objetivo.icone} {objetivo.titulo}</Text>
                                                    <View style={[styles.badgeDono, { backgroundColor: hexToRgba(colors.primaryLight, 0.15) }]}>
                                                        <Text style={[styles.badgeDonoTexto, { color: colors.primaryLight, fontFamily: 'SpaceGrotesk_600SemiBold' }]}>{objetivo.dono}</Text>
                                                    </View>
                                                </View>
                                                <Text style={[styles.valores, { color: colors.textLight, fontFamily: 'SpaceGrotesk_400Regular' }]}>
                                                    <Text style={[styles.guardado, { color: colors.textDark, fontFamily: 'SpaceGrotesk_700Bold' }]}>{objetivo.guardado.toFixed(0)}€</Text> / {objetivo.meta.toFixed(0)}€
                                                </Text>
                                            </View>
                                            <View style={[styles.barraFundo, { backgroundColor: colors.inputBg }]}>
                                                <View style={[styles.barraProgresso, { width: `${percentagem}%`, backgroundColor: concluido ? colors.success : colors.primaryLight }]} />
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>
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
                            <Text style={[styles.modalTitle, { color: colors.textDark, fontFamily: 'SpaceGrotesk_700Bold' }]}>Novo Objetivo</Text>
                            <TouchableOpacity onPress={() => setModalCriarVisivel(false)}><Ionicons name="close" size={28} color={colors.textLight} /></TouchableOpacity>
                        </View>
                        <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, fontFamily: 'SpaceGrotesk_400Regular' }]} placeholder="Título (Ex: Viagem)" placeholderTextColor={colors.textDisabled} value={novoTitulo} onChangeText={setNovoTitulo} />
                        <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, fontFamily: 'SpaceGrotesk_400Regular' }]} placeholder="Emoji (Ex: ✈️)" placeholderTextColor={colors.textDisabled} value={novoIcone} onChangeText={setNovoIcone} />
                        <View style={styles.rowInputs}>
                            <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, flex: 1, marginRight: 10, fontFamily: 'SpaceGrotesk_400Regular' }]} placeholder="Meta (€)" placeholderTextColor={colors.textDisabled} keyboardType="decimal-pad" value={novaMeta} onChangeText={setNovaMeta} />
                            <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, flex: 1, fontFamily: 'SpaceGrotesk_400Regular' }]} placeholder="Já guardado (€)" placeholderTextColor={colors.textDisabled} keyboardType="decimal-pad" value={novoGuardado} onChangeText={setNovoGuardado} />
                        </View>

                        <Text style={[styles.labelPessoa, { color: colors.textMuted, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 8, marginTop: 5 }]}>Tipo de Objetivo</Text>
                        <View style={styles.tipoContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.btnTipo,
                                    { backgroundColor: colors.inputBg },
                                    tipoObjetivo === 'familiar' && { backgroundColor: hexToRgba(colors.primaryLight, 0.2), borderColor: colors.primaryLight }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setTipoObjetivo('familiar');
                                }}
                            >
                                <Text style={[
                                    styles.btnTipoTexto,
                                    { color: colors.textLight, fontFamily: 'SpaceGrotesk_600SemiBold' },
                                    tipoObjetivo === 'familiar' && { color: colors.primaryLight, fontWeight: 'bold' }
                                ]}>
                                    Familiar
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.btnTipo,
                                    { backgroundColor: colors.inputBg },
                                    tipoObjetivo === 'individual' && { backgroundColor: hexToRgba(colors.primaryLight, 0.2), borderColor: colors.primaryLight }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setTipoObjetivo('individual');
                                }}
                            >
                                <Text style={[
                                    styles.btnTipoTexto,
                                    { color: colors.textLight, fontFamily: 'SpaceGrotesk_600SemiBold' },
                                    tipoObjetivo === 'individual' && { color: colors.primaryLight, fontWeight: 'bold' }
                                ]}>
                                    Individual
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {tipoObjetivo === 'individual' && (
                            <>
                                <Text style={[styles.labelPessoa, { color: colors.textMuted, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 8, marginTop: 5 }]}>A quem pertence?</Text>
                                <View style={styles.donoContainer}>
                                    {membrosFamilia.map((membro) => {
                                        const eSelecionado = donoObjetivo === membro.nome;
                                        return (
                                            <TouchableOpacity
                                                key={membro.uid}
                                                style={[
                                                    styles.btnDono,
                                                    { backgroundColor: colors.inputBg },
                                                    eSelecionado && { backgroundColor: hexToRgba(colors.primaryLight, 0.2), borderColor: colors.primaryLight }
                                                ]}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setDonoObjetivo(membro.nome);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.btnDonoTexto,
                                                    { color: colors.textLight, fontFamily: 'SpaceGrotesk_600SemiBold' },
                                                    eSelecionado && { color: colors.primaryLight, fontWeight: 'bold' }
                                                ]}>
                                                    {membro.nome}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: colors.primaryLight, marginTop: 10 }]} onPress={guardarNovoObjetivo}><Text style={[styles.btnGuardarTexto, { fontFamily: 'SpaceGrotesk_700Bold' }]}>Criar Objetivo</Text></TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* MODAL 2: EDITAR META EXISTENTE */}
            <Modal animationType="fade" transparent={true} visible={modalEditarVisivel} onRequestClose={() => setModalEditarVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textDark, fontFamily: 'SpaceGrotesk_700Bold' }]}>Editar Objetivo</Text>
                            <TouchableOpacity onPress={() => setModalEditarVisivel(false)}><Ionicons name="close" size={28} color={colors.textLight} /></TouchableOpacity>
                        </View>
                        <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, fontFamily: 'SpaceGrotesk_400Regular' }]} placeholder="Título" placeholderTextColor={colors.textDisabled} value={editTitulo} onChangeText={setEditTitulo} />
                        <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, fontFamily: 'SpaceGrotesk_400Regular' }]} placeholder="Emoji" placeholderTextColor={colors.textDisabled} value={editIcone} onChangeText={setEditIcone} />
                        <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, fontFamily: 'SpaceGrotesk_400Regular' }]} placeholder="Valor da Meta (€)" placeholderTextColor={colors.textDisabled} keyboardType="decimal-pad" value={editMeta} onChangeText={setEditMeta} />

                        <Text style={[styles.labelPessoa, { color: colors.textMuted, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 8, marginTop: 5 }]}>Tipo de Objetivo</Text>
                        <View style={styles.tipoContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.btnTipo,
                                    { backgroundColor: colors.inputBg },
                                    editTipo === 'familiar' && { backgroundColor: hexToRgba(colors.primaryLight, 0.2), borderColor: colors.primaryLight }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setEditTipo('familiar');
                                }}
                            >
                                <Text style={[
                                    styles.btnTipoTexto,
                                    { color: colors.textLight, fontFamily: 'SpaceGrotesk_600SemiBold' },
                                    editTipo === 'familiar' && { color: colors.primaryLight, fontWeight: 'bold' }
                                ]}>
                                    Familiar
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.btnTipo,
                                    { backgroundColor: colors.inputBg },
                                    editTipo === 'individual' && { backgroundColor: hexToRgba(colors.primaryLight, 0.2), borderColor: colors.primaryLight }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setEditTipo('individual');
                                }}
                            >
                                <Text style={[
                                    styles.btnTipoTexto,
                                    { color: colors.textLight, fontFamily: 'SpaceGrotesk_600SemiBold' },
                                    editTipo === 'individual' && { color: colors.primaryLight, fontWeight: 'bold' }
                                ]}>
                                    Individual
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {editTipo === 'individual' && (
                            <>
                                <Text style={[styles.labelPessoa, { color: colors.textMuted, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 8, marginTop: 5 }]}>A quem pertence?</Text>
                                <View style={styles.donoContainer}>
                                    {membrosFamilia.map((membro) => {
                                        const eSelecionado = editDono === membro.nome;
                                        return (
                                            <TouchableOpacity
                                                key={membro.uid}
                                                style={[
                                                    styles.btnDono,
                                                    { backgroundColor: colors.inputBg },
                                                    eSelecionado && { backgroundColor: hexToRgba(colors.primaryLight, 0.2), borderColor: colors.primaryLight }
                                                ]}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setEditDono(membro.nome);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.btnDonoTexto,
                                                    { color: colors.textLight, fontFamily: 'SpaceGrotesk_600SemiBold' },
                                                    eSelecionado && { color: colors.primaryLight, fontWeight: 'bold' }
                                                ]}>
                                                    {membro.nome}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: colors.primaryLight, marginTop: 15 }]} onPress={guardarEdicao}><Text style={[styles.btnGuardarTexto, { fontFamily: 'SpaceGrotesk_700Bold' }]}>Guardar Alterações</Text></TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* MODAL 3: DEPOSITAR OU RETIRAR DINHEIRO */}
            <Modal animationType="fade" transparent={true} visible={modalMovimentoVisivel} onRequestClose={() => setModalMovimentoVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textDark, fontFamily: 'SpaceGrotesk_700Bold' }]}>Movimentar Dinheiro</Text>
                            <TouchableOpacity onPress={() => setModalMovimentoVisivel(false)}><Ionicons name="close" size={28} color={colors.textLight} /></TouchableOpacity>
                        </View>
                        <Text style={{ color: colors.textLight, marginBottom: 20, textAlign: 'center', fontFamily: 'SpaceGrotesk_400Regular' }}>Valor a movimentar em: {objetivoSelecionado?.titulo}</Text>

                        <TextInput style={[styles.inputGrande, { color: colors.primaryLight, fontFamily: 'SpaceGrotesk_700Bold' }]} placeholder="0,00 €" placeholderTextColor={colors.textDisabled} keyboardType="decimal-pad" value={valorMovimento} onChangeText={setValorMovimento} autoFocus={true} />

                        <View style={styles.rowInputs}>
                            <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: colors.primaryLight, flex: 1, marginRight: 10 }]} onPress={() => realizarMovimento('depositar')}>
                                <Text style={[styles.btnGuardarTexto, { fontFamily: 'SpaceGrotesk_700Bold' }]}>Depositar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btnRetirar, { flex: 1, backgroundColor: hexToRgba(colors.danger, 0.15) }]} onPress={() => realizarMovimento('retirar')}>
                                <Text style={[styles.btnRetirarTexto, { color: colors.danger, fontFamily: 'SpaceGrotesk_700Bold' }]}>Retirar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}


