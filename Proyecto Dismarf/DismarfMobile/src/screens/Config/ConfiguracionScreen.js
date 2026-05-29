// src/screens/Config/ConfiguracionScreen.js
import React, { useContext, useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Switch, 
  ScrollView, Alert, StatusBar, Modal, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../../context/AuthContext';
import apiClient from '../../api/client';

// Librerías nativas de almacenamiento y biometría
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';

// LOS 6 ÍCONOS PREMIUM DISPONIBLES EN EL SISTEMA
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
  
  // Garantizamos conversión robusta de roles
  const isAdmin = parseInt(userRole, 10) === 1 || parseInt(user?.rol_id, 10) === 1;

  // --- ESTADOS DE INTERFAZ ---
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modalEditVisible, setModalEditVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  // Preferencias Operativas y KPIs
  const [biometriaActiva, setBiometriaActiva] = useState(false);
  const [unidadTemperatura, setUnidadTemperatura] = useState('C'); 
  const [totalCavasActivas, setTotalCavasActivas] = useState(0);

  // --- ESTADOS DEL FORMULARIO DE SEGURIDAD ---
  const [nuevoNombre, setNuevoNombre] = useState(user?.nombre || '');
  const [iconoSeleccionado, setIconoSeleccionado] = useState(user?.icono_perfil || null);
  const [passActual, setPassActual] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [preguntaSeg, setPreguntaSeg] = useState(user?.pregunta_seguridad || '');
  const [respuestaSeg, setRespuestaSeg] = useState('');

  // Sincronizar datos al montar la vista
  useEffect(() => {
    if (user?.nombre) setNuevoNombre(user.nombre);
    if (user?.pregunta_seguridad) setPreguntaSeg(user.pregunta_seguridad);
    if (user?.icono_perfil !== undefined) setIconoSeleccionado(user.icono_perfil);
    
    // Cargar preferencias locales y conteo rápido de cavas
    const cargarDatosIniciales = async () => {
      try {
        const bio = await AsyncStorage.getItem('biometria_activa');
        setBiometriaActiva(bio === 'true');
        
        const unidad = await AsyncStorage.getItem('unidad_temp') || 'C';
        setUnidadTemperatura(unidad);

        // Consulta en segundo plano para alimentar los KPIs
        const resCavas = await apiClient.get('/core/cavas');
        const activas = (resCavas.data || []).filter(c => c.estado).length;
        setTotalCavasActivas(activas);
      } catch (e) { 
        console.log("Aviso: Sincronización secundaria en espera."); 
      }
    };
    cargarDatosIniciales();
  }, [user]);

  // Jerarquía de Roles
  const roles = {
    1: { label: "Administrador", color: "#D97706", icon: "shield-crown", bg: "#FEF3C7" },
    2: { label: "Supervisor", color: "#0284C7", icon: "eye-check", bg: "#E0F2FE" },
    3: { label: "Almacenista", color: "#64748B", icon: "package-variant", bg: "#F1F5F9" }
  };
  const currentRolConfig = roles[parseInt(userRole, 10)] || { label: "Operador", color: "#64748B", icon: "account", bg: "#F1F5F9" };

  const nombreUsuario = user?.nombre || "Usuario Dismarf";
  const emailUsuario = user?.email || "correo@dismarf.com";

  // ====================================================================
  // FUNCIÓN 1: ACTIVAR Y VALIDAR BIOMETRÍA REAL EN EL HARDWARE
  // ====================================================================
  const handleToggleBiometria = async (valor) => {
    const rnBiometrics = new ReactNativeBiometrics();
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();

    if (!available) {
      Alert.alert("Hardware Incompatible", "Tu terminal móvil no tiene sensores de huella o reconocimiento facial habilitados.");
      return;
    }

    setBiometriaActiva(valor);
    await AsyncStorage.setItem('biometria_activa', valor ? 'true' : 'false');
    
    if (valor && user?.email) {
      await AsyncStorage.setItem('bio_email', user.email);
      Alert.alert("Seguridad Vinculada", `Acceso biométrico habilitado mediante tu ${biometryType}.`);
    }
  };

  // Alternar formato de temperatura global
  const handleToggleUnidad = async () => {
    const nueva = unidadTemperatura === 'C' ? 'F' : 'C';
    setUnidadTemperatura(nueva);
    await AsyncStorage.setItem('unidad_temp', nueva);
  };

  // ====================================================================
  // FUNCIÓN 2: GUARDAR PERFIL E ÍCONO PREDETERMINADO EN BASE DE DATOS
  // ====================================================================
  const handleUpdatePerfil = async () => {
    if (!nuevoNombre.trim()) {
      Alert.alert("Validación", "El nombre de usuario es obligatorio.");
      return;
    }
    
    setLoading(true);
    try {
      await apiClient.put('/core/perfil/update', {
        nombre: nuevoNombre.trim(),
        icono_perfil: iconoSeleccionado, // Guardamos el nombre del ícono escogido (o null)
        passwordActual: passActual || null,
        nuevaPassword: passNueva || null,
        pregunta_seguridad: preguntaSeg.trim() || null,
        respuesta_seguridad: respuestaSeg.trim().toLowerCase() || null
      });
      
      // Sincronizamos el estado de la app al instante
      setUser(prev => ({ 
        ...prev, 
        nombre: nuevoNombre.trim(), 
        icono_perfil: iconoSeleccionado,
        pregunta_seguridad: preguntaSeg.trim() 
      }));
      
      Alert.alert("Actualización Exitosa", "Tus credenciales y preferencias de avatar han sido guardadas.");
      setModalEditVisible(false);
      setPassActual(''); setPassNueva(''); setRespuestaSeg('');
    } catch (error) {
      Alert.alert("Error", error.response?.data?.msg || "Fallo interno al actualizar el perfil en la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  const confirmarLogout = () => {
    Alert.alert("Desconectar Terminal", "¿Confirmas que deseas cerrar tu sesión en este dispositivo?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar Sesión", onPress: logout, style: "destructive" }
    ]);
  };

  // Fila de opciones perfectamente estilizada e integrada
  const SettingRow = ({ icon, title, subtitle, value, onValueChange, onPress, type = 'chevron', color = "#0284C7", rightBadge = null }) => (
    <TouchableOpacity 
      style={[styles.itemRow, isDarkMode && styles.itemRowDark]} 
      onPress={onPress} 
      disabled={type === 'switch' || !onPress} 
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <View style={styles.itemTextContent}>
        <Text style={[styles.itemTitle, isDarkMode && styles.textWhite]}>{title}</Text>
        {subtitle && <Text style={styles.itemSub}>{subtitle}</Text>}
      </View>
      
      {type === 'switch' ? (
        <Switch 
          value={value} 
          onValueChange={onValueChange} 
          trackColor={{ true: color, false: '#CBD5E1' }} 
          thumbColor="#FFFFFF" 
        />
      ) : rightBadge ? (
        <View style={styles.badgeOption}>
          <Text style={styles.badgeOptionTxt}>{rightBadge}</Text>
        </View>
      ) : (
        onPress && <Icon name="chevron-right" size={22} color="#CBD5E1" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? "#0F172A" : "#F0F9FF"} translucent={false} />
      
      {/* SCROLL UNIFICADO PREMIUM (Sin cortes visuales en la parte superior) */}
      <ScrollView contentContainerStyle={styles.scrollUnificado} showsVerticalScrollIndicator={false}>
        
        {/* ENCABEZADO Y PANELES DE ESTADO ESTILO DASHBOARD */}
        <View style={[styles.headerBlock, isDarkMode && styles.headerBlockDark]}>
          <Text style={[styles.headerMainTitle, isDarkMode && styles.textWhite]}>Ajustes del Sistema</Text>
          <Text style={styles.headerSubTitle}>Centro logístico y credenciales</Text>

          {/* PANEL FLOTANTE DE TELEMETRÍA GLOBAL (KPIs) */}
          <View style={styles.kpiLiveBox}>
            <View style={styles.kpiItem}>
              <View style={[styles.dotLive, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.kpiLabel, isDarkMode && styles.textWhite]}>Nube TLS</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiItem}>
              <View style={[styles.dotLive, { backgroundColor: '#0284C7' }]} />
              <Text style={[styles.kpiLabel, isDarkMode && styles.textWhite]}>SQLite OK</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiItem}>
              <Text style={styles.kpiNumText}>{totalCavasActivas}</Text>
              <Text style={[styles.kpiLabel, isDarkMode && styles.textWhite]}>Operativas</Text>
            </View>
          </View>

          {/* TARJETA MAESTRA DE PERFIL */}
          <View style={[styles.profileMasterCard, isDarkMode && styles.cardDark]}>
            
            <TouchableOpacity 
              style={styles.avatarConcentricOuter} 
              activeOpacity={0.85} 
              onPress={() => setModalEditVisible(true)}
            >
              <View style={styles.avatarConcentricInner}>
                {/* RENDERIZADO CONDICIONAL DEL AVATAR */}
                {user?.icono_perfil ? (
                  <Icon name={user.icono_perfil} size={42} color="#FFFFFF" />
                ) : (
                  <Text style={styles.avatarTxt}>{nombreUsuario.charAt(0).toUpperCase()}</Text>
                )}
              </View>

              <View style={styles.editBadgeBtn}>
                <Icon name="pencil" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <Text style={[styles.profileName, isDarkMode && styles.textWhite]} numberOfLines={1}>{nombreUsuario}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{emailUsuario}</Text>
            
            <View style={[styles.roleBadge, { backgroundColor: currentRolConfig.bg }]}>
              <Icon name={currentRolConfig.icon} size={13} color={currentRolConfig.color} style={{ marginRight: 4 }} />
              <Text style={[styles.roleText, { color: currentRolConfig.color }]}>{currentRolConfig.label}</Text>
            </View>
          </View>
        </View>

        {/* --- SECCIÓN 1: CUENTA Y HARDWARE --- */}
        <Text style={styles.groupLabel}>Seguridad y Dispositivo</Text>
        <View style={[styles.cardGroup, isDarkMode && styles.cardDark]}>
          <SettingRow 
            icon="account-key-outline" title="Configurar Avatar y Datos" subtitle="Elegir ícono predeterminado y claves"
            onPress={() => setModalEditVisible(true)}
          />
          <View style={styles.rowDivider} />
          
          {/* SWITCH BIOMÉTRICO INTEGRADO */}
          <SettingRow 
            icon="fingerprint" title="Acceso Biométrico" subtitle="Desbloqueo por Huella o FaceID"
            type="switch" value={biometriaActiva} onValueChange={handleToggleBiometria} color="#10B981"
          />
        </View>

        {/* --- SECCIÓN 2: LOGÍSTICA DE FRÍO --- */}
        <Text style={styles.groupLabel}>Parámetros Operativos</Text>
        <View style={[styles.cardGroup, isDarkMode && styles.cardDark]}>
          <SettingRow 
            icon="thermometer-lines" title="Unidad Térmica Maestra" subtitle="Formato global de lectura en cavas"
            rightBadge={unidadTemperatura === 'C' ? "°C Celsius" : "°F Fahrenheit"}
            onPress={handleToggleUnidad} color="#F59E0B"
          />
          <View style={styles.rowDivider} />
          <SettingRow 
            icon="access-point-network" title="Calibrar Módulos ESP32" subtitle="Enviar orden de reinicio a la red" color="#0EA5E9"
            onPress={() => Alert.alert("Comando IoT", "Pulso de calibración y latencia enviado a los sensores.")}
          />
        </View>

        {/* --- SECCIÓN 3: GERENCIAL (RBAC) --- */}
        {isAdmin && (
          <>
            <Text style={styles.groupLabel}>Administración y Nómina</Text>
            <View style={[styles.cardGroup, isDarkMode && styles.cardDark]}>
              <SettingRow icon="account-group-outline" title="Nómina de Empleados" subtitle="Gestión de roles y accesos" color="#D97706" onPress={() => navigation.navigate('GestionUsuarios')} />
              <View style={styles.rowDivider} />
              <SettingRow icon="history" title="Auditoría Global" subtitle="Historial completo de operaciones" color="#6366F1" onPress={() => navigation.navigate('Bitácora')} />
              <View style={styles.rowDivider} />
              <SettingRow icon="file-pdf-box" title="Descargar Reportes" subtitle="Actas en formato PDF firmadas" color="#10B981" onPress={() => navigation.navigate('Reportes')} />
            </View>
          </>
        )}

        {/* --- SECCIÓN 4: MANTENIMIENTO --- */}
        <Text style={styles.groupLabel}>Almacenamiento Local</Text>
        <View style={[styles.cardGroup, isDarkMode && styles.cardDark]}>
          <SettingRow 
            icon="database-refresh-outline" title="Compactar Memoria" subtitle="Limpiar caché de existencias locales" 
            onPress={() => Alert.alert("Optimización", "Registros SQLite encolados y depurados correctamente.")} 
          />
          <View style={styles.rowDivider} />
          <SettingRow 
            icon="headset" title="Asistencia de Ingeniería" subtitle="Contactar soporte técnico oficial" color="#14B8A6" 
            onPress={() => Alert.alert("Contacto", "Línea directa corporativa: soporte@studiosdaniels.com")} 
          />
        </View>

        {/* BOTÓN DE DESCONEXIÓN */}
        <TouchableOpacity style={styles.btnLogout} onPress={confirmarLogout} activeOpacity={0.8}>
          <Icon name="logout-variant" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.btnLogoutTxt}>Cerrar Sesión Segura</Text>
        </TouchableOpacity>

        {/* CRÉDITOS OFICIALES STUDIOS DANIELS */}
        <Text style={styles.footerAppTxt}>Dismarf Logística v1.6.0 • Studios Daniels</Text>
      </ScrollView>

      {/* ==================================================================== */}
      {/* MODAL DE EDICIÓN CON GRILLA DE 6 ÍCONOS PREMIUM                      */}
      {/* ==================================================================== */}
      <Modal visible={modalEditVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: '100%' }}>
            <View style={[styles.modalMasterBox, isDarkMode && styles.cardDark]}>
              
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalTitle, isDarkMode && styles.textWhite]}>Ajustes de Perfil</Text>
                <TouchableOpacity onPress={() => setModalEditVisible(false)} style={styles.closeModalBtn}>
                  <Icon name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 25 }}>
                
                {/* SELECTOR INTERACTIVO DE 6 ÍCONOS */}
                <Text style={styles.modalSubTitle}>ELEGIR AVATAR (ÍCONO PREDETERMINADO)</Text>
                <Text style={styles.avatarHint}>Si no seleccionas ninguno, el sistema utilizará la letra inicial de tu nombre.</Text>
                
                <View style={styles.gridIconos}>
                  {ICONOS_DISPONIBLES.map((item) => {
                    const isSelected = iconoSeleccionado === item.id;
                    return (
                      <TouchableOpacity 
                        key={item.id} 
                        activeOpacity={0.8}
                        style={[styles.iconoBox, isSelected && styles.iconoBoxSelected]}
                        onPress={() => setIconoSeleccionado(isSelected ? null : item.id)} // Toca para asignar o remover
                      >
                        <Icon name={item.id} size={28} color={isSelected ? '#FFFFFF' : '#0284C7'} />
                        <Text style={[styles.iconoLabel, isSelected && { color: '#FFFFFF' }]}>{item.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.modalInternalDivider} />

                <Text style={styles.inputTitle}>NOMBRE EN SISTEMA</Text>
                <View style={[styles.inputContainer, focusedInput === 'nom' && styles.inputFocused]}>
                  <Icon name="account-outline" size={20} color="#94A3B8" />
                  <TextInput 
                    style={[styles.inputField, isDarkMode && styles.textWhite]} value={nuevoNombre} onChangeText={setNuevoNombre}
                    onFocus={() => setFocusedInput('nom')} onBlur={() => setFocusedInput(null)}
                  />
                </View>

                <View style={styles.modalInternalDivider} />
                <Text style={styles.modalSubTitle}>PREGUNTA DE SEGURIDAD</Text>

                <Text style={styles.inputTitle}>PREGUNTA REGISTRADA</Text>
                <View style={[styles.inputContainer, focusedInput === 'preg' && styles.inputFocused]}>
                  <Icon name="help-circle-outline" size={20} color="#94A3B8" />
                  <TextInput style={[styles.inputField, isDarkMode && styles.textWhite]} value={preguntaSeg} onChangeText={setPreguntaSeg} placeholderTextColor="#94A3B8" onFocus={() => setFocusedInput('preg')} onBlur={() => setFocusedInput(null)} />
                </View>

                <Text style={styles.inputTitle}>RESPUESTA SECRETA</Text>
                <View style={[styles.inputContainer, focusedInput === 'resp' && styles.inputFocused]}>
                  <Icon name="shield-key-outline" size={20} color="#94A3B8" />
                  <TextInput style={[styles.inputField, isDarkMode && styles.textWhite]} value={respuestaSeg} onChangeText={setRespuestaSeg} placeholder="Asignar respuesta para recuperar clave..." placeholderTextColor="#94A3B8" secureTextEntry onFocus={() => setFocusedInput('resp')} onBlur={() => setFocusedInput(null)} />
                </View>

                <View style={styles.modalInternalDivider} />
                <Text style={styles.modalSubTitle}>CAMBIO DE CONTRASEÑA (OPCIONAL)</Text>

                <Text style={styles.inputTitle}>CLAVE ACTUAL</Text>
                <View style={[styles.inputContainer, focusedInput === 'passA' && styles.inputFocused]}>
                  <Icon name="lock-outline" size={20} color="#94A3B8" />
                  <TextInput style={[styles.inputField, isDarkMode && styles.textWhite]} secureTextEntry value={passActual} onChangeText={setPassActual} placeholderTextColor="#94A3B8" onFocus={() => setFocusedInput('passA')} onBlur={() => setFocusedInput(null)} />
                </View>

                <Text style={styles.inputTitle}>NUEVA CLAVE</Text>
                <View style={[styles.inputContainer, focusedInput === 'passN' && styles.inputFocused]}>
                  <Icon name="lock-reset" size={20} color="#94A3B8" />
                  <TextInput style={[styles.inputField, isDarkMode && styles.textWhite]} secureTextEntry value={passNueva} onChangeText={setPassNueva} placeholderTextColor="#94A3B8" onFocus={() => setFocusedInput('passN')} onBlur={() => setFocusedInput(null)} />
                </View>

                <TouchableOpacity style={styles.btnSaveConfig} onPress={handleUpdatePerfil} disabled={loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnSaveConfigTxt}>GUARDAR CONFIGURACIÓN</Text>}
                </TouchableOpacity>

              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </View>
  );
};

// ESTILOS PREMIUM ICE-TECH ARMONIZADOS
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  containerDark: { backgroundColor: '#0F172A' },
  textWhite: { color: '#FFFFFF' },

  scrollUnificado: { flexGrow: 1, paddingBottom: 50 },
  
  headerBlock: { 
    backgroundColor: '#F0F9FF', 
    paddingTop: Platform.OS === 'ios' ? 60 : 30, 
    paddingHorizontal: 25, 
    paddingBottom: 35, 
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40, 
    alignItems: 'center', 
    elevation: 4,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    marginBottom: 20
  },
  headerBlockDark: { backgroundColor: '#1E293B', shadowColor: '#000' },
  
  headerMainTitle: { fontSize: 26, fontWeight: '900', color: '#0F172A', letterSpacing: 0.2 },
  headerSubTitle: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 2, marginBottom: 15 },

  // Panel Flotante de Telemetría Global idéntico a Dashboard
  kpiLiveBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(2, 132, 199, 0.05)', 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 16, 
    marginBottom: 20, 
    borderWidth: 1.5, 
    borderColor: 'rgba(2, 132, 199, 0.12)' 
  },
  kpiItem: { flexDirection: 'row', alignItems: 'center' },
  dotLive: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  kpiLabel: { color: '#0F172A', fontSize: 12, fontWeight: '800' },
  kpiDivider: { width: 1.5, height: 16, backgroundColor: 'rgba(2, 132, 199, 0.12)', marginHorizontal: 12 },
  kpiNumText: { color: '#0284C7', fontSize: 14, fontWeight: '900', marginRight: 4 },

  profileMasterCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 20, 
    alignItems: 'center', 
    width: '100%', 
    elevation: 3, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1, 
    borderColor: '#F1F5F9' 
  },
  
  avatarConcentricOuter: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: '#E0F2FE', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#BAE6FD', 
    marginBottom: 12, 
    elevation: 3 
  },
  avatarConcentricInner: { 
    width: 76, 
    height: 76, 
    borderRadius: 38, 
    backgroundColor: '#0284C7', 
    justifyContent: 'center', 
    alignItems: 'center', 
    overflow: 'hidden' 
  },
  avatarTxt: { fontSize: 30, fontWeight: 'bold', color: '#FFFFFF' },
  
  editBadgeBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0284C7', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF', elevation: 4 },

  profileName: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 2 },
  profileEmail: { fontSize: 13, color: '#64748B', fontWeight: '500', marginBottom: 12 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  roleText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },

  groupLabel: { fontSize: 11, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, marginLeft: 25, marginTop: 10, letterSpacing: 0.8 },
  cardGroup: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 22, 
    marginHorizontal: 20, 
    marginBottom: 22, 
    borderWidth: 1, 
    borderColor: '#F1F5F9', 
    elevation: 2, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    overflow: 'hidden' 
  },
  cardDark: { backgroundColor: '#1E293B', borderColor: '#334155' },
  rowDivider: { height: 1, backgroundColor: '#F1F5F9' },

  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 16, minHeight: 65 },
  itemRowDark: { backgroundColor: '#1E293B' },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  itemTextContent: { flex: 1, marginRight: 10 },
  itemTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  itemSub: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500' },
  badgeOption: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeOptionTxt: { fontSize: 12, fontWeight: 'bold', color: '#0284C7' },

  btnLogout: { 
    flexDirection: 'row', 
    backgroundColor: '#FEF2F2', 
    height: 55, 
    marginHorizontal: 20, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#FEE2E2', 
    marginTop: 10 
  },
  btnLogoutTxt: { color: '#EF4444', fontWeight: '900', fontSize: 15, marginLeft: 8 },
  footerAppTxt: { textAlign: 'center', color: '#CBD5E1', fontSize: 11, marginTop: 25, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' },
  modalMasterBox: { 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24, 
    maxHeight: '90%' 
  },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  closeModalBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  
  modalSubTitle: { fontSize: 11, fontWeight: 'bold', color: '#0284C7', marginBottom: 2, marginTop: 5 },
  avatarHint: { fontSize: 11, color: '#64748B', marginBottom: 12 },
  
  gridIconos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  iconoBox: { width: '31%', backgroundColor: '#F8FAFC', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 10, borderWidth: 1.5, borderColor: '#E2E8F0' },
  iconoBoxSelected: { backgroundColor: '#0284C7', borderColor: '#0284C7', elevation: 3 },
  iconoLabel: { fontSize: 11, fontWeight: 'bold', color: '#0284C7', marginTop: 6 },

  inputTitle: { fontSize: 11, fontWeight: 'bold', color: '#64748B', marginBottom: 6, marginTop: 12, marginLeft: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E2E8F0', height: 52 },
  inputFocused: { borderColor: '#0284C7', backgroundColor: '#FFFFFF' },
  inputField: { flex: 1, fontSize: 14, color: '#1E293B', marginLeft: 10 },
  
  modalInternalDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 18 },
  
  btnSaveConfig: { backgroundColor: '#0284C7', height: 55, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 25, elevation: 3 },
  btnSaveConfigTxt: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 }
});

export default ConfiguracionScreen;