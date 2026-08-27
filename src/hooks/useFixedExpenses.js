import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/Firebase';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

export function useFixedExpenses(familyId, despesasEssenciais) {
    const alternarPagamentoFixo = async (id, estadoAtual, chaveMesSelecionado, eMesAtual, quemNome, quemUid) => {
        if (!familyId) return false;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const novoEstado = !estadoAtual;
            const nomeQuemPagou = quemNome || 'Eu';
            const uidQuemPagou = quemUid || '';

            const novaLista = (despesasEssenciais || []).map(item => {
                if (item.id !== id) return item;

                const pagamentos = { ...(item.pagamentos || {}) };

                if (novoEstado) {
                    pagamentos[chaveMesSelecionado] = {
                        pago: true,
                        quem: nomeQuemPagou,
                        quemUid: uidQuemPagou,
                        timestamp: Date.now()
                    };
                } else {
                    delete pagamentos[chaveMesSelecionado];
                }

                return {
                    ...item,
                    pagamentos,
                    ...(eMesAtual ? { pago: novoEstado } : {}),
                };
            });

            await updateDoc(doc(db, 'familias', familyId), {
                despesasFixas: novaLista
            });

            return true;
        } catch (error) {
            console.error("Erro ao alternar pagamento fixo:", error);
            Alert.alert("Erro", "Erro ao atualizar o estado da conta.");
            return false;
        }
    };

    return {
        alternarPagamentoFixo
    };
}
