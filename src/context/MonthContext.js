import React, { createContext, useState, useContext } from 'react';
import { inicioDoMes, chaveDoMes } from '../utils/Month';

const MonthContext = createContext();

export function MonthProvider({ children }) {
    const [mesSelecionado, setMesSelecionado] = useState(() => inicioDoMes(new Date()));
    const [mesAnteriorDisponivel, setMesAnteriorDisponivel] = useState(null);

    return (
        <MonthContext.Provider value={{
            mesSelecionado,
            setMesSelecionado,
            mesAnteriorDisponivel,
            setMesAnteriorDisponivel,
            chaveMesSelecionado: chaveDoMes(mesSelecionado),
        }}>
            {children}
        </MonthContext.Provider>
    );
}

export function useMonth() {
    const context = useContext(MonthContext);
    if (!context) {
        throw new Error('useMonth deve ser usado dentro de um MonthProvider');
    }
    return context;
}
