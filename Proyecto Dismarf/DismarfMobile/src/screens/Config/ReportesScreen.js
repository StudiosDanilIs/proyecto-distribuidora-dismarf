// src/screens/Config/ReportesScreen.js
import React, { useState, useContext } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, 
  Alert, StatusBar, Platform, Modal, SafeAreaView 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient from '../../api/client'; 
import { AuthContext } from '../../context/AuthContext';

// Librerías nativas para descarga y visualización interna
import ReactNativeBlobUtil from 'react-native-blob-util';
import Pdf from 'react-native-pdf';

const ReportesScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(null);
  const { userToken } = useContext(AuthContext);

  // Estados para el Visor PDF Interno
  const [pdfPath, setPdfPath] = useState(null);
  const [modalPdfVisible, setModalPdfVisible] = useState(false);
  const [tituloActual, setTituloActual] = useState('');

  // ====================================================================
  // DESCARGA Y VISUALIZACIÓN NATIVA INTERNA (OFFLINE ROBUSTO)
  // ====================================================================
  const generarYMostrarPDF = async (tipo, titulo) => {
    setLoading(tipo);
    setTituloActual(titulo);

    try {
      let baseURL = apiClient.defaults?.baseURL;
      if (!baseURL) {
        Alert.alert("Error de Conexión", "No se detectó la ruta del servidor local.");
        setLoading(null);
        return;
      }

      if (!baseURL.startsWith('http://') && !baseURL.startsWith('https://')) {
        baseURL = `http://${baseURL}`;
      }

      // LIMPIEZA Y CORRECCIÓN CRÍTICA: Inyectamos el prefijo /core/ alineado a tu API Gateway
      const limpiaBase = baseURL.replace(/\/+$/, '');
      const urlDestino = `${limpiaBase}/core/reportes/${tipo}?token=${userToken}&t=${Date.now()}`;
      
      console.log("Descargando binario nativo desde:", urlDestino);

      const dirs = ReactNativeBlobUtil.fs.dirs;
      const localFilePath = `${dirs.CacheDir}/Reporte_${tipo}_${Date.now()}.pdf`;

      const res = await ReactNativeBlobUtil.config({
        path: localFilePath,
        fileCache: true,
      }).fetch('GET', urlDestino, {
        Authorization: `Bearer ${userToken}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      });

      const status = res.info().status;
      console.log(`Estado HTTP de la descarga PDF: ${status}`);

      // ACEPTAMOS 200 OK y 304 NOT MODIFIED como transacciones exitosas
      if (status === 200 || status === 304) {
        setPdfPath(res.path());
        setModalPdfVisible(true);
      } else {
        Alert.alert(
          "Fallo en el Servidor", 
          `El servidor respondió con código de error (${status}). Verifica las rutas y registros en el backend.`
        );
      }

    } catch (error) {
      console.log("Error en descarga nativa:", error);
      Alert.alert(
        "Error de Procesamiento", 
        "No se pudo descargar el archivo localmente. Comprueba la conexión de tu cable o red."
      );
    } finally {
      setLoading(null);
    }
  };

  // Guardar el archivo en la carpeta pública de Descargas del teléfono
  const exportarADescargas = async () => {
    if (!pdfPath) return;
    try {
      const dirs = ReactNativeBlobUtil.fs.dirs;
      const destPath = `${dirs.DownloadDir}/${tituloActual.replace(/\s+/g, '_')}.pdf`;

      await ReactNativeBlobUtil.fs.cp(pdfPath, destPath);
      Alert.alert("Exportación Exitosa", `El archivo ha sido guardado en la carpeta de Descargas:\n${destPath}`);
    } catch (e) {
      Alert.alert("Aviso", "El archivo ya está guardado o el terminal no autorizó la escritura.");
    }
  };

  const ReporteBoton = ({ id, titulo, sub, icono, color }) => (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.8}
      onPress={() => generarYMostrarPDF(id, titulo)}
      disabled={loading !== null}
    >
      <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
        <Icon name={icono} size={28} color={color} />
      </View>
      
      <View style={styles.infoColumn}>
        <Text style={styles.cardTitle}>{titulo}</Text>
        <Text style={styles.cardSubtitle}>{sub}</Text>
      </View>

      {loading === id ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.actionCircle}>
          <Icon name="file-eye-outline" size={20} color="#0284C7" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F9FF" translucent={false} />
      
      {/* CABECERA PREMIUM ICE-TECH CON FLECHA INTEGRADA */}
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-left" size={22} color="#0284C7" />
          </TouchableOpacity>

          <View style={styles.headerTitlesBox}>
            <Text style={styles.greetingText}>DOCUMENTACIÓN LOCAL</Text>
            <Text style={styles.headerTitle}>Centro de Reportes</Text>
          </View>
        </View>
        
        <Text style={styles.headerDescription}>
          Generación, renderizado interno y auditoría de actas logísticas en formato PDF
        </Text>
      </View>

      {/* PANELES DE GENERACIÓN */}
      <View style={styles.contentArea}>
        <ReporteBoton 
          id="inventario"
          titulo="Inventario de Existencias"
          sub="Listado actual de lotes y ubicaciones"
          icono="package-variant-closed"
          color="#0EA5E9"
        />
        <ReporteBoton 
          id="bitacora"
          titulo="Auditoría de Movimientos"
          sub="Historial completo de acciones del personal"
          icono="shield-account-outline"
          color="#D97706"
        />
        <ReporteBoton 
          id="cavas"
          titulo="Control de Cadena de Frío"
          sub="Estado térmico, rangos y ocupación física"
          icono="snowflake-alert"
          color="#EF4444"
        />
      </View>

      <Text style={styles.brandFooterText}>Reportes Oficiales Dismarf • Studios Daniels</Text>

      {/* ==================================================================== */}
      {/* MODAL: VISOR PDF NATIVO 100% INTERNO                                 */}
      {/* ==================================================================== */}
      <Modal
        visible={modalPdfVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setModalPdfVisible(false)}
      >
        <SafeAreaView style={styles.modalVisorContainer}>
          
          {/* BARRA DE HERRAMIENTAS SUPERIOR DEL VISOR */}
          <View style={styles.visorToolbar}>
            <TouchableOpacity 
              style={styles.visorCloseBtn}
              onPress={() => setModalPdfVisible(false)}
            >
              <Icon name="close" size={24} color="#0F172A" />
            </TouchableOpacity>

            <Text style={styles.visorTitle} numberOfLines={1}>{tituloActual}</Text>

            <TouchableOpacity 
              style={styles.visorExportBtn}
              onPress={exportarADescargas}
            >
              <Icon name="content-save-outline" size={22} color="#0284C7" />
              <Text style={styles.visorExportTxt}>Guardar</Text>
            </TouchableOpacity>
          </View>

          {/* RENDERIZADOR PDF NATIVO */}
          {pdfPath ? (
            <Pdf
              source={{ uri: `file://${pdfPath}` }}
              onLoadComplete={(numberOfPages) => {
                console.log(`PDF cargado exitosamente. Páginas: ${numberOfPages}`);
              }}
              onError={(error) => {
                console.log("Error renderizando PDF interno:", error);
                Alert.alert("Error de Lectura", "No se pudo interpretar el archivo PDF generado por el servidor.");
              }}
              style={styles.pdfViewer}
              fitPolicy={0}
            />
          ) : (
            <View style={styles.visorLoading}>
              <ActivityIndicator size="large" color="#0284C7" />
              <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '600' }}>Renderizando documento...</Text>
            </View>
          )}

        </SafeAreaView>
      </Modal>

    </View>
  );
};

// ESTILOS ICE-TECH ULTRA PREMIUM
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
    shadowRadius: 12
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  
  backButton: {
    backgroundColor: '#FFFFFF',
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0', marginRight: 15
  },

  headerTitlesBox: { flex: 1 },
  greetingText: { color: '#0284C7', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerTitle: { color: '#0F172A', fontSize: 26, fontWeight: '900', letterSpacing: 0.2 },
  headerDescription: { fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 18 },

  contentArea: { padding: 20, marginTop: 10 },
  
  card: { 
    backgroundColor: '#FFFFFF', borderRadius: 22, padding: 20, 
    flexDirection: 'row', alignItems: 'center', marginBottom: 16, 
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' 
  },
  iconBox: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  
  infoColumn: { flex: 1, marginRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: '#64748B', fontWeight: '500' },

  actionCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E0F2FE'
  },

  brandFooterText: { position: 'absolute', bottom: 30, alignSelf: 'center', color: '#CBD5E1', fontSize: 11, fontWeight: '800' },

  // Estilos del Visor Interno
  modalVisorContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  
  visorToolbar: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0', elevation: 2
  },
  visorCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  visorTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', flex: 1, textAlign: 'center', marginHorizontal: 15 },
  
  visorExportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E0F2FE' },
  visorExportTxt: { color: '#0284C7', fontWeight: '800', fontSize: 13, marginLeft: 4 },

  pdfViewer: { flex: 1, backgroundColor: '#E2E8F0' },
  visorLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default ReportesScreen;