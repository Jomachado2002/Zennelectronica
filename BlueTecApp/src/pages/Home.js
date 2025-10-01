// src/pages/Home.js - VERSIÓN SIMPLIFICADA SIN FOOTER
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../components/MainLayout';
import SummaryApi from '../common';
import { formatPrice } from '../helpers';

const Home = ({ navigation }) => {
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ CATEGORÍAS Y SUBCATEGORÍAS A MOSTRAR
  const featuredCategories = [
    { category: 'informatica', subcategory: 'notebooks', title: 'Notebooks', icon: '💻' },
    { category: 'informatica', subcategory: 'placas_madre', title: 'Placas Madre', icon: '🔧' },
    { category: 'perifericos', subcategory: 'monitores', title: 'Monitores', icon: '🖥️' },
    { category: 'informatica', subcategory: 'memorias_ram', title: 'Memorias RAM', icon: '💾' },
    { category: 'informatica', subcategory: 'tarjeta_grafica', title: 'Tarjetas Gráficas', icon: '🎮' },
    { category: 'telefonia', subcategory: 'telefonos_moviles', title: 'Teléfonos', icon: '📱' },
  ];

  useEffect(() => {
    loadHomeProducts();
  }, []);

  const loadHomeProducts = async () => {
    try {
      console.log('🏠 Cargando productos del home...');
      
      // ✅ USAR LA RUTA CORRECTA PARA OBTENER PRODUCTOS
const response = await fetch(SummaryApi.allProduct.url, {
        method: SummaryApi.allProduct.method,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const dataApi = await response.json();
      
      if (dataApi.success && dataApi.data) {
        // ✅ ORGANIZAR PRODUCTOS POR CATEGORÍA Y SUBCATEGORÍA
        const organizedProducts = {};
        
        dataApi.data.forEach(product => {
          const categoryKey = product.category;
          const subcategoryKey = product.subcategory;
          
          if (!organizedProducts[categoryKey]) {
            organizedProducts[categoryKey] = {};
          }
          
          if (!organizedProducts[categoryKey][subcategoryKey]) {
            organizedProducts[categoryKey][subcategoryKey] = [];
          }
          
          organizedProducts[categoryKey][subcategoryKey].push(product);
        });

        console.log('✅ Productos organizados:', Object.keys(organizedProducts));
        setProducts(organizedProducts);
      } else {
        console.log('⚠️ No se pudieron cargar productos:', dataApi.message);
        Alert.alert('Aviso', 'No se pudieron cargar los productos');
      }
    } catch (error) {
      console.error('❌ Error cargando productos:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeProducts();
  };

  const renderProductCard = (product) => (
    <TouchableOpacity
      key={product._id}
      style={styles.productCard}
      onPress={() => Alert.alert('Producto', `${product.productName}\n\nPrecio: ${formatPrice(product.sellingPrice)}`)}
      activeOpacity={0.8}
    >
      <View style={styles.productImageContainer}>
        {product.productImage && product.productImage[0] ? (
          <Image
            source={{ uri: product.productImage[0] }}
            style={styles.productImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.noImageContainer}>
            <Ionicons name="image-outline" size={40} color="#94a3b8" />
            <Text style={styles.noImageText}>Sin imagen</Text>
          </View>
        )}
        
        {/* Badge de oferta */}
        {product.isVipOffer && (
          <View style={styles.offerBadge}>
            <Text style={styles.offerBadgeText}>OFERTA</Text>
          </View>
        )}
        
        {/* Badge de stock */}
        {product.stock > 0 ? (
          <View style={styles.stockBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
            <Text style={styles.stockText}>Stock: {product.stock}</Text>
          </View>
        ) : (
          <View style={[styles.stockBadge, styles.outOfStockBadge]}>
            <Ionicons name="close-circle" size={16} color="#ef4444" />
            <Text style={styles.outOfStockText}>Sin stock</Text>
          </View>
        )}
      </View>
      
      <View style={styles.productInfo}>
        <Text style={styles.productBrand}>{product.brandName || 'Zenn'}</Text>
        <Text style={styles.productName} numberOfLines={2}>
          {product.productName}
        </Text>
        
        <View style={styles.priceContainer}>
          {product.price > product.sellingPrice ? (
            <>
              <Text style={styles.originalPrice}>{formatPrice(product.price)}</Text>
              <Text style={styles.sellingPrice}>{formatPrice(product.sellingPrice)}</Text>
            </>
          ) : (
            <Text style={styles.sellingPrice}>{formatPrice(product.sellingPrice)}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCategorySection = (categoryConfig) => {
    const { category, subcategory, title, icon } = categoryConfig;
    const categoryProducts = products[category]?.[subcategory] || [];
    
    if (categoryProducts.length === 0) {
      return null;
    }

    return (
      <View key={`${category}-${subcategory}`} style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryTitleContainer}>
            <Text style={styles.categoryIcon}>{icon}</Text>
            <Text style={styles.categoryTitle}>{title}</Text>
          </View>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => Alert.alert(title, 'Ver todos los productos próximamente')}
          >
            <Text style={styles.viewAllText}>Ver todos</Text>
            <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
          </TouchableOpacity>
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productsScrollContainer}
          style={styles.productsScroll}
        >
          {categoryProducts.slice(0, 6).map(renderProductCard)}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <MainLayout navigation={navigation}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout navigation={navigation}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 🎯 SECCIÓN HERO */}
        <View style={styles.heroSection}>
          <Text style={styles.welcomeText}>¡Bienvenido a Zenn!</Text>
          <Text style={styles.heroSubtitle}>
            Tu destino tecnológico de confianza
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>500+</Text>
              <Text style={styles.statLabel}>Productos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>100%</Text>
              <Text style={styles.statLabel}>Garantía</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>24/7</Text>
              <Text style={styles.statLabel}>Soporte</Text>
            </View>
          </View>
        </View>

        {/* 📂 SECCIONES DE PRODUCTOS */}
        {featuredCategories.map(renderCategorySection)}

        {/* 📞 SECCIÓN DE CONTACTO */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>¿Necesitas ayuda?</Text>
          <Text style={styles.contactSubtitle}>
            Nuestro equipo está aquí para ayudarte
          </Text>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => Alert.alert('Contacto', 'Teléfono: +595 21 123-456')}
          >
            <Ionicons name="call" size={20} color="white" />
            <Text style={styles.contactButtonText}>Contactar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </MainLayout>
  );
};

// 🎨 STYLES (mismos que antes)
const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },

  // Hero Section
  heroSection: {
    backgroundColor: '#3b82f6',
    padding: 24,
    marginBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },

  // Category Sections
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    marginRight: 4,
  },

  // Products Scroll
  productsScroll: {
    paddingLeft: 20,
  },
  productsScrollContainer: {
    paddingRight: 20,
  },

  // Product Cards
  productCard: {
    width: 200,
    backgroundColor: 'white',
    borderRadius: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productImageContainer: {
    position: 'relative',
    height: 140,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  noImageText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },

  // Badges
  offerBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  offerBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stockBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
  },
  outOfStockBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  stockText: {
    fontSize: 10,
    color: '#22c55e',
    fontWeight: '600',
    marginLeft: 2,
  },
  outOfStockText: {
    fontSize: 10,
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 2,
  },

  // Product Info
  productInfo: {
    padding: 12,
  },
  productBrand: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 18,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  originalPrice: {
    fontSize: 12,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  sellingPrice: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: 'bold',
  },

  // Contact Section
  contactSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  contactButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default Home;