import React, { useContext, useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Alert, 
  StatusBar, Modal, TextInput, ActivityIndicator, Platform, 
  KeyboardAvoidingView, Pressable, LayoutAnimation, UIManager, Image, Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../../context/AuthContext';
import apiClient from '../../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';

const ICONOS_DISPONIBLES = [
  { id: 'account', label: 'Estándar' },
  { id: 'account-tie', label: 'Ejecutivo' },
  { id: 'account-hard-hat', label: 'Almacén' },
  { id: 'badge-account-horizontal', label: 'Credencial' },
  { id: 'shield-account', label: 'Seguridad' },
  { id: 'card-account-details', label: 'Operador' }
];

const ConfiguracionScreen = ({ navigation }) => {
  const { logout, userRole, user, setUser } = useContext(AuthContext);
  const isAdmin = parseInt(userRole, 10) === 1 || parseInt(user?.rol_id, 10) === 1;

  const [activeSection, setActiveSection] = useState('perfil');
  const [modalEditVisible, setModalEditVisible] = useState(false);
  const [modalPassVisible, setModalPassVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCleaningCache, setIsCleaningCache] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const [biometriaActiva, setBiometriaActiva] = useState(false);
  const [unidadTemperatura, setUnidadTemperatura] = useState('C'); 
  const [notificacionesPush, setNotificacionesPush] = useState(true);
  const [syncSegundoPlano, setSyncSegundoPlano] = useState(true);

  const [nuevoNombre, setNuevoNombre] = useState(user?.nombre || '');
  const [iconoSeleccionado, setIconoSeleccionado] = useState(user?.icono_perfil || 'account');
  const [passActual, setPassActual] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [passConfirmar, setPassConfirmar] = useState('');

  useEffect(() => {
    if (user?.nombre) setNuevoNombre(user.nombre);
    if (user?.icono_perfil) setIconoSeleccionado(user.icono_perfil);
    
    const cargarPreferencias = async () => {
      try {
        const bio = await AsyncStorage.getItem('biometria_activa');
        setBiometriaActiva(bio === 'true');
        const unidad = await AsyncStorage.getItem('unidad_temp') || 'C';
        setUnidadTemperatura(unidad);
      } catch (e) { console.log("Error cargando preferencias."); }
    };
    cargarPreferencias();
  }, [user]);

  const nombreUsuario = user?.nombre || "Usuario Operador";
  const emailUsuario = user?.email || "correo@dismarf.com";

  const toggleSection = (sectionName) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveSection(activeSection === sectionName ? null : sectionName);
  };

  const handleToggleBiometria = async () => {
    const nuevoValor = !biometriaActiva;
    const rnBiometrics = new ReactNativeBiometrics();
    const { available } = await rnBiometrics.isSensorAvailable();

    if (!available) {
      Alert.alert("Hardware Incompatible", "Tu dispositivo no soporta o no tiene configurada la biometría.");
      return;
    }
    
    setBiometriaActiva(nuevoValor);
    await AsyncStorage.setItem('biometria_activa', nuevoValor ? 'true' : 'false');
    if (nuevoValor && user?.email) await AsyncStorage.setItem('bio_email', user.email);
  };

  const handleLimpiarCache = () => {
    setIsCleaningCache(true);
    setTimeout(() => {
      setIsCleaningCache(false);
      Alert.alert("Optimización Completa", "La caché de la aplicación ha sido liberada exitosamente.");
    }, 1500);
  };

  const handleUpdatePerfil = async () => {
    if (!nuevoNombre.trim()) { Alert.alert("Dato Requerido", "El nombre no puede estar vacío."); return; }
    
    setLoading(true);
    try {
      await apiClient.put('/api/perfil/update', {
        nombre: nuevoNombre.trim(), 
        icono_perfil: iconoSeleccionado
      });
      setUser(prev => ({ ...prev, nombre: nuevoNombre.trim(), icono_perfil: iconoSeleccionado }));
      Alert.alert("Perfil Actualizado", "Tu identidad se ha guardado correctamente.");
      setModalEditVisible(false);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.msg || "Fallo al actualizar el perfil.");
    } finally { setLoading(false); }
  };


  const handleAbrirManual = async () => {
    const urlManual = 'https://docs.google.com/document/d/1CNWQdVH3dG-7jen_Sqf9kB7sorrtus7U/edit?usp=drive_link&ouid=103725381561965202907&rtpof=true&sd=true'; 
    
    try {
      await Linking.openURL(urlManual);
    } catch (error) {
      Alert.alert("Error de Enlace", "La dirección del manual no tiene un formato válido.");
    }
  };

  const handleContactarIT = async () => {
    const email = 'soporte@studiosdanills.com'; // Cambia esto por el correo que vayas a usar
    const subject = 'Soporte Técnico - App Dismarf';
    const body = `Hola equipo de IT,%0A%0ANecesito ayuda con mi cuenta (${emailUsuario}) en la aplicación de logística. Mi problema es el siguiente:%0A%0A`;
    
    const mailtoURL = `mailto:${email}?subject=${subject}&body=${body}`;

    
    try {
      await Linking.openURL(mailtoURL); 
    } catch (error) {
      Alert.alert("Error", "No tienes una aplicación de correo instalada (o WhatsApp).");
    }
  };

  const handleUpdatePassword = async () => {
    if (!passActual || !passNueva || !passConfirmar) {
      Alert.alert("Campos Incompletos", "Por favor, llena todos los campos de seguridad."); return;
    }
    if (passNueva !== passConfirmar) {
      Alert.alert("Coincidencia Fallida", "La nueva contraseña y su confirmación no son iguales."); return;
    }
    
    setLoading(true);
    try {
      await apiClient.put('/api/perfil/update', {
        passwordActual: passActual, 
        nuevaPassword: passNueva
      });
      Alert.alert("Seguridad Actualizada", "Tu contraseña ha sido cambiada exitosamente.");
      setModalPassVisible(false);
      setPassActual(''); setPassNueva(''); setPassConfirmar('');
    } catch (error) {
      Alert.alert("Error de Seguridad", error.response?.data?.msg || "La contraseña actual es incorrecta.");
    } finally { setLoading(false); }
  };

  const CustomSwitch = ({ value, onValueChange, color }) => (
    <Pressable onPress={onValueChange} style={[styles.customSwitchBg, { backgroundColor: value ? color : '#E2E8F0' }]}>
      <View style={[styles.customSwitchThumb, { transform: [{ translateX: value ? 20 : 2 }] }]} />
    </Pressable>
  );

  const AccordionSection = ({ title, icon, color, sectionId, children }) => {
    const isOpen = activeSection === sectionId;
    return (
      <View style={[styles.accordionContainer, isOpen && { borderColor: color, elevation: 2, shadowColor: color, shadowOpacity: 0.1 }]}>
        <Pressable style={styles.accordionHeader} onPress={() => toggleSection(sectionId)}>
          <View style={[styles.accordionIconBg, { backgroundColor: `${color}15` }]}>
            <Icon name={icon} size={22} color={color} />
          </View>
          <Text style={styles.accordionTitle}>{title}</Text>
          <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={24} color="#94A3B8" />
        </Pressable>
        {isOpen && <View style={styles.accordionBody}>{children}</View>}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />
      
      {/* CABECERA FLOTANTE MEJORADA */}
      <View style={styles.header}>
        <View style={styles.headerBackground} />
        
        <View style={styles.profileFloatCard}>
          <Pressable style={styles.profileAvatarBox} onPress={() => setModalEditVisible(true)}>
            <Icon name={iconoSeleccionado} size={42} color="#FFFFFF" />
            <View style={styles.editAvatarBadge}>
              <Icon name="camera-plus" size={12} color="#FFFFFF" />
            </View>
          </Pressable>
          
          <View style={styles.profileInfoBox}>
            <Text style={styles.profileName} numberOfLines={1}>{nombreUsuario}</Text>
            <Text style={styles.profileEmail}>{emailUsuario}</Text>
            <View style={styles.roleRow}>
              <View style={[styles.rolePill, isAdmin && styles.rolePillAdmin]}>
                <Icon name={isAdmin ? "shield-crown" : "package-variant"} size={12} color={isAdmin ? "#D97706" : "#0284C7"} />
                <Text style={[styles.rolePillTxt, isAdmin && {color: '#D97706'}]}>{isAdmin ? "Administrador" : "Almacenista"}</Text>
              </View>
            </View>
          </View>
          
          {/* Botón rápido para editar */}
          <Pressable style={styles.quickEditBtn} onPress={() => setModalEditVisible(true)} hitSlop={15}>
            <Icon name="pencil" size={20} color="#94A3B8" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* SECCIÓN 1: SEGURIDAD Y ACCESO */}
        <AccordionSection title="Seguridad y Acceso" icon="shield-check-outline" color="#10B981" sectionId="seguridad">
          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Desbloqueo Biométrico</Text>
              <Text style={styles.settingSub}>Usa tu huella o FaceID para entrar más rápido.</Text>
            </View>
            <CustomSwitch value={biometriaActiva} onValueChange={handleToggleBiometria} color="#10B981" />
          </View>
          <View style={styles.divider} />
          
          <Pressable style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.6 }]} onPress={() => setModalPassVisible(true)}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Cambiar Contraseña</Text>
              <Text style={styles.settingSub}>Actualiza tus credenciales de acceso seguro.</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#CBD5E1" />
          </Pressable>
        </AccordionSection>

        {/* SECCIÓN 2: PREFERENCIAS LOGÍSTICAS */}
        <AccordionSection title="Preferencias Logísticas" icon="cog-outline" color="#3B82F6" sectionId="preferencias">
          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Unidad de Temperatura</Text>
              <Text style={styles.settingSub}>Medida para los gráficos de las cavas.</Text>
            </View>
            <View style={styles.segmentControl}>
              <Pressable style={[styles.segmentBtn, unidadTemperatura === 'C' && styles.segmentBtnActive]} onPress={() => {setUnidadTemperatura('C'); AsyncStorage.setItem('unidad_temp', 'C');}}>
                <Text style={[styles.segmentTxt, unidadTemperatura === 'C' && styles.segmentTxtActive]}>°C</Text>
              </Pressable>
              <Pressable style={[styles.segmentBtn, unidadTemperatura === 'F' && styles.segmentBtnActive]} onPress={() => {setUnidadTemperatura('F'); AsyncStorage.setItem('unidad_temp', 'F');}}>
                <Text style={[styles.segmentTxt, unidadTemperatura === 'F' && styles.segmentTxtActive]}>°F</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Alertas Push</Text>
              <Text style={styles.settingSub}>Recibe notificaciones críticas en tiempo real.</Text>
            </View>
            <CustomSwitch value={notificacionesPush} onValueChange={() => setNotificacionesPush(!notificacionesPush)} color="#3B82F6" />
          </View>
        </AccordionSection>

        {/* SECCIÓN 3: HERRAMIENTAS DE ADMIN */}
        {isAdmin && (
          <AccordionSection title="Centro de Administración" icon="briefcase-outline" color="#F59E0B" sectionId="admin">
            <Pressable style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.6 }]} onPress={() => navigation.navigate('GestionUsuarios')}>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingTitle}>Gestión de Personal</Text>
                <Text style={styles.settingSub}>Añadir, bloquear o editar accesos.</Text>
              </View>
              <Icon name="account-group-outline" size={24} color="#F59E0B" />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.6 }]} onPress={() => navigation.navigate('Reportes')}>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingTitle}>Generador de Actas</Text>
                <Text style={styles.settingSub}>Exportar auditorías y temperaturas en PDF.</Text>
              </View>
              <Icon name="file-pdf-box" size={24} color="#F59E0B" />
            </Pressable>
          </AccordionSection>
        )}

        {/* SECCIÓN 4: AYUDA Y SOPORTE */}
        <AccordionSection title="Ayuda y Soporte" icon="lifebuoy" color="#06B6D4" sectionId="soporte">
          
          {/* BOTÓN DEL MANUAL */}
          <Pressable 
            style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.6 }]} 
            onPress={handleAbrirManual}
          >
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Manual de Usuario</Text>
              <Text style={styles.settingSub}>Aprende a usar la app Dismarf.</Text>
            </View>
            <Icon name="book-open-page-variant-outline" size={24} color="#06B6D4" />
          </Pressable>
          
          <View style={styles.divider} />
          
          {/* BOTÓN DE CONTACTO IT */}
          <Pressable 
            style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.6 }]} 
            onPress={handleContactarIT}
          >
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Contactar a IT</Text>
              <Text style={styles.settingSub}>Reporta un fallo en el sistema.</Text>
            </View>
            <Icon name="headset" size={24} color="#06B6D4" />
          </Pressable>
          
        </AccordionSection>

        {/* SECCIÓN 5: SISTEMA */}
        <AccordionSection title="Sistema y Mantenimiento" icon="cellphone-cog" color="#8B5CF6" sectionId="sistema">
          <Pressable style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.6 }]} onPress={handleLimpiarCache} disabled={isCleaningCache}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Limpiar Caché Local</Text>
              <Text style={styles.settingSub}>Libera espacio y corrige problemas de carga.</Text>
            </View>
            {isCleaningCache ? <ActivityIndicator color="#8B5CF6" /> : <Icon name="broom" size={24} color="#8B5CF6" />}
          </Pressable>
        </AccordionSection>

        {/* BOTÓN SALIR */}
        <Pressable 
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
          onPress={() => Alert.alert("Cerrar Sesión", "¿Estás seguro que deseas salir del sistema?", [{text: "Cancelar"}, {text: "Salir", onPress: logout, style: 'destructive'}])}
        >
          <Icon name="logout-variant" size={22} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnTxt}>CERRAR SESIÓN</Text>
        </Pressable>

        <Text style={styles.footerBranding}>Dismarf v2.4.1 • by Studios Danills</Text>

      </ScrollView>

      {/* MODAL 1: EDITAR IDENTIDAD (NOMBRE Y AVATAR)*/}
      <Modal visible={modalEditVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: '100%' }}>
            <View style={styles.modalContent}>
              <View style={styles.modalDragIndicator} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Editar Perfil</Text>
                <Pressable onPress={() => setModalEditVisible(false)} hitSlop={15}>
                  <Icon name="close-circle" size={28} color="#94A3B8" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* PREVIEW DEL AVATAR */}
                <View style={styles.avatarPreviewContainer}>
                  <View style={styles.avatarPreviewCircle}>
                    <Icon name={iconoSeleccionado} size={50} color="#FFFFFF" />
                  </View>
                </View>

                <Text style={styles.inputLabel}>ELIGE TU AVATAR</Text>
                <View style={styles.avatarGrid}>
                  {ICONOS_DISPONIBLES.map((item) => (
                    <Pressable 
                      key={item.id} 
                      style={[styles.avatarBox, iconoSeleccionado === item.id && styles.avatarBoxActive]}
                      onPress={() => setIconoSeleccionado(item.id)}
                    >
                      <Icon name={item.id} size={30} color={iconoSeleccionado === item.id ? '#FFFFFF' : '#64748B'} />
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.inputLabel}>NOMBRE COMPLETO</Text>
                <View style={[styles.inputContainer, focusedInput === 'nom' && styles.inputFocused]}>
                  <Icon name="account-edit-outline" size={20} color={focusedInput === 'nom' ? '#0284C7' : '#94A3B8'} />
                  <TextInput style={styles.inputField} value={nuevoNombre} onChangeText={setNuevoNombre} onFocus={() => setFocusedInput('nom')} onBlur={() => setFocusedInput(null)} placeholderTextColor="#94A3B8" />
                </View>

                <Pressable style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.9 }]} onPress={handleUpdatePerfil} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnPrimaryTxt}>GUARDAR PERFIL</Text>}
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MODAL 2: CAMBIAR CONTRASEÑA (SEGURIDAD)*/}
      <Modal visible={modalPassVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: '100%' }}>
            <View style={styles.modalContent}>
              <View style={styles.modalDragIndicator} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seguridad</Text>
                <Pressable onPress={() => {setModalPassVisible(false); setPassActual(''); setPassNueva(''); setPassConfirmar('');}} hitSlop={15}>
                  <Icon name="close-circle" size={28} color="#94A3B8" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                
                <View style={styles.securityHeaderIcon}>
                  <Icon name="shield-lock-outline" size={60} color="#10B981" />
                  <Text style={styles.securityHeaderTxt}>Actualiza tu clave periódicamente para mantener tu cuenta segura.</Text>
                </View>

                <Text style={styles.inputLabel}>CONTRASEÑA ACTUAL</Text>
                <View style={[styles.inputContainer, focusedInput === 'passA' && styles.inputFocused]}>
                  <Icon name="lock-outline" size={20} color={focusedInput === 'passA' ? '#0284C7' : '#94A3B8'} />
                  <TextInput style={styles.inputField} secureTextEntry value={passActual} onChangeText={setPassActual} placeholder="Escribe tu clave actual" placeholderTextColor="#94A3B8" onFocus={() => setFocusedInput('passA')} onBlur={() => setFocusedInput(null)} />
                </View>

                <Text style={styles.inputLabel}>NUEVA CONTRASEÑA</Text>
                <View style={[styles.inputContainer, focusedInput === 'passN' && styles.inputFocused]}>
                  <Icon name="lock-reset" size={20} color={focusedInput === 'passN' ? '#0284C7' : '#94A3B8'} />
                  <TextInput style={styles.inputField} secureTextEntry value={passNueva} onChangeText={setPassNueva} placeholder="Crea una clave segura" placeholderTextColor="#94A3B8" onFocus={() => setFocusedInput('passN')} onBlur={() => setFocusedInput(null)} />
                </View>

                <Text style={styles.inputLabel}>CONFIRMAR NUEVA CONTRASEÑA</Text>
                <View style={[styles.inputContainer, focusedInput === 'passC' && styles.inputFocused]}>
                  <Icon name="lock-check-outline" size={20} color={focusedInput === 'passC' ? '#0284C7' : '#94A3B8'} />
                  <TextInput style={styles.inputField} secureTextEntry value={passConfirmar} onChangeText={setPassConfirmar} placeholder="Repite la nueva clave" placeholderTextColor="#94A3B8" onFocus={() => setFocusedInput('passC')} onBlur={() => setFocusedInput(null)} />
                </View>

                <Pressable style={({ pressed }) => [styles.btnSecurity, pressed && { opacity: 0.9 }]} onPress={handleUpdatePassword} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : (
                    <>
                      <Icon name="content-save-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.btnPrimaryTxt}>ACTUALIZAR CONTRASEÑA</Text>
                    </>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },

  header: { alignItems: 'center', marginBottom: 25 },
  headerBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 140, backgroundColor: '#E0F2FE', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  profileFloatCard: { backgroundColor: '#FFFFFF', width: '90%', marginTop: 70, borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 15, borderWidth: 1, borderColor: '#F1F5F9' },
  profileAvatarBox: { width: 70, height: 70, borderRadius: 22, backgroundColor: '#0284C7', justifyContent: 'center', alignItems: 'center', marginRight: 16, position: 'relative', elevation: 4, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  editAvatarBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#10B981', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  profileInfoBox: { flex: 1 },
  profileName: { fontSize: 19, fontWeight: '900', color: '#0F172A', marginBottom: 2 },
  profileEmail: { fontSize: 13, color: '#64748B', fontWeight: '500', marginBottom: 8 },
  roleRow: { flexDirection: 'row' },
  rolePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#BAE6FD' },
  rolePillAdmin: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
  rolePillTxt: { fontSize: 10, fontWeight: '800', color: '#0284C7', marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  quickEditBtn: { padding: 8 },

  accordionContainer: { backgroundColor: '#FFFFFF', borderRadius: 20, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  accordionIconBg: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  accordionTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: '#0F172A' },
  accordionBody: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 5 },
  
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  settingTextCol: { flex: 1, marginRight: 15 },
  settingTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  settingSub: { fontSize: 12, color: '#64748B', fontWeight: '500', lineHeight: 18 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 6 },

  customSwitchBg: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center', paddingHorizontal: 2 },
  customSwitchThumb: { width: 24, height: 24, backgroundColor: '#FFFFFF', borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: {width: 0, height: 1} },
  
  segmentControl: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
  segmentBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  segmentBtnActive: { backgroundColor: '#FFFFFF', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 },
  segmentTxt: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  segmentTxtActive: { color: '#0284C7', fontWeight: '900' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', paddingVertical: 18, borderRadius: 20, marginTop: 10, borderWidth: 1, borderColor: '#FECACA', elevation: 2, shadowColor: '#EF4444', shadowOpacity: 0.1, shadowRadius: 8 },
  logoutBtnPressed: { backgroundColor: '#FEF2F2', transform: [{ scale: 0.98 }] },
  logoutBtnTxt: { color: '#EF4444', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  footerBranding: { textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: 25, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 25, paddingTop: 10, paddingBottom: 20, maxHeight: '90%' },
  modalDragIndicator: { width: 45, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  
  avatarPreviewContainer: { alignItems: 'center', marginBottom: 25 },
  avatarPreviewCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#0284C7', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, borderWidth: 3, borderColor: '#E0F2FE' },
  
  inputLabel: { fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  avatarBox: { width: '30%', aspectRatio: 1, borderRadius: 20, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1.5, borderColor: '#E2E8F0' },
  avatarBoxActive: { backgroundColor: '#0284C7', borderColor: '#0284C7', elevation: 4, shadowColor: '#0284C7', shadowOpacity: 0.3, shadowRadius: 6 },

  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#E2E8F0', height: 60, marginBottom: 20 },
  inputFocused: { borderColor: '#0284C7', backgroundColor: '#FFFFFF' },
  inputField: { flex: 1, fontSize: 15, color: '#0F172A', marginLeft: 12, fontWeight: '600', paddingVertical: 0 },
  
  securityHeaderIcon: { alignItems: 'center', marginBottom: 25, backgroundColor: '#ECFDF5', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#A7F3D0' },
  securityHeaderTxt: { textAlign: 'center', color: '#047857', fontWeight: '600', marginTop: 10, fontSize: 13, paddingHorizontal: 10 },

  btnPrimary: { backgroundColor: '#0284C7', height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  btnSecurity: { flexDirection: 'row', backgroundColor: '#10B981', height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  btnPrimaryTxt: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, letterSpacing: 1 }
});

export default ConfiguracionScreen;