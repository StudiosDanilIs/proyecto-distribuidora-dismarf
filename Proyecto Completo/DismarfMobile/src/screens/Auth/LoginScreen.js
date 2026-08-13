import React, { useState, useContext, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, StyleSheet, ActivityIndicator, 
  KeyboardAvoidingView, Platform, StatusBar, ScrollView, 
  Animated, Pressable, Switch, Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);
  
  const [isBiometryConfigured, setIsBiometryConfigured] = useState(false);
  const [biometryTypeLabel, setBiometryTypeLabel] = useState('Biometría');

  const { login, isLoading } = useContext(AuthContext);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();

    const verificarBiometria = async () => {
      try {
        const bioActiva = await AsyncStorage.getItem('biometria_activa');
        const bioEmail = await AsyncStorage.getItem('bio_email');
        if (bioActiva === 'true' && bioEmail) {
          const rnBiometrics = new ReactNativeBiometrics();
          const { available, biometryType } = await rnBiometrics.isSensorAvailable();
          if (available) {
            setIsBiometryConfigured(true);
            setBiometryTypeLabel(biometryType === 'FaceID' ? 'FaceID' : 'Huella');
            const { success } = await rnBiometrics.simplePrompt({ promptMessage: 'Autenticación Segura Dismarf', cancelButtonText: 'Usar Contraseña' });
            if (success) {
              setEmail(bioEmail);
              const bioPass = await AsyncStorage.getItem('bio_pass') || 'BIOMETRIC_VALIDATED';
              login(bioEmail.trim().toLowerCase(), bioPass);
            }
          }
        }
      } catch (error) { console.log('Biometría cancelada.'); }
    };
    verificarBiometria();
  }, []);

  const handleLogin = () => {
    setErrorMessage('');
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor, completa todos los campos.');
      return;
    }
    login(email.trim().toLowerCase(), password);
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />
      
      <View style={styles.glowCircleTop} pointerEvents="none" />
      <View style={styles.glowCircleBottom} pointerEvents="none" />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex1}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.headerContent}>
            <View style={styles.logoCircle}>
              <Image source={require('../../../assets/logo.png')} style={styles.logoImage} />
            </View>
            <Text style={styles.title}>Dismarf</Text>
            <Text style={styles.subtitle}>Logística de Frío Inteligente</Text>
          </View>

          <Animated.View style={[styles.cardWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.cleanCard}>
              <Text style={styles.welcomeText}>Portal de Acceso</Text>

              {errorMessage !== '' && (
                <View style={styles.errorBadge}>
                  <Icon name="alert-circle-outline" size={18} color="#EF4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              <View style={[styles.inputWrapper, focusedInput === 'email' && styles.inputFocused]}>
                <Icon name="email-outline" size={20} color={focusedInput === 'email' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} placeholder="Correo Electrónico" placeholderTextColor="#94A3B8" 
                  keyboardType="email-address" autoCapitalize="none" 
                  onFocus={() => setFocusedInput('email')} onBlur={() => setFocusedInput(null)} 
                  value={email} onChangeText={(text) => setEmail(text)} 
                />
              </View>

              <View style={[styles.inputWrapper, focusedInput === 'password' && styles.inputFocused]}>
                <Icon name="lock-outline" size={20} color={focusedInput === 'password' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} placeholder="Contraseña" placeholderTextColor="#94A3B8" 
                  secureTextEntry={!isPasswordVisible} 
                  onFocus={() => setFocusedInput('password')} onBlur={() => setFocusedInput(null)} 
                  value={password} onChangeText={(text) => setPassword(text)} 
                />
                <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon} hitSlop={15}>
                  <Icon name={isPasswordVisible ? "eye-outline" : "eye-off-outline"} size={20} color="#94A3B8" />
                </Pressable>
              </View>

              <View style={styles.optionsRow}>
                <View style={styles.rememberMeContainer}>
                  <Switch 
                    value={rememberMe} onValueChange={setRememberMe}
                    trackColor={{ false: '#E2E8F0', true: '#BAE6FD' }}
                    thumbColor={rememberMe ? '#0284C7' : '#FFFFFF'}
                  />
                  <Text style={styles.rememberMeText}>Recordarme</Text>
                </View>
                <Pressable onPress={() => navigation.navigate('ForgotPassword')} hitSlop={15}>
                  <Text style={styles.forgotPassText}>¿Olvidaste tu clave?</Text>
                </Pressable>
              </View>

              {isLoading ? (
                <ActivityIndicator size="large" color="#0284C7" style={styles.loader}/>
              ) : (
                <View style={styles.actionButtonsRow}>
                  {isBiometryConfigured && (
                    <Pressable style={({ pressed }) => [styles.bioButton, pressed && { transform: [{ scale: 0.95 }] }]} onPress={() => {/* Biometría */}}>
                      <Icon name={biometryTypeLabel === 'FaceID' ? "face-recognition" : "fingerprint"} size={26} color="#0284C7" />
                    </Pressable>
                  )}
                  <Pressable style={({ pressed }) => [styles.button, { flex: 1 }, pressed && { transform: [{ scale: 0.98 }] }]} onPress={handleLogin}>
                    <Text style={styles.buttonText}>INGRESAR</Text>
                    <Icon name="chevron-right" size={24} color="#fff" />
                  </Pressable>
                </View>
              )}
            </View>
          </Animated.View>

          <Animated.View style={[styles.footerContainer, { opacity: fadeAnim }]}>
            <Pressable onPress={() => navigation.navigate('Register')} hitSlop={20}>
              <Text style={styles.registerText}>¿Nuevo en el sistema? <Text style={styles.registerTextBold}>Solicitar acceso</Text></Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' }, 
  glowCircleTop: { position: 'absolute', top: -100, right: -50, width: 350, height: 350, borderRadius: 175, backgroundColor: '#E0F2FE', opacity: 0.8 },
  glowCircleBottom: { position: 'absolute', bottom: -150, left: -100, width: 450, height: 450, borderRadius: 225, backgroundColor: '#E0F2FE', opacity: 0.6 },
  flex1: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 40 },
  
  headerContent: { alignItems: 'center', marginTop: 40, marginBottom: 40 },
  logoCircle: { width: 90, height: 90, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 },
  logoImage: { width: 90, height: 130, resizeMode: 'contain' },
  title: { fontSize: 34, fontWeight: '900', color: '#0F172A', letterSpacing: 0.5 },
  subtitle: { fontSize: 11, color: '#0284C7', marginTop: 6, textTransform: 'uppercase', letterSpacing: 2.5, fontWeight: '800' },
  
  cardWrapper: { paddingHorizontal: 24 },
  cleanCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 26, borderWidth: 1, borderColor: '#E2E8F0', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 12 },
  welcomeText: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 24, textAlign: 'center', letterSpacing: 0.3 },
  
  errorBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 14, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { color: '#EF4444', fontSize: 13, marginLeft: 8, fontWeight: '700', flex: 1 },
  
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#E2E8F0', height: 60 },
  inputFocused: { borderColor: '#0284C7', backgroundColor: '#FFFFFF' },
  inputIcon: { paddingHorizontal: 16 },
  input: { flex: 1, color: '#0F172A', fontSize: 15, fontWeight: '600', paddingVertical: 0 }, // paddingVertical 0 previene crash en Android
  eyeIcon: { paddingHorizontal: 16, height: '100%', justifyContent: 'center' },
  
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26, marginTop: 4 },
  rememberMeContainer: { flexDirection: 'row', alignItems: 'center' },
  rememberMeText: { color: '#64748B', fontSize: 13, marginLeft: 8, fontWeight: '600' },
  forgotPassText: { color: '#0284C7', fontSize: 13, fontWeight: '800' },
  
  actionButtonsRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  bioButton: { backgroundColor: '#F0F9FF', height: 60, width: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#BAE6FD' },
  button: { flexDirection: 'row', backgroundColor: '#0284C7', borderRadius: 16, height: 60, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1.2, marginRight: 8 },
  loader: { marginVertical: 12 },
  
  footerContainer: { marginTop: 40, alignItems: 'center' },
  registerText: { color: '#64748B', fontSize: 14, fontWeight: '500' },
  registerTextBold: { color: '#0284C7', fontWeight: '900' },
});

export default LoginScreen;