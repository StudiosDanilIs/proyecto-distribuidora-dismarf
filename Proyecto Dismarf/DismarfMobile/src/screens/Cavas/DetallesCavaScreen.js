import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ActivityIndicator, Dimensions, 
  ScrollView, TouchableOpacity, StatusBar, RefreshControl, Platform 
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient from '../../api/client';

const DetallesCavaScreen = ({ route, navigation }) => {
  const { 
    id, nombre, mac_esp32, tipo_producto = 'Mixto', capacidad_ocupada = 0, 
    ultimo_mantenimiento, temp_min = -20, temp_max = -10, estado = true, ubicacion = ''
  } = route.params;

  const [historial, setHistorial] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Diccionario de Iconos y Colores (Ice-Tech)
  const obtenerIconoProducto = (tipo) => {
    switch(tipo) {
      case 'Carnes': return { icon: 'food-steak', color: '#EF4444', bg: '#FEF2F2' };
      case 'Pollo': return { icon: 'food-drumstick', color: '#F59E0B', bg: '#FFFBEB' };
      case 'Pescado': return { icon: 'fish', color: '#0EA5E9', bg: '#E0F2FE' };
      case 'Verduras': return { icon: 'leaf', color: '#10B981', bg: '#ECFDF5' };
      case 'Charcutería': return { icon: 'sausage', color: '#F43F5E', bg: '#FFF1F2' };
      case 'Medicinas': return { icon: 'pill', color: '#14B8A6', bg: '#F0FDFA' };
      default: return { icon: 'package-variant', color: '#0284C7', bg: '#F0F9FF' };
    }
  };

  const UI_Logistica = obtenerIconoProducto(tipo_producto);

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return 'Sin registro';
    try { return fechaISO.split('T')[0]; } 
    catch (e) { return fechaISO; }
  };

  const fetchHistorial = async () => {
    try {
      const response = await apiClient.get(`/iot/history/${mac_esp32}`);
      setHistorial(response.data.reverse());
    } catch (error) {
      console.log('Error IoT:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistorial();
  }, [mac_esp32]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistorial();
  }, []);

  // Variables de lectura actual
  const tempActual = historial.length > 0 ? parseFloat(historial[historial.length - 1].temperatura) : null;
  const humActual = historial.length > 0 ? historial[historial.length - 1].humedad : '--';
  const puertaAbierta = historial.length > 0 ? historial[historial.length - 1].puerta_abierta : false;

  // Validación de Rango Seguro
  const tempSegura = tempActual !== null ? (tempActual >= temp_min && tempActual <= temp_max) : true;

  const chartData = {
    labels: historial.length > 0 ? historial.map(item => {
      const fecha = new Date(item.timestamp);
      return `${fecha.getHours()}:${fecha.getMinutes() < 10 ? '0' : ''}${fecha.getMinutes()}`;
    }) : ['--'],
    datasets: [{ 
      data: historial.length > 0 ? historial.map(item => item.temperatura) : [0], 
      color: () => tempSegura ? `#0284C7` : `#EF4444`, 
      strokeWidth: 3 
    }],
    legend: ["Temp (°C)"]
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F9FF" translucent={false} />
      
      {/* CABECERA CORREGIDA: Todo alineado en una sola fila horizontal */}
      <View style={styles.header}>
        <View style={styles.headerMainRow}>
          
          {/* Botón Atrás a la izquierda */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <Icon name="arrow-left" size={28} color="#0284C7" />
          </TouchableOpacity>
          
          {/* Título en el centro/lado */}
          <View style={styles.titleWrapper}>
            <Text style={styles.title} numberOfLines={1}>{nombre}</Text>
          </View>

          {/* Etiqueta de Estado a la derecha */}
          <View style={[styles.badgeEstado, { backgroundColor: estado ? '#ECFDF5' : '#FEF2F2' }]}>
            <Icon name={estado ? "check-circle" : "alert-circle"} size={14} color={estado ? "#10B981" : "#EF4444"} />
            <Text style={[styles.textoBadge, { color: estado ? "#047857" : "#B91C1C" }]}>
              {estado ? 'OPERATIVA' : 'SUSPENDIDA'}
            </Text>
          </View>

        </View>

        {/* Subtítulo alineado visualmente con el texto superior */}
        <View style={styles.subtitleRow}>
          <Icon name="map-marker" size={14} color="#0284C7" />
          <Text style={styles.subtitle} numberOfLines={1}> {ubicacion}  •  MAC: {mac_esp32}</Text>
        </View>
      </View>

      {/* CONTENIDO SCROLLABLE CON PULL-TO-REFRESH */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0284C7"]} tintColor="#0284C7" />
        }
      >
        {/* PANEL LOGÍSTICO */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Estado Logístico</Text>
            <TouchableOpacity 
              style={styles.btnEditar} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate('FormularioCava', { cava: route.params })}
            >
              <Icon name="pencil" size={16} color="#0284C7" />
              <Text style={styles.textoBtnEditar}>Editar Cava</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.filaInfo}>
            <View style={[styles.iconoFondo, { backgroundColor: UI_Logistica.bg }]}>
              <Icon name={UI_Logistica.icon} size={22} color={UI_Logistica.color} />
            </View>
            <View style={styles.textoInfo}>
              <Text style={styles.label}>Producto Principal</Text>
              <Text style={styles.valor}>{tipo_producto}</Text>
            </View>
          </View>

          <View style={styles.filaInfo}>
            <View style={[styles.iconoFondo, { backgroundColor: '#F1F5F9' }]}>
              <Icon name="thermometer-lines" size={22} color="#64748B" />
            </View>
            <View style={styles.textoInfo}>
              <Text style={styles.label}>Rango Térmico Permitido</Text>
              <Text style={styles.valor}>{temp_min}°C  a  {temp_max}°C</Text>
            </View>
          </View>

          <View style={styles.filaInfo}>
            <View style={[styles.iconoFondo, { backgroundColor: '#E0F2FE' }]}>
              <Icon name="chart-pie" size={22} color="#0284C7" />
            </View>
            <View style={styles.textoInfo}>
              <View style={styles.capacidadHeader}>
                <Text style={styles.label}>Capacidad Física Ocupada</Text>
                <Text style={[styles.valorCapacidad, { color: capacidad_ocupada > 85 ? '#EF4444' : '#0284C7' }]}>{capacidad_ocupada}%</Text>
              </View>
              <View style={styles.barraFondo}>
                <View style={[styles.barraProgreso, { width: `${capacidad_ocupada}%`, backgroundColor: capacidad_ocupada > 85 ? '#EF4444' : '#0EA5E9' }]} />
              </View>
            </View>
          </View>

          <View style={[styles.filaInfo, { marginBottom: 0 }]}>
            <View style={[styles.iconoFondo, { backgroundColor: '#FFFBEB' }]}>
              <Icon name="wrench-clock" size={22} color="#D97706" />
            </View>
            <View style={styles.textoInfo}>
              <Text style={styles.label}>Último Mantenimiento</Text>
              <Text style={styles.valor}>{formatearFecha(ultimo_mantenimiento)}</Text>
            </View>
          </View>
        </View>

        {/* TELEMETRÍA IOT Y GRÁFICO */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 40 }} />
        ) : historial.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="satellite-uplink" size={50} color="#CBD5E1" />
            <Text style={styles.emptyText}>Sin telemetría reciente del ESP32</Text>
            <Text style={styles.emptySubText}>Desliza hacia abajo para intentar reconectar</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionTitle}>Comportamiento Térmico</Text>
              <View style={[styles.statusIndicator, { backgroundColor: tempSegura ? '#ECFDF5' : '#FEF2F2' }]}>
                <Text style={[styles.statusIndicatorTxt, { color: tempSegura ? '#10B981' : '#EF4444' }]}>
                  {tempSegura ? '● ESTABLE' : '● PELIGRO'}
                </Text>
              </View>
            </View>

            <LineChart 
              data={chartData} 
              width={Dimensions.get('window').width - 80} 
              height={210} 
              yAxisSuffix="°" 
              chartConfig={{ 
                backgroundColor: '#FFFFFF', 
                backgroundGradientFrom: '#FFFFFF', 
                backgroundGradientTo: '#FFFFFF', 
                decimalPlaces: 1, 
                color: () => tempSegura ? `#0284C7` : `#EF4444`, 
                labelColor: () => `#64748B`,
                propsForDots: { r: "5", strokeWidth: "2", stroke: tempSegura ? "#0EA5E9" : "#DC2626" },
                propsForBackgroundLines: { stroke: "#F1F5F9" }
              }} 
              bezier 
              style={styles.chartStyle} 
            />
            
            {/* PÍLDORAS DE SENSORES */}
            <View style={styles.statusGrid}>
              <View style={styles.statusBox}>
                <Icon name="thermometer" size={24} color={tempSegura ? "#0284C7" : "#EF4444"} />
                <Text style={[styles.statusValue, !tempSegura && { color: '#EF4444' }]}>{tempActual}°C</Text>
                <Text style={styles.statusLabel}>Temperatura</Text>
              </View>
              
              <View style={styles.statusBox}>
                <Icon name="water-percent" size={24} color="#0EA5E9" />
                <Text style={styles.statusValue}>{humActual}%</Text>
                <Text style={styles.statusLabel}>Humedad</Text>
              </View>

              <View style={[styles.statusBox, puertaAbierta && { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Icon name={puertaAbierta ? "door-open" : "door-closed"} size={24} color={puertaAbierta ? "#EF4444" : "#10B981"} />
                <Text style={[styles.statusValue, puertaAbierta && { color: '#EF4444' }]}>
                  {puertaAbierta ? 'ABIERTA' : 'CERRADA'}
                </Text>
                <Text style={styles.statusLabel}>Puerta</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  
  // Cabecera reestructurada en fila horizontal
  header: { 
    backgroundColor: '#F0F9FF', 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingHorizontal: 20, 
    paddingBottom: 25, 
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40, 
    elevation: 4,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    zIndex: 10
  },
  headerMainRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 6 
  },
  backBtn: { 
    marginRight: 12 
  },
  titleWrapper: { 
    flex: 1, 
    marginRight: 10 
  },
  title: { 
    color: '#0F172A', 
    fontSize: 22, 
    fontWeight: '900', 
    letterSpacing: 0.2 
  },
  badgeEstado: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 12 
  },
  textoBadge: { 
    fontSize: 10, 
    fontWeight: '800', 
    marginLeft: 4 
  },
  subtitleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginLeft: 40 // Desplaza el subtítulo para alinearse exactamente bajo el texto del título principal
  },
  subtitle: { 
    color: '#64748B', 
    fontSize: 13, 
    fontWeight: '600' 
  },

  scrollContent: { padding: 20, paddingBottom: 60 },
  
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 22, 
    marginBottom: 20, 
    elevation: 3, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1, 
    borderColor: '#F1F5F9' 
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  btnEditar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  textoBtnEditar: { color: '#0284C7', fontSize: 12, fontWeight: '800', marginLeft: 6 },

  filaInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  iconoFondo: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  textoInfo: { flex: 1 },
  label: { fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', fontWeight: '800', marginBottom: 3, letterSpacing: 0.5 },
  valor: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  
  capacidadHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  valorCapacidad: { fontWeight: '800', fontSize: 14 },
  barraFondo: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  barraProgreso: { height: '100%', borderRadius: 4 },

  statusIndicator: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusIndicatorTxt: { fontSize: 11, fontWeight: '800' },

  chartStyle: { marginVertical: 10, borderRadius: 16, alignSelf: 'center' },

  statusGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 15 },
  statusBox: { flex: 1, alignItems: 'center', backgroundColor: '#F8FAFC', paddingVertical: 16, paddingHorizontal: 5, borderRadius: 18, borderWidth: 1, borderColor: '#F1F5F9', marginHorizontal: 5 },
  statusValue: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginTop: 6 },
  statusLabel: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', backgroundColor: '#FFFFFF', padding: 40, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
  emptyText: { fontSize: 16, fontWeight: '800', color: '#475569', marginTop: 15 },
  emptySubText: { fontSize: 13, color: '#94A3B8', marginTop: 5 }
});

export default DetallesCavaScreen;