const { ipcRenderer } = require('electron');
const axios = require('axios');

class Auth {
    constructor() {
        this.API_URL = 'http://localhost:3001';
        this.currentNumber = null;
    }

    async getFreeNumber() {
        try {
            const response = await axios.post(`${this.API_URL}/api/numbers/free`, {
                solanagramId: Math.random().toString(36).substring(7)
            });

            if (response.data.number) {
                this.currentNumber = response.data.number;
                return {
                    success: true,
                    number: response.data.number,
                    expiresAt: response.data.expiresAt
                };
            }
        } catch (error) {
            console.error('Error getting number:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Failed to get number'
            };
        }
    }

    async buyNumber() {
        try {
            const response = await axios.post(`${this.API_URL}/api/numbers/purchase`, {
                solanagramId: Math.random().toString(36).substring(7),
                solanaTransaction: 'test_transaction' // В тестовом режиме
            });

            if (response.data.number) {
                this.currentNumber = response.data.number;
                return {
                    success: true,
                    number: response.data.number,
                    expiresAt: response.data.expiresAt
                };
            }
        } catch (error) {
            console.error('Error buying number:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Failed to buy number'
            };
        }
    }

    async verifyCode(code) {
        try {
            if (!this.currentNumber || !code) {
                return {
                    success: false,
                    error: 'Invalid number or code'
                };
            }

            const response = await axios.post(`${this.API_URL}/api/verify`, {
                number: this.currentNumber,
                code: code,
                solanagramId: Math.random().toString(36).substring(7)
            });

            if (response.data.token) {
                localStorage.setItem('solanagramToken', response.data.token);
                return {
                    success: true,
                    token: response.data.token
                };
            }
        } catch (error) {
            console.error('Error verifying code:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Invalid code'
            };
        }
    }
}

module.exports = Auth;
