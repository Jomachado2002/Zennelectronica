// frontend/src/services/balanceService.js
import SummaryApi from '../common';
import { authGet, authPost } from '../helpers/authFetch';

const API_BASE_URL = SummaryApi.baseURL;

/**
 * ✅ SERVICIO PARA GESTIÓN DE SALDO
 */
class BalanceService {
    
    /**
     * Obtener saldo del usuario
     */
    static async getUserBalance() {
        try {
            // ✅ USAR authGet QUE INCLUYE AUTOMÁTICAMENTE EL TOKEN
            const response = await authGet(`${API_BASE_URL}/api/perfil/saldo`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            // console.error removed for production
            throw error;
        }
    }

    /**
     * Cargar saldo con Bancard
     */
    static async loadBalance(amount, currency = 'PYG', description = 'Carga de saldo') {
        try {
            // ✅ USAR authPost QUE INCLUYE AUTOMÁTICAMENTE EL TOKEN
            const response = await authPost(`${API_BASE_URL}/api/perfil/cargar-saldo`, {
                amount: parseFloat(amount),
                currency,
                description
            });

            if (!response.ok) {
                const errorText = await response.text();
                // console.error removed for production
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            // console.error removed for production
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
                // console.error removed for production
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            // console.error removed for production
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

            // ✅ USAR authGet QUE INCLUYE AUTOMÁTICAMENTE EL TOKEN
            const response = await authGet(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            // console.error removed for production
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
                // console.error removed for production
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            // console.error removed for production
            throw error;
        }
    }
}

export default BalanceService;
