import React, { useState, useEffect } from 'react';
import { Text, View, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, Switch, RefreshControl, Share, Image} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from "../services/Firebase";
import { CATEGORIAS_DE_GASTO } from '../constants/Categories';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { hexToRgba } from '../utils/colors';
import { styles } from './styles/ProfileScreenStyles';
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
        demoteFromAdmin,
        removeMember,
        updateUserProfile
    } = useAuth();

    // Editar Perfil (Nome e Foto)
    const [modalPerfilVisivel, setModalPerfilVisivel] = useState(false);
    const [nomeInput, setNomeInput] = useState('');
    const [fotoInput, setFotoInput] = useState('');

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
    const [categoriaFixaSelecionada, setCategoriaFixaSelecionada] = useState(CATEGORIAS_DE_GASTO[0] || 'Casa');

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
            id: item.id || Date.now().toString() + Math.random(),
            valorString: (item.valor !== undefined && item.valor !== null ? item.valor : 0).toString(),
            categoria: item.categoria || 'Casa',
            diaVencimento: (item.diaVencimento || '').toString(),
        }));
        setListaFixas(copia);
        setCategoriaFixaSelecionada(CATEGORIAS_DE_GASTO[0] || 'Casa');
        setModalFixasVisivel(true);
    };

    const atualizarItemFixa = (id, campo, novoTexto) => {
        const novaLista = listaFixas.map(item => {
            if (item.id === id) {
                return { ...item, [campo]: novoTexto };
            }
            return item;
        });
        setListaFixas(novaLista);
    };

    const adicionarItemFixa = (cat = categoriaFixaSelecionada) => {
        const novoItem = {
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            nome: '',
            valorString: '',
            tipo: 'Fixo',
            categoria: cat || 'Casa',
            diaVencimento: '',
        };
        setListaFixas([...listaFixas, novoItem]);
    };

    const removerItemFixa = (id) => {
        setListaFixas(listaFixas.filter(item => item.id !== id));
    };

    const guardarFixas = async () => {
        if (!familyData) return;
        try {
            const listaLimpa = listaFixas
                .filter(item => (item.nome && item.nome.trim() !== '') || (item.valorString && item.valorString.trim() !== ''))
                .map(item => {
                    const diaNum = parseInt(item.diaVencimento, 10);
                    return {
                        id: String(item.id),
                        nome: item.nome?.trim() || 'Sem Nome',
                        tipo: item.tipo || 'Fixo',
                        categoria: item.categoria || 'Casa',
                        valor: converterEmNumero(item.valorString) || 0,
                        diaVencimento: (!isNaN(diaNum) && diaNum >= 1 && diaNum <= 31) ? diaNum : (item.diaVencimento?.trim() || null),
                        pago: Boolean(item.pago),
                        pagamentos: item.pagamentos || {}
                    };
                });

            if (listaLimpa.some(item => !Number.isFinite(item.valor) || item.valor < 0)) {
                Alert.alert("Aviso", "Cada conta deve ter um valor numérico válido.");
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

    // 7. EDITAR PERFIL (NOME E FOTO)
    const abrirModalPerfil = () => {
        setNomeInput(userProfile?.nome || user?.displayName || '');
        setFotoInput(userProfile?.fotoUrl || user?.photoURL || '');
        setModalPerfilVisivel(true);
    };

    const guardarPerfil = async () => {
        if (!nomeInput.trim()) {
            Alert.alert("Aviso", "O nome de utilizador não pode estar vazio.");
            return;
        }
        const sucesso = await updateUserProfile({
            nome: nomeInput.trim(),
            fotoUrl: fotoInput.trim()
        });
        if (sucesso) {
            setModalPerfilVisivel(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
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
            <View style={[styles.header, { paddingTop: Math.max(insets.top + 4, 12) }]}>
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
                    <TouchableOpacity activeOpacity={0.8} onPress={abrirModalPerfil} style={{ position: 'relative' }}>
                        {userProfile?.fotoUrl && (userProfile.fotoUrl.startsWith('http://') || userProfile.fotoUrl.startsWith('https://')) ? (
                            <Image source={{ uri: userProfile.fotoUrl }} style={styles.avatarImage} />
                        ) : userProfile?.fotoUrl && userProfile.fotoUrl.length <= 4 ? (
                            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                                <Text style={{ fontSize: 26 }}>{userProfile.fotoUrl}</Text>
                            </View>
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                                <Text style={styles.avatarText}>
                                    {(userProfile?.nome || user?.displayName || 'EU').slice(0, 2).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <View style={[styles.btnEditarAvatar, { backgroundColor: colors.primaryLight }]}>
                            <Ionicons name="camera" size={11} color="#FFF" />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.profileInfo}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={[styles.profileName, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>
                                {userProfile?.nome || user?.displayName || 'Utilizador'}
                            </Text>
                            <TouchableOpacity onPress={abrirModalPerfil} style={{ padding: 4 }}>
                                <Ionicons name="create-outline" size={20} color={colors.primaryLight} />
                            </TouchableOpacity>
                        </View>
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
                    Perfil, Aparência & Sessão
                </Text>
                <View style={[styles.menuGroup, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <MenuItem
                        icone="person-outline"
                        titulo="Editar o meu Perfil"
                        subtitulo="Alterar nome e foto de perfil"
                        corIcone={colors.primaryLight}
                        acao={abrirModalPerfil}
                    />
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
                                const foto = membro.fotoUrl || (eProprio ? userProfile?.fotoUrl : null);

                                return (
                                    <View key={membro.uid} style={[styles.linhaMembro, { borderBottomColor: colors.border }]}>
                                        {foto && (foto.startsWith('http://') || foto.startsWith('https://')) ? (
                                            <Image source={{ uri: foto }} style={styles.miniAvatar} />
                                        ) : foto && foto.length <= 4 ? (
                                            <View style={[styles.miniAvatar, { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' }]}>
                                                <Text style={{ fontSize: 18 }}>{foto}</Text>
                                            </View>
                                        ) : (
                                            <View style={[styles.miniAvatar, { backgroundColor: colors.primaryLight }]}>
                                                <Text style={styles.miniAvatarText}>{(membro.nome || 'MB').slice(0, 2).toUpperCase()}</Text>
                                            </View>
                                        )}
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
                                                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                                    {!eAdminMembro ? (
                                                        <TouchableOpacity
                                                            onPress={() => promoteToAdmin(membro.uid)}
                                                            accessibilityLabel={`Promover ${membro.nome} a admin`}
                                                        >
                                                            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primaryLight} />
                                                        </TouchableOpacity>
                                                    ) : (
                                                        <TouchableOpacity
                                                            onPress={() => {
                                                                Alert.alert(
                                                                    "Remover Cargo de Admin",
                                                                    `Remover privilégios de administrador de ${membro.nome}?`,
                                                                    [
                                                                        { text: "Cancelar", style: "cancel" },
                                                                        { text: "Remover Admin", style: "destructive", onPress: () => demoteFromAdmin(membro.uid) }
                                                                    ]
                                                                );
                                                            }}
                                                            accessibilityLabel={`Remover admin de ${membro.nome}`}
                                                        >
                                                            <Ionicons name="shield-outline" size={18} color={colors.warning} />
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

            {/* 4. MODAL DE DESPESAS FIXAS DIVIDIDAS POR CATEGORIA */}
            <Modal animationType="fade" transparent={true} visible={modalFixasVisivel} onRequestClose={() => setModalFixasVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent, maxHeight: '88%' }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>Despesas Mensais</Text>
                                <Text style={{ fontSize: 12, color: colors.textLight, fontFamily: 'Inter_400Regular' }}>
                                    Total: {listaFixas.reduce((acc, i) => acc + (converterEmNumero(i.valorString) || 0), 0).toFixed(2)} € / mês
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setModalFixasVisivel(false)}>
                                <Ionicons name="close" size={28} color={colors.textLight} />
                            </TouchableOpacity>
                        </View>

                        {/* SELETOR DE CATEGORIAS (CHIPS) */}
                        <View style={{ marginBottom: 12 }}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                                {CATEGORIAS_DE_GASTO.map((cat) => {
                                    const countNaCategoria = listaFixas.filter(i => (i.categoria || 'Casa') === cat).length;
                                    const selecionada = categoriaFixaSelecionada === cat;
                                    return (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[
                                                styles.chipCategoriaFixa,
                                                { backgroundColor: colors.inputBg, borderColor: colors.border },
                                                selecionada && { backgroundColor: hexToRgba(colors.primaryLight, 0.18), borderColor: colors.primaryLight }
                                            ]}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setCategoriaFixaSelecionada(cat);
                                            }}
                                        >
                                            <Text style={[
                                                styles.chipCategoriaFixaTexto,
                                                { color: colors.textMuted, fontFamily: 'Inter_600SemiBold' },
                                                selecionada && { color: colors.primaryLight, fontWeight: 'bold' }
                                            ]}>
                                                {cat} {countNaCategoria > 0 ? `(${countNaCategoria})` : ''}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* LISTAGEM DE DESPESAS DA CATEGORIA SELECIONADA */}
                        <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 15 }}>
                            {(() => {
                                const despesasDaCategoria = listaFixas.filter(i => (i.categoria || 'Casa') === categoriaFixaSelecionada);
                                if (despesasDaCategoria.length === 0) {
                                    return (
                                        <View style={{ alignItems: 'center', paddingVertical: 25, gap: 8 }}>
                                            <Ionicons name="receipt-outline" size={36} color={colors.textDisabled} />
                                            <Text style={{ color: colors.textLight, fontSize: 13, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>
                                                Nenhuma conta configurada em {categoriaFixaSelecionada}.
                                            </Text>
                                        </View>
                                    );
                                }

                                return despesasDaCategoria.map((item) => (
                                    <View key={item.id} style={[styles.cardContaFixaEdit, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                        <View style={styles.linhaDespesa}>
                                            <View style={{ flex: 2, marginRight: 8 }}>
                                                <Text style={[styles.microLabel, { color: colors.textMuted }]}>Nome</Text>
                                                <TextInput
                                                    style={[styles.inputNormal, { backgroundColor: colors.cardBg, color: colors.textDark, marginBottom: 0, fontSize: 14 }]}
                                                    placeholder="Ex: Eletricidade"
                                                    placeholderTextColor={colors.textDisabled}
                                                    value={item.nome}
                                                    onChangeText={(texto) => atualizarItemFixa(item.id, 'nome', texto)}
                                                />
                                            </View>
                                            <View style={{ flex: 1.2, marginRight: 8 }}>
                                                <Text style={[styles.microLabel, { color: colors.textMuted }]}>Valor (€)</Text>
                                                <TextInput
                                                    style={[styles.inputNormal, { backgroundColor: colors.cardBg, color: colors.textDark, marginBottom: 0, textAlign: 'center', fontSize: 14 }]}
                                                    placeholder="0.00"
                                                    placeholderTextColor={colors.textDisabled}
                                                    keyboardType="decimal-pad"
                                                    value={item.valorString}
                                                    onChangeText={(texto) => atualizarItemFixa(item.id, 'valorString', texto)}
                                                />
                                            </View>
                                            <View style={{ width: 55, marginRight: 4 }}>
                                                <Text style={[styles.microLabel, { color: colors.textMuted }]}>Dia</Text>
                                                <TextInput
                                                    style={[styles.inputNormal, { backgroundColor: colors.cardBg, color: colors.textDark, marginBottom: 0, textAlign: 'center', fontSize: 14 }]}
                                                    placeholder="Dia"
                                                    placeholderTextColor={colors.textDisabled}
                                                    keyboardType="number-pad"
                                                    maxLength={2}
                                                    value={item.diaVencimento?.toString() || ''}
                                                    onChangeText={(texto) => atualizarItemFixa(item.id, 'diaVencimento', texto)}
                                                />
                                            </View>
                                            <TouchableOpacity style={[styles.btnRemover, { marginTop: 16 }]} onPress={() => removerItemFixa(item.id)}>
                                                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ));
                            })()}

                            <TouchableOpacity
                                style={[styles.btnAdicionarNova, { borderColor: colors.primaryLight, backgroundColor: hexToRgba(colors.primaryLight, 0.1) }]}
                                onPress={() => adicionarItemFixa(categoriaFixaSelecionada)}
                            >
                                <Ionicons name="add-circle-outline" size={20} color={colors.primaryLight} style={{ marginRight: 6 }} />
                                <Text style={[styles.txtAdicionarNova, { color: colors.primaryLight, fontFamily: 'Inter_700Bold' }]}>
                                    Adicionar Conta em {categoriaFixaSelecionada}
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>

                        <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: colors.primary }]} onPress={guardarFixas}>
                            <Text style={styles.btnGuardarTexto}>Guardar Despesas</Text>
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

            {/* 6. MODAL DE EDIÇÃO DE PERFIL */}
            <Modal animationType="fade" transparent={true} visible={modalPerfilVisivel} onRequestClose={() => setModalPerfilVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent, maxHeight: '85%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textDark, fontFamily: 'Inter_700Bold' }]}>Editar Perfil</Text>
                            <TouchableOpacity onPress={() => setModalPerfilVisivel(false)}>
                                <Ionicons name="close" size={28} color={colors.textLight} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Preview do Avatar */}
                            <View style={{ alignItems: 'center', marginVertical: 15 }}>
                                {fotoInput && (fotoInput.startsWith('http://') || fotoInput.startsWith('https://')) ? (
                                    <Image source={{ uri: fotoInput }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                                ) : fotoInput && fotoInput.length <= 4 ? (
                                    <View style={[styles.avatar, { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, marginRight: 0 }]}>
                                        <Text style={{ fontSize: 36 }}>{fotoInput}</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.avatar, { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, marginRight: 0 }]}>
                                        <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: 'bold' }}>
                                            {(nomeInput || 'EU').slice(0, 2).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Nome de Utilizador</Text>
                            <TextInput
                                style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, fontFamily: 'Inter_600SemiBold' }]}
                                placeholder="O teu nome"
                                placeholderTextColor={colors.textDisabled}
                                value={nomeInput}
                                onChangeText={setNomeInput}
                            />

                            <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 5 }]}>Escolher Avatar Pré-definido</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15, justifyContent: 'center' }}>
                                {['👤', '🦊', '🦁', '🚀', '💎', '⚽', '🎨', '🎧', '🌟', '👑', '🐱', '🐶'].map((emoji) => (
                                    <TouchableOpacity
                                        key={emoji}
                                        style={[
                                            styles.avatarOption,
                                            { backgroundColor: colors.inputBg, borderColor: fotoInput === emoji ? colors.primaryLight : 'transparent' }
                                        ]}
                                        onPress={() => setFotoInput(emoji)}
                                    >
                                        <Text style={{ fontSize: 24 }}>{emoji}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Ou URL de Foto (opcional)</Text>
                            <TextInput
                                style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, fontSize: 13 }]}
                                placeholder="https://exemplo.com/foto.jpg"
                                placeholderTextColor={colors.textDisabled}
                                autoCapitalize="none"
                                value={fotoInput.startsWith('http') ? fotoInput : ''}
                                onChangeText={setFotoInput}
                            />
                        </ScrollView>

                        <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: colors.primary }]} onPress={guardarPerfil}>
                            <Text style={styles.btnGuardarTexto}>Guardar Perfil</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </SafeAreaView>
    );
}