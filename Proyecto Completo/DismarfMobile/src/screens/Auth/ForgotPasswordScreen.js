import React, { useState } from 'react';
import { 
  View, Text, TextInput, StyleSheet, ActivityIndicator, 
  KeyboardAvoidingView, Platform, StatusBar, ScrollView, Pressable 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient from '../../api/client';

const ForgotPasswordScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [preguntaObtenida, setPreguntaObtenida] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  
  const [statusMessage, setStatusMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const handleFetchQuestion = async () => {
    if (!email.trim()) { setStatusMessage({ type: 'error', text: 'Ingresa tu correo.' }); return; }
    setIsLoading(true); setStatusMessage(null);
    try {
      const response = await apiClient.post('/api/auth/get-security-question', { email: email.trim().toLowerCase() });
      if (!response.data.pregunta_seguridad) {
        setStatusMessage({ type: 'error', text: 'Cuenta antigua sin pregunta configurada.' });
        setIsLoading(false); return;
      }
      setPreguntaObtenida(response.data.pregunta_seguridad);
      setStep(2);
    } catch (error) {
      setStatusMessage({ type: 'error', text: 'No se encontró la cuenta en la base de datos.' });
    } finally { setIsLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!respuesta.trim() || !nuevaPassword.trim()) { setStatusMessage({ type: 'error', text: 'Completa los campos.' }); return; }
    setIsLoading(true); setStatusMessage(null);
    try {
      await apiClient.post('/api/auth/reset-password-security', {
        email: email.trim().toLowerCase(),
        respuesta_seguridad: respuesta.trim().toLowerCase(),
        nueva_password: nuevaPassword
      });
      setStatusMessage({ type: 'success', text: '¡Clave actualizada correctamente!' });
      setTimeout(() => navigation.navigate('Login'), 2000);
    } catch (error) {
      setStatusMessage({ type: 'error', text: 'Respuesta incorrecta. Acceso denegado.' });
    } finally { setIsLoading(false); }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />
      <View style={styles.glowCircleTop} pointerEvents="none" />
      <View style={styles.glowCircleBottom} pointerEvents="none" />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex1}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <Pressable style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]} onPress={() => step === 2 ? setStep(1) : navigation.goBack()} hitSlop={20}>
            <Icon name="arrow-left" size={26} color="#0F172A" />
          </Pressable>

          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Icon name="shield-key-outline" size={42} color="#0284C7" />
            </View>
            <Text style={styles.title}>Recuperar Acceso</Text>
          </View>

          <View style={styles.cardWrapper}>
            <View style={styles.cleanCard}>
              <Text style={styles.welcomeText}>Restablecer Contraseña</Text>
              <Text style={styles.infoText}>
                {step === 1 ? "Introduce tu correo para buscar tu pregunta registrada." : "Responde tu pregunta y asigna una nueva clave de acceso."}
              </Text>

              {statusMessage && (
                <View style={[styles.statusBadge, statusMessage.type === 'error' ? styles.badgeError : styles.badgeSuccess]}>
                  <Icon name={statusMessage.type === 'error' ? "alert-circle-outline" : "check-circle-outline"} size={22} color={statusMessage.type === 'error' ? "#EF4444" : "#10B981"} />
                  <Text style={[styles.statusText, statusMessage.type === 'error' ? styles.textError : styles.textSuccess]}>
                    {statusMessage.text}
                  </Text>
                </View>
              )}

              {step === 1 ? (
                <>
                  <View style={[styles.inputWrapper, focusedInput === 'email' && styles.inputFocused]}>
                    <Icon name="email-outline" size={20} color={focusedInput === 'email' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Correo Electrónico" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" onFocus={() => setFocusedInput('email')} onBlur={() => setFocusedInput(null)} value={email} onChangeText={(text) => { setEmail(text); setStatusMessage(null); }} />
                  </View>
                  {isLoading ? <ActivityIndicator size="large" color="#0284C7" style={styles.loader}/> : (
                    <Pressable style={({ pressed }) => [styles.button, pressed && { transform: [{ scale: 0.98 }] }]} onPress={handleFetchQuestion}>
                      <Text style={styles.buttonText}>BUSCAR PREGUNTA</Text>
                      <Icon name="magnify" size={22} color="#fff" />
                    </Pressable>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.questionContainer}>
                    <Text style={styles.questionLabel}>Pregunta de Seguridad:</Text>
                    <Text style={styles.questionValue}>{preguntaObtenida}</Text>
                  </View>
                  <View style={[styles.inputWrapper, focusedInput === 'respuesta' && styles.inputFocused]}>
                    <Icon name="key-outline" size={20} color={focusedInput === 'respuesta' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Tu Respuesta" placeholderTextColor="#94A3B8" autoCapitalize="words" onFocus={() => setFocusedInput('respuesta')} onBlur={() => setFocusedInput(null)} value={respuesta} onChangeText={(text) => { setRespuesta(text); setStatusMessage(null); }} />
                  </View>
                  <View style={[styles.inputWrapper, focusedInput === 'newpass' && styles.inputFocused]}>
                    <Icon name="lock-reset" size={20} color={focusedInput === 'newpass' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Nueva Contraseña" placeholderTextColor="#94A3B8" secureTextEntry onFocus={() => setFocusedInput('newpass')} onBlur={() => setFocusedInput(null)} value={nuevaPassword} onChangeText={(text) => { setNuevaPassword(text); setStatusMessage(null); }} />
                  </View>
                  {isLoading ? <ActivityIndicator size="large" color="#0284C7" style={styles.loader}/> : (
                    <Pressable style={({ pressed }) => [styles.button, pressed && { transform: [{ scale: 0.98 }] }]} onPress={handleResetPassword}>
                      <Text style={styles.buttonText}>GUARDAR CLAVE</Text>
                      <Icon name="content-save-outline" size={22} color="#fff" />
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  glowCircleTop: { position: 'absolute', top: -80, right: -50, width: 250, height: 250, borderRadius: 125, backgroundColor: '#E0F2FE', opacity: 0.9 },
  glowCircleBottom: { position: 'absolute', bottom: -100, left: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: '#E0F2FE', opacity: 0.9 },
  flex1: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  backButton: { position: 'absolute', top: 15, left: 20, padding: 10, zIndex: 10, backgroundColor: '#FFFFFF', borderRadius: 14, elevation: 1, borderWidth: 1, borderColor: '#F1F5F9' },
  
  headerContent: { alignItems: 'center', marginTop: 85, marginBottom: 25 },
  logoContainer: { width: 80, height: 80, backgroundColor: '#FFFFFF', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#E0F2FE', elevation: 2, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: 0.5 },
  
  cardWrapper: { paddingHorizontal: 24 },
  cleanCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 26, borderWidth: 1, borderColor: '#E2E8F0', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 12 },
  welcomeText: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  infoText: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 22, fontWeight: '500' },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 20, borderWidth: 1 },
  badgeError: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  badgeSuccess: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  statusText: { fontSize: 13, marginLeft: 10, fontWeight: '700', flex: 1 },
  textError: { color: '#EF4444' },
  textSuccess: { color: '#10B981' },
  
  questionContainer: { backgroundColor: '#F8FAFC', padding: 18, borderRadius: 16, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#0284C7', borderWidth: 1, borderColor: '#E2E8F0' },
  questionLabel: { fontSize: 11, color: '#64748B', fontWeight: '800', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  questionValue: { fontSize: 16, color: '#0F172A', fontWeight: '800' },
  
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#E2E8F0', height: 60 },
  inputFocused: { borderColor: '#0284C7', backgroundColor: '#FFFFFF' },
  inputIcon: { paddingHorizontal: 16 },
  input: { flex: 1, color: '#0F172A', fontSize: 15, fontWeight: '600', paddingVertical: 0 },
  
  button: { flexDirection: 'row', backgroundColor: '#0284C7', borderRadius: 16, height: 60, justifyContent: 'center', alignItems: 'center', marginTop: 15, elevation: 3, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1, marginRight: 8 },
  loader: { marginVertical: 20 }
});

export default ForgotPasswordScreen;