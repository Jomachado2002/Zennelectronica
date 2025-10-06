// hooks/useProducts.js - ✅ VERSIÓN CORREGIDA
import { useQuery } from '@tanstack/react-query';
import SummaryApi from '../common';

// ✅ HOOK PARA PRODUCTOS DEL HOME - CORREGIDO
export const useHomeProducts = () => {
  return useQuery({
    queryKey: ['category-products', 'all'],
    queryFn: async () => {
      try {
        // Usar el endpoint actual de todos los productos
        const response = await fetch(SummaryApi.baseURL + '/api/obtener-productos-home', {
          method: SummaryApi.allProduct.method,
          credentials: 'include'
        });
                
        if (!response.ok) {
          throw new Error('Error al cargar productos');
        }
                
        const result = await response.json();
                
        if (!result.success) {
          throw new Error(result.message || 'Error en la respuesta');
        }
                
        // ✅ VERIFICACIÓN CORREGIDA - ACEPTAR TANTO ARRAY COMO OBJETO
        let products = [];
        
        
        
        if (result && result.data) {
          // Si result.data ya es un array de productos
          if (Array.isArray(result.data)) {
            products = result.data;
            
          }
          // Si result.data es un objeto con la estructura organizada
          else if (typeof result.data === 'object' && result.data !== null) {
            
            
            // Si ya viene organizado por categorías, usarlo directamente
            if (result.data.informatica || result.data.perifericos || result.data.telefonia) {
              
              return {
                success: true,
                data: result.data
              };
            }
            // Si es un objeto plano, convertir a array
            else {
              products = Object.values(result.data).flat();
              
            }
          }
        } else {
          console.warn('⚠️ Datos no válidos recibidos:', result);
          return { success: false, data: {} };
        }

        // Filtrar productos con stock
        const filteredProducts = products.filter(product => 
          product?.stock === undefined || product?.stock === null || product?.stock > 0
        );
        
        
                
        // Organizar productos por categoría y subcategoría
        const organizedData = {
          informatica: {
            notebooks: filteredProducts
              .filter(p => p.category === 'informatica' && p.subcategory === 'notebooks')
              .slice(0, 20),
            placas_madre: filteredProducts
              .filter(p => p.category === 'informatica' && p.subcategory === 'placas_madre')
              .slice(0, 20),
            memorias_ram: filteredProducts
              .filter(p => p.category === 'informatica' && p.subcategory === 'memorias_ram')
              .slice(0, 20),
            discos_duros: filteredProducts
              .filter(p => p.category === 'informatica' && p.subcategory === 'discos_duros')
              .slice(0, 20),
            tarjeta_grafica: filteredProducts
              .filter(p => p.category === 'informatica' && p.subcategory === 'tarjeta_grafica')
              .slice(0, 20),
            gabinetes: filteredProducts
              .filter(p => p.category === 'informatica' && p.subcategory === 'gabinetes')
              .slice(0, 20),
            procesador: filteredProducts
              .filter(p => p.category === 'informatica' && p.subcategory === 'procesador')
              .slice(0, 20)
          },
          perifericos: {
            monitores: filteredProducts
              .filter(p => p.category === 'perifericos' && p.subcategory === 'monitores')
              .slice(0, 20),
            mouses: filteredProducts
              .filter(p => p.category === 'perifericos' && p.subcategory === 'mouses')
              .slice(0, 12),
            teclados: filteredProducts
              .filter(p => p.category === 'perifericos' && p.subcategory === 'teclados')
              .slice(0, 12)
          },
          telefonia: {
            telefonos_moviles: filteredProducts
              .filter(p => p.category === 'telefonia' && p.subcategory === 'telefonos_moviles')
              .slice(0, 20)
          }
        };
        
        // ✅ LOG FINAL PARA VERIFICAR RESULTADOS
        console.log('✅ DATOS ORGANIZADOS FINALES:', {
          notebooks: organizedData.informatica.notebooks.length,
          placas_madre: organizedData.informatica.placas_madre.length,
          telefonos: organizedData.telefonia.telefonos_moviles.length,
          mouses: organizedData.perifericos.mouses.length
        });
                
        return {
          success: true,
          data: organizedData
        };
                
      } catch (error) {
        console.error('❌ Error en useHomeProducts:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - datos considerados frescos
    cacheTime: 10 * 60 * 1000, // 10 minutos - tiempo en caché
    retry: 1, // Solo 1 reintento
    refetchOnWindowFocus: false, // No refrescar al cambiar ventana
    refetchOnMount: false, // No refrescar al montar
  });
};