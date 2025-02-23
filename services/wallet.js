const { PublicKey } = require('@solana/web3.js');

class WalletService {
    constructor() {
        this.provider = null;
        this.publicKey = null;
    }

    // Проверка наличия Phantom
    isPhantomInstalled() {
        const provider = this.getProvider();
        return provider && provider.isPhantom;
    }

    // Получение провайдера Phantom
    getProvider() {
        if ('solana' in window) {
            const provider = window.solana;
            if (provider.isPhantom) {
                return provider;
            }
        }
        return null;
    }

    // Подключение к кошельку
    async connect() {
        try {
            const provider = this.getProvider();
            if (!provider) {
                throw new Error('Phantom не установлен!');
            }

            const response = await provider.connect();
            this.provider = provider;
            this.publicKey = new PublicKey(response.publicKey.toString());
            
            return {
                publicKey: this.publicKey,
                provider: this.provider
            };
        } catch (error) {
            console.error('Ошибка подключения к Phantom:', error);
            throw error;
        }
    }

    // Отключение от кошелька
    async disconnect() {
        try {
            if (this.provider) {
                await this.provider.disconnect();
                this.provider = null;
                this.publicKey = null;
            }
        } catch (error) {
            console.error('Ошибка отключения от Phantom:', error);
            throw error;
        }
    }

    // Подпись сообщения
    async signMessage(message) {
        try {
            if (!this.provider) {
                throw new Error('Кошелек не подключен!');
            }

            const encodedMessage = new TextEncoder().encode(message);
            const signedMessage = await this.provider.signMessage(encodedMessage, 'utf8');
            
            return signedMessage;
        } catch (error) {
            console.error('Ошибка подписи сообщения:', error);
            throw error;
        }
    }

    // Отправка транзакции
    async sendTransaction(transaction) {
        try {
            if (!this.provider) {
                throw new Error('Кошелек не подключен!');
            }

            const signature = await this.provider.signAndSendTransaction(transaction);
            return signature;
        } catch (error) {
            console.error('Ошибка отправки транзакции:', error);
            throw error;
        }
    }

    // Проверка баланса
    async getBalance() {
        try {
            if (!this.provider || !this.publicKey) {
                throw new Error('Кошелек не подключен!');
            }

            const balance = await this.provider.connection.getBalance(this.publicKey);
            return balance / 1e9; // Конвертируем в SOL
        } catch (error) {
            console.error('Ошибка получения баланса:', error);
            throw error;
        }
    }
}

module.exports = WalletService;
