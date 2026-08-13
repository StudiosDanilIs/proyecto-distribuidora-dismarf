import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  Alert, FlatList, ActivityIndicator, StatusBar, Modal, 
  Platform, KeyboardAvoidingView, Pressable, LayoutAnimation, UIManager 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';

import { 
  initDB, guardarInspeccionOffline, obtenerInspeccionesOffline, eliminarInspeccionSincronizada 
} from '../../database/dbLocal';
import apiClient from '../../api/client';


const opcionesLimpieza = [
  { id: 'Excelente', icon: 'star-check', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
  { id: 'Regular', icon: 'alert-minus', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  { id: 'Mal', icon: 'close-octagon', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' }
];

const AuditoriaScreen = () => {
  const [activeTab, setActiveTab] = useState('formulario'); // 'formulario' | 'historial'
  const [isLoading, setIsLoading] = useState(true);
  
  const [cavas, setCavas] = useState([]);
  const [cavaSeleccionada, setCavaSeleccionada] = useState(null);
  const [modalSelectorVisible, setModalSelectorVisible] = useState(false);
  const [limpieza, setLimpieza] = useState('Excelente');
  const [obs, setObs] = useState('');
  const [focusedInput, setFocusedInput] = useState(false);
  
  const [inspeccionesLocales, setInspeccionesLocales] = useState([]);
  const [historialNube, setHistorialNube] = useState([]); // Auditorías de todos los usuarios
  const [syncStatus, setSyncStatus] = useState('Sincronizado');

  useEffect(() => {
    initDB();
    cargarDatosLocales();
  }, []);

  useEffect(() => {
    const autoSyncInterval = setInterval(() => { sincronizarEnSegundoPlano(); }, 8000);
    return () => clearInterval(autoSyncInterval);
  }, [inspeccionesLocales]);

  const cargarDatosLocales = async () => {
    try {
      const resCavas = await apiClient.get('/api/cavas');
      setCavas(resCavas.data);

      try {
        const resHistorial = await apiClient.get('/api/auditorias');
        setHistorialNube(resHistorial.data || []);
      } catch (e) {}

      const datosOffline = await obtenerInspeccionesOffline();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setInspeccionesLocales(datosOffline || []);
      setSyncStatus((datosOffline && datosOffline.length > 0) ? 'Pendientes' : 'Sincronizado');

    } catch (error) {
      console.log('Modo offline activado.');
    } finally {
      setIsLoading(false);
    }
  };

  const sincronizarEnSegundoPlano = async () => {
    const pendientes = await obtenerInspeccionesOffline();
    if (!pendientes || pendientes.length === 0) { setSyncStatus('Sincronizado'); return; }

    setSyncStatus('Sincronizando');
    let sincronizadosHoy = false;

    for (const item of pendientes) {
      try {
        await apiClient.post('/alertas/auditorias', {
          cava_id: item.cava_id,
          estado_limpieza: item.estado_limpieza,
          observaciones: item.observaciones,
          fecha_inspeccion: item.fecha
        });
        await eliminarInspeccionSincronizada(item.id);
        sincronizadosHoy = true;
      } catch (error) { setSyncStatus('Pendientes'); return; }
    }

    if (sincronizadosHoy) cargarDatosLocales(); 
  };

  const manejarGuardadoLocal = async () => {
    if (!cavaSeleccionada) {
      Alert.alert("Atención", "Por favor, selecciona una cava para inspeccionar."); return;
    }

    try {
      await guardarInspeccionOffline(cavaSeleccionada.id, "Inspección de Rutina", limpieza, obs);
      
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      Alert.alert("Auditoría Registrada", "El reporte se guardó correctamente y será enviado a la nube.");
      
      // Reset Form
      setCavaSeleccionada(null); setLimpieza('Excelente'); setObs('');
      cargarDatosLocales();
      sincronizarEnSegundoPlano();
      setActiveTab('historial');
    } catch (error) {
      Alert.alert("Error", "Fallo al escribir en la base de datos local.");
    }
  };

  const cambiarTab = (tab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
  };

  const renderPildoraNube = () => {
    const isOk = syncStatus === 'Sincronizado';
    const isWork = syncStatus === 'Sincronizando';
    return (
      <View style={[styles.cloudPill, isOk ? styles.pillOk : isWork ? styles.pillWork : styles.pillPend]}>
        <Icon name={isOk ? "cloud-check" : isWork ? "cloud-sync" : "cloud-off-outline"} size={14} color={isOk ? "#10B981" : isWork ? "#3B82F6" : "#F59E0B"} style={{ marginRight: 4 }} />
        <Text style={[styles.cloudPillTxt, { color: isOk ? "#10B981" : isWork ? "#3B82F6" : "#F59E0B" }]}>
          {isOk ? "En línea" : isWork ? "Subiendo..." : `${inspeccionesLocales.length} en cola`}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      
      {/* CABECERA ULTRA-MODERNA */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerSubtitle}>MÓDULO DE CALIDAD</Text>
          {renderPildoraNube()}
        </View>
        <Text style={styles.headerTitle}>Auditoría de Equipos</Text>
        
        {/* TABS DE NAVEGACIÓN */}
        <View style={styles.tabContainer}>
          <Pressable style={[styles.tab, activeTab === 'formulario' && styles.tabActive]} onPress={() => cambiarTab('formulario')}>
            <Icon name="clipboard-check-outline" size={16} color={activeTab === 'formulario' ? '#3B82F6' : '#94A3B8'} style={{ marginRight: 6 }} />
            <Text style={[styles.tabTxt, activeTab === 'formulario' && styles.tabTxtActive]}>Auditar</Text>
          </Pressable>
          <Pressable style={[styles.tab, activeTab === 'historial' && styles.tabActive]} onPress={() => cambiarTab('historial')}>
            <Icon name="history" size={16} color={activeTab === 'historial' ? '#3B82F6' : '#94A3B8'} style={{ marginRight: 6 }} />
            <Text style={[styles.tabTxt, activeTab === 'historial' && styles.tabTxtActive]}>Registros</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 60 }} />
      ) : activeTab === 'formulario' ? (
        
        /* VISTA 1: FORMULARIO DE AUDITORÍA*/
        <FlatList
          data={[]} renderItem={() => null}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.formCard}>
              <View style={styles.sectionHeader}>
                <Icon name="file-document-edit-outline" size={22} color="#0F172A" />
                <Text style={styles.sectionTitle}>Nueva Inspección</Text>
              </View>

              <Text style={styles.label}>1. Equipo a Inspeccionar</Text>
              <Pressable style={({ pressed }) => [styles.selectorPressable, pressed && { backgroundColor: '#F1F5F9' }]} onPress={() => setModalSelectorVisible(true)}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="fridge-outline" size={20} color="#3B82F6" />
                  <Text style={[styles.selectorText, !cavaSeleccionada && { color: '#94A3B8', fontWeight: '500' }]}>
                    {cavaSeleccionada ? cavaSeleccionada.nombre : "Toca para seleccionar cava..."}
                  </Text>
                </View>
                <Icon name="chevron-down" size={20} color="#64748B" />
              </Pressable>

              <Text style={styles.label}>2. Estado de Higiene y Orden</Text>
              <View style={styles.selectorRow}>
                {opcionesLimpieza.map(opcion => {
                  const isActive = limpieza === opcion.id;
                  return (
                    <TouchableOpacity 
                      key={opcion.id} activeOpacity={0.8}
                      style={[styles.chip, isActive ? { backgroundColor: opcion.bg, borderColor: opcion.color } : null]}
                      onPress={() => setLimpieza(opcion.id)}
                    >
                      <Icon name={opcion.icon} size={18} color={isActive ? opcion.color : '#94A3B8'} style={{marginRight: 6}} />
                      <Text style={[styles.chipText, isActive && { color: opcion.color, fontWeight: '800' }]}>{opcion.id}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <Text style={styles.label}>3. Observaciones Técnicas</Text>
              <TextInput 
                placeholder="Ej: Hay un derrame en el nivel 2, la puerta suena al cerrar..." 
                placeholderTextColor="#94A3B8"
                style={[styles.inputArea, focusedInput && styles.inputFocused]} 
                multiline 
                value={obs} 
                onChangeText={setObs} 
                onFocus={() => setFocusedInput(true)}
                onBlur={() => setFocusedInput(false)}
              />

              <TouchableOpacity style={styles.btnGuardar} activeOpacity={0.85} onPress={manejarGuardadoLocal}>
                <Icon name="content-save-check" size={20} color="#FFFFFF" style={{marginRight: 8}} />
                <Text style={styles.btnText}>REGISTRAR AUDITORÍA</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (

        /* VISTA 2: HISTORIAL Y PENDIENTES (LOG DE CAMBIOS)*/
        <FlatList
          data={[...inspeccionesLocales, ...historialNube]} // Combinamos locales (pendientes) y nube
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.logTitle}>Registro de Actividad Reciente</Text>
          }
          renderItem={({ item }) => {
            const isOffline = item.cava_id !== undefined && item.sincronizado_el === undefined && inspeccionesLocales.includes(item);
            
            const cfg = opcionesLimpieza.find(o => o.id === item.estado_limpieza) || opcionesLimpieza[1];

            return (
              <View style={[styles.cardLog, isOffline && { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
                <View style={styles.logHeader}>
                  <View style={styles.logCavaInfo}>
                    <View style={[styles.iconLogBg, { backgroundColor: cfg.bg }]}>
                      <Icon name={cfg.icon} size={20} color={cfg.color} />
                    </View>
                    <View>
                      <Text style={styles.logCavaName}>{item.cava_nombre || `Cava #${item.cava_id}`}</Text>
                      <Text style={styles.logDate}>
                        {new Date(item.fecha || item.fecha_inspeccion).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </Text>
                    </View>
                  </View>
                  
                  {isOffline ? (
                    <View style={styles.badgePending}>
                      <Icon name="cloud-upload" size={12} color="#D97706" style={{ marginRight: 4 }}/>
                      <Text style={styles.badgePendingTxt}>En cola</Text>
                    </View>
                  ) : (
                    <View style={styles.badgeUser}>
                      <Icon name="account" size={12} color="#3B82F6" style={{ marginRight: 4 }}/>
                      <Text style={styles.badgeUserTxt}>{item.usuario_nombre || 'Operador'}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.logBody}>
                  <Text style={styles.logSubTitle}>Condición: <Text style={{ color: cfg.color, fontWeight: '800' }}>{item.estado_limpieza}</Text></Text>
                  {item.observaciones ? (
                    <Text style={styles.logObs}>{item.observaciones}</Text>
                  ) : (
                    <Text style={[styles.logObs, { fontStyle: 'italic', color: '#CBD5E1' }]}>Sin observaciones adicionales.</Text>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Icon name="clipboard-text-search-outline" size={50} color="#94A3B8" />
              </View>
              <Text style={styles.emptyText}>Sin registros</Text>
              <Text style={styles.emptySubText}>No hay auditorías recientes en el sistema.</Text>
            </View>
          }
        />
      )}

      {/* MODAL: SELECTOR DE CAVA (REUTILIZADO Y ESTÉTICO)*/}
      <Modal visible={modalSelectorVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Elige un Equipo</Text>
              <Pressable onPress={() => setModalSelectorVisible(false)} hitSlop={10}><Icon name="close" size={24} color="#64748B"/></Pressable>
            </View>
            <FlatList
              data={cavas}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <Pressable 
                  style={({ pressed }) => [styles.cavaOption, !item.estado && { opacity: 0.4 }, pressed && { backgroundColor: '#F8FAFC' }]} 
                  disabled={!item.estado}
                  onPress={() => { setCavaSeleccionada(item); setModalSelectorVisible(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cavaOptionName}>{item.nombre}</Text>
                    {item.estado ? (
                      <Text style={styles.cavaOptionSub}>{item.ubicacion}</Text>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Icon name="cancel" size={12} color="#EF4444" />
                        <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '800', marginLeft: 4 }}>FUERA DE SERVICIO</Text>
                      </View>
                    )}
                  </View>
                  <Icon name="chevron-right" size={20} color="#CBD5E1" />
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  
  header: { 
    backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'ios' ? 60 : 25, 
    paddingHorizontal: 25, paddingBottom: 20, 
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', zIndex: 10 
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  headerSubtitle: { color: '#64748B', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { color: '#0F172A', fontSize: 26, fontWeight: '900', letterSpacing: 0.2, marginBottom: 15 },
  
  cloudPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  pillOk: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  pillWork: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  pillPend: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  cloudPillTxt: { fontSize: 11, fontWeight: '800' },

  tabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  tabTxt: { color: '#94A3B8', fontWeight: '700', fontSize: 13 },
  tabTxtActive: { color: '#3B82F6', fontWeight: '800' },

  formCard: { 
    backgroundColor: '#FFFFFF', margin: 20, padding: 24, borderRadius: 28, 
    elevation: 3, borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginLeft: 10 },
  
  label: { fontSize: 12, fontWeight: '800', color: '#64748B', marginBottom: 8, marginTop: 15, letterSpacing: 0.5 },
  
  selectorPressable: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 16, height: 54, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  selectorText: { marginLeft: 12, color: '#0F172A', fontSize: 15, fontWeight: '700' },
  
  selectorRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  chip: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginHorizontal: 4, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  chipText: { color: '#64748B', fontWeight: '700', fontSize: 12 },
  
  inputArea: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, fontSize: 15, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0', height: 100, textAlignVertical: 'top' },
  inputFocused: { borderColor: '#3B82F6', backgroundColor: '#FFFFFF' },

  btnGuardar: { flexDirection: 'row', backgroundColor: '#3B82F6', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 25, elevation: 4, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  btnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, letterSpacing: 0.8 },
  
  logTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 15, marginLeft: 5 },
  cardLog: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  logCavaInfo: { flexDirection: 'row', alignItems: 'center' },
  iconLogBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  logCavaName: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 2 },
  logDate: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  
  badgeUser: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeUserTxt: { color: '#3B82F6', fontSize: 11, fontWeight: '800' },
  badgePending: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A' },
  badgePendingTxt: { color: '#D97706', fontSize: 11, fontWeight: '800' },

  logBody: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  logSubTitle: { fontSize: 13, color: '#475569', fontWeight: '600', marginBottom: 6 },
  logObs: { fontSize: 13, color: '#64748B', lineHeight: 20 },
  
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  emptyText: { color: '#0F172A', fontWeight: '900', fontSize: 18, marginBottom: 5 },
  emptySubText: { color: '#64748B', fontSize: 14, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContentSmall: { backgroundColor: '#FFFFFF', width: '100%', borderRadius: 28, padding: 20, maxHeight: '70%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  cavaOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', borderRadius: 16 },
  cavaOptionName: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 2 },
  cavaOptionSub: { fontSize: 12, color: '#64748B', fontWeight: '600' }
});

export default AuditoriaScreen;