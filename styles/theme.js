// Тема в стиле Solana
const theme = {
    colors: {
        primary: '#9945FF',          // Фиолетовый Solana
        secondary: '#14F195',        // Зеленый Solana
        accent: '#00C2FF',          // Голубой Solana
        background: '#1C1C1C',      // Темный фон
        backgroundLight: '#2C2C2C', // Светлый темный фон
        text: '#FFFFFF',            // Белый текст
        textSecondary: '#9945FF',   // Фиолетовый текст
        border: '#3C3C3C',         // Цвет границ
    },
    
    gradients: {
        primary: 'linear-gradient(45deg, #9945FF 0%, #14F195 100%)',
        secondary: 'linear-gradient(45deg, #14F195 0%, #00C2FF 100%)',
    },

    spacing: {
        small: '8px',
        medium: '16px',
        large: '24px',
    },

    borderRadius: {
        small: '4px',
        medium: '8px',
        large: '12px',
    },

    typography: {
        fontFamily: 'Inter, sans-serif',
        sizes: {
            small: '12px',
            medium: '14px',
            large: '16px',
            xlarge: '20px',
        },
    },

    shadows: {
        small: '0 2px 4px rgba(0, 0, 0, 0.1)',
        medium: '0 4px 8px rgba(0, 0, 0, 0.1)',
        large: '0 8px 16px rgba(0, 0, 0, 0.1)',
    },
};

module.exports = theme;
