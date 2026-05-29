import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  Alert, FlatList, ActivityIndicator, StatusBar 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Importaciones de base de datos local y API
import { 
  initDB, guardarInspeccionOffline, obtenerInspeccionesOffline, eliminarInspeccionSincronizada 
} from '../../database/dbLocal';
import apiClient from '../../api/client';

const opcionesLimpieza = [
  { id: 'Excelente', icon: 'star-check', color: '#10b981' },
  { id: 'Regular', icon: 'alert-minus', color: '#f59e0b' },
  { id: 'Mal', icon: 'close-octagon', color: '#ef4444' }
];

const AuditoriaScreen = () => {
  const [cavaId, setCavaId] = useState('');
  const [limpieza, setLimpieza] = useState('Excelente');
  const [obs, setObs] = useState('');
  
  const [inspeccionesLocales, setInspeccionesLocales] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    initDB();
    cargarDatosLocales();
  }, []);

  const cargarDatosLocales = async () => {
    try {
      const datos = await obtenerInspeccionesOffline();
      setInspeccionesLocales(datos || []);
    } catch (error) {
      console.log('Error cargando SQLite:', error);
    }
  };

  const manejarGuardadoLocal = async () => {
    if (!cavaId) {
      Alert.alert("Atención", "Ingresa el ID de la cava inspeccionada.");
      return;
    }

    try {
      await guardarInspeccionOffline(parseInt(cavaId), "Inspección de Rutina", limpieza, obs);
      Alert.alert("Guardado Exitoso", "Reporte almacenado en la memoria del dispositivo.");
      
      setCavaId(''); setLimpieza('Excelente'); setObs('');
      cargarDatosLocales();
    } catch (error) {
      Alert.alert("Error", "Fallo al escribir en la base de datos local.");
    }
  };

  const sincronizarDatos = async () => {
    if (inspeccionesLocales.length === 0) return;

    setIsSyncing(true);
    let exitos = 0;

    for (const item of inspeccionesLocales) {
      try {
        await apiClient.post('/alertas/auditorias', {
          cava_id: item.cava_id,
          estado_limpieza: item.estado_limpieza,
          observaciones: item.observaciones,
          fecha_inspeccion: item.fecha
        });
        await eliminarInspeccionSincronizada(item.id);
        exitos++;
      } catch (error) {
        console.log("Error sincronizando:", item.id);
      }
    }

    setIsSyncing(false);
    cargarDatosLocales(); 

    if (exitos > 0) {
      Alert.alert("Sincronización Exitosa", `Se enviaron ${exitos} reportes al servidor central.`);
    } else {
      Alert.alert("Sin Conexión", "No se pudo sincronizar. Verifica tu red.");
    }
  };

  const cabeceraFormulario = (
    <View style={styles.formContainer}>
      
      {/* TARJETA DE FORMULARIO PRINCIPAL */}
      <View style={styles.modernCard}>
        <View style={styles.sectionHeader}>
          <Icon name="clipboard-text-outline" size={20} color="#0066cc" />
          <Text style={styles.sectionTitle}>Nueva Inspección</Text>
        </View>

        <Text style={styles.label}>ID de Cava</Text>
        <TextInput 
          placeholder="Ej: 1" 
          style={styles.input} 
          keyboardType="numeric" 
          value={cavaId} 
          onChangeText={setCavaId} 
        />

        <Text style={styles.label}>Estado de Higiene</Text>
        <View style={styles.selectorRow}>
          {opcionesLimpieza.map(opcion => {
            const isActive = limpieza === opcion.id;
            return (
              <TouchableOpacity 
                key={opcion.id} 
                style={[styles.chip, isActive && { backgroundColor: opcion.color, borderColor: opcion.color }]}
                onPress={() => setLimpieza(opcion.id)}
              >
                <Icon name={opcion.icon} size={16} color={isActive ? '#fff' : '#64748b'} style={{marginRight: 4}} />
                <Text style={[styles.chipText, isActive && { color: '#fff' }]}>{opcion.id}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={styles.label}>Observaciones Técnicas</Text>
        <TextInput 
          placeholder="Anomalías, derrames, fallos estructurales..." 
          style={[styles.input, {height: 80, textAlignVertical: 'top'}]} 
          multiline 
          value={obs} 
          onChangeText={setObs} 
        />

        <TouchableOpacity style={styles.btnGuardar} onPress={manejarGuardadoLocal}>
          <Icon name="database-arrow-down" size={20} color="#fff" style={{marginRight: 8}} />
          <Text style={styles.btnText}>Guardar Local (Offline)</Text>
        </TouchableOpacity>
      </View>

      {/* CABECERA DE SINCRONIZACIÓN */}
      {inspeccionesLocales.length > 0 && (
        <View style={styles.syncHeaderRow}>
          <View>
            <Text style={styles.syncTitle}>Registros Pendientes</Text>
            <Text style={styles.syncSubtitle}>Esperando subida al servidor</Text>
          </View>
          <TouchableOpacity 
            style={styles.btnSync} 
            onPress={sincronizarDatos} 
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Icon name="cloud-upload" size={18} color="#fff" style={{marginRight: 5}} />
                <Text style={styles.btnSyncText}>Sincronizar ({inspeccionesLocales.length})</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderItemLocal = ({ item }) => (
    <View style={styles.cardOffline}>
      <View style={styles.cardOfflineLeft}>
        <View style={styles.iconPendingBg}>
          <Icon name="clock-outline" size={24} color="#f59e0b" />
        </View>
      </View>
      <View style={styles.cardContent}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <Text style={styles.cardTitle}>Cava #{item.cava_id}</Text>
          <Text style={styles.cardDate}>
            {new Date(item.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </Text>
        </View>
        <Text style={styles.cardSub}>Condición: <Text style={{fontWeight:'bold'}}>{item.estado_limpieza}</Text></Text>
        {item.observaciones ? (
          <Text style={styles.cardObs} numberOfLines={1}>{item.observaciones}</Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#002a5c" />
      
      {/* CABECERA ULTRA-MODERNA */}
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>Módulo de Inspección</Text>
        <Text style={styles.headerTitle}>Auditoría de Cavas</Text>
        <View style={styles.offlineBadge}>
          <Icon name="wifi-strength-off-outline" size={12} color="#93c5fd" style={{marginRight: 4}}/>
          <Text style={styles.offlineText}>Soporte Offline Activo</Text>
        </View>
      </View>

      <FlatList
        data={inspeccionesLocales}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={cabeceraFormulario}
        renderItem={renderItemLocal}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Icon name="cloud-check-outline" size={50} color="#10b981" />
            </View>
            <Text style={styles.emptyText}>Memoria Local Limpia</Text>
            <Text style={styles.emptySubText}>Todo está sincronizado con la base de datos central.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#f8fafc' },
  
  header: { backgroundColor: '#002a5c', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  headerSubtitle: { color: '#93c5fd', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  offlineText: { color: '#93c5fd', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },

  formContainer: { paddingBottom: 10 },
  
  modernCard: { backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#334155', marginLeft: 8, textTransform: 'uppercase' },
  
  label: { fontSize: 13, fontWeight: 'bold', color: '#64748b', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 12, fontSize: 15, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 5 },
  
  selectorRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, marginTop: 5 },
  chip: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginHorizontal: 4, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  chipText: { color: '#64748b', fontWeight: 'bold', fontSize: 12, marginLeft: 4 },
  
  btnGuardar: { flexDirection: 'row', backgroundColor: '#002a5c', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  syncHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginTop: 10, marginBottom: 15 },
  syncTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  syncSubtitle: { fontSize: 12, color: '#64748b' },
  btnSync: { flexDirection: 'row', backgroundColor: '#f59e0b', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignItems: 'center', elevation: 2 },
  btnSyncText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  
  cardOffline: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 12, padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
  cardOfflineLeft: { marginRight: 15 },
  iconPendingBg: { backgroundColor: '#fef3c7', padding: 10, borderRadius: 12 },
  cardContent: { flex: 1 },
  cardTitle: { fontWeight: 'bold', fontSize: 16, color: '#1e293b' },
  cardSub: { color: '#475569', fontSize: 13, marginTop: 2 },
  cardObs: { color: '#94a3b8', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  cardDate: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 30, marginTop: 20 },
  emptyIconBg: { backgroundColor: '#dcfce7', padding: 20, borderRadius: 40, marginBottom: 15 },
  emptyText: { color: '#1e293b', fontWeight: 'bold', fontSize: 18 },
  emptySubText: { color: '#64748b', fontSize: 14, marginTop: 5, textAlign: 'center' }
});

export default AuditoriaScreen;