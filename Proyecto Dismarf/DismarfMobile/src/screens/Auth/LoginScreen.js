import React, { useState, useContext, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, KeyboardAvoidingView, Platform, 
  StatusBar, TouchableWithoutFeedback, Keyboard, ScrollView, Dimensions 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../../context/AuthContext';

// Librerías nativas de almacenamiento y biometría
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);
  
  // Estado para habilitar visualmente el botón de biometría manual
  const [isBiometryConfigured, setIsBiometryConfigured] = useState(false);
  const [biometryTypeLabel, setBiometryTypeLabel] = useState('Biometría');

  const { login, isLoading } = useContext(AuthContext);

  // ====================================================================
  // INTENTO DE AUTO-DESBLOQUEO BIOMÉTRICO AL CARGAR LA PANTALLA
  // ====================================================================
  useEffect(() => {
    const verificarYDesbloquearBiometria = async () => {
      try {
        const bioActiva = await AsyncStorage.getItem('biometria_activa');
        const bioEmail = await AsyncStorage.getItem('bio_email');

        if (bioActiva === 'true' && bioEmail) {
          const rnBiometrics = new ReactNativeBiometrics();
          const { available, biometryType } = await rnBiometrics.isSensorAvailable();

          if (available) {
            setIsBiometryConfigured(true);
            if (biometryType === 'TouchID' || biometryType === 'Biometrics') {
              setBiometryTypeLabel('Huella');
            } else if (biometryType === 'FaceID') {
              setBiometryTypeLabel('FaceID');
            }

            // Disparamos el prompt nativo automáticamente
            const { success } = await rnBiometrics.simplePrompt({
              promptMessage: 'Autenticación Segura Dismarf',
              cancelButtonText: 'Usar Contraseña'
            });

            if (success) {
              setEmail(bioEmail);
              // Nota: Dependiendo de la seguridad de tu AuthContext, puedes recuperar una clave 
              // encriptada desde AsyncStorage o enviar un bypass validado por el backend.
              const bioPass = await AsyncStorage.getItem('bio_pass') || 'BIOMETRIC_VALIDATED';
              login(bioEmail.trim().toLowerCase(), bioPass);
            }
          }
        }
      } catch (error) {
        console.log('Desbloqueo biométrico cancelado o no disponible en este momento.');
      }
    };

    verificarYDesbloquearBiometria();
  }, []);

  // ====================================================================
  // DISPARO MANUAL DE BIOMETRÍA (POR SI EL USUARIO CANCELÓ EL AUTO-PROMPT)
  // ====================================================================
  const handleBiometricManualTrigger = async () => {
    setErrorMessage('');
    try {
      const bioEmail = await AsyncStorage.getItem('bio_email');
      if (!bioEmail) {
        setErrorMessage('No hay una cuenta vinculada biométricamente en este terminal.');
        return;
      }

      const rnBiometrics = new ReactNativeBiometrics();
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: 'Verificar Identidad Dismarf',
        cancelButtonText: 'Cancelar'
      });

      if (success) {
        setEmail(bioEmail);
        const bioPass = await AsyncStorage.getItem('bio_pass') || 'BIOMETRIC_VALIDATED';
        login(bioEmail.trim().toLowerCase(), bioPass);
      }
    } catch (error) {
      console.log('Fallo al procesar biometría manual.');
    }
  };

  // ====================================================================
  // LOGÍSTICA DE ACCESO POR FORMULARIO ESTÁNDAR
  // ====================================================================
  const handleLogin = () => {
    setErrorMessage('');
    if (email.trim() === '' || password.trim() === '') {
      setErrorMessage('Por favor, completa todos los campos.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Ingresa un formato de correo válido.');
      return;
    }
    
    // Si el login manual es exitoso, te recomendamos guardar la clave en tu AuthContext
    // con AsyncStorage.setItem('bio_pass', password) para que la biometría la use en el futuro.
    login(email.trim().toLowerCase(), password);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.mainContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F0F9FF" translucent={false} />
        
        {/* Fondo decorativo superior suave y moderno */}
        <View style={styles.softHeaderBackground} />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex1}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            
            {/* Encabezado Visual */}
            <View style={styles.headerContent}>
              <View style={styles.logoCircle}>
                <Icon name="snowflake" size={40} color="#0284C7" />
              </View>
              <Text style={styles.title}>Dismarf</Text>
              <Text style={styles.subtitle}>Logística de Frío Inteligente</Text>
            </View>

            {/* Tarjeta Principal */}
            <View style={styles.cardWrapper}>
              <View style={styles.card}>
                <Text style={styles.welcomeText}>Acceso al Sistema</Text>

                {errorMessage !== '' && (
                  <View style={styles.errorBadge}>
                    <Icon name="alert-circle-outline" size={18} color="#EF4444" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Input: Email */}
                <View style={[styles.inputWrapper, focusedInput === 'email' && styles.inputFocused]}>
                  <Icon name="email-outline" size={20} color={focusedInput === 'email' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Correo Electrónico" 
                    placeholderTextColor="#94A3B8" 
                    keyboardType="email-address" 
                    autoCapitalize="none" 
                    onFocus={() => setFocusedInput('email')} 
                    onBlur={() => setFocusedInput(null)} 
                    value={email} 
                    onChangeText={setEmail} 
                  />
                </View>

                {/* Input: Contraseña */}
                <View style={[styles.inputWrapper, focusedInput === 'password' && styles.inputFocused]}>
                  <Icon name="lock-outline" size={20} color={focusedInput === 'password' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Contraseña" 
                    placeholderTextColor="#94A3B8" 
                    secureTextEntry={!isPasswordVisible} 
                    onFocus={() => setFocusedInput('password')} 
                    onBlur={() => setFocusedInput(null)} 
                    value={password} 
                    onChangeText={setPassword} 
                  />
                  <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
                    <Icon name={isPasswordVisible ? "eye-outline" : "eye-off-outline"} size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Enlace a Recuperar Contraseña */}
                <TouchableOpacity 
                  style={styles.forgotPassContainer} 
                  onPress={() => navigation.navigate('ForgotPassword')}
                >
                  <Text style={styles.forgotPassText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>

                {/* Fila de Botones: Biometría Manual + Ingreso Estándar */}
                {isLoading ? (
                  <ActivityIndicator size="large" color="#0284C7" style={styles.loader}/>
                ) : (
                  <View style={styles.actionButtonsRow}>
                    
                    {/* Botón Biométrico Condicional (UX Premium) */}
                    {isBiometryConfigured && (
                      <TouchableOpacity 
                        style={styles.bioButton} 
                        onPress={handleBiometricManualTrigger}
                        activeOpacity={0.8}
                      >
                        <Icon 
                          name={biometryTypeLabel === 'FaceID' ? "face-recognition" : "fingerprint"} 
                          size={24} 
                          color="#0284C7" 
                        />
                      </TouchableOpacity>
                    )}

                    {/* Botón Principal de Ingreso */}
                    <TouchableOpacity 
                      style={[styles.button, { flex: 1 }]} 
                      onPress={handleLogin} 
                      activeOpacity={0.85}
                    >
                      <Text style={styles.buttonText}>INGRESAR</Text>
                      <Icon name="arrow-right-circle-outline" size={20} color="#fff" />
                    </TouchableOpacity>

                  </View>
                )}
              </View>
            </View>

            {/* Enlace a Registro */}
            <View style={styles.footerContainer}>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerText}>¿No tienes una cuenta? <Text style={styles.registerTextBold}>Regístrate aquí</Text></Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
};

// ESTILOS DE ALTA GAMA (Ice-Tech)
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  flex1: { flex: 1 },
  softHeaderBackground: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    height: 240, 
    backgroundColor: '#E0F2FE',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40
  },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 30 },
  
  headerContent: { alignItems: 'center', marginTop: 30, marginBottom: 35 },
  logoCircle: { 
    width: 75, 
    height: 75, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 12, 
    elevation: 6, 
    shadowColor: '#0284C7', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8 
  },
  title: { fontSize: 30, fontWeight: '900', color: '#0F172A', letterSpacing: 0.5 },
  subtitle: { fontSize: 11, color: '#0284C7', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '700' },
  
  cardWrapper: { paddingHorizontal: 20 },
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 24, 
    elevation: 6, 
    shadowColor: '#0284C7', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 12 
  },
  welcomeText: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 20, textAlign: 'center' },
  
  errorBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12, marginBottom: 15 },
  errorText: { color: '#EF4444', fontSize: 13, marginLeft: 8, fontWeight: '600', flex: 1 },
  
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F1F5F9', 
    borderRadius: 14, 
    marginBottom: 14, 
    borderWidth: 1.5, 
    borderColor: 'transparent', 
    height: 52 
  },
  inputFocused: { borderColor: '#0284C7', backgroundColor: '#FFFFFF' },
  inputIcon: { paddingHorizontal: 14 },
  input: { flex: 1, color: '#0F172A', fontSize: 14, paddingVertical: 0 },
  eyeIcon: { paddingHorizontal: 14, height: '100%', justifyContent: 'center' },
  
  forgotPassContainer: { alignSelf: 'flex-end', marginBottom: 20, marginTop: 2 },
  forgotPassText: { color: '#0284C7', fontSize: 13, fontWeight: '700' },
  
  actionButtonsRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  
  bioButton: {
    backgroundColor: '#F0F9FF',
    height: 52,
    width: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0F2FE'
  },

  button: { 
    flexDirection: 'row', 
    backgroundColor: '#0284C7', 
    borderRadius: 14, 
    height: 52, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 4, 
    shadowColor: '#0284C7', 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    shadowOffset: { width: 0, height: 4 } 
  },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.8, marginRight: 8 },
  loader: { marginVertical: 10 },
  
  footerContainer: { marginTop: 35, alignItems: 'center' },
  registerText: { color: '#64748B', fontSize: 14 },
  registerTextBold: { color: '#0284C7', fontWeight: '800' },
});

export default LoginScreen;