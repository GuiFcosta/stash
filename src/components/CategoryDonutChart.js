import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const CORES = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#64748B'];
const RAIO = 50;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

export default function CategoryDonutChart({ dados }) {
    const total = dados.reduce((soma, item) => soma + item.valor, 0);

    if (total <= 0) {
        return <Text style={styles.semDados}>Ainda não existem gastos para analisar neste mês.</Text>;
    }

    let percentagemAcumulada = 0;

    return (
        <View>
            <View style={styles.graficoContainer}>
                <Svg width={150} height={150} viewBox="0 0 120 120" accessibilityLabel="Distribuição de gastos por categoria">
                    <Circle cx="60" cy="60" r={RAIO} stroke="#E5E7EB" strokeWidth="18" fill="none" />
                    {dados.map((item, index) => {
                        const percentagem = item.valor / total;
                        const comprimento = percentagem * CIRCUNFERENCIA;
                        const deslocamento = -percentagemAcumulada * CIRCUNFERENCIA;
                        percentagemAcumulada += percentagem;

                        return (
                            <Circle
                                key={item.categoria}
                                cx="60"
                                cy="60"
                                r={RAIO}
                                stroke={CORES[index % CORES.length]}
                                strokeWidth="18"
                                strokeDasharray={`${comprimento} ${CIRCUNFERENCIA}`}
                                strokeDashoffset={deslocamento}
                                strokeLinecap="butt"
                                fill="none"
                                rotation="-90"
                                origin="60, 60"
                            />
                        );
                    })}
                </Svg>
                <View style={styles.centroGrafico} pointerEvents="none">
                    <Text style={styles.total}>{total.toFixed(0)}€</Text>
                    <Text style={styles.totalLabel}>gasto</Text>
                </View>
            </View>

            <View style={styles.legenda}>
                {dados.map((item, index) => {
                    const percentagem = (item.valor / total) * 100;
                    return (
                        <View key={item.categoria} style={styles.linhaLegenda}>
                            <View style={[styles.corLegenda, { backgroundColor: CORES[index % CORES.length] }]} />
                            <Text style={styles.nomeCategoria}>{item.categoria}</Text>
                            <Text style={styles.valorCategoria}>{percentagem.toFixed(0)}% · {item.valor.toFixed(2)}€</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    graficoContainer: { width: 150, height: 150, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
    centroGrafico: { position: 'absolute', alignItems: 'center' },
    total: { fontSize: 20, fontWeight: '700', color: '#111827' },
    totalLabel: { fontSize: 12, color: '#6B7280' },
    legenda: { gap: 10 },
    linhaLegenda: { flexDirection: 'row', alignItems: 'center' },
    corLegenda: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    nomeCategoria: { flex: 1, fontSize: 14, color: '#374151' },
    valorCategoria: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
    semDados: { color: '#6B7280', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
});
