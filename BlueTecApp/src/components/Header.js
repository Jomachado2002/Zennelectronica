// src/components/Header.js
// 🎯 HEADER SIMPLIFICADO PARA SOLO HOME Y LOGIN

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const Header = ({ navigation, showSearch = true, title, showBack = false, onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      if (onSearch) {
        onSearch(searchQuery.trim());
      } else {
        // Por ahora solo mostrar alert
        Alert.alert('Búsqueda', `Buscando: ${searchQuery.trim()}`);
      }
      setSearchQuery('');
      setSearchVisible(false);
    }
  };

  const toggleSearch = () => {
    setSearchVisible(!searchVisible);
    if (searchVisible) {
      setSearchQuery('');
    }
  };

  const handleProfile = () => {
    // Navegar a Login desde el perfil
    navigation?.navigate('Login');
  };

  const handleCart = () => {
    Alert.alert('Carrito', 'Función de carrito próximamente');
  };

  const handleMenu = () => {
    Alert.alert('Menú', 'Menú próximamente');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      
      <LinearGradient
        colors={['#2563eb', '#3b82f6']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {/* 📱 PRIMERA FILA - NAVEGACIÓN PRINCIPAL */}
        <View style={styles.topRow}>
          {/* Botón de regreso o menú */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={showBack ? () => navigation?.goBack() : handleMenu}
          >
            <Ionicons
              name={showBack ? "chevron-back" : "menu"}
              size={24}
              color="white"
            />
          </TouchableOpacity>

          {/* Logo/Título */}
          <View style={styles.logoContainer}>
            {title ? (
              <Text style={styles.titleText}>{title}</Text>
            ) : (
              <>
                <Text style={styles.logoText}>Zenn</Text>
                <Text style={styles.logoSubtitle}>Technology Store</Text>
              </>
            )}
          </View>

          {/* Acciones derecha */}
          <View style={styles.rightActions}>
            {showSearch && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={toggleSearch}
              >
                <Ionicons name="search" size={22} color="white" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCart}
            >
              <Ionicons name="bag" size={22} color="white" />
              {/* Badge del carrito */}
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>3</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleProfile}
            >
              <Ionicons name="person" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 🔍 SEGUNDA FILA - BARRA DE BÚSQUEDA */}
        {searchVisible && showSearch && (
          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar productos..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Ionicons name="close-circle" size={20} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearch}
            >
              <Text style={styles.searchButtonText}>Buscar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 🏷️ TERCERA FILA - CATEGORÍAS RÁPIDAS */}
        {!searchVisible && !title && (
          <View style={styles.categoriesRow}>
            <TouchableOpacity 
              style={styles.categoryButton}
              onPress={() => Alert.alert('Informática', 'Categoría próximamente')}
            >
              <Ionicons name="laptop" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.categoryButtonText}>Informática</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.categoryButton}
              onPress={() => Alert.alert('Periféricos', 'Categoría próximamente')}
            >
              <Ionicons name="desktop" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.categoryButtonText}>Periféricos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.categoryButton}
              onPress={() => Alert.alert('Telefonía', 'Categoría próximamente')}
            >
              <Ionicons name="phone-portrait" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.categoryButtonText}>Telefonía</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.categoryButton}
              onPress={() => Alert.alert('Gaming', 'Categoría próximamente')}
            >
              <Ionicons name="game-controller" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.categoryButtonText}>Gaming</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

// 🎨 STYLES
const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#2563eb',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  // Top Row
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    marginTop: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1,
  },
  logoSubtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginTop: -2,
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Cart Badge
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Search Row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 44,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Categories Row
  categoriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  categoryButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    minWidth: 70,
  },
  categoryButtonText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default Header;