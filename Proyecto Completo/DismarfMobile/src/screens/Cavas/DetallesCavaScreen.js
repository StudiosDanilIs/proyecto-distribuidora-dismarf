import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ActivityIndicator, Dimensions, 
  ScrollView, TouchableOpacity, StatusBar, RefreshControl, Platform, Pressable 
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient, { iotClient } from '../../api/client';

const FILTROS_TIEMPO = [
  { id: '1H', label: '1H', minutos: 60 },
  { id: '6H', label: '6H', minutos: 360 },
  { id: '12H', label: '12H', minutos: 720 },
  { id: '24H', label: '24H', minutos: 1440 },
  { id: 'ALL', label: 'Todo', minutos: Infinity }
];

const DetallesCavaScreen = ({ route, navigation }) => {
  const { 
    id, nombre, mac_esp32, tipo_producto = 'Mixto', capacidad_ocupada = 0, 
    temp_min = -20, temp_max = -10, estado = true, ubicacion = ''
  } = route.params;

  const [historial, setHistorial] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState('1H');

  const UI_Logistica = (() => {
    switch(tipo_producto) {
      case 'Carnes': return { icon: 'food-steak', color: '#EF4444', bg: '#FEF2F2' };
      case 'Pollo': return { icon: 'food-drumstick', color: '#F59E0B', bg: '#FFFBEB' };
      case 'Pescado': return { icon: 'fish', color: '#0EA5E9', bg: '#E0F2FE' };
      case 'Verduras': return { icon: 'leaf', color: '#10B981', bg: '#ECFDF5' };
      case 'Medicinas': return { icon: 'pill', color: '#8B5CF6', bg: '#F5F3FF' };
      default: return { icon: 'package-variant', color: '#0284C7', bg: '#F0F9FF' };
    }
  })();

  const fetchHistorial = async () => {
    try {
      const response = await iotClient.get(`/api/telemetry/history/${mac_esp32}`);
      setHistorial(response.data.reverse());
    } catch (error) { console.log('Error IoT:', error); } 
    finally { setIsLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchHistorial(); }, [mac_esp32]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchHistorial(); }, []);

  const datosMostrar = (() => {
    if (historial.length === 0) return [];
    if (filtroActivo === 'ALL') return historial;
    const minutos = FILTROS_TIEMPO.find(f => f.id === filtroActivo).minutos;
    const tiempoReferencia = new Date(historial[historial.length - 1].timestamp).getTime();
    const tiempoCorte = tiempoReferencia - (minutos * 60000);
    let filtrados = historial.filter(item => new Date(item.timestamp).getTime() >= tiempoCorte);
    return filtrados.length < 3 ? historial.slice(-5) : filtrados;
  })();

  const stats = (() => {
    if (datosMostrar.length === 0) return { min: '--', max: '--', avg: '--' };
    const temps = datosMostrar.map(d => parseFloat(d.temperatura));
    return {
      min: Math.min(...temps).toFixed(1),
      max: Math.max(...temps).toFixed(1),
      avg: (temps.reduce((a,b) => a+b, 0) / temps.length).toFixed(1)
    };
  })();

  const tempActual = historial.length > 0 ? parseFloat(historial[historial.length - 1].temperatura) : null;
  const humActual = historial.length > 0 ? historial[historial.length - 1].humedad : '--';
  const puertaAbierta = historial.length > 0 ? historial[historial.length - 1].puerta_abierta : false;
  const tempSegura = tempActual !== null ? (tempActual >= temp_min && tempActual <= temp_max) : true;
  
  const ultimaConexion = historial.length > 0 
    ? new Date(historial[historial.length - 1].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
    : '--:--';

  const chartData = {
    labels: datosMostrar.length > 0 ? datosMostrar.map((item, index) => {
      const saltos = Math.ceil(datosMostrar.length / 6);
      if (index % saltos !== 0 && index !== datosMostrar.length - 1) return ''; 
      const f = new Date(item.timestamp);
      return `${f.getHours()}:${f.getMinutes().toString().padStart(2, '0')}`;
    }) : ['--'],
    datasets: [{ 
      data: datosMostrar.length > 0 ? datosMostrar.map(item => item.temperatura) : [0], 
      color: () => tempSegura ? `#0284C7` : `#EF4444`, 
      strokeWidth: 4 
    }]
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      
      {/* CABECERA */}
      <View style={styles.header}>
        <View style={styles.headerMainRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={15}>
            <Icon name="arrow-left" size={26} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.titleWrapper}>
            <Text style={styles.title} numberOfLines={1}>{nombre}</Text>
          </View>
          <View style={[styles.badgeEstado, { backgroundColor: estado ? '#ECFDF5' : '#FEF2F2' }]}>
            <Text style={[styles.textoBadge, { color: estado ? "#10B981" : "#EF4444" }]}>
              {estado ? 'ACTIVA' : 'INACTIVA'}
            </Text>
          </View>
        </View>
        <View style={styles.subtitleRow}>
          <Icon name="map-marker" size={14} color="#64748B" />
          <Text style={styles.subtitle} numberOfLines={1}> {ubicacion}  •  ID: {mac_esp32.slice(-6)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0284C7"]} />}>
        
        {/* PANEL LOGÍSTICO */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Perfil Logístico</Text>
            <TouchableOpacity style={styles.btnEditar} onPress={() => navigation.navigate('FormularioCava', { cava: route.params })}>
              <Icon name="cog-outline" size={16} color="#0284C7" />
              <Text style={styles.textoBtnEditar}>Ajustes</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <View style={[styles.iconoFondo, { backgroundColor: UI_Logistica.bg }]}>
                <Icon name={UI_Logistica.icon} size={22} color={UI_Logistica.color} />
              </View>
              <View>
                <Text style={styles.label}>Producto</Text>
                <Text style={styles.valor}>{tipo_producto}</Text>
              </View>
            </View>
            <View style={styles.infoCol}>
              <View style={[styles.iconoFondo, { backgroundColor: '#F8FAFC' }]}>
                <Icon name="thermometer-lines" size={22} color="#64748B" />
              </View>
              <View>
                <Text style={styles.label}>Rango Ideal</Text>
                <Text style={styles.valor}>{temp_min}°  a  {temp_max}°</Text>
              </View>
            </View>
          </View>

          <View style={styles.capacidadContainer}>
            <View style={styles.capacidadHeader}>
              <Text style={styles.label}>Ocupación Física</Text>
              <Text style={[styles.valorCapacidad, { color: capacidad_ocupada > 85 ? '#EF4444' : '#0284C7' }]}>{capacidad_ocupada}%</Text>
            </View>
            <View style={styles.barraFondo}>
              <View style={[styles.barraProgreso, { width: `${capacidad_ocupada}%`, backgroundColor: capacidad_ocupada > 85 ? '#EF4444' : '#0284C7' }]} />
            </View>
          </View>
        </View>

        {/* TELEMETRÍA IOT Y GRÁFICO */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 40 }} />
        ) : historial.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="satellite-variant" size={45} color="#CBD5E1" />
            <Text style={styles.emptyText}>Buscando señal de telemetría...</Text>
          </View>
        ) : (
          <View style={[styles.card, { paddingHorizontal: 0, paddingBottom: 0 }]}>
            
            <View style={{ paddingHorizontal: 20 }}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle}>Monitoreo Térmico</Text>
                <View style={styles.syncRow}>
                  <Icon name="wifi" size={14} color="#10B981" />
                  <Text style={styles.syncText}>Sync: {ultimaConexion}</Text>
                </View>
              </View>

              {/* FILTROS DE TIEMPO */}
              <View style={styles.filtrosContainer}>
                {FILTROS_TIEMPO.map(filtro => (
                  <Pressable key={filtro.id} style={[styles.filtroBtn, filtroActivo === filtro.id && styles.filtroBtnActivo]} onPress={() => setFiltroActivo(filtro.id)}>
                    <Text style={[styles.filtroTxt, filtroActivo === filtro.id && styles.filtroTxtActivo]}>{filtro.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* RESUMEN ESTADÍSTICO */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Mínima</Text>
                  <Text style={styles.statNumber}>{stats.min}°</Text>
                </View>
                <View style={[styles.statBox, styles.statBoxBorder]}>
                  <Text style={styles.statLabel}>Promedio</Text>
                  <Text style={[styles.statNumber, { color: '#0284C7' }]}>{stats.avg}°</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Máxima</Text>
                  <Text style={[styles.statNumber, stats.max > temp_max && { color: '#EF4444' }]}>{stats.max}°</Text>
                </View>
              </View>
            </View>

            {/* GRÁFICO MEJORADO SIN PUNTOS Y CON DEGRADADO */}
            <View style={styles.chartWrapper}>
              <LineChart 
                data={chartData} 
                width={Dimensions.get('window').width - 30}
                height={220} 
                withInnerLines={true}
                withOuterLines={false}
                withDots={false}
                chartConfig={{ 
                  backgroundColor: '#FFFFFF', backgroundGradientFrom: '#FFFFFF', backgroundGradientTo: '#FFFFFF', 
                  fillShadowGradientFrom: tempSegura ? '#0284C7' : '#EF4444', 
                  fillShadowGradientFromOpacity: 0.25, 
                  fillShadowGradientTo: '#FFFFFF', 
                  fillShadowGradientToOpacity: 0.05,
                  decimalPlaces: 1, 
                  color: () => tempSegura ? `#0284C7` : `#EF4444`, 
                  labelColor: () => `#94A3B8`,
                  propsForBackgroundLines: { stroke: "#F1F5F9", strokeDasharray: "4" }
                }} 
                bezier 
                style={styles.chartStyle} 
              />
            </View>
            
            {/* SENSORES EN BENTO GRID INFERIOR */}
            <View style={styles.statusGrid}>
              <View style={styles.statusBox}>
                <Text style={styles.statusLabel}>TEMPERATURA</Text>
                <View style={styles.sensorValueRow}>
                  <Icon name="thermometer" size={24} color={tempSegura ? "#0284C7" : "#EF4444"} />
                  <Text style={[styles.statusValue, !tempSegura && { color: '#EF4444' }]}>{tempActual}°</Text>
                </View>
              </View>
              
              <View style={[styles.statusBox, styles.statusBoxCenter]}>
                <Text style={styles.statusLabel}>HUMEDAD</Text>
                <View style={styles.sensorValueRow}>
                  <Icon name="water-percent" size={24} color="#0EA5E9" />
                  <Text style={styles.statusValue}>{humActual}%</Text>
                </View>
              </View>

              <View style={[styles.statusBox, puertaAbierta && { backgroundColor: '#FEF2F2' }]}>
                <Text style={styles.statusLabel}>PUERTA</Text>
                <View style={styles.sensorValueRow}>
                  <Icon name={puertaAbierta ? "door-open" : "door-closed"} size={24} color={puertaAbierta ? "#EF4444" : "#10B981"} />
                  <Text style={[styles.statusValue, puertaAbierta && { color: '#EF4444' }]}>
                    {puertaAbierta ? 'ABIERTA' : 'CERRADA'}
                  </Text>
                </View>
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
  
  header: { backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', zIndex: 10 },
  headerMainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  titleWrapper: { flex: 1, marginHorizontal: 12 },
  title: { color: '#0F172A', fontSize: 24, fontWeight: '900' },
  badgeEstado: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  textoBadge: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 38 },
  subtitle: { color: '#64748B', fontSize: 13, fontWeight: '600' },

  scrollContent: { padding: 20, paddingBottom: 60 },
  
  card: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 22, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5 },
  btnEditar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD' },
  textoBtnEditar: { color: '#0284C7', fontSize: 12, fontWeight: '800', marginLeft: 6 },
  syncRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  syncText: { fontSize: 11, color: '#64748B', fontWeight: '700', marginLeft: 4 },

  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  infoCol: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconoFondo: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  label: { fontSize: 11, color: '#94A3B8', fontWeight: '800', marginBottom: 2, textTransform: 'uppercase' },
  valor: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  
  capacidadContainer: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  capacidadHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  valorCapacidad: { fontWeight: '900', fontSize: 14 },
  barraFondo: { height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, overflow: 'hidden' },
  barraProgreso: { height: '100%', borderRadius: 5 },

  filtrosContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, backgroundColor: '#F8FAFC', padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  filtroBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  filtroBtnActivo: { backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  filtroTxt: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  filtroTxtActivo: { color: '#0284C7', fontWeight: '900' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statBox: { flex: 1, alignItems: 'center' },
  statBoxBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#F1F5F9' },
  statLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase' },
  statNumber: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginTop: 4 },

  chartWrapper: { marginLeft: -15, marginTop: 10 },
  chartStyle: { alignSelf: 'center' },

  statusGrid: { flexDirection: 'row', width: '100%', borderTopWidth: 1, borderColor: '#F1F5F9' },
  statusBox: { flex: 1, alignItems: 'center', paddingVertical: 18, backgroundColor: '#F8FAFC' },
  statusBoxCenter: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#F1F5F9' },
  statusLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  sensorValueRow: { flexDirection: 'row', alignItems: 'center' },
  statusValue: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginLeft: 4 },

  emptyContainer: { alignItems: 'center', backgroundColor: '#FFFFFF', padding: 40, borderRadius: 28, borderWidth: 1, borderColor: '#E2E8F0' },
  emptyText: { fontSize: 15, fontWeight: '700', color: '#64748B', marginTop: 12 }
});

export default DetallesCavaScreen;