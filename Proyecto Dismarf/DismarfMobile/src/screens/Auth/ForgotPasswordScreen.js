import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  KeyboardAvoidingView, Platform, StatusBar, TouchableWithoutFeedback, 
  Keyboard, ScrollView, ActivityIndicator 
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

  // PASO 1: Buscar la pregunta usando el prefijo correcto (/core/auth)
  const handleFetchQuestion = async () => {
    if (!email.trim()) {
      setStatusMessage({ type: 'error', text: 'Por favor ingresa tu correo electrónico.' });
      return;
    }
    
    setIsLoading(true);
    setStatusMessage(null);
    try {
      // ¡CORRECCIÓN AQUÍ! Usamos /core/auth/ para coincidir con tu API Gateway
      const response = await apiClient.post('/core/auth/get-security-question', { 
        email: email.trim().toLowerCase() 
      });
      
      // Validamos si el usuario es antiguo y tiene la pregunta en NULL
      if (!response.data.pregunta_seguridad) {
        setStatusMessage({ 
          type: 'error', 
          text: 'Esta cuenta es antigua y no tiene una pregunta de seguridad configurada.' 
        });
        setIsLoading(false);
        return;
      }

      setPreguntaObtenida(response.data.pregunta_seguridad);
      setStep(2);
    } catch (error) {
      setStatusMessage({ 
        type: 'error', 
        text: 'No se encontró una cuenta asociada o la ruta es incorrecta.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // PASO 2: Validar la respuesta y actualizar
  const handleResetPassword = async () => {
    if (!respuesta.trim() || !nuevaPassword.trim()) {
      setStatusMessage({ type: 'error', text: 'Completa tu respuesta y la nueva contraseña.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    try {
      // ¡CORRECCIÓN AQUÍ TAMBIÉN! Usamos /core/auth/
      await apiClient.post('/core/auth/reset-password-security', {
        email: email.trim().toLowerCase(),
        respuesta_seguridad: respuesta.trim().toLowerCase(),
        nueva_password: nuevaPassword
      });

      setStatusMessage({ 
        type: 'success', 
        text: '¡Contraseña actualizada! Redirigiendo al login...' 
      });

      setTimeout(() => navigation.navigate('Login'), 2500);
    } catch (error) {
      setStatusMessage({ 
        type: 'error', 
        text: 'La respuesta de seguridad es incorrecta. Inténtalo de nuevo.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.mainContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F0F9FF" translucent={false} />
        <View style={styles.softHeaderBackground} />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex1}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            
            <TouchableOpacity style={styles.backButton} onPress={() => step === 2 ? setStep(1) : navigation.goBack()}>
              <Icon name="arrow-left" size={26} color="#0284C7" />
            </TouchableOpacity>

            <View style={styles.headerContent}>
              <View style={styles.logoCircle}>
                <Icon name="shield-lock-outline" size={38} color="#0284C7" />
              </View>
              <Text style={styles.title}>Recuperar Acceso</Text>
            </View>

            <View style={styles.cardWrapper}>
              <View style={styles.card}>
                <Text style={styles.welcomeText}>Restablecer Contraseña</Text>
                
                <Text style={styles.infoText}>
                  {step === 1 
                    ? "Introduce tu correo para buscar tu pregunta de seguridad registrada."
                    : "Responde tu pregunta de seguridad y asigna una nueva contraseña secreta."}
                </Text>

                {statusMessage && (
                  <View style={[styles.statusBadge, statusMessage.type === 'error' ? styles.badgeError : styles.badgeSuccess]}>
                    <Icon name={statusMessage.type === 'error' ? "alert-circle-outline" : "check-circle-outline"} size={18} color={statusMessage.type === 'error' ? "#EF4444" : "#10B981"} />
                    <Text style={[styles.statusText, statusMessage.type === 'error' ? styles.textError : styles.textSuccess]}>
                      {statusMessage.text}
                    </Text>
                  </View>
                )}

                {step === 1 ? (
                  <>
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
                        onChangeText={(text) => { setEmail(text); setStatusMessage(null); }} 
                      />
                    </View>

                    {isLoading ? (
                      <ActivityIndicator size="large" color="#0284C7" style={styles.loader}/>
                    ) : (
                      <TouchableOpacity style={styles.button} onPress={handleFetchQuestion} activeOpacity={0.85}>
                        <Text style={styles.buttonText}>BUSCAR PREGUNTA</Text>
                        <Icon name="magnify" size={20} color="#fff" />
                      </TouchableOpacity>
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
                      <TextInput 
                        style={styles.input} 
                        placeholder="Tu Respuesta" 
                        placeholderTextColor="#94A3B8" 
                        autoCapitalize="words"
                        onFocus={() => setFocusedInput('respuesta')} 
                        onBlur={() => setFocusedInput(null)} 
                        value={respuesta} 
                        onChangeText={(text) => { setRespuesta(text); setStatusMessage(null); }} 
                      />
                    </View>

                    <View style={[styles.inputWrapper, focusedInput === 'newpass' && styles.inputFocused]}>
                      <Icon name="lock-reset" size={20} color={focusedInput === 'newpass' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                      <TextInput 
                        style={styles.input} 
                        placeholder="Nueva Contraseña" 
                        placeholderTextColor="#94A3B8" 
                        secureTextEntry
                        onFocus={() => setFocusedInput('newpass')} 
                        onBlur={() => setFocusedInput(null)} 
                        value={nuevaPassword} 
                        onChangeText={(text) => { setNuevaPassword(text); setStatusMessage(null); }} 
                      />
                    </View>

                    {isLoading ? (
                      <ActivityIndicator size="large" color="#0284C7" style={styles.loader}/>
                    ) : (
                      <TouchableOpacity style={styles.button} onPress={handleResetPassword} activeOpacity={0.85}>
                        <Text style={styles.buttonText}>GUARDAR CONTRASEÑA</Text>
                        <Icon name="content-save-outline" size={20} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </>
                )}

              </View>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  flex1: { flex: 1 },
  softHeaderBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 240, backgroundColor: '#E0F2FE', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  scrollContent: { flexGrow: 1, paddingBottom: 30 },
  backButton: { position: 'absolute', top: 15, left: 20, padding: 10, zIndex: 10 },
  headerContent: { alignItems: 'center', marginTop: 40, marginBottom: 25 },
  logoCircle: { width: 70, height: 70, backgroundColor: '#FFFFFF', borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 12, elevation: 4, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  title: { fontSize: 26, fontWeight: '900', color: '#0F172A', letterSpacing: 0.5 },
  cardWrapper: { paddingHorizontal: 20, alignItems: 'center' },
  card: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, elevation: 6, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12 },
  welcomeText: { fontSize: 19, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  infoText: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 18 },
  badgeError: { backgroundColor: '#FEF2F2' },
  badgeSuccess: { backgroundColor: '#ECFDF5' },
  statusText: { fontSize: 13, marginLeft: 8, fontWeight: '600', flex: 1 },
  textError: { color: '#EF4444' },
  textSuccess: { color: '#10B981' },
  questionContainer: { backgroundColor: '#F1F5F9', padding: 14, borderRadius: 14, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#0284C7' },
  questionLabel: { fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  questionValue: { fontSize: 14, color: '#0F172A', fontWeight: '700' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 14, marginBottom: 14, borderWidth: 1.5, borderColor: 'transparent', height: 52 },
  inputFocused: { borderColor: '#0284C7', backgroundColor: '#FFFFFF' },
  inputIcon: { paddingHorizontal: 14 },
  input: { flex: 1, color: '#0F172A', fontSize: 14, paddingVertical: 0 },
  button: { flexDirection: 'row', backgroundColor: '#0284C7', borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 6, elevation: 4, shadowColor: '#0284C7', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.8, marginRight: 8 },
  loader: { marginVertical: 15 }
});

export default ForgotPasswordScreen;