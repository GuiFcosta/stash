import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from '../theme/Colors';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const systemScheme = useColorScheme();
    const [modoManual, setModoManual] = useState(null); // null = seguir sistema

    const isDarkMode = modoManual !== null ? modoManual : systemScheme === 'dark';

    const toggleTheme = () => {
        setModoManual(prev => {
            if (prev === null) return !isDarkMode;
            return !prev;
        });
    };

    const colors = isDarkMode ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{
            isDarkMode,
            setIsDarkMode: setModoManual,
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
