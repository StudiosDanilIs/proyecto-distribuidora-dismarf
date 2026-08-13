import React, { useState } from 'react';
import { 
  View, Text, TextInput, StyleSheet, ActivityIndicator, 
  KeyboardAvoidingView, Platform, Alert, StatusBar, ScrollView, Pressable 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient from '../../api/client';

const SUGERENCIAS_PREGUNTAS = [
  "¿Nombre de tu primera mascota?",
  "¿Ciudad donde naciste?",
  "¿Apodo de la infancia?"
];

const RegisterScreen = ({ navigation }) => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preguntaSeguridad, setPreguntaSeguridad] = useState('');
  const [respuestaSeguridad, setRespuestaSeguridad] = useState('');
  
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const handleRegister = async () => {
    if (!nombre.trim() || !email.trim() || !password.trim() || !preguntaSeguridad.trim() || !respuestaSeguridad.trim()) {
      Alert.alert('Datos Incompletos', 'Por favor, rellena todos los campos requeridos para el personal.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/api/auth/register', { 
        nombre, email: email.trim().toLowerCase(), password, rol_id: 3,
        pregunta_seguridad: preguntaSeguridad.trim(),
        respuesta_seguridad: respuestaSeguridad.trim().toLowerCase()
      });
      Alert.alert('¡Registro Exitoso!', 'Ya puedes acceder al sistema.', [{ text: 'Ir al Login', onPress: () => navigation.navigate('Login') }]);
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la cuenta. Verifica la conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />
      <View style={styles.glowCircleTop} pointerEvents="none" />
      <View style={styles.glowCircleBottom} pointerEvents="none" />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex1}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <Pressable style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]} onPress={() => navigation.goBack()} hitSlop={20}>
            <Icon name="arrow-left" size={26} color="#0F172A" />
          </Pressable>

          <View style={styles.headerContent}>
            <Text style={styles.title}>Registro de Usuario</Text>
            <Text style={styles.subtitle}>SISTEMA CORPORATIVO DISMARF</Text>
          </View>

          <View style={styles.cardWrapper}>
            <View style={styles.cleanCard}>
              
              <View style={[styles.inputWrapper, focusedInput === 'nombre' && styles.inputFocused]}>
                <Icon name="account-outline" size={20} color={focusedInput === 'nombre' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Nombre Completo" placeholderTextColor="#94A3B8" onFocus={() => setFocusedInput('nombre')} onBlur={() => setFocusedInput(null)} value={nombre} onChangeText={(text) => setNombre(text)} />
              </View>

              <View style={[styles.inputWrapper, focusedInput === 'email' && styles.inputFocused]}>
                <Icon name="email-outline" size={20} color={focusedInput === 'email' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Correo Corporativo / Personal" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" onFocus={() => setFocusedInput('email')} onBlur={() => setFocusedInput(null)} value={email} onChangeText={(text) => setEmail(text)} />
              </View>

              <View style={[styles.inputWrapper, focusedInput === 'password' && styles.inputFocused]}>
                <Icon name="lock-outline" size={20} color={focusedInput === 'password' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Contraseña" placeholderTextColor="#94A3B8" secureTextEntry={!isPasswordVisible} onFocus={() => setFocusedInput('password')} onBlur={() => setFocusedInput(null)} value={password} onChangeText={(text) => setPassword(text)} />
                <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon} hitSlop={15}>
                  <Icon name={isPasswordVisible ? "eye-outline" : "eye-off-outline"} size={20} color="#94A3B8" />
                </Pressable>
              </View>

              <View style={[styles.inputWrapper, focusedInput === 'confirm' && styles.inputFocused]}>
                <Icon name="lock-check-outline" size={20} color={focusedInput === 'confirm' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Confirmar Contraseña" placeholderTextColor="#94A3B8" secureTextEntry={!isPasswordVisible} onFocus={() => setFocusedInput('confirm')} onBlur={() => setFocusedInput(null)} value={confirmPassword} onChangeText={(text) => setConfirmPassword(text)} />
              </View>

              <Text style={styles.sectionLabel}>Cuestionario de Recuperación</Text>
              
              <View style={[styles.inputWrapper, focusedInput === 'pregunta' && styles.inputFocused]}>
                <Icon name="help-circle-outline" size={20} color={focusedInput === 'pregunta' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Tu pregunta secreta" placeholderTextColor="#94A3B8" autoCapitalize="sentences" onFocus={() => setFocusedInput('pregunta')} onBlur={() => setFocusedInput(null)} value={preguntaSeguridad} onChangeText={(text) => setPreguntaSeguridad(text)} />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer} keyboardShouldPersistTaps="handled">
                {SUGERENCIAS_PREGUNTAS.map((item, index) => (
                  <Pressable key={index} style={({ pressed }) => [styles.chip, pressed && { backgroundColor: '#E0F2FE' }]} onPress={() => setPreguntaSeguridad(item)}>
                    <Text style={styles.chipText}>{item}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={[styles.inputWrapper, focusedInput === 'respuesta' && styles.inputFocused, { marginTop: 5 }]}>
                <Icon name="shield-key-outline" size={20} color={focusedInput === 'respuesta' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Tu respuesta secreta" placeholderTextColor="#94A3B8" autoCapitalize="words" onFocus={() => setFocusedInput('respuesta')} onBlur={() => setFocusedInput(null)} value={respuestaSeguridad} onChangeText={(text) => setRespuestaSeguridad(text)} />
              </View>

              {isLoading ? (
                <ActivityIndicator size="large" color="#0284C7" style={styles.loader}/>
              ) : (
                <Pressable style={({ pressed }) => [styles.button, pressed && { transform: [{ scale: 0.98 }] }]} onPress={handleRegister}>
                  <Text style={styles.buttonText}>FINALIZAR REGISTRO</Text>
                  <Icon name="arrow-right-circle-outline" size={22} color="#fff" />
                </Pressable>
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
  glowCircleTop: { position: 'absolute', top: -100, left: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: '#E0F2FE', opacity: 0.9 },
  glowCircleBottom: { position: 'absolute', bottom: -150, right: -100, width: 400, height: 400, borderRadius: 200, backgroundColor: '#E0F2FE', opacity: 0.6 },
  flex1: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 50 },
  backButton: { position: 'absolute', top: 15, left: 20, padding: 10, zIndex: 10, backgroundColor: '#FFFFFF', borderRadius: 14, elevation: 1, borderWidth: 1, borderColor: '#F1F5F9' },
  
  headerContent: { alignItems: 'center', marginTop: 80, marginBottom: 25 },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: 0.5 },
  subtitle: { fontSize: 11, color: '#0284C7', marginTop: 6, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '800' },
  
  cardWrapper: { paddingHorizontal: 24 },
  cleanCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 26, borderWidth: 1, borderColor: '#E2E8F0', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 12 },
  
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#E2E8F0', height: 60 },
  inputFocused: { borderColor: '#0284C7', backgroundColor: '#FFFFFF' },
  inputIcon: { paddingHorizontal: 16 },
  input: { flex: 1, color: '#0F172A', fontSize: 15, fontWeight: '600', paddingVertical: 0 },
  eyeIcon: { paddingHorizontal: 16, height: '100%', justifyContent: 'center' },
  
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#64748B', marginTop: 8, marginBottom: 14, paddingLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipsContainer: { paddingBottom: 16, alignItems: 'center' },
  chip: { backgroundColor: '#F0F9FF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#BAE6FD' },
  chipText: { fontSize: 13, color: '#0284C7', fontWeight: '800' },
  
  button: { flexDirection: 'row', backgroundColor: '#0284C7', borderRadius: 16, height: 60, justifyContent: 'center', alignItems: 'center', marginTop: 15, elevation: 3, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1, marginRight: 8 },
  loader: { marginTop: 25, marginBottom: 10 },
});

export default RegisterScreen;