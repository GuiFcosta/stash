import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../theme/Colors';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    // Por padrão a aplicação carrega SEMPRE em Light Mode (false), independente do tema do dispositivo
    const [isDarkMode, setIsDarkModeState] = useState(false);

    useEffect(() => {
        const carregarTemaSalvo = async () => {
            try {
                const salvo = await AsyncStorage.getItem('@stash_theme_mode');
                if (salvo !== null) {
                    setIsDarkModeState(salvo === 'dark');
                }
            } catch (e) {
                console.warn('Erro ao carregar tema salvo:', e);
            }
        };
        carregarTemaSalvo();
    }, []);

    const setIsDarkMode = async (valor) => {
        const novoValor = typeof valor === 'function' ? valor(isDarkMode) : valor;
        setIsDarkModeState(novoValor);
        try {
            await AsyncStorage.setItem('@stash_theme_mode', novoValor ? 'dark' : 'light');
        } catch (e) {
            console.warn('Erro ao gravar preferência de tema:', e);
        }
    };

    const toggleTheme = () => {
        setIsDarkMode(prev => !prev);
    };

    const colors = isDarkMode ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{
            isDarkMode,
            setIsDarkMode,
            toggleTheme,
            colors,
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
    }
    return context;
}
