import React, { useState, useCallback, useContext } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
  StatusBar,
  Platform,
  RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const DashboardScreen = ({ navigation }) => {
  const [cavas, setCavas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Extraemos logout y los datos del usuario logueado
  const { logout, user } = useContext(AuthContext);

  // Formateamos el nombre para mostrar el primer nombre o uno por defecto
  const nombreMostrar = user?.nombre ? user.nombre.split(' ')[0] : 'Equipo';
  const inicialAvatar = user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'D';

  const fetchCavas = async () => {
    try {
      const response = await apiClient.get('/core/cavas');
      setCavas(response.data);
    } catch (error) {
      console.log('Error obteniendo cavas:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCavas();
    }, [])
  );

  // Funcionalidad extra: Deslizar para actualizar (Pull-to-Refresh)
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchCavas();
  }, []);

  // Estadísticas operativas
  const cavasActivas = cavas.filter(c => c.estado).length;
  const totalCavas = cavas.length;
  const cavasInactivas = totalCavas - cavasActivas;

  // Iconos visuales según la categoría
  const obtenerIconoRápido = (tipo) => {
    switch(tipo) {
      case 'Carnes': return { icon: 'food-steak', color: '#EF4444', bg: '#FEF2F2' };
      case 'Pollo': return { icon: 'food-drumstick', color: '#F59E0B', bg: '#FFFBEB' };
      case 'Pescado': return { icon: 'fish', color: '#0EA5E9', bg: '#E0F2FE' };
      case 'Verduras': return { icon: 'leaf', color: '#10B981', bg: '#ECFDF5' };
      case 'Charcutería': return { icon: 'sausage', color: '#F43F5E', bg: '#FFF1F2' };
      case 'Medicinas': return { icon: 'pill', color: '#14B8A6', bg: '#F0FDFA' };
      default: return { icon: 'fridge-outline', color: '#0284C7', bg: '#F0F9FF' };
    }
  };

  const renderItem = ({ item }) => {
    const ui = obtenerIconoRápido(item.tipo_producto);
    
    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('DetallesCava', { ...item })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrapper, { backgroundColor: item.estado ? ui.bg : '#F1F5F9' }]}>
            <Icon name={ui.icon} size={26} color={item.estado ? ui.color : '#94A3B8'} />
          </View>
          
          <View style={styles.cardMainInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.nombre}</Text>
            <View style={styles.locationRow}>
              <Icon name="map-marker-outline" size={14} color="#64748B" />
              <Text style={styles.cardLocation} numberOfLines={1}> {item.ubicacion}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.editButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => navigation.navigate('FormularioCava', { cava: item })}
          >
            <Icon name="pencil-outline" size={18} color="#0284C7" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Icon name="thermometer" size={16} color="#0284C7" />
            <Text style={styles.footerText}>Rango: {item.temp_min}° a {item.temp_max}°C</Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: item.estado ? '#ECFDF5' : '#FEF2F2' }]}>
            <View style={[styles.statusDot, { backgroundColor: item.estado ? '#10B981' : '#EF4444' }]} />
            <Text style={[styles.statusText, { color: item.estado ? '#047857' : '#B91C1C' }]}>
              {item.estado ? 'OPERATIVA' : 'INACTIVA'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F9FF" translucent={false} />
      
      {/* CABECERA LUMINOSA PREMIUM (Ice-Tech) */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>¡Hola, {nombreMostrar}!</Text>
            <Text style={styles.headerTitle}>Panel de Control</Text>
          </View>
          
          {/* Controles de la fila superior */}
          <View style={styles.topRightControls}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{inicialAvatar}</Text>
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="logout" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* WIDGET DE RESUMEN (Glassmorphism Suave y Contrastado) */}
        <View style={styles.glassSummaryContainer}>
          <View style={styles.glassMetric}>
            <Text style={styles.glassNumber}>{totalCavas}</Text>
            <Text style={styles.glassLabel}>TOTAL EQUIPOS</Text>
          </View>
          
          <View style={styles.glassDivider} />
          
          <View style={styles.glassMetric}>
            <Text style={[styles.glassNumber, { color: '#059669' }]}>{cavasActivas}</Text>
            <Text style={styles.glassLabel}>OPERATIVAS</Text>
          </View>
          
          <View style={styles.glassDivider} />
          
          <View style={styles.glassMetric}>
            <Text style={[styles.glassNumber, { color: cavasInactivas > 0 ? '#DC2626' : '#64748B' }]}>
              {cavasInactivas}
            </Text>
            <Text style={styles.glassLabel}>SUSPENDIDAS</Text>
          </View>
        </View>
      </View>

      {/* LISTADO PRINCIPAL CON PULL-TO-REFRESH */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.loadingText}>Obteniendo telemetría...</Text>
        </View>
      ) : (
        <FlatList
          data={cavas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={onRefresh} 
              colors={['#0284C7']} 
              tintColor="#0284C7" 
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="fridge-off-outline" size={65} color="#CBD5E1" />
              <Text style={styles.emptyText}>No hay cavas registradas</Text>
              <Text style={styles.emptySubText}>Toca el botón inferior para añadir una.</Text>
            </View>
          }
        />
      )}

      {/* BOTÓN FLOTANTE (FAB) AZUL VIBRANTE */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.85}
        onPress={() => navigation.navigate('FormularioCava')}
      >
        <Icon name="plus" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14, fontWeight: '600' },
  
  // Cabecera Ice-Tech
  header: { 
    backgroundColor: '#F0F9FF', 
    paddingTop: Platform.OS === 'ios' ? 60 : 30, 
    paddingHorizontal: 25, 
    paddingBottom: 35, 
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40, 
    elevation: 4,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: '#0284C7', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  headerTitle: { color: '#0F172A', fontSize: 28, fontWeight: '900', letterSpacing: 0.2 },
  
  topRightControls: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#FFFFFF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#E0F2FE',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  avatarText: { color: '#0284C7', fontSize: 18, fontWeight: '900' },
  logoutBtn: { 
    backgroundColor: '#FEF2F2', 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2'
  },

  // Panel de Resumen
  glassSummaryContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    paddingVertical: 14, 
    paddingHorizontal: 10, 
    marginBottom: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    elevation: 3,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6
  },
  glassMetric: { flex: 1, alignItems: 'center' },
  glassNumber: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  glassLabel: { fontSize: 10, color: '#64748B', marginTop: 4, textTransform: 'uppercase', fontWeight: '800', letterSpacing: 0.8 },
  glassDivider: { width: 1.5, backgroundColor: 'rgba(2, 132, 199, 0.12)', marginHorizontal: 5 },

  listContainer: { padding: 20, paddingBottom: 110 },
  
  // Tarjetas de Telemetría
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 22, 
    padding: 20, 
    marginBottom: 16, 
    elevation: 3, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1, 
    borderColor: '#F1F5F9' 
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconWrapper: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardMainInfo: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  cardLocation: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  editButton: { padding: 10, backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  
  divider: { height: 1.5, backgroundColor: '#F1F5F9', marginVertical: 15 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerItem: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 13, color: '#475569', marginLeft: 6, fontWeight: '700' },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, color: '#475569', fontWeight: '800', marginTop: 15 },
  emptySubText: { fontSize: 14, color: '#94A3B8', marginTop: 5 },

  fab: { 
    position: 'absolute', 
    width: 64, 
    height: 64, 
    alignItems: 'center', 
    justifyContent: 'center', 
    right: 22, 
    bottom: 25, 
    backgroundColor: '#0284C7', 
    borderRadius: 32, 
    elevation: 6,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10 
  }
});

export default DashboardScreen;