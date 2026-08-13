import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, 
  StatusBar, RefreshControl, Platform, Modal, Pressable 
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
  
  const [modalVisible, setModalVisible] = useState(false);
  const [alertaSeleccionada, setAlertaSeleccionada] = useState(null);
  const [isResolving, setIsResolving] = useState(false);

  const cantidadAlertasAnterior = useRef(0);

  useEffect(() => {
    solicitarPermisosNotificacion();
    const monitor = setInterval(() => { fetchAlertas(true); }, 10000);
    return () => clearInterval(monitor); 
  }, []);

  const fetchAlertas = async (silencioso = false) => {
    try {
      if (!silencioso && !refreshing) setIsLoading(true);
      
      const resActivas = await apiClient.get('/api/alertas'); 
      const nuevasAlertas = resActivas.data;
      
      if (nuevasAlertas.length > cantidadAlertasAnterior.current) {
        const ultima = nuevasAlertas[0];
        lanzarAlertaLocal("ANOMALÍA TÉRMICA", `${ultima.cava_nombre}: ${ultima.mensaje}`);
      }
      
      setAlertas(nuevasAlertas);
      cantidadAlertasAnterior.current = nuevasAlertas.length;

      if (activeTab === 'historial') {
        const resHistorial = await apiClient.get('/api/alertas/historial'); 
        setHistorial(resHistorial.data);
      }
    } catch (error) {
      console.log('Error de sincronización en alertas');
    } finally {
      setIsLoading(false); setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchAlertas(); }, [activeTab]));

  const confirmarResolucion = async () => {
    if (!alertaSeleccionada) return;
    setIsResolving(true);
    try {
      await apiClient.put(`/api/alertas/${alertaSeleccionada.id}/resolver`);
      setModalVisible(false);
      setAlertaSeleccionada(null);
      fetchAlertas(true); 
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar la estabilización en el servidor.');
    } finally { setIsResolving(false); }
  };

  const obtenerTiempoRelativo = (fechaISO) => {
    const diffMinutos = Math.floor((new Date() - new Date(fechaISO)) / 60000);
    if (diffMinutos < 1) return 'Hace un instante';
    if (diffMinutos < 60) return `Hace ${diffMinutos} min`;
    const diffHoras = Math.floor(diffMinutos / 60);
    if (diffHoras < 24) return `Hace ${diffHoras} h`;
    return diffHoras < 48 ? 'Ayer' : `Hace ${Math.floor(diffHoras / 24)} días`;
  };

  const getPrioridadConfig = (tipoProducto, tipoAlerta) => {
    if (tipoAlerta === 'DESCONEXION') {
      return { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', icon: 'wifi-off', label: 'CRÍTICA' };
    }
    if (['Carnes', 'Pollo', 'Pescado', 'Medicinas'].includes(tipoProducto)) {
      return { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', icon: 'thermometer-alert', label: 'ALTA' };
    }
    return { bg: '#F0F9FF', border: '#BAE6FD', text: '#0284C7', icon: 'alert-circle', label: 'MEDIA' };
  };

  const conteoCriticas = alertas.filter(a => getPrioridadConfig(a.tipo_producto, a.tipo).label === 'CRÍTICA').length;
  const conteoAltas = alertas.filter(a => getPrioridadConfig(a.tipo_producto, a.tipo).label === 'ALTA').length;

  const renderAlerta = ({ item }) => {
    const ui = getPrioridadConfig(item.tipo_producto, item.tipo);
    const esHistorial = activeTab === 'historial';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cavaInfo}>
            <View style={[styles.iconCircle, { backgroundColor: esHistorial ? '#F1F5F9' : ui.bg }]}>
              <Icon name={esHistorial ? "check-decagram" : ui.icon} size={22} color={esHistorial ? '#64748B' : ui.text} />
            </View>
            <View>
              <Text style={styles.cavaName}>{item.cava_nombre}</Text>
              <Text style={styles.timeText}>{obtenerTiempoRelativo(item.fecha)}</Text>
            </View>
          </View>
          
          <View style={[styles.priorityBadge, { backgroundColor: esHistorial ? '#F8FAFC' : ui.bg, borderColor: esHistorial ? '#E2E8F0' : ui.border }]}>
            <Text style={[styles.priorityText, { color: esHistorial ? '#94A3B8' : ui.text }]}>
              {esHistorial ? 'RESUELTA' : ui.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.messageText}>{item.mensaje}</Text>
          {item.valor_registrado && (
            <View style={styles.lecturePill}>
              <Icon name="history" size={16} color="#64748B" />
              <Text style={styles.lectureText}>Lectura Registrada: <Text style={{fontWeight: '900', color: '#0F172A'}}>{item.valor_registrado}°C</Text></Text>
            </View>
          )}
        </View>

        {!esHistorial && (
          <Pressable 
            style={({ pressed }) => [styles.actionButton, { backgroundColor: ui.text }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={() => { setAlertaSeleccionada(item); setModalVisible(true); }}
          >
            <Icon name="shield-check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.actionButtonText}>ATENDER ALERTA</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />
      
      <View style={styles.headerArea}>
        <Text style={styles.pageTitle}>Centro de Alertas</Text>
        
        {/* KPIs Limpios e Integrados */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <Text style={[styles.kpiNumber, { color: '#DC2626' }]}>{conteoCriticas}</Text>
            <Text style={[styles.kpiLabel, { color: '#EF4444' }]}>CRÍTICAS</Text>
          </View>
          <View style={[styles.kpiBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
            <Text style={[styles.kpiNumber, { color: '#D97706' }]}>{conteoAltas}</Text>
            <Text style={[styles.kpiLabel, { color: '#F59E0B' }]}>ALTAS</Text>
          </View>
          <View style={[styles.kpiBox, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
            <Text style={[styles.kpiNumber, { color: '#64748B' }]}>{alertas.length}</Text>
            <Text style={[styles.kpiLabel, { color: '#94A3B8' }]}>TOTAL</Text>
          </View>
        </View>

        {/* Tab Selector Moderno */}
        <View style={styles.tabContainer}>
          <Pressable style={[styles.tabButton, activeTab === 'pendientes' && styles.tabButtonActive]} onPress={() => setActiveTab('pendientes')}>
            <Text style={[styles.tabText, activeTab === 'pendientes' && styles.tabTextActive]}>En Curso</Text>
          </Pressable>
          <Pressable style={[styles.tabButton, activeTab === 'historial' && styles.tabButtonActive]} onPress={() => setActiveTab('historial')}>
            <Text style={[styles.tabText, activeTab === 'historial' && styles.tabTextActive]}>Historial</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#0284C7" /></View>
      ) : (
        <FlatList
          data={activeTab === 'pendientes' ? alertas : historial}
          renderItem={renderAlerta}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAlertas()} colors={["#0284C7"]} />}
          ListEmptyComponent={
            <View style={styles.emptyStateBox}>
              <Icon name="shield-check-outline" size={60} color="#10B981" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyStateTitle}>Sistema Estabilizado</Text>
              <Text style={styles.emptyStateSub}>No hay emergencias en la cadena de frío.</Text>
            </View>
          }
        />
      )}

      {/* MODAL DE RESOLUCIÓN PREMIUM */}
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => !isResolving && setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderIcon}>
              <Icon name="shield-lock-outline" size={45} color="#0284C7" />
            </View>
            <Text style={styles.modalTitle}>Certificar Revisión</Text>
            <Text style={styles.modalDesc}>¿Confirmas que la temperatura de la cava ha sido verificada físicamente y el problema solucionado?</Text>
            
            {alertaSeleccionada && (
              <View style={styles.modalTargetBox}>
                <Text style={styles.modalCavaTarget}>{alertaSeleccionada.cava_nombre}</Text>
                <Text style={styles.modalIssueTarget}>{alertaSeleccionada.mensaje}</Text>
              </View>
            )}

            <View style={styles.modalActionRow}>
              <Pressable style={styles.btnCancel} disabled={isResolving} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnCancelTxt}>CANCELAR</Text>
              </Pressable>
              <Pressable style={styles.btnConfirm} disabled={isResolving} onPress={confirmarResolucion}>
                {isResolving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.btnConfirmTxt}>CERTIFICAR</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerArea: { backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderColor: '#E2E8F0', zIndex: 10 },
  pageTitle: { fontSize: 28, fontWeight: '900', color: '#0F172A', marginBottom: 20, letterSpacing: 0.5 },
  
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  kpiBox: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 16, borderWidth: 1, marginHorizontal: 4 },
  kpiNumber: { fontSize: 20, fontWeight: '900' },
  kpiLabel: { fontSize: 10, fontWeight: '800', marginTop: 4, letterSpacing: 0.5 },

  tabContainer: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabButtonActive: { backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  tabText: { color: '#64748B', fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#0284C7', fontWeight: '900' },

  listContainer: { padding: 20, paddingBottom: 40 },
  
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cavaInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cavaName: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginBottom: 2 },
  timeText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  priorityText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  cardBody: { marginBottom: 16 },
  messageText: { fontSize: 14, color: '#475569', lineHeight: 22, fontWeight: '500', marginBottom: 12 },
  lecturePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  lectureText: { fontSize: 13, color: '#64748B', fontWeight: '600', marginLeft: 8 },

  actionButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 48, borderRadius: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
  actionButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },

  emptyStateBox: { alignItems: 'center', justifyContent: 'center', marginTop: 40, padding: 30, backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  emptyStateTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  emptyStateSub: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFFFFF', width: '100%', borderRadius: 32, padding: 30, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
  modalHeaderIcon: { width: 80, height: 80, borderRadius: 25, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 10 },
  modalDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  
  modalTargetBox: { width: '100%', backgroundColor: '#F8FAFC', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 25 },
  modalCavaTarget: { fontSize: 16, fontWeight: '900', color: '#0284C7', marginBottom: 6, textAlign: 'center' },
  modalIssueTarget: { fontSize: 13, color: '#475569', textAlign: 'center', fontWeight: '500' },

  modalActionRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnCancel: { flex: 1, backgroundColor: '#F1F5F9', height: 55, justifyContent: 'center', alignItems: 'center', borderRadius: 16, marginRight: 8 },
  btnCancelTxt: { color: '#64748B', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  btnConfirm: { flex: 1, backgroundColor: '#0284C7', height: 55, justifyContent: 'center', alignItems: 'center', borderRadius: 16, marginLeft: 8, elevation: 4, shadowColor: '#0284C7', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8 },
  btnConfirmTxt: { color: '#FFFFFF', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }
});

export default AlertasScreen;