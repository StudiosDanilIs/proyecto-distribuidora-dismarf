import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, StatusBar, 
  ScrollView, TouchableWithoutFeedback, Keyboard, Dimensions 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient from '../../api/client';

const { width } = Dimensions.get('window');

// Sugerencias rápidas por si el usuario no quiere escribir una desde cero
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
  
  // Ahora el usuario puede escribir libremente aquí
  const [preguntaSeguridad, setPreguntaSeguridad] = useState('');
  const [respuestaSeguridad, setRespuestaSeguridad] = useState('');
  
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const handleRegister = async () => {
    if (!nombre.trim() || !email.trim() || !password.trim() || !preguntaSeguridad.trim() || !respuestaSeguridad.trim()) {
      Alert.alert('Campos Incompletos', 'Por favor, completa todos los campos, incluyendo tu pregunta y respuesta de seguridad.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error de Validación', 'Las contraseñas ingresadas no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      // Aseguramos usar el prefijo /core/auth/ que tenías en tu versión original
      await apiClient.post('/core/auth/register', { 
        nombre, 
        email: email.trim().toLowerCase(), 
        password, 
        rol_id: 3,
        pregunta_seguridad: preguntaSeguridad.trim(),
        respuesta_seguridad: respuestaSeguridad.trim().toLowerCase()
      });

      Alert.alert('¡Registro Exitoso!', 'Tu cuenta ha sido creada correctamente. Ya puedes iniciar sesión.', [
        { text: 'Ir al Login', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error) {
      Alert.alert('Error en el Registro', 'No se pudo crear la cuenta. Verifica tu conexión o si el correo ya está registrado.');
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
            
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Icon name="arrow-left" size={26} color="#0284C7" />
            </TouchableOpacity>

            <View style={styles.headerContent}>
              <Text style={styles.title}>Crear Cuenta</Text>
              <Text style={styles.subtitle}>Monitoreo y Logística de Frío</Text>
            </View>

            <View style={styles.cardWrapper}>
              <View style={styles.card}>
                
                {/* NOMBRE */}
                <View style={[styles.inputWrapper, focusedInput === 'nombre' && styles.inputFocused]}>
                  <Icon name="account-outline" size={20} color={focusedInput === 'nombre' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Nombre Completo" placeholderTextColor="#94A3B8" onFocus={() => setFocusedInput('nombre')} onBlur={() => setFocusedInput(null)} value={nombre} onChangeText={setNombre} />
                </View>

                {/* EMAIL */}
                <View style={[styles.inputWrapper, focusedInput === 'email' && styles.inputFocused]}>
                  <Icon name="email-outline" size={20} color={focusedInput === 'email' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Correo Electrónico" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" onFocus={() => setFocusedInput('email')} onBlur={() => setFocusedInput(null)} value={email} onChangeText={setEmail} />
                </View>

                {/* CONTRASEÑA */}
                <View style={[styles.inputWrapper, focusedInput === 'password' && styles.inputFocused]}>
                  <Icon name="lock-outline" size={20} color={focusedInput === 'password' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Contraseña" placeholderTextColor="#94A3B8" secureTextEntry={!isPasswordVisible} onFocus={() => setFocusedInput('password')} onBlur={() => setFocusedInput(null)} value={password} onChangeText={setPassword} />
                  <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
                    <Icon name={isPasswordVisible ? "eye-outline" : "eye-off-outline"} size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* CONFIRMAR CONTRASEÑA */}
                <View style={[styles.inputWrapper, focusedInput === 'confirm' && styles.inputFocused]}>
                  <Icon name="lock-check-outline" size={20} color={focusedInput === 'confirm' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Confirmar Contraseña" placeholderTextColor="#94A3B8" secureTextEntry={!isPasswordVisible} onFocus={() => setFocusedInput('confirm')} onBlur={() => setFocusedInput(null)} value={confirmPassword} onChangeText={setConfirmPassword} />
                </View>

                {/* PREGUNTA DE SEGURIDAD (TEXTO LIBRE) */}
                <Text style={styles.sectionLabel}>Escribe tu Pregunta de Seguridad</Text>
                <View style={[styles.inputWrapper, focusedInput === 'pregunta' && styles.inputFocused]}>
                  <Icon name="help-circle-outline" size={20} color={focusedInput === 'pregunta' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Ej. ¿Cuál es mi película favorita?" 
                    placeholderTextColor="#94A3B8" 
                    autoCapitalize="sentences"
                    onFocus={() => setFocusedInput('pregunta')} 
                    onBlur={() => setFocusedInput(null)} 
                    value={preguntaSeguridad} 
                    onChangeText={setPreguntaSeguridad} 
                  />
                </View>

                {/* SUGERENCIAS RÁPIDAS */}
                <Text style={styles.subLabel}>Sugerencias rápidas (toca para usar):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                  {SUGERENCIAS_PREGUNTAS.map((item, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.chip}
                      onPress={() => setPreguntaSeguridad(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.chipText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* RESPUESTA DE SEGURIDAD */}
                <View style={[styles.inputWrapper, focusedInput === 'respuesta' && styles.inputFocused, { marginTop: 5 }]}>
                  <Icon name="shield-key-outline" size={20} color={focusedInput === 'respuesta' ? "#0284C7" : "#94A3B8"} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Tu Respuesta Secreta" 
                    placeholderTextColor="#94A3B8" 
                    autoCapitalize="words"
                    onFocus={() => setFocusedInput('respuesta')} 
                    onBlur={() => setFocusedInput(null)} 
                    value={respuestaSeguridad} 
                    onChangeText={setRespuestaSeguridad} 
                  />
                </View>

                {isLoading ? (
                  <ActivityIndicator size="large" color="#0284C7" style={styles.loader}/>
                ) : (
                  <TouchableOpacity style={styles.button} onPress={handleRegister} activeOpacity={0.85}>
                    <Text style={styles.buttonText}>CREAR CUENTA</Text>
                    <Icon name="arrow-right-circle-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.footerContainer}>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLinkText}>¿Ya tienes cuenta? <Text style={styles.loginLinkBold}>Inicia Sesión</Text></Text>
              </TouchableOpacity>
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
  softHeaderBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 220, backgroundColor: '#E0F2FE', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  scrollContent: { flexGrow: 1, paddingBottom: 30 },
  backButton: { position: 'absolute', top: 15, left: 20, padding: 10, zIndex: 10 },
  headerContent: { alignItems: 'center', marginTop: 40, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: 0.5 },
  subtitle: { fontSize: 12, color: '#0284C7', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '700' },
  cardWrapper: { paddingHorizontal: 20, alignItems: 'center' },
  card: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, elevation: 6, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 14, marginBottom: 14, borderWidth: 1.5, borderColor: 'transparent', height: 52 },
  inputFocused: { borderColor: '#0284C7', backgroundColor: '#FFFFFF' },
  inputIcon: { paddingHorizontal: 14 },
  input: { flex: 1, color: '#0F172A', fontSize: 14, paddingVertical: 0 },
  eyeIcon: { paddingHorizontal: 14, height: '100%', justifyContent: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 4, marginBottom: 8, paddingLeft: 4 },
  subLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 6, paddingLeft: 4 },
  chipsContainer: { paddingBottom: 10, alignItems: 'center' },
  chip: { backgroundColor: '#F1F5F9', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  chipText: { fontSize: 12, color: '#0284C7', fontWeight: '600' },
  button: { flexDirection: 'row', backgroundColor: '#0284C7', borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 4, shadowColor: '#0284C7', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.8, marginRight: 8 },
  loader: { marginTop: 20, marginBottom: 10 },
  footerContainer: { marginTop: 25, alignItems: 'center', paddingBottom: 20 },
  loginLinkText: { color: '#64748B', fontSize: 14 },
  loginLinkBold: { color: '#0284C7', fontWeight: '800' }
});

export default RegisterScreen;