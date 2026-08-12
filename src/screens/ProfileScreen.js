import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Switch,
    RefreshControl,
    Share
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from "../services/Firebase";
import { CATEGORIAS_DE_GASTO } from '../constants/Categories';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { hexToRgba } from '../utils/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
    const { colors, isDarkMode, toggleTheme } = useTheme();
    const insets = useSafeAreaInsets();
    const {
        user,
        userProfile,
        familyData,
        isAdmin,
        currentMember,
        logout,
        joinFamilyByCode,
        regenerateInviteCode,
        updateFamilyName,
        promoteToAdmin,
        removeMember
    } = useAuth();

    // Renda Pessoal
    const [minhaRenda, setMinhaRenda] = useState('0');
    const [modalRendaVisivel, setModalRendaVisivel] = useState(false);

    // Gestão de Família
    const [modalFamiliaVisivel, setModalFamiliaVisivel] = useState(false);
    const [modalCodigoVisivel, setModalCodigoVisivel] = useState(false);
    const [codigoInput, setCodigoInput] = useState('');
    const [editNomeFamilia, setEditNomeFamilia] = useState('');

    // Despesas Fixas
    const [listaFixas, setListaFixas] = useState([]);
    const [modalFixasVisivel, setModalFixasVisivel] = useState(false);

    // Limites de Orçamento
    const [rascunhoLimites, setRascunhoLimites] = useState({});
    const [modalLimitesVisivel, setModalLimitesVisivel] = useState(false);

    // Notificações
    const [lembreteContas, setLembreteContas] = useState(false);
    const [alertaSemanal, setAlertaSemanal] = useState(false);

    const toggleLembreteContas = async (valor) => {
        const { requestNotificationPermissions, scheduleFixedExpensesReminder } = require('../services/NotificationService');
        const permitido = await requestNotificationPermissions();
        if (!permitido && valor) {
            Alert.alert("Permissão Negada", "Ativa as notificações nas definições do teu telemóvel para receberes avisos do Stash.");
            return;
        }
        setLembreteContas(valor);
        await scheduleFixedExpensesReminder(valor);
        if (valor) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const toggleAlertaSemanal = async (valor) => {
        const { requestNotificationPermissions, scheduleWeeklyBalanceAlert } = require('../services/NotificationService');
        const permitido = await requestNotificationPermissions();
        if (!permitido && valor) {
            Alert.alert("Permissão Negada", "Ativa as notificações nas definições do teu telemóvel para receberes avisos do Stash.");
            return;
        }
        setAlertaSemanal(valor);
        await scheduleWeeklyBalanceAlert(valor);
        if (valor) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };
    const [atualizando, setAtualizando] = useState(false);

    useEffect(() => {
        if (currentMember) {
            setMinhaRenda(String(currentMember.renda || 0));
        }
        if (familyData) {
            setEditNomeFamilia(familyData.nome || '');
        }
    }, [currentMember, familyData]);

    const converterEmNumero = (valor) => Number(String(valor).trim().replace(',', '.'));

    const aoAtualizar = () => {
        setAtualizando(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => setAtualizando(false), 1000);
    };

    // 1. GUARDAR RENDA PESSOAL
    const guardarMinhaRenda = async () => {
        if (!familyData || !user) return;
        try {
            const rendaNum = converterEmNumero(minhaRenda);
            if (!Number.isFinite(rendaNum) || rendaNum < 0) {
                Alert.alert("Aviso", "Indica um rendimento válido.");
                return;
            }

            const membrosAtualizados = (familyData.membros || []).map(m => {
                if (m.uid === user.uid) {
                    return { ...m, renda: rendaNum };
                }
                return m;
            });

            await updateDoc(doc(db, 'familias', familyData.id), {
                membros: membrosAtualizados
            });

            setModalRendaVisivel(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            Alert.alert("Erro", "Erro ao guardar o teu rendimento.");
        }
    };

    // 2. DESPESAS FIXAS
    const abrirModalFixas = () => {
        const fixasAtuais = familyData?.despesasFixas || [];
        const copia = fixasAtuais.map(item => ({
            ...item,
            valorString: (item.valor || 0).toString(),
            categoria: item.categoria || 'Casa'
        }));
        setListaFixas(copia);
        setModalFixasVisivel(true);
    };

    const atualizarItemFixa = (index, campo, novoTexto) => {
        const novaLista = [...listaFixas];
        novaLista[index][campo] = novoTexto;
        setListaFixas(novaLista);
    };

    const adicionarItemFixa = () => {
        const novoItem = { id: Date.now().toString(), nome: '', valorString: '', tipo: 'Fixo', categoria: 'Casa' };
        setListaFixas([...listaFixas, novoItem]);
    };

    const removerItemFixa = (index) => {
        const novaLista = [...listaFixas];
        novaLista.splice(index, 1);
        setListaFixas(novaLista);
    };

    const guardarFixas = async () => {
        if (!familyData) return;
        try {
            const listaLimpa = listaFixas.map(item => ({
                id: item.id,
                nome: item.nome || 'Sem Nome',
                tipo: item.tipo || 'Fixo',
                categoria: item.categoria || 'Casa',
                valor: converterEmNumero(item.valorString),
                pago: Boolean(item.pago),
                pagamentos: item.pagamentos || {}
            }));

            if (listaLimpa.some(item => !Number.isFinite(item.valor) || item.valor < 0)) {
                Alert.alert("Aviso", "Cada conta deve ter um valor válido.");
                return;
            }

            await updateDoc(doc(db, 'familias', familyData.id), {
                despesasFixas: listaLimpa
            });

            setModalFixasVisivel(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            Alert.alert("Erro", "Erro ao guardar as despesas fixas.");
        }
    };

    // 3. LIMITES POR CATEGORIA
    const abrirModalLimites = () => {
        const limitesAtuais = familyData?.limitesCategorias || {};
        const rascunho = {};
        CATEGORIAS_DE_GASTO.forEach((cat) => {
            rascunho[cat] = limitesAtuais[cat] ? String(limitesAtuais[cat]) : '';
        });
        setRascunhoLimites(rascunho);
        setModalLimitesVisivel(true);
    };

    const atualizarLimiteCategoria = (cat, texto) => {
        setRascunhoLimites(prev => ({ ...prev, [cat]: texto }));
    };

    const guardarLimites = async () => {
        if (!familyData) return;
        try {
            const limsLimpos = {};
            for (const [cat, valStr] of Object.entries(rascunhoLimites)) {
                if (valStr && valStr.trim() !== '') {
                    const num = converterEmNumero(valStr);
                    if (Number.isFinite(num) && num > 0) {
                        limsLimpos[cat] = num;
                    }
                }
            }

            await updateDoc(doc(db, 'familias', familyData.id), {
                limitesCategorias: limsLimpos
            });

            setModalLimitesVisivel(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            Alert.alert("Erro", "Erro ao guardar limites.");
        }
    };

    // 4. PARTILHAR CÓDIGO DE CONVITE
    const partilharCodigo = async () => {
        if (!familyData?.codigoConvite) return;
        try {
            await Share.share({
                message: `Junta-te ao nosso orçamento familiar no Stash! Abre a aplicação e introduz o código de convite: ${familyData.codigoConvite}`
            });
        } catch (error) {
            console.error("Erro ao partilhar código:", error);
        }
    };

    // 5. ENTRAR NOUTRA FAMÍLIA POR CÓDIGO
    const handleJuntarPorCodigo = async () => {
        if (!codigoInput.trim()) {
            Alert.alert("Aviso", "Introduz um código de convite.");
            return;
        }
        const sucesso = await joinFamilyByCode(codigoInput);
        if (sucesso) {
            setCodigoInput('');
            setModalCodigoVisivel(false);
        }
    };

    // 6. ALTERAR NOME DA FAMÍLIA
    const guardarNomeFamilia = async () => {
        if (!editNomeFamilia.trim()) return;
        await updateFamilyName(editNomeFamilia);
        Alert.alert("Sucesso", "Nome da família atualizado.");
    };

    const MenuItem = ({ icone, titulo, subtitulo, corIcone = colors.textMuted, acao, rightElement }) => (
        <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            activeOpacity={acao ? 0.7 : 1}
            onPress={acao}
        >
            <View style={[styles.iconContainer, { backgroundColor: hexToRgba(corIcone, 0.12) }]}>
                <Ionicons name={icone} size={22} color={corIcone} />
            </View>
            <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, { color: colors.textDark, fontFamily: 'Inter_600SemiBold' }]}>{titulo}</Text>
                {subtitulo && <Text style={[styles.menuSubtitle, { color: colors.textLight, fontFamily: 'Inter_400Regular' }]}>{subtitulo}</Text>}
            </View>
            {rightElement || <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />}
        </TouchableOpacity>
    );

    const totalLimitesConfigurados = Object.keys(familyData?.limitesCategorias || {}).length;
    const totalContasFixas = (familyData?.despesasFixas || []).length;
    const qtdMembros = (familyData?.membros || []).length;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 30) }]}>
                <Text style={[styles.headerTitle, { color: colors.textDark }]}>O Meu Perfil</Text>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={atualizando}
                        onRefresh={aoAtualizar}
                        tintColor={colors.primaryLight}
                    />
                }
            >
                {/* CARTÃO DE PERFIL E FAMÍLIA */}
                <View style={[styles.profileCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.avatarText}>
                            {(userProfile?.nome || user?.displayName || 'EU').slice(0, 2).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={[styles.profileName, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>
                            {userProfile?.nome || user?.displayName || 'Utilizador'}
                        </Text>
                        <Text style={[styles.profileEmail, { color: colors.textLight, fontFamily: 'Inter_400Regular' }]}>
                            {user?.email}
                        </Text>
                        <View style={styles.badgeRow}>
                            <View style={[styles.roleBadge, { backgroundColor: isAdmin ? `${colors.primaryLight}20` : `${colors.success}20` }]}>
                                <Text style={[styles.roleBadgeTexto, { color: isAdmin ? colors.primaryLight : colors.success }]}>
                                    {isAdmin ? '👑 Administrador' : '👤 Membro'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* PAINEL DE GESTÃO DA FAMÍLIA */}
                <Text style={[styles.sectionTitle, { color: colors.textDisabled, fontFamily: 'Inter_700Bold' }]}>
                    Gestão Familiar & Membros
                </Text>
                <View style={[styles.menuGroup, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <MenuItem
                        icone="people-outline"
                        titulo="Membros da Família"
                        subtitulo={`${qtdMembros} membro(s) • Código: ${familyData?.codigoConvite || 'N/A'}`}
                        corIcone={colors.primaryLight}
                        acao={() => setModalFamiliaVisivel(true)}
                    />
                    <MenuItem
                        icone="share-social-outline"
                        titulo="Partilhar Código de Convite"
                        subtitulo={`Código: ${familyData?.codigoConvite || 'N/A'}`}
                        corIcone={colors.success}
                        acao={partilharCodigo}
                    />
                    <MenuItem
                        icone="key-outline"
                        titulo="Juntar a outra Família por Código"
                        subtitulo="Introduzir código de 6 dígitos"
                        corIcone={colors.warning}
                        acao={() => setModalCodigoVisivel(true)}
                    />
                </View>

                {/* DEFINIÇÕES FINANCEIRAS */}
                <Text style={[styles.sectionTitle, { color: colors.textDisabled, fontFamily: 'Inter_700Bold' }]}>
                    Definições Financeiras
                </Text>
                <View style={[styles.menuGroup, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <MenuItem
                        icone="wallet-outline"
                        titulo="O teu Rendimento Mensal"
                        subtitulo={`${minhaRenda} € / mês`}
                        corIcone={colors.success}
                        acao={() => setModalRendaVisivel(true)}
                    />
                    <MenuItem
                        icone="home-outline"
                        titulo="Despesas Mensais"
                        subtitulo={`${totalContasFixas} contas registadas`}
                        corIcone={colors.warning}
                        acao={abrirModalFixas}
                    />
                    <MenuItem
                        icone="pie-chart-outline"
                        titulo="Limites por Categoria"
                        subtitulo={`${totalLimitesConfigurados} limites configurados`}
                        corIcone={colors.primaryLight}
                        acao={abrirModalLimites}
                    />
                </View>

                {/* NOTIFICAÇÕES & LEMBRETES */}
                {/*<Text style={[styles.sectionTitle, { color: colors.textDisabled, fontFamily: 'Inter_700Bold' }]}>*/}
                {/*    Notificações & Lembretes*/}
                {/*</Text>*/}
                {/*<View style={[styles.menuGroup, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>*/}
                {/*    <MenuItem*/}
                {/*        icone="notifications-outline"*/}
                {/*        titulo="Lembrete de Contas (Dia 1)"*/}
                {/*        subtitulo="Aviso para pagar contas no início do mês"*/}
                {/*        corIcone={colors.warning}*/}
                {/*        acao={() => toggleLembreteContas(!lembreteContas)}*/}
                {/*        rightElement={*/}
                {/*            <Switch*/}
                {/*                value={lembreteContas}*/}
                {/*                onValueChange={toggleLembreteContas}*/}
                {/*                trackColor={{ false: '#D1D5DB', true: colors.primaryLight }}*/}
                {/*                thumbColor={lembreteContas ? colors.primary : '#FFFFFF'}*/}
                {/*            />*/}
                {/*        }*/}
                {/*    />*/}
                {/*    <MenuItem*/}
                {/*        icone="trending-up-outline"*/}
                {/*        titulo="Alerta de Saldo Semanal"*/}
                {/*        subtitulo="Resumo do orçamento todas as Segundas-feiras"*/}
                {/*        corIcone={colors.success}*/}
                {/*        acao={() => toggleAlertaSemanal(!alertaSemanal)}*/}
                {/*        rightElement={*/}
                {/*            <Switch*/}
                {/*                value={alertaSemanal}*/}
                {/*                onValueChange={toggleAlertaSemanal}*/}
                {/*                trackColor={{ false: '#D1D5DB', true: colors.primaryLight }}*/}
                {/*                thumbColor={alertaSemanal ? colors.primary : '#FFFFFF'}*/}
                {/*            />*/}
                {/*        }*/}
                {/*    />*/}
                {/*</View>*/}

                {/* APARÊNCIA E CONTA */}
                <Text style={[styles.sectionTitle, { color: colors.textDisabled, fontFamily: 'Inter_700Bold' }]}>
                    Aparência & Sessão
                </Text>
                <View style={[styles.menuGroup, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <MenuItem
                        icone="moon-outline"
                        titulo="Modo Escuro"
                        subtitulo={isDarkMode ? "Ativado" : "Desativado"}
                        corIcone={colors.primaryLight}
                        acao={toggleTheme}
                        rightElement={
                            <Switch
                                value={isDarkMode}
                                onValueChange={toggleTheme}
                                trackColor={{ false: '#D1D5DB', true: colors.primaryLight }}
                                thumbColor={isDarkMode ? colors.primary : '#FFFFFF'}
                            />
                        }
                    />
                    <MenuItem
                        icone="log-out-outline"
                        titulo="Terminar Sessão"
                        subtitulo="Sair da conta no Stash"
                        corIcone={colors.danger}
                        acao={() => {
                            Alert.alert(
                                "Terminar Sessão",
                                "Tens a certeza que desejas sair da tua conta?",
                                [
                                    { text: "Cancelar", style: "cancel" },
                                    { text: "Sair", style: "destructive", onPress: logout }
                                ]
                            );
                        }}
                    />
                </View>
            </ScrollView>

            {/* 1. MODAL DE GESTÃO DE MEMBROS E GRUPO FAMILIAR */}
            <Modal animationType="fade" transparent={true} visible={modalFamiliaVisivel} onRequestClose={() => setModalFamiliaVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent, maxHeight: '85%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>
                                {familyData?.nome || 'Gestão da Família'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalFamiliaVisivel(false)}>
                                <Ionicons name="close" size={28} color={colors.textLight} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Alterar nome da família (Admin) */}
                            {isAdmin && (
                                <View style={styles.boxNomeFamilia}>
                                    <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Nome do Grupo Familiar</Text>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <TextInput
                                            style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, flex: 1, marginBottom: 0 }]}
                                            value={editNomeFamilia}
                                            onChangeText={setEditNomeFamilia}
                                        />
                                        <TouchableOpacity style={[styles.btnPequeno, { backgroundColor: colors.primary }]} onPress={guardarNomeFamilia}>
                                            <Text style={styles.btnPequenoTexto}>Guardar</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* Código de Convite Card */}
                            <View style={[styles.codigoCardBox, { backgroundColor: colors.inputBg }]}>
                                <Text style={[styles.codigoTitle, { color: colors.textMuted }]}>Código de Convite da Família</Text>
                                <Text style={[styles.codigoValor, { color: colors.primaryLight }]}>{familyData?.codigoConvite || '---'}</Text>
                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                                    <TouchableOpacity style={[styles.btnAcaoCodigo, { backgroundColor: colors.primary }]} onPress={partilharCodigo}>
                                        <Ionicons name="share-social" size={16} color="#FFF" style={{ marginRight: 6 }} />
                                        <Text style={styles.btnAcaoCodigoTexto}>Partilhar</Text>
                                    </TouchableOpacity>
                                    {isAdmin && (
                                        <TouchableOpacity style={[styles.btnAcaoCodigo, { backgroundColor: colors.warning }]} onPress={regenerateInviteCode}>
                                            <Ionicons name="refresh" size={16} color="#FFF" style={{ marginRight: 6 }} />
                                            <Text style={styles.btnAcaoCodigoTexto}>Regerar</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {/* Lista de Membros */}
                            <Text style={[styles.subSecaoTitulo, { color: colors.textDark }]}>Membros Registados ({qtdMembros})</Text>
                            {(familyData?.membros || []).map((membro) => {
                                const eProprio = membro.uid === user?.uid;
                                const eAdminMembro = membro.role === 'admin';

                                return (
                                    <View key={membro.uid} style={[styles.linhaMembro, { borderBottomColor: colors.border }]}>
                                        <View style={[styles.miniAvatar, { backgroundColor: colors.primaryLight }]}>
                                            <Text style={styles.miniAvatarText}>{membro.nome.slice(0, 2).toUpperCase()}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.membroNome, { color: colors.textDark }]}>
                                                {membro.nome} {eProprio ? '(Tu)' : ''}
                                            </Text>
                                            <Text style={[styles.membroSub, { color: colors.textLight }]}>
                                                {membro.email} • Renda: {membro.renda || 0}€
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: eAdminMembro ? colors.primaryLight : colors.textLight }}>
                                                {eAdminMembro ? '👑 Admin' : 'Membro'}
                                            </Text>

                                            {/* Ações de Administrador */}
                                            {isAdmin && !eProprio && (
                                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                                    {!eAdminMembro && (
                                                        <TouchableOpacity onPress={() => promoteToAdmin(membro.uid)}>
                                                            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primaryLight} />
                                                        </TouchableOpacity>
                                                    )}
                                                    <TouchableOpacity onPress={() => {
                                                        Alert.alert(
                                                            "Remover Membro",
                                                            `Remover ${membro.nome} da família? Esta pessoa voltará ao modo solo.`,
                                                            [
                                                                { text: "Cancelar", style: "cancel" },
                                                                { text: "Remover", style: "destructive", onPress: () => removeMember(membro.uid) }
                                                            ]
                                                        );
                                                    }}>
                                                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* 2. MODAL DE JUNTAR A UMA FAMÍLIA POR CÓDIGO */}
            <Modal animationType="fade" transparent={true} visible={modalCodigoVisivel} onRequestClose={() => setModalCodigoVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>Juntar a outra Família</Text>
                            <TouchableOpacity onPress={() => setModalCodigoVisivel(false)}>
                                <Ionicons name="close" size={28} color={colors.textLight} />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 14, color: colors.textLight, marginBottom: 15 }}>
                            Introduz o código de convite de 6 dígitos facultado pelo administrador do grupo.
                        </Text>
                        <TextInput
                            style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, textAlign: 'center', fontSize: 22, fontWeight: 'bold', letterSpacing: 4 }]}
                            placeholder="EX: 8X2K9P"
                            placeholderTextColor={colors.textDisabled}
                            autoCapitalize="characters"
                            maxLength={8}
                            value={codigoInput}
                            onChangeText={setCodigoInput}
                        />
                        <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: colors.primary }]} onPress={handleJuntarPorCodigo}>
                            <Text style={styles.btnGuardarTexto}>Juntar ao Grupo</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* 3. MODAL DE EDIÇÃO DE RENDA PESSOAL */}
            <Modal animationType="fade" transparent={true} visible={modalRendaVisivel} onRequestClose={() => setModalRendaVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>O teu Rendimento (€)</Text>
                            <TouchableOpacity onPress={() => setModalRendaVisivel(false)}>
                                <Ionicons name="close" size={28} color={colors.textLight} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, fontSize: 20, textAlign: 'center' }]}
                            keyboardType="decimal-pad"
                            value={minhaRenda}
                            onChangeText={setMinhaRenda}
                        />
                        <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: colors.primary }]} onPress={guardarMinhaRenda}>
                            <Text style={styles.btnGuardarTexto}>Atualizar Valor</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* 4. MODAL DE DESPESAS FIXAS */}
            <Modal animationType="fade" transparent={true} visible={modalFixasVisivel} onRequestClose={() => setModalFixasVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent, maxHeight: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>Despesas Fixas</Text>
                            <TouchableOpacity onPress={() => setModalFixasVisivel(false)}>
                                <Ionicons name="close" size={28} color={colors.textLight} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 15 }}>
                            {listaFixas.map((item, index) => (
                                <View key={item.id} style={[styles.cardContaFixaEdit, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                    <View style={styles.linhaDespesa}>
                                        <TextInput
                                            style={[styles.inputNormal, { backgroundColor: colors.cardBg, color: colors.textDark, flex: 2, marginBottom: 0, marginRight: 10 }]}
                                            placeholder="Nome (ex: Luz)"
                                            placeholderTextColor={colors.textDisabled}
                                            value={item.nome}
                                            onChangeText={(texto) => atualizarItemFixa(index, 'nome', texto)}
                                        />
                                        <TextInput
                                            style={[styles.inputNormal, { backgroundColor: colors.cardBg, color: colors.textDark, flex: 1, marginBottom: 0, textAlign: 'center' }]}
                                            placeholder="0,00 €"
                                            placeholderTextColor={colors.textDisabled}
                                            keyboardType="decimal-pad"
                                            value={item.valorString}
                                            onChangeText={(texto) => atualizarItemFixa(index, 'valorString', texto)}
                                        />
                                        <TouchableOpacity style={styles.btnRemover} onPress={() => removerItemFixa(index)}>
                                            <Ionicons name="trash-outline" size={22} color={colors.danger} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={[styles.pickerContainer, { backgroundColor: colors.cardBg, marginTop: 8, marginBottom: 0 }]}>
                                        <Picker
                                            selectedValue={item.categoria || 'Casa'}
                                            onValueChange={(cat) => atualizarItemFixa(index, 'categoria', cat)}
                                            style={{ color: colors.textDark }}
                                            itemStyle={Platform.OS === 'ios' ? { height: 100, fontSize: 14, color: colors.textDark } : {}}
                                        >
                                            {CATEGORIAS_DE_GASTO.map((cat) => (
                                                <Picker.Item key={cat} label={cat} value={cat} color={colors.textDark} />
                                            ))}
                                        </Picker>
                                    </View>
                                </View>
                            ))}
                            <TouchableOpacity style={[styles.btnAdicionarNova, { borderColor: colors.primaryLight, backgroundColor: `${colors.primaryLight}15` }]} onPress={adicionarItemFixa}>
                                <Ionicons name="add-circle-outline" size={20} color={colors.primaryLight} style={{ marginRight: 5 }} />
                                <Text style={[styles.txtAdicionarNova, { color: colors.primaryLight }]}>Adicionar Conta</Text>
                            </TouchableOpacity>
                        </ScrollView>
                        <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: colors.primary }]} onPress={guardarFixas}>
                            <Text style={styles.btnGuardarTexto}>Guardar Tudo</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* 5. MODAL DE LIMITES DE CATEGORIA */}
            <Modal animationType="fade" transparent={true} visible={modalLimitesVisivel} onRequestClose={() => setModalLimitesVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent, maxHeight: '85%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>Limites por Categoria (€)</Text>
                            <TouchableOpacity onPress={() => setModalLimitesVisivel(false)}>
                                <Ionicons name="close" size={28} color={colors.textLight} />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: 15 }}>
                            Define o teto de gasto mensal para a tua família. Deixa em branco para sem limite.
                        </Text>
                        <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 15 }}>
                            {CATEGORIAS_DE_GASTO.map((categoria) => (
                                <View key={categoria} style={[styles.linhaLimite, { borderBottomColor: colors.border }]}>
                                    <Text style={[styles.labelCategoriaLimite, { color: colors.textDark }]}>{categoria}</Text>
                                    <TextInput
                                        style={[styles.inputLimite, { backgroundColor: colors.inputBg, color: colors.textDark }]}
                                        placeholder="Sem limite"
                                        placeholderTextColor={colors.textDisabled}
                                        keyboardType="decimal-pad"
                                        value={rascunhoLimites[categoria] || ''}
                                        onChangeText={(texto) => atualizarLimiteCategoria(categoria, texto)}
                                    />
                                </View>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: colors.primary }]} onPress={guardarLimites}>
                            <Text style={styles.btnGuardarTexto}>Guardar Limites</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingBottom: 16, alignItems: 'center' },
    headerTitle: { fontSize: 28,  fontFamily: 'Inter_800ExtraBold',},
    content: { padding: 20 },
    profileCard: { padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 25, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 18, fontWeight: 'bold' },
    profileEmail: { fontSize: 13, marginTop: 2 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    roleBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
    roleBadgeTexto: { fontSize: 11, fontWeight: 'bold' },
    grupoNomeTexto: { fontSize: 12, marginLeft: 6 },
    sectionTitle: { fontSize: 12, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 5 },
    menuGroup: { borderRadius: 16, marginBottom: 25, overflow: 'hidden', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
    iconContainer: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    menuTextContainer: { flex: 1 },
    menuTitle: { fontSize: 15, fontWeight: '600' },
    menuSubtitle: { fontSize: 12, marginTop: 2 },

    modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 25, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    inputLabel: { fontSize: 13, fontWeight: 'bold', marginBottom: 6 },
    inputNormal: { padding: 14, borderRadius: 12, fontSize: 15, marginBottom: 15 },
    btnGuardar: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    btnGuardarTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

    boxNomeFamilia: { marginBottom: 20 },
    btnPequeno: { paddingHorizontal: 16, justifyContent: 'center', borderRadius: 12 },
    btnPequenoTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
    codigoCardBox: { padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
    codigoTitle: { fontSize: 12, fontWeight: '600' },
    codigoValor: { fontSize: 28, fontWeight: 'bold', letterSpacing: 4, marginVertical: 6 },
    btnAcaoCodigo: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
    btnAcaoCodigoTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
    subSecaoTitulo: { fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
    linhaMembro: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    miniAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    miniAvatarText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
    membroNome: { fontSize: 14, fontWeight: 'bold' },
    membroSub: { fontSize: 12, marginTop: 2 },

    linhaDespesa: { flexDirection: 'row', alignItems: 'center' },
    cardContaFixaEdit: { padding: 12, borderRadius: 14, marginBottom: 12, borderWidth: 1 },
    pickerContainer: { borderRadius: 12, overflow: 'hidden', paddingHorizontal: Platform.OS === 'android' ? 5 : 0 },
    btnRemover: { padding: 10, marginLeft: 5 },
    btnAdicionarNova: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 12, marginTop: 5, borderStyle: 'dashed', borderWidth: 1 },
    txtAdicionarNova: { fontWeight: 'bold', fontSize: 14 },
    linhaLimite: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
    labelCategoriaLimite: { fontSize: 14, fontWeight: '600', flex: 1 },
    inputLimite: { padding: 10, borderRadius: 10, fontSize: 14, width: 110, textAlign: 'center' }
});
