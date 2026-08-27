import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { collection, addDoc, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/Firebase';
import { chaveDoMes } from '../utils/Month';
import * as Haptics from 'expo-haptics';

export function useExpenses(familyId, mesSelecionado) {
    const [gastos, setGastos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);

    useEffect(() => {
        if (!familyId) {
            setGastos([]);
            setCarregando(false);
            return;
        }

        setCarregando(true);
        const q = query(
            collection(db, 'gastos_variaveis'),
            where('familyId', '==', familyId),
            where('mesReferencia', '==', chaveDoMes(mesSelecionado)),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const itens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGastos(itens);
            setCarregando(false);
        }, (error) => {
            console.error("Erro ao carregar despesas:", error);
            setErro(error);
            setCarregando(false);
        });

        return () => unsubscribe();
    }, [familyId, mesSelecionado]);

    const adicionarGasto = async (gastoData) => {
        try {
            const docRef = await addDoc(collection(db, 'gastos_variaveis'), {
                ...gastoData,
                timestamp: gastoData.timestamp || Date.now()
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return docRef.id;
        } catch (error) {
            console.error("Erro ao adicionar gasto:", error);
            Alert.alert("Erro", "Erro ao gravar. Verifica a ligação.");
            throw error;
        }
    };

    const editarGasto = async (id, dadosAtualizados) => {
        try {
            await updateDoc(doc(db, 'gastos_variaveis', id), dadosAtualizados);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return true;
        } catch (error) {
            console.error("Erro ao editar gasto:", error);
            Alert.alert("Erro", "Erro ao atualizar. Verifica a ligação.");
            throw error;
        }
    };

    const eliminarGasto = async (id) => {
        try {
            await deleteDoc(doc(db, 'gastos_variaveis', id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return true;
        } catch (error) {
            console.error("Erro ao apagar o gasto:", error);
            Alert.alert("Erro", "Erro ao apagar. Verifica a ligação.");
            throw error;
        }
    };

    return {
        gastos,
        carregando,
        erro,
        adicionarGasto,
        editarGasto,
        eliminarGasto
    };
}
