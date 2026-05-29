import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Alert, StatusBar, RefreshControl, Platform, Modal 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient from '../../api/client';
import { lanzarAlertaLocal, solicitarPermisosNotificacion } from '../../utils/notificaciones';

const AlertasScreen = () => {
  const [alertas, setAlertas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [activeTab, setActiveTab] = useState('pendientes');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para la ventana de resolución (Modal)
  const [modalVisible, setModalVisible] = useState(false);
  const [alertaSeleccionada, setAlertaSeleccionada] = useState(null);
  const [isResolving, setIsResolving] = useState(false);

  const cantidadAlertasAnterior = useRef(0);

  // ==========================================
  // LÓGICA DE MONITOREO (INTACTA)
  // ==========================================
  useEffect(() => {
    solicitarPermisosNotificacion();
    
    // Intervalo de chequeo silencioso cada 10 segundos
    const monitor = setInterval(() => {
        fetchAlertas(true); 
    }, 10000);

    return () => clearInterval(monitor); 
  }, []);

  const fetchAlertas = async (silencioso = false) => {
    try {
      if (!silencioso && !refreshing) setIsLoading(true);
      
      const resActivas = await apiClient.get('/core/alertas'); 
      const nuevasAlertas = resActivas.data;
      
      if (nuevasAlertas.length > cantidadAlertasAnterior.current) {
        const ultima = nuevasAlertas[0];
        lanzarAlertaLocal("🚨 EMERGENCIA TÉRMICA", `${ultima.cava_nombre}: ${ultima.mensaje}`);
        
        if (silencioso) {
            Alert.alert("Nueva Alerta Crítica", `${ultima.cava_nombre} requiere atención inmediata.`);
        }
      }
      
      setAlertas(nuevasAlertas);
      cantidadAlertasAnterior.current = nuevasAlertas.length;

      if (activeTab === 'historial') {
        const resHistorial = await apiClient.get('/core/alertas/historial'); 
        setHistorial(resHistorial.data);
      }
    } catch (error) {
      console.log('Error de sincronización en alertas');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAlertas();
    }, [activeTab])
  );

  const abrirVentanaResolver = (alerta) => {
    setAlertaSeleccionada(alerta);
    setModalVisible(true);
  };

  const confirmarResolucion = async () => {
    if (!alertaSeleccionada) return;
    
    setIsResolving(true);
    try {
      await apiClient.put(`/core/alertas/${alertaSeleccionada.id}/resolver`);
      
      setModalVisible(false);
      setAlertaSeleccionada(null);
      fetchAlertas(true); 
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar la estabilización en el servidor.');
    } finally {
      setIsResolving(false);
    }
  };

  // ==========================================
  // AGREGADO: CÁLCULO DE ESTADÍSTICAS EN VIVO
  // ==========================================
  const getPrioridadConfig = (tipoProducto, tipoAlerta) => {
    if (tipoAlerta === 'DESCONEXION') {
      return { label: 'CRÍTICA', level: 3, bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C', icon: 'wifi-off', iconColor: '#E11D48' };
    }
    if (['Carnes', 'Pollo', 'Pescado', 'Medicinas'].includes(tipoProducto)) {
      return { label: 'ALTA', level: 2, bg: '#FFF7ED', border: '#FFEDD5', text: '#C2410C', icon: 'thermometer-alert', iconColor: '#EA580C' };
    }
    return { label: 'MEDIA', level: 1, bg: '#FEFCE8', border: '#FEF08A', text: '#A16207', icon: 'alert-outline', iconColor: '#CA8A04' };
  };

  const conteoCriticas = alertas.filter(a => getPrioridadConfig(a.tipo_producto, a.tipo).level === 3).length;
  const conteoAltas = alertas.filter(a => getPrioridadConfig(a.tipo_producto, a.tipo).level === 2).length;
  const conteoMedias = alertas.filter(a => getPrioridadConfig(a.tipo_producto, a.tipo).level === 1).length;

  const getIconoComida = (tipo) => {
    switch(tipo) {
      case 'Carnes': return 'food-steak';
      case 'Pollo': return 'food-drumstick';
      case 'Pescado': return 'fish';
      case 'Medicinas': return 'pill';
      default: return 'package-variant';
    }
  };

  // ==========================================
  // RENDERIZADO VISUAL PREMIUM DE TARJETAS
  // ==========================================
  const renderAlerta = ({ item }) => {
    const ui = getPrioridadConfig(item.tipo_producto, item.tipo);
    const esHistorial = activeTab === 'historial';

    return (
      <View style={[
        styles.card, 
        // Si no es historial, aplicamos fondos llamativos según el peligro
        !esHistorial ? { backgroundColor: ui.bg, borderColor: ui.border } : { backgroundColor: '#FFFFFF', borderColor: '#F1F5F9' }
      ]}>
        
        {/* FILA SUPERIOR: Hora y Prioridad */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.priorityBadge, { backgroundColor: !esHistorial ? ui.text : '#94A3B8' }]}>
              <Icon name="shield-alert" size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
              <Text style={styles.priorityText}>{ui.label}</Text>
            </View>
            
            <View style={[styles.productBadge, esHistorial && { backgroundColor: '#F8FAFC' }]}>
              <Icon name={getIconoComida(item.tipo_producto)} size={13} color="#64748B" />
              <Text style={styles.productText}>{item.tipo_producto || 'Mixto'}</Text>
            </View>
          </View>
          <Text style={styles.time}>{new Date(item.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>

        {/* CUERPO CENTRAL: Gran impacto visual */}
        <View style={styles.bodyRow}>
          <View style={[styles.alertIconCircle, { backgroundColor: !esHistorial ? '#FFFFFF' : '#F1F5F9' }]}>
            <Icon name={ui.icon} size={24} color={!esHistorial ? ui.iconColor : '#94A3B8'} />
          </View>
          
          <View style={styles.bodyTextContainer}>
            <Text style={[styles.cavaName, !esHistorial && { color: ui.text }]}>{item.cava_nombre}</Text>
            <Text style={styles.msg}>{item.mensaje}</Text>
          </View>
        </View>

        {/* PIE DE TARJETA: Lectura y Botón de Acción Prominente */}
        <View style={[styles.footer, !esHistorial && { borderTopColor: ui.border }]}>
          <View style={styles.valorContainer}>
            <Text style={styles.valorLabel}>Lectura Actual:</Text>
            <Text style={[styles.valorText, !esHistorial && { color: ui.iconColor }]}>
              {item.valor_registrado || '--'}°C
            </Text>
          </View>

          {!esHistorial ? (
            <TouchableOpacity 
              style={[styles.btnResolver, { backgroundColor: ui.iconColor }]} 
              activeOpacity={0.85} 
              onPress={() => abrirVentanaResolver(item)}
            >
              <Icon name="wrench-outline" size={16} color="#FFFFFF" />
              <Text style={styles.btnText}>ESTABILIZAR</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.resolvedInfo}>
              <Icon name="check-decagram" size={16} color="#059669" />
              <Text style={styles.resolvedText}>Alerta Resuelta</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F9FF" translucent={false} />
      
      {/* CABECERA LUMINOSA PREMIUM */}
      <View style={styles.headerApp}>
        <Text style={styles.headerTitle}>Centro de Alertas</Text>
        
        {/* AGREGADO VISUAL: PANEL DE ESTADÍSTICAS DE IMPACTO */}
        <View style={styles.kpiWrapper}>
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiNum, { color: '#E11D48' }]}>{conteoCriticas}</Text>
            <Text style={styles.kpiLabel}>CRÍTICAS</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiNum, { color: '#EA580C' }]}>{conteoAltas}</Text>
            <Text style={styles.kpiLabel}>ALTAS</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiNum, { color: '#CA8A04' }]}>{conteoMedias}</Text>
            <Text style={styles.kpiLabel}>MEDIAS</Text>
          </View>
        </View>
        
        {/* PESTAÑAS (TABS) DE ALTA COSTURA */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'pendientes' && styles.tabActive]} 
            onPress={() => setActiveTab('pendientes')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabTxt, activeTab === 'pendientes' && styles.tabTxtActive]}>
              Revisión ({alertas.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'historial' && styles.tabActive]} 
            onPress={() => setActiveTab('historial')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabTxt, activeTab === 'historial' && styles.tabTxtActive]}>
              Historial Cerrado
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* LISTADO CON FEEDBACK VISUAL PREMIUM */}
      {isLoading ? (
        <View style={styles.centerView}>
          <ActivityIndicator size="large" color="#0284C7" />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'pendientes' ? alertas : historial}
          renderItem={renderAlerta}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchAlertas()} colors={["#0284C7"]} tintColor="#0284C7" />
          }
          // AGREGADO: ESTADO VACÍO CELEBRATORIO HERMOSO
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Icon name="shield-check" size={55} color="#10B981" />
              </View>
              <Text style={styles.emptyTitle}>¡Cadena de Frío al 100%!</Text>
              <Text style={styles.emptySub}>
                {activeTab === 'pendientes' 
                  ? 'No hay ninguna emergencia activa. Todos los sensores ESP32 reportan rangos óptimos y estables.' 
                  : 'Aún no se ha registrado ninguna alerta resuelta en esta base de datos.'}
              </Text>
            </View>
          }
        />
      )}

      {/* VENTANA DE RESOLUCIÓN PREMIUM (MODAL) */}
      <Modal 
        visible={modalVisible} 
        transparent={true} 
        animationType="fade"
        onRequestClose={() => !isResolving && setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderIcon}>
              <Icon name="shield-alert-outline" size={38} color="#0284C7" />
            </View>
            
            <Text style={styles.modalTitle}>Confirmar Estabilización</Text>
            <Text style={styles.modalSub}>
              ¿Declaras que se han tomado las medidas correctivas físicas y los parámetros del equipo vuelven a ser seguros?
            </Text>
            
            {alertaSeleccionada && (
              <View style={styles.modalDetails}>
                <Text style={styles.modalCavaText}>{alertaSeleccionada.cava_nombre}</Text>
                <Text style={styles.modalMsgText}>{alertaSeleccionada.mensaje}</Text>
                
                <View style={styles.modalPill}>
                  <Icon name={getIconoComida(alertaSeleccionada.tipo_producto)} size={14} color="#0284C7" />
                  <Text style={styles.modalPillText}>Almacenado: {alertaSeleccionada.tipo_producto || 'Mixto'}</Text>
                </View>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={styles.btnCancelModal} 
                activeOpacity={0.7}
                disabled={isResolving}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnCancelText}>Volver</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.btnConfirmModal} 
                activeOpacity={0.85}
                disabled={isResolving}
                onPress={confirmarResolucion}
              >
                {isResolving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Icon name="check-decagram" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.btnConfirmText}>Estable y Seguro</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ESTILOS ALTAMENTE LLAMATIVOS Y PULIDOS
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Cabecera Luminosa
  headerApp: { 
    backgroundColor: '#F0F9FF', 
    paddingTop: Platform.OS === 'ios' ? 60 : 25, 
    paddingHorizontal: 22, 
    paddingBottom: 25, 
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40, 
    elevation: 5,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12
  },
  headerTitle: { color: '#0F172A', fontSize: 28, fontWeight: '900', marginBottom: 15, letterSpacing: 0.2 },
  
  // Agregado: KPIs de Emergencia Vivos
  kpiWrapper: { 
    flexDirection: 'row', 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    paddingVertical: 14, 
    paddingHorizontal: 10, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    elevation: 3,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6
  },
  kpiBox: { flex: 1, alignItems: 'center' },
  kpiNum: { fontSize: 22, fontWeight: '900' },
  kpiLabel: { fontSize: 10, color: '#64748B', fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },
  kpiDivider: { width: 1.5, backgroundColor: '#F1F5F9', marginVertical: 5 },

  // Pestañas (Tabs) Premium
  tabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 5, borderWidth: 1, borderColor: '#E2E8F0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: '#0284C7', elevation: 3, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  tabTxt: { color: '#64748B', fontWeight: '700', fontSize: 13 },
  tabTxtActive: { color: '#FFFFFF', fontWeight: '900' },

  listContent: { padding: 20, paddingBottom: 110 },
  
  // Tarjetas Dinámicas e Impactantes
  card: { 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 16, 
    borderWidth: 1.5, 
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginRight: 8 },
  priorityText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  productBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  productText: { color: '#475569', fontSize: 11, fontWeight: '800', marginLeft: 4 },
  time: { fontSize: 12, color: '#64748B', fontWeight: '800' },

  bodyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  alertIconCircle: { width: 50, height: 50, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  bodyTextContainer: { flex: 1 },
  cavaName: { fontSize: 19, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  msg: { fontSize: 14, color: '#334155', lineHeight: 20, fontWeight: '600' },
  
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1.5 },
  valorContainer: { flexDirection: 'column' },
  valorLabel: { fontSize: 10, color: '#64748B', fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
  valorText: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  
  btnResolver: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 18, 
    paddingVertical: 12, 
    borderRadius: 16, 
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6
  },
  btnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, marginLeft: 6, letterSpacing: 0.8 },
  
  resolvedInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: '#A7F3D0' },
  resolvedText: { color: '#059669', fontWeight: '900', fontSize: 13, marginLeft: 6 },

  // Estado Vacío Celebratorio
  emptyContainer: { alignItems: 'center', backgroundColor: '#FFFFFF', padding: 40, borderRadius: 28, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 40, elevation: 2 },
  emptyIconCircle: { width: 85, height: 85, borderRadius: 42, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#A7F3D0' },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, fontWeight: '500' },

  // Estilos del Modal Premium
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#FFFFFF', width: '100%', borderRadius: 30, padding: 26, alignItems: 'center', elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
  modalHeaderIcon: { width: 75, height: 75, borderRadius: 24, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#BAE6FD' },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  modalSub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 22, lineHeight: 20, paddingHorizontal: 10 },
  
  modalDetails: { backgroundColor: '#F8FAFC', width: '100%', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 25 },
  modalCavaText: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 6, textAlign: 'center' },
  modalMsgText: { fontSize: 13, color: '#475569', textAlign: 'center', marginBottom: 14, fontWeight: '600' },
  modalPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: '#F0F9FF', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#E0F2FE' },
  modalPillText: { fontSize: 12, fontWeight: '800', color: '#0284C7', marginLeft: 6 },

  modalBtnRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  btnCancelModal: { flex: 1, height: 55, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: '#F1F5F9', marginRight: 8 },
  btnCancelText: { color: '#64748B', fontWeight: '800', fontSize: 14 },
  btnConfirmModal: { flex: 1, flexDirection: 'row', height: 55, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: '#0284C7', marginLeft: 8, elevation: 4, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  btnConfirmText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 }
});

export default AlertasScreen;