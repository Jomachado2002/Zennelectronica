// src/components/MainLayout.js
// 🏗️ LAYOUT SIMPLIFICADO SOLO CON HEADER (SIN FOOTER)

import React from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Header from './Header';

const MainLayout = ({ 
  children, 
  navigation, 
  showHeader = true,
  headerProps = {}
}) => {
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* 🎯 HEADER */}
      {showHeader && (
        <Header 
          navigation={navigation}
          {...headerProps}
        />
      )}
      
      {/* 📱 CONTENIDO PRINCIPAL */}
      <View style={styles.content}>
        {children}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
});

export default MainLayout;