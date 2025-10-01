import React, { useState, useEffect } from 'react';
import { 
    FaSearch, 
    FaFilter, 
    FaTimes, 
    FaCalendarAlt, 
    FaChevronDown,
    FaSyncAlt,
    FaDownload
} from 'react-icons/fa';

const OrderSearchAndFilters = ({ 
    filters, 
    onFiltersChange, 
    onReset,
    showExport = false,
    onExport,
    totalResults = 0,
    loading = false
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [localFilters, setLocalFilters] = useState(filters);

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    const handleFilterChange = (name, value) => {
        const newFilters = { ...localFilters, [name]: value };
        setLocalFilters(newFilters);
        onFiltersChange(newFilters);
    };

    const handleReset = () => {
        const resetFilters = {
            status: '',
            delivery_status: '',
            startDate: '',
            endDate: '',
            search: '',
            payment_method: '',
            user_bancard_id: ''
        };
        setLocalFilters(resetFilters);
        onReset(resetFilters);
    };

    const getActiveFiltersCount = () => {
        return Object.values(localFilters).filter(value => value && value.trim() !== '').length;
    };

    const statusOptions = [
        { value: '', label: 'Todos los estados' },
        { value: 'pending', label: '⏳ Pendiente' },
        { value: 'approved', label: '✅ Aprobado' },
        { value: 'rejected', label: '❌ Rechazado' },
        { value: 'rolled_back', label: '🔄 Revertido' },
        { value: 'failed', label: '⚠️ Fallido' }
    ];

    const deliveryStatusOptions = [
        { value: '', label: 'Todos los delivery' },
        { value: 'payment_confirmed', label: '✅ Pago Confirmado' },
        { value: 'preparing_order', label: '📦 Preparando' },
        { value: 'in_transit', label: '🚚 En Camino' },
        { value: 'delivered', label: '📍 Entregado' },
        { value: 'problem', label: '⚠️ Problema' }
    ];

    const paymentMethodOptions = [
        { value: '', label: 'Todos los métodos' },
        { value: 'saved_card', label: '💳 Tarjeta Guardada' },
        { value: 'new_card', label: '🆕 Nueva Tarjeta' }
    ];

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header del filtro */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <FaFilter className="text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Filtros y Búsqueda</h3>
                        <p className="text-sm text-gray-600">
                            {totalResults > 0 ? `${totalResults} resultado${totalResults !== 1 ? 's' : ''} encontrado${totalResults !== 1 ? 's' : ''}` : 'Sin resultados'}
                            {getActiveFiltersCount() > 0 && (
                                <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                    {getActiveFiltersCount()} filtro{getActiveFiltersCount() !== 1 ? 's' : ''} activo{getActiveFiltersCount() !== 1 ? 's' : ''}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {showExport && totalResults > 0 && (
                        <button
                            onClick={onExport}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                            <FaDownload />
                            Exportar
                        </button>
                    )}
                    
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                            isExpanded 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <FaFilter />
                        {isExpanded ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                        <FaChevronDown className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Barra de búsqueda rápida */}
            <div className="p-4 border-b border-gray-200">
                <div className="relative">
                    <input
                        type="text"
                        name="search"
                        value={localFilters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        placeholder="Buscar por ID, cliente, email, tracking..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    {localFilters.search && (
                        <button
                            onClick={() => handleFilterChange('search', '')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <FaTimes />
                        </button>
                    )}
                </div>
            </div>

            {/* Filtros expandibles */}
            {isExpanded && (
                <div className="p-6 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Estado de Pago */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Estado de Pago</label>
                            <select
                                name="status"
                                value={localFilters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                                {statusOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Estado de Delivery */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Estado de Entrega</label>
                            <select
                                name="delivery_status"
                                value={localFilters.delivery_status}
                                onChange={(e) => handleFilterChange('delivery_status', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                                {deliveryStatusOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Método de Pago */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Método de Pago</label>
                            <select
                                name="payment_method"
                                value={localFilters.payment_method}
                                onChange={(e) => handleFilterChange('payment_method', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                                {paymentMethodOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Usuario Bancard ID */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">ID Usuario Bancard</label>
                            <input
                                type="text"
                                name="user_bancard_id"
                                value={localFilters.user_bancard_id}
                                onChange={(e) => handleFilterChange('user_bancard_id', e.target.value)}
                                placeholder="Ej: 12345"
                                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>

                        {/* Fecha Desde */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                <FaCalendarAlt className="inline mr-1" /> Fecha Desde
                            </label>
                            <input
                                type="date"
                                name="startDate"
                                value={localFilters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>

                        {/* Fecha Hasta */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                <FaCalendarAlt className="inline mr-1" /> Fecha Hasta
                            </label>
                            <input
                                type="date"
                                name="endDate"
                                value={localFilters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                            {getActiveFiltersCount() > 0 ? (
                                <span>
                                    🔍 Filtros activos: <strong>{getActiveFiltersCount()}</strong>
                                </span>
                            ) : (
                                'Sin filtros activos.'
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm"
                            >
                                Limpiar Filtros
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderSearchAndFilters;
