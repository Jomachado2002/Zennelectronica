// src/pages/Login.js
// 📱 PANTALLA DE LOGIN - DISEÑO ELEGANTE COMO LA IMAGEN

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// ALTERNATIVA SI NO FUNCIONAN LOS ICONOS:
// import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SummaryApi from '../common';
import { validateEmail } from '../helpers';

const Login = ({ navigation }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [data, setData] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);

  const handleOnChange = (name, value) => {
    setData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    if (!data.email || !data.password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (!validateEmail(data.email)) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(SummaryApi.signIn.url, {
        method: SummaryApi.signIn.method,
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const dataApi = await response.json();
      
      if (dataApi.success) {
        Alert.alert('¡Bienvenido!', `Hola ${dataApi.user?.name || 'Usuario'}`);
        // TODO: Navegar a Home
        console.log('Usuario logueado:', dataApi.user);
      } else {
        Alert.alert('Error', dataApi.message || 'Error al iniciar sesión');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo conectar con el servidor');
      console.error('Error de login:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      
      {/* 🎨 HEADER CON GRADIENTE */}
      <LinearGradient
        colors={['#2563eb', '#3b82f6', '#60a5fa']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Botón de regreso */}
        <TouchableOpacity style={styles.backButton}>
          <Text style={styles.iconText}>←</Text>
        </TouchableOpacity>

        {/* Header content */}
        <View style={styles.headerContent}>
          <Text style={styles.welcomeTitle}>¡Bienvenido a</Text>
          <Text style={styles.companyName}>Zenn!</Text>
          <Text style={styles.subtitle}>Tu destino tecnológico de confianza</Text>
        </View>
      </LinearGradient>

      {/* 📱 FORMULARIO */}
      <View style={styles.formContainer}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.formWrapper}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            
            {/* 🏢 LOGO CONTAINER - TAMAÑO 500x200 */}
            <View style={styles.logoContainer}>
              <View style={styles.logoPlaceholder}>
                <Image 
                  source={require('../../assets/logo.png')} 
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* 📋 TITULO DEL FORMULARIO */}
            <Text style={styles.formTitle}>Iniciar sesión</Text>

            {/* 📧 EMAIL INPUT */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIconText}>📧</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Correo Electrónico"
                  placeholderTextColor="#94a3b8"
                  value={data.email}
                  onChangeText={(value) => handleOnChange('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* 🔐 PASSWORD INPUT */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIconText}>🔒</Text>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="Contraseña"
                  placeholderTextColor="#94a3b8"
                  value={data.password}
                  onChangeText={(value) => handleOnChange('password', value)}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#94a3b8" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* ✅ REMEMBER ME */}
            <TouchableOpacity 
              style={styles.rememberContainer}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Text style={styles.checkmarkText}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>Recuérdame</Text>
            </TouchableOpacity>

            {/* 🚀 LOGIN BUTTON */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#94a3b8', '#94a3b8'] : ['#3b82f6', '#2563eb']}
                style={styles.loginButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* 🔗 FORGOT PASSWORD */}
            <TouchableOpacity style={styles.forgotPasswordContainer}>
              <Text style={styles.forgotPasswordText}>Olvidé mi contraseña</Text>
            </TouchableOpacity>

            {/* 📝 REGISTER BUTTON */}
            <TouchableOpacity 
              style={styles.registerButton}
              onPress={() => navigation?.navigate('Register')}
            >
              <Text style={styles.registerButtonText}>Regístrese</Text>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

// 🎨 STYLES - DISEÑO ELEGANTE COMO LA IMAGEN
const styles = StyleSheet.create({
    iconText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  inputIconText: {
    fontSize: 20,
    marginRight: 12,
  },
  eyeIconText: {
    fontSize: 20,
    padding: 4,
  },
  checkmarkText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // 🎨 Header con gradiente
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    padding: 8,
  },
  headerContent: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    color: 'white',
    fontWeight: '300',
    textAlign: 'center',
  },
  companyName: {
    fontSize: 32,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: -5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '400',
  },

  // 📱 Formulario
  formContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
    paddingTop: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  formWrapper: {
    flex: 1,
    paddingHorizontal: 30,
  },

  
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20, // Reducido para dar más espacio al logo
  },
  logoPlaceholder: {
    width: 280, // Ancho para mostrar logo completo (proporción de 500x200)
    height: 112, // Alto proporcional (280/500 * 200 = 112)
    backgroundColor: 'transparent', // Sin fondo para mostrar solo el logo
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    // Removemos las sombras para que se vea limpio
  },
  logo: {
    width: 280, // TAMAÑO COMPLETO del logo
    height: 112, // Proporcional a 500x200
  },

  // 📋 Form title
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 30,
  },

  // 📝 Inputs
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    height: 56,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 4,
  },

  // ✅ Remember me
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  rememberText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },

  // 🚀 Login button
  loginButton: {
    borderRadius: 16,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 20,
  },
  loginButtonGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // 🔗 Links
  forgotPasswordContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  forgotPasswordText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },

  // 📝 Register button
  registerButton: {
    backgroundColor: '#64748b',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Login;