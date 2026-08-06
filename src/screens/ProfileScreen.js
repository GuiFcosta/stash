import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from "../services/Firebase";
import { CATEGORIAS_DE_GASTO } from '../constants/Categories';
import { useTheme } from '../context/ThemeContext';

export default function ProfileScreen() {
    const { colors, isDarkMode, toggleTheme } = useTheme();

    const [rendaEu, setRendaEu] = useState('0');
    const [rendaParceira, setRendaParceira] = useState('0');
    const [modalRendaVisivel, setModalRendaVisivel] = useState(false);

    // Estados para Despesas Fixas
    const [despesasFixasDB, setDespesasFixasDB] = useState([]);
    const [listaFixas, setListaFixas] = useState([]);
    const [modalFixasVisivel, setModalFixasVisivel] = useState(false);

    // Estados para Limites de Orçamento por Categoria
    const [limitesDB, setLimitesDB] = useState({});
    const [rascunhoLimites, setRascunhoLimites] = useState({});
    const [modalLimitesVisivel, setModalLimitesVisivel] = useState(false);

    const converterEmNumero = (valor) => Number(String(valor).trim().replace(',', '.'));

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'familias', 'nossa_casa'), (docSnap) => {
            if (docSnap.exists()) {
                const dados = docSnap.data();
                if (dados.rendas) {
                    setRendaEu(String(dados.rendas.Eu ?? 0));
                    setRendaParceira(String(dados.rendas.Parceira ?? 0));
                }
                if (dados.despesasFixas) {
                    setDespesasFixasDB(dados.despesasFixas);
                }
                if (dados.limitesCategorias) {
                    setLimitesDB(dados.limitesCategorias);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const guardarRendas = async () => {
        try {
            const eu = converterEmNumero(rendaEu);
            const parceira = converterEmNumero(rendaParceira);
            if (!Number.isFinite(eu) || !Number.isFinite(parceira) || eu < 0 || parceira < 0) {
                Alert.alert("Aviso", "Indica rendimentos válidos iguais ou superiores a zero.");
                return;
            }

            await setDoc(doc(db, 'familias', 'nossa_casa'), {
                rendas: {
                    Eu: eu,
                    Parceira: parceira
                }
            }, { merge: true });

            setModalRendaVisivel(false);
        } catch (error) {
            Alert.alert("Erro", "Erro ao guardar as configurações.");
        }
    };

    const abrirModalFixas = () => {
        const copia = despesasFixasDB.map(item => ({ ...item, valorString: item.valor.toString() }));
        setListaFixas(copia);
        setModalFixasVisivel(true);
    };

    const atualizarItemFixa = (index, campo, novoTexto) => {
        const novaLista = [...listaFixas];
        novaLista[index][campo] = novoTexto;
        setListaFixas(novaLista);
    };

    const adicionarItemFixa = () => {
        const novoItem = { id: Date.now().toString(), nome: '', valorString: '', tipo: 'Fixo' };
        setListaFixas([...listaFixas, novoItem]);
    };

    const removerItemFixa = (index) => {
        const novaLista = [...listaFixas];
        novaLista.splice(index, 1);
        setListaFixas(novaLista);
    };

    const guardarFixas = async () => {
        try {
            const listaLimpa = listaFixas.map(item => ({
                id: item.id,
                nome: item.nome || 'Sem Nome',
                tipo: item.tipo,
                valor: converterEmNumero(item.valorString),
                pago: Boolean(item.pago)
            }));

            if (listaLimpa.some(item => !Number.isFinite(item.valor) || item.valor < 0)) {
                Alert.alert("Aviso", "Cada despesa deve ter um valor válido igual ou superior a zero.");
                return;
            }

            await setDoc(doc(db, 'familias', 'nossa_casa'), {
                despesasFixas: listaLimpa
            }, { merge: true });

            setModalFixasVisivel(false);
        } catch (error) {
            Alert.alert("Erro", "Erro ao guardar as despesas fixas.");
        }
    };

    const abrirModalLimites = () => {
        const rascunho = {};
        CATEGORIAS_DE_GASTO.forEach((cat) => {
            rascunho[cat] = limitesDB[cat] ? String(limitesDB[cat]) : '';
        });
        setRascunhoLimites(rascunho);
        setModalLimitesVisivel(true);
    };

    const atualizarLimiteCategoria = (cat, texto) => {
        setRascunhoLimites(prev => ({ ...prev, [cat]: texto }));
    };

    const guardarLimites = async () => {
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

            await setDoc(doc(db, 'familias', 'nossa_casa'), {
                limitesCategorias: limsLimpos
            }, { merge: true });

            setModalLimitesVisivel(false);
        } catch (error) {
            Alert.alert("Erro", "Erro ao guardar limites por categoria.");
        }
    };

    const MenuItem = ({ icone, titulo, subtitulo, corIcone = colors.textMuted, acao, rightElement }) => (
        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} activeOpacity={acao ? 0.7 : 1} onPress={acao}>
            <View style={[styles.iconContainer, { backgroundColor: `${corIcone}18` }]}>
                <Ionicons name={icone} size={22} color={corIcone} />
            </View>
            <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, { color: colors.textDark }]}>{titulo}</Text>
                {subtitulo && <Text style={[styles.menuSubtitle, { color: colors.textLight }]}>{subtitulo}</Text>}
            </View>
            {rightElement || <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />}
        </TouchableOpacity>
    );

    const totalLimitesConfigurados = Object.keys(limitesDB).length;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <Text style={[styles.headerTitle, { color: colors.textDark }]}>O Meu Perfil</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.profileCard, { backgroundColor: colors.cardBg }]}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={styles.avatarText}>EU</Text></View>
                    <View style={styles.profileInfo}>
                        <Text style={[styles.profileName, { color: colors.textDark }]}>Família Costa</Text>
                        <Text style={[styles.profileEmail, { color: colors.textLight }]}>Gestão Partilhada</Text>
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.textDisabled }]}>Gestão Familiar (Firebase)</Text>
                <View style={[styles.menuGroup, { backgroundColor: colors.cardBg }]}>
                    <MenuItem
                        icone="wallet-outline"
                        titulo="Rendimentos Mensais"
                        subtitulo={`Total: ${(parseFloat(rendaEu) + parseFloat(rendaParceira)).toFixed(2)} €`}
                        corIcone={colors.success}
                        acao={() => setModalRendaVisivel(true)}
                    />
                    <MenuItem
                        icone="home-outline"
                        titulo="Despesas da Casa (Fixas)"
                        subtitulo={`${despesasFixasDB.length} contas registadas`}
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

                <Text style={[styles.sectionTitle, { color: colors.textDisabled }]}>Aparência e Preferências</Text>
                <View style={[styles.menuGroup, { backgroundColor: colors.cardBg }]}>
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
                </View>
            </ScrollView>

            {/* 1. JANELA DE EDIÇÃO DE RENDIMENTOS */}
            <Modal animationType="fade" transparent={true} visible={modalRendaVisivel} onRequestClose={() => setModalRendaVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textDark }]}>Rendimentos Mensais</Text>
                            <TouchableOpacity onPress={() => setModalRendaVisivel(false)}>
                                <Ionicons name="close" size={28} color={colors.textLight} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>O teu ordenado base (€)</Text>
                        <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark }]} keyboardType="decimal-pad" value={rendaEu} onChangeText={setRendaEu} />

                        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Ordenado da Parceira (€)</Text>
                        <TextInput style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark }]} keyboardType="decimal-pad" value={rendaParceira} onChangeText={setRendaParceira} />

                        <TouchableOpacity style={[styles.btnGuardar, { backgroundColor: colors.primary }]} onPress={guardarRendas}>
                            <Text style={styles.btnGuardarTexto}>Atualizar Valores</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* 2. JANELA DE EDIÇÃO DE DESPESAS FIXAS */}
            <Modal animationType="fade" transparent={true} visible={modalFixasVisivel} onRequestClose={() => setModalFixasVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent, maxHeight: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textDark }]}>Despesas Fixas</Text>
                            <TouchableOpacity onPress={() => setModalFixasVisivel(false)}>
                                <Ionicons name="close" size={28} color={colors.textLight} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 15 }}>
                            {listaFixas.map((item, index) => (
                                <View key={item.id} style={styles.linhaDespesa}>
                                    <TextInput
                                        style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, flex: 2, marginBottom: 0, marginRight: 10 }]}
                                        placeholder="Nome (ex: Luz)"
                                        placeholderTextColor={colors.textDisabled}
                                        value={item.nome}
                                        onChangeText={(texto) => atualizarItemFixa(index, 'nome', texto)}
                                    />
                                    <TextInput
                                        style={[styles.inputNormal, { backgroundColor: colors.inputBg, color: colors.textDark, flex: 1, marginBottom: 0, textAlign: 'center' }]}
                                        placeholder="0,00"
                                        placeholderTextColor={colors.textDisabled}
                                        keyboardType="decimal-pad"
                                        value={item.valorString}
                                        onChangeText={(texto) => atualizarItemFixa(index, 'valorString', texto)}
                                    />
                                    <TouchableOpacity style={styles.btnRemover} onPress={() => removerItemFixa(index)}>
                                        <Ionicons name="trash-outline" size={22} color={colors.danger} />
                                    </TouchableOpacity>
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

            {/* 3. JANELA DE EDIÇÃO DE LIMITES POR CATEGORIA */}
            <Modal animationType="fade" transparent={true} visible={modalLimitesVisivel} onRequestClose={() => setModalLimitesVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalContent, maxHeight: '85%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textDark }]}>Limites por Categoria (€)</Text>
                            <TouchableOpacity onPress={() => setModalLimitesVisivel(false)}>
                                <Ionicons name="close" size={28} color={colors.textLight} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: 15 }}>
                            Define o teto de gasto mensal para cada área. Deixa em branco para sem limite.
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
    header: { padding: 30, paddingTop: 60, alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: 'bold' },
    content: { padding: 20 },
    profileCard: { padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    avatar: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 18, fontWeight: 'bold' },
    profileEmail: { fontSize: 14, marginTop: 2 },
    sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 5 },
    menuGroup: { borderRadius: 16, marginBottom: 25, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
    iconContainer: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    menuTextContainer: { flex: 1 },
    menuTitle: { fontSize: 16, fontWeight: '600' },
    menuSubtitle: { fontSize: 13, marginTop: 2 },

    // Modais
    modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 25, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    inputLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
    inputNormal: { padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 20 },
    btnGuardar: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    btnGuardarTexto: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },

    // Estilos da lista de contas
    linhaDespesa: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    btnRemover: { padding: 10, marginLeft: 5 },
    btnAdicionarNova: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 12, marginTop: 5, borderStyle: 'dashed', borderWidth: 1 },
    txtAdicionarNova: { fontWeight: 'bold', fontSize: 15 },

    // Estilos da lista de limites
    linhaLimite: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
    labelCategoriaLimite: { fontSize: 15, fontWeight: '600', flex: 1 },
    inputLimite: { padding: 10, borderRadius: 10, fontSize: 15, width: 110, textAlign: 'center' }
});
