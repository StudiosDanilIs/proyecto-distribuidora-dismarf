import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, 
  Alert, StatusBar, Platform, Modal, ScrollView, Pressable,
  LayoutAnimation, UIManager
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient from '../../api/client'; 
import { AuthContext } from '../../context/AuthContext';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Pdf from 'react-native-pdf';

const ReportesScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  
  const [cavasDisponibles, setCavasDisponibles] = useState([]);
  
  const [loading, setLoading] = useState(null);

  const [pdfPath, setPdfPath] = useState(null);
  const [modalPdfVisible, setModalPdfVisible] = useState(false);
  const [tituloActual, setTituloActual] = useState('');
  
  const [modalConfigVisible, setModalConfigVisible] = useState(false);
  const [reporteSeleccionado, setReporteSeleccionado] = useState({ id: '', titulo: '' });
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos'); 
  const [filtroCava, setFiltroCava] = useState('todas'); 

  useEffect(() => {
    const fetchCavas = async () => {
      try {
        const res = await apiClient.get('/api/cavas');
        setCavasDisponibles(res.data || []);
      } catch (error) {
        console.log("No se pudieron cargar las cavas para el filtro.");
      }
    };
    fetchCavas();
  }, []);

  const abrirConfiguracion = (id, titulo) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setReporteSeleccionado({ id, titulo });
    setFiltroPeriodo('todos');
    setFiltroCava('todas');
    setModalConfigVisible(true);
  };

  const iniciarGeneracion = () => {
    setModalConfigVisible(false);
    generarYMostrarPDF(reporteSeleccionado.id, reporteSeleccionado.titulo);
  };

  const generarYMostrarPDF = async (tipo, titulo) => {
    setLoading(tipo);
    setTituloActual(titulo);

    try {
      let baseURL = apiClient.defaults?.baseURL;
      
      if (!baseURL || !baseURL.startsWith('http')) {
        Alert.alert("Error", "Ruta del servidor inválida en client.js.");
        setLoading(null);
        return;
      }

      let limpiaBase = baseURL.replace(/\/+$/, '');
      if (!limpiaBase.endsWith('/api')) {
        limpiaBase = `${limpiaBase}/api`;
      }

      const urlDestino = `${limpiaBase}/reportes/${tipo}?periodo=${filtroPeriodo}&cavaId=${filtroCava}&token=${userToken}&t=${Date.now()}`;
      
      const dirs = ReactNativeBlobUtil.fs.dirs;
      const localFilePath = `${dirs.CacheDir}/Reporte_${tipo}_${Date.now()}.pdf`;

      const res = await ReactNativeBlobUtil.config({
        path: localFilePath,
        fileCache: true,
      }).fetch('GET', urlDestino, {
        Authorization: `Bearer ${userToken}`,
        'Cache-Control': 'no-cache',
      });

      const status = res.info().status;

      if (status === 200 || status === 304) {
        setPdfPath(res.path());
        setModalPdfVisible(true);
      } else {
        Alert.alert("Rechazo del Servidor", `Código de error: ${status}`);
      }
    } catch (error) {
      Alert.alert("Fallo de Red", "Asegúrate de que el celular y la PC estén en el mismo Wi-Fi.");
    } finally {
      setLoading(null);
    }
  };

  const exportarADescargas = async () => {
    if (!pdfPath) return;
    try {
      const dirs = ReactNativeBlobUtil.fs.dirs;
      const safeTitle = tituloActual.replace(/[^a-zA-Z0-9]/g, '_');
      const destPath = `${dirs.DownloadDir}/Dismarf_${safeTitle}_${Date.now()}.pdf`;
      
      await ReactNativeBlobUtil.fs.cp(pdfPath, destPath);
      Alert.alert("Exportación Exitosa", `Documento guardado en Descargas:\n\n${destPath}`);
    } catch (e) {
      Alert.alert("Alerta de Sistema", "No se pudo mover el archivo. Verifica los permisos de almacenamiento.");
    }
  };

  const SelectorOpcion = ({ label, activo, onPress, icon }) => (
    <Pressable 
      style={({ pressed }) => [
        styles.selectorBtn, 
        activo && styles.selectorBtnActivo,
        pressed && { transform: [{ scale: 0.96 }] }
      ]} 
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onPress();
      }}
    >
      {icon && <Icon name={icon} size={14} color={activo ? "#0284C7" : "#64748B"} style={{ marginRight: 4 }} />}
      <Text style={[styles.selectorTxt, activo && styles.selectorTxtActivo]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F9FF" translucent={false} />
      
      {/* CABECERA ALINEADA AL ESTILO DEL DASHBOARD */}
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Icon name="arrow-left" size={22} color="#0284C7" />
          </TouchableOpacity>
          <View style={styles.headerTitlesBox}>
            <Text style={styles.greetingText}>CENTRO DE IMPRESIÓN</Text>
            <Text style={styles.headerTitle}>Auditoría PDF</Text>
          </View>
        </View>
        <Text style={styles.headerDescription}>
          Genera y exporta actas logísticas firmadas digitalmente por el sistema.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        
        <Pressable 
          style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]} 
          onPress={() => abrirConfiguracion('inventario', 'Acta de Inventario')}
          disabled={loading !== null}
        >
          <View style={[styles.iconBox, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD', borderWidth: 1 }]}>
            {loading === 'inventario' ? <ActivityIndicator color="#0284C7" /> : <Icon name="package-variant" size={24} color="#0284C7" />}
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.cardTitle}>Inventario de Existencias</Text>
            <Text style={styles.cardSubtitle}>Cuadre general de lotes almacenados y en cola.</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#CBD5E1" />
        </Pressable>

        <Pressable 
          style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]} 
          onPress={() => abrirConfiguracion('cavas', 'Reporte de Cadena de Frío')}
          disabled={loading !== null}
        >
          <View style={[styles.iconBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1 }]}>
            {loading === 'cavas' ? <ActivityIndicator color="#EF4444" /> : <Icon name="snowflake-thermometer" size={24} color="#EF4444" />}
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.cardTitle}>Reporte de Cadena de Frío</Text>
            <Text style={styles.cardSubtitle}>Métricas térmicas y estados operativos (ESP32).</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#CBD5E1" />
        </Pressable>

        <Pressable 
          style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]} 
          onPress={() => abrirConfiguracion('bitacora', 'Trazabilidad de Personal')}
          disabled={loading !== null}
        >
          <View style={[styles.iconBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A', borderWidth: 1 }]}>
            {loading === 'bitacora' ? <ActivityIndicator color="#D97706" /> : <Icon name="shield-account" size={24} color="#D97706" />}
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.cardTitle}>Trazabilidad de Personal</Text>
            <Text style={styles.cardSubtitle}>Bitácora de movimientos y accesos operativos.</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#CBD5E1" />
        </Pressable>

      </ScrollView>

      <Modal visible={modalConfigVisible} transparent animationType="slide" onRequestClose={() => setModalConfigVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.configCard}>
            
            <View style={styles.pullIndicator} />
            
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.configModalTitle}>Configurar Acta</Text>
                <Text style={styles.configModalSubtitle}>{reporteSeleccionado.titulo}</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setModalConfigVisible(false)}>
                <Icon name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <Text style={styles.filterLabel}>Rango Cronológico</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterGrid}>
              <SelectorOpcion icon="calendar-today" label="Hoy" activo={filtroPeriodo === 'dia'} onPress={() => setFiltroPeriodo('dia')} />
              <SelectorOpcion icon="calendar-week" label="7 Días" activo={filtroPeriodo === 'semana'} onPress={() => setFiltroPeriodo('semana')} />
              <SelectorOpcion icon="calendar-month" label="Mes" activo={filtroPeriodo === 'mes'} onPress={() => setFiltroPeriodo('mes')} />
              <SelectorOpcion icon="database-search" label="Todo el Historial" activo={filtroPeriodo === 'todos'} onPress={() => setFiltroPeriodo('todos')} />
            </ScrollView>

            <Text style={[styles.filterLabel, { marginTop: 10 }]}>Segmentación Físca (Cavas)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterGrid}>
              <SelectorOpcion icon="fridge-industrial-outline" label="Todas las Áreas" activo={filtroCava === 'todas'} onPress={() => setFiltroCava('todas')} />
              {cavasDisponibles.map(cava => (
                <SelectorOpcion 
                  key={cava.id} 
                  icon="fridge-outline" 
                  label={cava.nombre} 
                  activo={filtroCava === cava.id.toString()} 
                  onPress={() => setFiltroCava(cava.id.toString())} 
                />
              ))}
            </ScrollView>

            <Pressable 
              style={({ pressed }) => [styles.btnGenerar, pressed && { transform: [{ scale: 0.98 }] }]} 
              onPress={iniciarGeneracion}
            >
              <Icon name="printer-pos" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.txtBtnGenerar}>Procesar e Imprimir Documento</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL VISOR PDF A PANTALLA COMPLETA*/}
      <Modal visible={modalPdfVisible} transparent={false} animationType="slide" onRequestClose={() => setModalPdfVisible(false)}>
        <View style={styles.modalVisorContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          
          <View style={styles.visorToolbar}>
            <TouchableOpacity style={styles.visorCloseBtn} onPress={() => setModalPdfVisible(false)}>
              <Icon name="arrow-left" size={24} color="#0F172A" />
            </TouchableOpacity>
            
            <View style={{ flex: 1, marginHorizontal: 15 }}>
              <Text style={styles.visorTitle} numberOfLines={1}>{tituloActual}</Text>
              <Text style={styles.visorSubTitle}>Documento validado</Text>
            </View>

            <TouchableOpacity style={styles.visorExportBtn} onPress={exportarADescargas}>
              <Icon name="download-box-outline" size={20} color="#0284C7" />
              <Text style={styles.visorExportTxt}>Exportar</Text>
            </TouchableOpacity>
          </View>

          {pdfPath && (
            <View style={{ flex: 1, backgroundColor: '#E2E8F0' }}>
              <Pdf 
                source={{ uri: `file://${pdfPath}` }} 
                style={styles.pdfViewer} 
                fitPolicy={0} 
                onLoadProgress={() => <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 50 }}/>}
              />
            </View>
          )}
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  headerBlock: { 
    backgroundColor: '#F0F9FF', 
    paddingTop: Platform.OS === 'ios' ? 60 : 30, 
    paddingHorizontal: 25, 
    paddingBottom: 30, 
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40,
    elevation: 4,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    zIndex: 10
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  backButton: { backgroundColor: '#FFFFFF', width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  headerTitlesBox: { flex: 1 },
  greetingText: { color: '#0284C7', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { color: '#0F172A', fontSize: 26, fontWeight: '900', letterSpacing: 0.2 },
  headerDescription: { fontSize: 13, color: '#64748B', lineHeight: 20, fontWeight: '500' },
  
  contentArea: { padding: 20, paddingTop: 30 },
  
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#F1F5F9', 
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8
  },
  iconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoColumn: { flex: 1, paddingRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: '#64748B', lineHeight: 18 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
  configCard: { backgroundColor: '#FFFFFF', width: '100%', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, paddingBottom: 35, elevation: 15 },
  pullIndicator: { width: 45, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  configModalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  configModalSubtitle: { fontSize: 13, color: '#0284C7', fontWeight: '800', marginTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },

  filterLabel: { fontSize: 12, fontWeight: '800', color: '#64748B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  filterGrid: { flexDirection: 'row', paddingBottom: 15 },
  selectorBtn: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 10 },
  selectorBtnActivo: { backgroundColor: '#F0F9FF', borderColor: '#0284C7' },
  selectorTxt: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  selectorTxtActivo: { color: '#0284C7', fontWeight: '900' },
  
  btnGenerar: { flexDirection: 'row', backgroundColor: '#0284C7', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 25, elevation: 4, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  txtBtnGenerar: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },

  modalVisorContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  visorToolbar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'ios' ? 50 : 20, 
    paddingBottom: 15,
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9',
    elevation: 2
  },
  visorCloseBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  visorTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  visorSubTitle: { fontSize: 11, color: '#10B981', fontWeight: '700', marginTop: 2 },
  visorExportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD' },
  visorExportTxt: { color: '#0284C7', fontWeight: '800', fontSize: 12, marginLeft: 4 },
  
  pdfViewer: { flex: 1, backgroundColor: '#E2E8F0' }
});

export default ReportesScreen;