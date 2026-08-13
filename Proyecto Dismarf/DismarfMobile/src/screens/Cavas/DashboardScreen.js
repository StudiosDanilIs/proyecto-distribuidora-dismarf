import React, { useState, useCallback, useContext } from 'react';
import { 
  View, Text, FlatList, StyleSheet, ActivityIndicator, 
  StatusBar, Platform, RefreshControl, Pressable 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const DashboardScreen = ({ navigation }) => {
  const [cavas, setCavas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { user } = useContext(AuthContext);

  const nombreMostrar = user?.nombre ? user.nombre.split(' ')[0] : 'Operador';
  const inicialAvatar = user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'D';

  const fetchCavas = async () => {
    try {
      const response = await apiClient.get('/api/cavas');
      setCavas(response.data);
    } catch (error) {
      console.log('Error obteniendo cavas:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchCavas(); }, []));

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchCavas();
  }, []);

  const cavasActivas = cavas.filter(c => c.estado).length;
  const totalCavas = cavas.length;
  const cavasInactivas = totalCavas - cavasActivas;

  const obtenerIconoRápido = (tipo) => {
    switch(tipo) {
      case 'Carnes': return { icon: 'food-steak', color: '#EF4444', bg: '#FEF2F2' };
      case 'Pollo': return { icon: 'food-drumstick', color: '#F59E0B', bg: '#FFFBEB' };
      case 'Pescado': return { icon: 'fish', color: '#0EA5E9', bg: '#E0F2FE' };
      case 'Verduras': return { icon: 'leaf', color: '#10B981', bg: '#ECFDF5' };
      case 'Charcutería': return { icon: 'sausage', color: '#F43F5E', bg: '#FFF1F2' };
      case 'Medicinas': return { icon: 'pill', color: '#8B5CF6', bg: '#F5F3FF' };
      default: return { icon: 'fridge-outline', color: '#3B82F6', bg: '#EFF6FF' };
    }
  };

  const renderItem = ({ item }) => {
    const ui = obtenerIconoRápido(item.tipo_producto);
    const borderColor = item.estado ? '#E2E8F0' : '#FECACA';
    
    return (
      <Pressable 
        style={({ pressed }) => [styles.telemetryCard, { borderColor }, pressed && { transform: [{ scale: 0.98 }], backgroundColor: '#F8FAFC' }]}
        onPress={() => navigation.navigate('DetallesCava', { ...item })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrapper, { backgroundColor: item.estado ? ui.bg : '#F1F5F9' }]}>
            <Icon name={ui.icon} size={28} color={item.estado ? ui.color : '#94A3B8'} />
          </View>
          
          <View style={styles.cardMainInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.nombre}</Text>
            <View style={styles.locationRow}>
              <Icon name="map-marker-outline" size={14} color="#94A3B8" />
              <Text style={styles.cardLocation} numberOfLines={1}> {item.ubicacion}</Text>
            </View>
          </View>

          <Pressable style={styles.editButton} hitSlop={15} onPress={() => navigation.navigate('FormularioCava', { cava: item })}>
            <Icon name="dots-vertical" size={24} color="#CBD5E1" />
          </Pressable>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Icon name="thermometer-lines" size={18} color="#3B82F6" />
            <Text style={styles.footerText}>{item.temp_min}°C <Text style={styles.footerTextMuted}>a</Text> {item.temp_max}°C</Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: item.estado ? '#ECFDF5' : '#FEF2F2' }]}>
            <View style={[styles.statusDot, { backgroundColor: item.estado ? '#10B981' : '#EF4444' }]} />
            <Text style={[styles.statusText, { color: item.estado ? '#047857' : '#B91C1C' }]}>
              {item.estado ? 'OPERATIVA' : 'SUSPENDIDA'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />
      
      {/* ENCABEZADO Y PERFIL */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.greeting}>Centro Logístico</Text>
            <Text style={styles.headerTitle}>Hola, <Text style={{color: '#3B82F6'}}>{nombreMostrar}</Text></Text>
          </View>
          
          {/* Avatar Integrado con Configuración */}
          <Pressable style={({ pressed }) => [styles.avatarCircle, pressed && { opacity: 0.7 }]} onPress={() => navigation.navigate('Configuracion')}>
            {user?.icono_perfil ? (
              <Icon name={user.icono_perfil} size={24} color="#3B82F6" />
            ) : (
              <Text style={styles.avatarText}>{inicialAvatar}</Text>
            )}
          </Pressable>
        </View>
        
        {/* WIDGET BENTO GRID CLEAN */}
        <View style={styles.bentoGrid}>
          <View style={[styles.bentoBox, styles.bentoMain]}>
            <View style={styles.bentoIconBg}>
              <Icon name="server-network" size={24} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.bentoNumberMain}>{totalCavas}</Text>
              <Text style={styles.bentoLabel}>TOTAL NODOS</Text>
            </View>
          </View>
          
          <View style={styles.bentoColumn}>
            <View style={[styles.bentoBox, styles.bentoSecondary, { marginBottom: 12, backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }]}>
              <Text style={[styles.bentoNumberSmall, { color: '#047857' }]}>{cavasActivas}</Text>
              <Text style={[styles.bentoLabel, { color: '#10B981' }]}>EN LÍNEA</Text>
            </View>
            <View style={[styles.bentoBox, styles.bentoSecondary, { backgroundColor: cavasInactivas > 0 ? '#FEF2F2' : '#F8FAFC', borderColor: cavasInactivas > 0 ? '#FECACA' : '#F1F5F9' }]}>
              <Text style={[styles.bentoNumberSmall, { color: cavasInactivas > 0 ? '#B91C1C' : '#64748B' }]}>{cavasInactivas}</Text>
              <Text style={styles.bentoLabel}>CAÍDAS</Text>
            </View>
          </View>
        </View>
      </View>

      {/* LISTADO DE CAVAS */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Sincronizando telemetría...</Text>
        </View>
      ) : (
        <FlatList
          data={cavas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#3B82F6']} tintColor="#3B82F6" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrapper}>
                <Icon name="fridge-off-outline" size={45} color="#94A3B8" />
              </View>
              <Text style={styles.emptyText}>Red sin dispositivos</Text>
              <Text style={styles.emptySubText}>Registra tu primera cava para comenzar el monitoreo de frío.</Text>
            </View>
          }
        />
      )}

      {/* FAB - BOTÓN FLOTANTE */}
      <Pressable style={({ pressed }) => [styles.fabContainer, pressed && { transform: [{ scale: 0.95 }] }]} onPress={() => navigation.navigate('FormularioCava')}>
        <View style={styles.fabSolid}>
          <Icon name="plus" size={24} color="#FFFFFF" />
          <Text style={styles.fabText}>NUEVO EQUIPO</Text>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, color: '#94A3B8', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },

  header: { paddingTop: Platform.OS === 'ios' ? 60 : 30, paddingHorizontal: 24, paddingBottom: 10 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  greeting: { color: '#64748B', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  headerTitle: { color: '#0F172A', fontSize: 28, fontWeight: '900', letterSpacing: 0.2 },
  
  avatarCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#BFDBFE' },
  avatarText: { color: '#3B82F6', fontSize: 20, fontWeight: '900' },

  bentoGrid: { flexDirection: 'row', height: 140, marginBottom: 10 },
  bentoBox: { backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', padding: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
  bentoMain: { flex: 1.2, marginRight: 12, justifyContent: 'space-between' },
  bentoIconBg: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  bentoColumn: { flex: 1, justifyContent: 'space-between' },
  bentoSecondary: { flex: 1, padding: 0, alignItems: 'center', justifyContent: 'center' },
  
  bentoNumberMain: { fontSize: 38, fontWeight: '900', color: '#0F172A', lineHeight: 42 },
  bentoNumberSmall: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  bentoLabel: { fontSize: 10, color: '#64748B', marginTop: 2, textTransform: 'uppercase', fontWeight: '800', letterSpacing: 0.5 },

  listContainer: { padding: 24, paddingBottom: 120 },
  
  telemetryCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1.5, borderColor: '#E2E8F0', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  iconWrapper: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardMainInfo: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  cardLocation: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  editButton: { padding: 5 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 16 },
  footerItem: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 14, color: '#1E293B', marginLeft: 8, fontWeight: '700' },
  footerTextMuted: { color: '#94A3B8', fontWeight: '500', marginHorizontal: 4 },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyIconWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 18, color: '#0F172A', fontWeight: '800', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },

  fabContainer: { position: 'absolute', bottom: 30, alignSelf: 'center', elevation: 6, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
  fabSolid: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30 },
  fabText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.5, marginLeft: 8 }
});

export default DashboardScreen;