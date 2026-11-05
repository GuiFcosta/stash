import React, { useState, useEffect } from 'react';
import { Text, View, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { hexToRgba } from '../utils/Colors';
import { useGoals } from '../hooks/useGoals';
import { styles } from './styles/GoalsScreenStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import EmptyState from '../components/EmptyState';
import { SkeletonGoalCard } from '../components/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export default function GoalsScreen() {
    const { colors } = useTheme();
    const { user, userProfile, familyData } = useAuth();
    const insets = useSafeAreaInsets();
    const toast = useToast();

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
        if (!novoTitulo || !novaMeta) {
            toast.warning("Preenche o título e a meta!", "Campos Obrigatórios");
            return;
        }
        if (!familyId) return;

        const meta = Number(novaMeta.trim().replace(',', '.'));
        const guardado = novoGuardado ? Number(novoGuardado.trim().replace(',', '.')) : 0;
        if (!Number.isFinite(meta) || !Number.isFinite(guardado) || meta <= 0 || guardado < 0) {
            toast.warning("Indica valores válidos para a meta e o montante guardado.", "Valor Inválido");
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
            toast.success(`Meta "${novoTitulo.trim()}" criada com sucesso!`, "Meta Criada");
            setNovoTitulo(''); setNovaMeta(''); setNovoGuardado(''); setNovoIcone('');
            setTipoObjetivo('familiar');
            setDonoObjetivo(userProfile?.nome || 'Eu');
            setModalCriarVisivel(false);
        } catch (error) {
            toast.error("Erro ao criar o objetivo.", "Erro");
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
        if (!editTitulo || !editMeta) {
            toast.warning("Preenche o título e a meta.", "Campos Obrigatórios");
            return;
        }
        const meta = Number(editMeta.trim().replace(',', '.'));
        if (!Number.isFinite(meta) || meta <= 0) {
            toast.warning("Indica uma meta válida superior a zero.", "Valor Inválido");
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
            toast.success(`Meta "${editTitulo.trim()}" atualizada!`, "Meta Atualizada");
            setModalEditarVisivel(false);
            setObjetivoSelecionado(null);
        } catch (error) {
            toast.error("Erro ao atualizar o objetivo.", "Erro");
        }
    };

    const realizarMovimento = async (tipo) => {
        if (!valorMovimento || !objetivoSelecionado || !familyId) return;

        try {
            const valorAcao = Number(valorMovimento.trim().replace(',', '.'));
            if (!Number.isFinite(valorAcao) || valorAcao <= 0) {
                toast.warning("Indica um valor superior a zero.", "Valor Inválido");
                return;
            }
            if (tipo === 'retirar' && valorAcao > (objetivoSelecionado.guardado || 0)) {
                toast.warning("Não podes retirar mais do que tens guardado!", "Saldo Insuficiente");
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
                toast.success(
                    tipo === 'depositar'
                        ? `Depositado ${valorAcao.toFixed(2)} € em "${objetivoSelecionado.titulo}".`
                        : `Retirado ${valorAcao.toFixed(2)} € de "${objetivoSelecionado.titulo}".`,
                    tipo === 'depositar' ? "Depósito Efetuado" : "Levantamento Efetuado"
                );
                setValorMovimento('');
                setObjetivoSelecionado(null);
                setModalMovimentoVisivel(false);
            }
        } catch (error) {
            toast.error(error?.message || "Erro ao movimentar o fundo.", "Erro");
        }
    };

    const gerirObjetivo = (objetivo) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert(
            "Gerir Objetivo", // Mantem consistência com título original/novo
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
                            toast.info(`Meta "${objetivo.titulo}" apagada.`, "Meta Removida");
                        } catch (error) {
                            toast.error("Erro ao apagar a meta.", "Erro");
                        }
                    }
                }
            ]
        );
    };

    const renderGoalCard = (objetivo, individual = false) => {
        const percentagem = Math.min(objetivo.meta > 0 ? (objetivo.guardado / objetivo.meta) * 100 : 0, 100);
        const concluido = percentagem >= 100;

        return (
            <TouchableOpacity
                key={objetivo.id}
                style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                activeOpacity={0.8}
                onPress={() => gerirObjetivo(objetivo)}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={[styles.titulo, { color: colors.textDark }]}>
                            {objetivo.icone} {objetivo.titulo}
                        </Text>
                        {individual && objetivo.dono && (
                            <View style={[styles.badgeDono, { backgroundColor: colors.primarySoft, borderColor: colors.primaryLight }]}>
                                <Text style={[styles.badgeDonoTexto, { color: '#065F46' }]}>{objetivo.dono}</Text>
                            </View>
                        )}
                    </View>
                    <View style={[
                        styles.pctPill,
                        {
                            backgroundColor: concluido ? colors.successSoft : colors.inputBg,
                            borderColor: concluido ? colors.success : colors.border,
                        }
                    ]}>
                        <Text style={[
                            styles.pctPillText,
                            { color: concluido ? '#065F46' : colors.textDark }
                        ]}>
                            {percentagem.toFixed(0)}%
                        </Text>
                    </View>
                </View>

                <View style={styles.valoresRow}>
                    <Text style={[styles.valores, { color: colors.textLight }]}>
                        <Text style={[styles.guardado, { color: colors.textDark }]}>{objetivo.guardado.toFixed(0)} €</Text> / {objetivo.meta.toFixed(0)} €
                    </Text>

                    <TouchableOpacity
                        style={[styles.btnMovimentarInline, { backgroundColor: colors.primary }]}
                        onPress={() => {
                            Haptics.selectionAsync();
                            setObjetivoSelecionado(objetivo);
                            setModalMovimentoVisivel(true);
                        }}
                    >
                        <Ionicons name="swap-vertical" size={12} color="#10B981" />
                        <Text style={styles.btnMovimentarInlineText}>MOVIMENTAR</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.barraFundo, { backgroundColor: colors.trackBg, borderColor: colors.border }]}>
                    <View style={[
                        styles.barraProgresso,
                        {
                            width: `${percentagem}%`,
                            backgroundColor: concluido ? colors.success : colors.primaryLight,
                        }
                    ]} />
                </View>
            </TouchableOpacity>
        );
    };

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
                    <Text style={[styles.headerOverline, { color: colors.textLight }]}>METAS & POUPANÇAS</Text>
                    <Text style={[styles.headerTitle, { color: colors.textDark }]}>Objetivos</Text>
                </View>
                <TouchableOpacity
                    style={[styles.btnHeaderAdd, { backgroundColor: '#10B981', borderColor: colors.border }]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setModalCriarVisivel(true);
                    }}
                >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.btnHeaderAddText}>NOVA META</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {carregando ? (
                    <View style={{ gap: 12 }}>
                        <SkeletonGoalCard />
                        <SkeletonGoalCard />
                    </View>
                ) : objetivos.length === 0 ? (
                    <EmptyState
                        title="Sem metas definidas"
                        subtitle="Cria objetivos de poupança como viagens, fundo de emergência ou compras."
                        icon="flag-outline"
                    />
                ) : (
                    <View style={{ gap: 20, paddingBottom: 90 }}>
                        {/* SECÇÃO FAMILIAR */}
                        {objetivos.filter(obj => obj.tipo === 'familiar' || !obj.tipo).length > 0 && (
                            <View style={styles.seccao}>
                                <Text style={[styles.seccaoTitulo, { color: colors.textDark }]}>OBJETIVOS DA FAMÍLIA</Text>
                                {objetivos.filter(obj => obj.tipo === 'familiar' || !obj.tipo).map(obj => renderGoalCard(obj, false))}
                            </View>
                        )}

                        {/* SECÇÃO INDIVIDUAL */}
                        {objetivos.filter(obj => obj.tipo === 'individual').length > 0 && (
                            <View style={styles.seccao}>
                                <Text style={[styles.seccaoTitulo, { color: colors.textDark }]}>OBJETIVOS INDIVIDUAIS</Text>
                                {objetivos.filter(obj => obj.tipo === 'individual').map(obj => renderGoalCard(obj, true))}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: '#10B981', borderColor: colors.border }]}
                activeOpacity={0.85}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setModalCriarVisivel(true);
                }}
            >
                <Ionicons name="add" size={30} color="#FFFFFF" />
            </TouchableOpacity>

            {/* MODAL 1: CRIAR NOVA META */}
            <Modal animationType="fade" transparent={true} visible={modalCriarVisivel} onRequestClose={() => setModalCriarVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent, borderColor: colors.border }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle || colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.textDark }]}>NOVO OBJETIVO</Text>
                            <TouchableOpacity onPress={() => setModalCriarVisivel(false)}><Ionicons name="close" size={26} color={colors.textDark} /></TouchableOpacity>
                        </View>
                        <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, borderColor: colors.border }]} placeholder="Título (Ex: Viagem)" placeholderTextColor={colors.textDisabled} value={novoTitulo} onChangeText={setNovoTitulo} />
                        <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, borderColor: colors.border }]} placeholder="Emoji (Ex: ✈️)" placeholderTextColor={colors.textDisabled} value={novoIcone} onChangeText={setNovoIcone} />
                        <View style={styles.rowInputs}>
                            <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, borderColor: colors.border, flex: 1, marginRight: 10 }]} placeholder="Meta (€)" placeholderTextColor={colors.textDisabled} keyboardType="decimal-pad" value={novaMeta} onChangeText={setNovaMeta} />
                            <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, borderColor: colors.border, flex: 1 }]} placeholder="Já guardado (€)" placeholderTextColor={colors.textDisabled} keyboardType="decimal-pad" value={novoGuardado} onChangeText={setNovoGuardado} />
                        </View>

                        <Text style={[styles.labelPessoa, { color: colors.textMuted }]}>TIPO DE OBJETIVO</Text>
                        <View style={styles.tipoContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.btnTipo,
                                    { backgroundColor: tipoObjetivo === 'familiar' ? colors.primary : colors.inputBg, borderColor: colors.border }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setTipoObjetivo('familiar');
                                }}
                            >
                                <Text style={[
                                    styles.btnTipoTexto,
                                    { color: tipoObjetivo === 'familiar' ? '#FFFFFF' : colors.textDark }
                                ]}>
                                    FAMILIAR
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.btnTipo,
                                    { backgroundColor: tipoObjetivo === 'individual' ? colors.primary : colors.inputBg, borderColor: colors.border }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setTipoObjetivo('individual');
                                }}
                            >
                                <Text style={[
                                    styles.btnTipoTexto,
                                    { color: tipoObjetivo === 'individual' ? '#FFFFFF' : colors.textDark }
                                ]}>
                                    INDIVIDUAL
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {tipoObjetivo === 'individual' && (
                            <>
                                <Text style={[styles.labelPessoa, { color: colors.textMuted }]}>A QUEM PERTENCE?</Text>
                                <View style={styles.donoContainer}>
                                    {membrosFamilia.map((membro) => {
                                        const eSelecionado = donoObjetivo === membro.nome;
                                        return (
                                            <TouchableOpacity
                                                key={membro.uid}
                                                style={[
                                                    styles.btnDono,
                                                    { backgroundColor: eSelecionado ? colors.primary : colors.inputBg, borderColor: colors.border }
                                                ]}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setDonoObjetivo(membro.nome);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.btnDonoTexto,
                                                    { color: eSelecionado ? '#FFFFFF' : colors.textDark }
                                                ]}>
                                                    {membro.nome}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: '#10B981', borderColor: colors.border, marginTop: 10 }]} onPress={guardarNovoObjetivo}>
                            <Text style={styles.btnGuardarTexto}>CRIAR OBJETIVO</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* MODAL 2: EDITAR META EXISTENTE */}
            <Modal animationType="fade" transparent={true} visible={modalEditarVisivel} onRequestClose={() => setModalEditarVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent, borderColor: colors.border }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle || colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.textDark }]}>EDITAR OBJETIVO</Text>
                            <TouchableOpacity onPress={() => setModalEditarVisivel(false)}><Ionicons name="close" size={26} color={colors.textDark} /></TouchableOpacity>
                        </View>
                        <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, borderColor: colors.border }]} placeholder="Título" placeholderTextColor={colors.textDisabled} value={editTitulo} onChangeText={setEditTitulo} />
                        <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, borderColor: colors.border }]} placeholder="Emoji" placeholderTextColor={colors.textDisabled} value={editIcone} onChangeText={setEditIcone} />
                        <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, borderColor: colors.border }]} placeholder="Valor da Meta (€)" placeholderTextColor={colors.textDisabled} keyboardType="decimal-pad" value={editMeta} onChangeText={setEditMeta} />

                        <Text style={[styles.labelPessoa, { color: colors.textMuted }]}>TIPO DE OBJETIVO</Text>
                        <View style={styles.tipoContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.btnTipo,
                                    { backgroundColor: editTipo === 'familiar' ? colors.primary : colors.inputBg, borderColor: colors.border }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setEditTipo('familiar');
                                }}
                            >
                                <Text style={[
                                    styles.btnTipoTexto,
                                    { color: editTipo === 'familiar' ? '#FFFFFF' : colors.textDark }
                                ]}>
                                    FAMILIAR
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.btnTipo,
                                    { backgroundColor: editTipo === 'individual' ? colors.primary : colors.inputBg, borderColor: colors.border }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setEditTipo('individual');
                                }}
                            >
                                <Text style={[
                                    styles.btnTipoTexto,
                                    { color: editTipo === 'individual' ? '#FFFFFF' : colors.textDark }
                                ]}>
                                    INDIVIDUAL
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {editTipo === 'individual' && (
                            <>
                                <Text style={[styles.labelPessoa, { color: colors.textMuted }]}>A QUEM PERTENCE?</Text>
                                <View style={styles.donoContainer}>
                                    {membrosFamilia.map((membro) => {
                                        const eSelecionado = editDono === membro.nome;
                                        return (
                                            <TouchableOpacity
                                                key={membro.uid}
                                                style={[
                                                    styles.btnDono,
                                                    { backgroundColor: eSelecionado ? colors.primary : colors.inputBg, borderColor: colors.border }
                                                ]}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setEditDono(membro.nome);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.btnDonoTexto,
                                                    { color: eSelecionado ? '#FFFFFF' : colors.textDark }
                                                ]}>
                                                    {membro.nome}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: '#10B981', borderColor: colors.border, marginTop: 15 }]} onPress={guardarEdicao}>
                            <Text style={styles.btnGuardarTexto}>GUARDAR ALTERAÇÕES</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* MODAL 3: DEPOSITAR OU RETIRAR DINHEIRO */}
            <Modal animationType="fade" transparent={true} visible={modalMovimentoVisivel} onRequestClose={() => setModalMovimentoVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent, borderColor: colors.border }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle || colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.textDark }]}>MOVIMENTAR DINHEIRO</Text>
                            <TouchableOpacity onPress={() => setModalMovimentoVisivel(false)}><Ionicons name="close" size={26} color={colors.textDark} /></TouchableOpacity>
                        </View>
                        <Text style={{ color: colors.textLight, marginBottom: 14, textAlign: 'center', fontFamily: 'SpaceGrotesk_500Medium' }}>
                            Meta: {objetivoSelecionado?.titulo}
                        </Text>

                        <TextInput style={[styles.inputGrande, { color: colors.textDark, borderBottomColor: colors.border }]} placeholder="0,00 €" placeholderTextColor={colors.textDisabled} keyboardType="decimal-pad" value={valorMovimento} onChangeText={setValorMovimento} autoFocus={true} />

                        <View style={styles.rowInputs}>
                            <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: '#10B981', borderColor: colors.border, flex: 1, marginRight: 10 }]} onPress={() => realizarMovimento('depositar')}>
                                <Text style={styles.btnGuardarTexto}>DEPOSITAR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btnRetirar, { flex: 1, backgroundColor: colors.dangerSoft, borderColor: colors.danger }]} onPress={() => realizarMovimento('retirar')}>
                                <Text style={[styles.btnRetirarTexto, { color: colors.danger }]}>RETIRAR</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}
