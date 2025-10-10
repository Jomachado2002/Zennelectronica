// frontend/src/services/balanceService.js
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

/**
 * ✅ SERVICIO PARA GESTIÓN DE SALDO
 */
class BalanceService {
    
    /**
     * Obtener saldo del usuario
     */
    static async getUserBalance() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/perfil/saldo`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error obteniendo saldo:', error);
            throw error;
        }
    }

    /**
     * Cargar saldo con Bancard
     */
    static async loadBalance(amount, currency = 'PYG', description = 'Carga de saldo') {
        try {
            const response = await fetch(`${API_BASE_URL}/api/perfil/cargar-saldo`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    currency,
                    description
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error cargando saldo:', error);
            throw error;
        }
    }

    /**
     * Pagar con saldo
     */
    static async payWithBalance(paymentData) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/perfil/pagar-con-saldo`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error pagando con saldo:', error);
            throw error;
        }
    }

    /**
     * Obtener historial de transacciones de saldo
     */
    static async getBalanceHistory(limit = 20, offset = 0, type = null) {
        try {
            let url = `${API_BASE_URL}/api/perfil/historial-saldo?limit=${limit}&offset=${offset}`;
            if (type) {
                url += `&type=${type}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error obteniendo historial:', error);
            throw error;
        }
    }

    /**
     * Cargar saldo usando Bancard (método directo)
     */
    static async loadBalanceWithBancard(amount, currency = 'PYG') {
        try {
            const response = await fetch(`${API_BASE_URL}/api/bancard/cargar-saldo`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    currency,
                    description: 'Carga de saldo desde frontend'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error cargando saldo con Bancard:', error);
            throw error;
        }
    }
}

export default BalanceService;
