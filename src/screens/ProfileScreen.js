import React, { useState, useEffect} from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from "../services/Firebase"

export default function ProfileScreen() {
    const [rendaEu, setRendaEu] = useState('0');
    const [rendaParceira, setRendaParceira] = useState('0');
    const [modalRendaVisivel, setModalRendaVisivel] = useState(false);

    // Estados para Despesas Fixas
    const [despesasFixasDB, setDespesasFixasDB] = useState([]); // Guarda o que vem do Firebase
    const [listaFixas, setListaFixas] = useState([]); // Rascunho para edição no Modal
    const [modalFixasVisivel, setModalFixasVisivel] = useState(false);

    // 1. O "Radar" das configurações da família
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'familias', 'nossa_casa'), (docSnap) => {
            if (docSnap.exists()) {
                const dados = docSnap.data();
                if (dados.rendas) {
                    setRendaEu(dados.rendas.Eu.toString());
                    setRendaParceira(dados.rendas.Parceira.toString());
                }
                if (dados.despesasFixas) {
                    setDespesasFixasDB(dados.despesasFixas);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // 2. Guardar as novas rendas no Firebase
    const guardarRendas = async () => {
        try {
            // O { merge: true } garante que não apagamos as despesas fixas quando atualizamos a renda
            await setDoc(doc(db, 'familias', 'nossa_casa'), {
                rendas: {
                    Eu: parseFloat(rendaEu.replace(',', '.')) || 0,
                    Parceira: parseFloat(rendaParceira.replace(',', '.')) || 0
                }
            }, { merge: true });

            setModalRendaVisivel(false);
        } catch (error) {
            alert("Erro ao guardar as configurações.");
        }
    };

    // -- FUNÇÕES PARA DESPESAS FIXAS --
    const abrirModalFixas = () => {
        // Copia os dados reais para o "rascunho" para podermos editar à vontade
        // Convertendo os valores para string para o TextInput não se queixar com as vírgulas
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
            // Limpar as strings e transformar de volta em números reais
            const listaLimpa = listaFixas.map(item => ({
                id: item.id,
                nome: item.nome || 'Sem Nome',
                tipo: item.tipo,
                valor: parseFloat(item.valorString.replace(',', '.')) || 0
            }));

            await setDoc(doc(db, 'familias', 'nossa_casa'), {
                despesasFixas: listaLimpa
            }, { merge: true });

            setModalFixasVisivel(false);
        } catch (error) {
            alert("Erro ao guardar as despesas fixas.");
        }
    };

    // Componente visual das linhas do menu
    const MenuItem = ({ icone, titulo, subtitulo, corIcone = '#4B5563', acao }) => (
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={acao}>
            <View style={[styles.iconContainer, { backgroundColor: `${corIcone}15` }]}>
                <Ionicons name={icone} size={22} color={corIcone} />
            </View>
            <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{titulo}</Text>
                {subtitulo && <Text style={styles.menuSubtitle}>{subtitulo}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>O Meu Perfil</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.profileCard}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>EU</Text></View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>Família Costa</Text>
                        <Text style={styles.profileEmail}>Gestão Partilhada</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Gestão Familiar (Firebase)</Text>
                <View style={styles.menuGroup}>
                    <MenuItem
                        icone="wallet-outline"
                        titulo="Rendimentos Mensais"
                        subtitulo={`Total: ${(parseFloat(rendaEu) + parseFloat(rendaParceira)).toFixed(2)} €`}
                        corIcone="#10B981"
                        acao={() => setModalRendaVisivel(true)}
                    />
                    <MenuItem
                        icone="home-outline"
                        titulo="Despesas da Casa (Fixas)"
                        subtitulo={`${despesasFixasDB.length} contas registadas`}
                        corIcone="#F59E0B"
                        acao={abrirModalFixas} // <-- Agora abre a nova janela!
                    />
                </View>
            </ScrollView>

            {/* 1. JANELA DE EDIÇÃO DE RENDIMENTOS */}
            <Modal animationType="fade" transparent={true} visible={modalRendaVisivel} onRequestClose={() => setModalRendaVisivel(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Rendimentos Mensais</Text>
                            <TouchableOpacity onPress={() => setModalRendaVisivel(false)}>
                                <Ionicons name="close" size={28} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>O teu ordenado base (€)</Text>
                        <TextInput style={styles.inputNormal} keyboardType="decimal-pad" value={rendaEu} onChangeText={setRendaEu} />

                        <Text style={styles.inputLabel}>Ordenado da Parceira (€)</Text>
                        <TextInput style={styles.inputNormal} keyboardType="decimal-pad" value={rendaParceira} onChangeText={setRendaParceira} />

                        <TouchableOpacity style={styles.btnGuardar} onPress={guardarRendas}>
                            <Text style={styles.btnGuardarTexto}>Atualizar Valores</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* 2. JANELA DE EDIÇÃO DE DESPESAS FIXAS */}
            <Modal animationType="fade" transparent={true} visible={modalFixasVisivel} onRequestClose={() => setModalFixasVisivel(false)}>
                {/* Substituímos a View simples pelo KeyboardAvoidingView e usamos o estilo centrado (modalFundo) */}
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFundo}>
                    <View style={[styles.modalContent, { maxHeight: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Despesas Fixas</Text>
                            <TouchableOpacity onPress={() => setModalFixasVisivel(false)}>
                                <Ionicons name="close" size={28} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 15 }}>
                            {listaFixas.map((item, index) => (
                                <View key={item.id} style={styles.linhaDespesa}>
                                    <TextInput
                                        style={[styles.inputNormal, { flex: 2, marginBottom: 0, marginRight: 10 }]}
                                        placeholder="Nome (ex: Luz)"
                                        placeholderTextColor="#9CA3AF"
                                        value={item.nome}
                                        onChangeText={(texto) => atualizarItemFixa(index, 'nome', texto)}
                                    />
                                    <TextInput
                                        style={[styles.inputNormal, { flex: 1, marginBottom: 0, textAlign: 'center' }]}
                                        placeholder="0,00"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="decimal-pad"
                                        value={item.valorString}
                                        onChangeText={(texto) => atualizarItemFixa(index, 'valorString', texto)}
                                    />
                                    <TouchableOpacity style={styles.btnRemover} onPress={() => removerItemFixa(index)}>
                                        <Ionicons name="trash-outline" size={22} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            <TouchableOpacity style={styles.btnAdicionarNova} onPress={adicionarItemFixa}>
                                <Ionicons name="add-circle-outline" size={20} color="#3B82F6" style={{ marginRight: 5 }} />
                                <Text style={styles.txtAdicionarNova}>Adicionar Conta</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        <TouchableOpacity style={styles.btnGuardar} onPress={guardarFixas}>
                            <Text style={styles.btnGuardarTexto}>Guardar Tudo</Text>
                        </TouchableOpacity>
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
    profileCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1E3A8A', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    profileEmail: { fontSize: 14, color: '#6B7280', marginTop: 2 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#9CA3AF', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 5 },
    menuGroup: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 25, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    iconContainer: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    menuTextContainer: { flex: 1 },
    menuTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
    menuSubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },

    // Modais
    modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalFundoEscuro: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }, // A janela das contas abre de baixo para cima
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 25, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#4B5563', marginBottom: 8 },
    inputNormal: { backgroundColor: '#F3F4F6', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 20, color: '#1F2937' },
    btnGuardar: { backgroundColor: '#1E3A8A', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    btnGuardarTexto: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },

    // Estilos específicos da lista de contas
    linhaDespesa: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    btnRemover: { padding: 10, marginLeft: 5 },
    btnAdicionarNova: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, backgroundColor: '#EFF6FF', borderRadius: 12, marginTop: 5, borderStyle: 'dashed', borderWidth: 1, borderColor: '#BFDBFE' },
    txtAdicionarNova: { color: '#3B82F6', fontWeight: 'bold', fontSize: 15 }
});