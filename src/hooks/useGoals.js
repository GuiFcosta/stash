import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/Firebase';
import { chaveDoMes } from '../utils/Month';
import * as Haptics from 'expo-haptics';

export function useGoals(familyId) {
    const [objetivos, setObjetivos] = useState([]);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        if (!familyId) {
            setObjetivos([]);
            setCarregando(false);
            return;
        }

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

    const criarObjetivo = async (dados) => {
        try {
            await addDoc(collection(db, 'objetivos'), {
                familyId,
                ...dados
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return true;
        } catch (error) {
            console.error("Erro ao criar objetivo:", error);
            Alert.alert("Erro", "Erro ao criar meta.");
            throw error;
        }
    };

    const editarObjetivo = async (id, dados) => {
        try {
            await updateDoc(doc(db, 'objetivos', id), dados);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return true;
        } catch (error) {
            console.error("Erro ao editar objetivo:", error);
            Alert.alert("Erro", "Erro ao editar.");
            throw error;
        }
    };

    const excluirObjetivo = async (id) => {
        try {
            await deleteDoc(doc(db, 'objetivos', id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return true;
        } catch (error) {
            console.error("Erro ao excluir objetivo:", error);
            Alert.alert("Erro", "Erro ao apagar meta.");
            throw error;
        }
    };

    const movimentarFundo = async (objetivo, valorAcao, tipo, quemNome, quemUid) => {
        try {
            let novoTotalGuardado;
            let valorParaHome;

            if (tipo === 'depositar') {
                novoTotalGuardado = (objetivo.guardado || 0) + valorAcao;
                valorParaHome = valorAcao;
            } else {
                if (valorAcao > objetivo.guardado) {
                    Alert.alert("Aviso", "Não podes retirar mais do que tens guardado!");
                    return false;
                }
                novoTotalGuardado = (objetivo.guardado || 0) - valorAcao;
                valorParaHome = -valorAcao;
            }

            // 1. Atualizar montante do objetivo
            await updateDoc(doc(db, 'objetivos', objetivo.id), { guardado: novoTotalGuardado });

            // 2. Gravar histórico como transação variável
            const dataAtual = new Date();
            const diaStr = String(dataAtual.getDate()).padStart(2, '0');
            const mesStr = String(dataAtual.getMonth() + 1).padStart(2, '0');

            await addDoc(collection(db, 'gastos_variaveis'), {
                familyId,
                loja: tipo === 'depositar' ? `Poupança: ${objetivo.titulo}` : `Resgate: ${objetivo.titulo}`,
                valor: valorParaHome,
                data: `${diaStr}/${mesStr}`,
                quem: quemNome || 'Eu',
                quemUid: quemUid || '',
                categoria: 'Poupança',
                mesReferencia: chaveDoMes(dataAtual),
                timestamp: Date.now()
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            Alert.alert(
                "Sucesso!",
                tipo === 'depositar'
                    ? `Guardaste ${valorAcao}€.`
                    : `Retiraste ${valorAcao}€. O valor voltou ao Saldo Disponível.`
            );

            return true;
        } catch (error) {
            console.error("Erro ao movimentar fundo:", error);
            Alert.alert("Erro", "Erro ao movimentar dinheiro.");
            return false;
        }
    };

    return {
        objetivos,
        carregando,
        criarObjetivo,
        editarObjetivo,
        excluirObjetivo,
        movimentarFundo
    };
}
