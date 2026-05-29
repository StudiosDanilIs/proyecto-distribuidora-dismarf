import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Switch, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar 
} from 'react-native';
import apiClient from '../../api/client';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const CATEGORIAS = [
  { id: 'Carnes', icon: 'food-steak' },
  { id: 'Pollo', icon: 'food-drumstick' },
  { id: 'Pescado', icon: 'fish' },
  { id: 'Charcutería', icon: 'sausage' },
  { id: 'Verduras', icon: 'leaf' },
  { id: 'Medicinas', icon: 'pill' },
  { id: 'Mixto', icon: 'package-variant' }
];

const FormularioCavaScreen = ({ route, navigation }) => {
  const cavaEdit = route.params?.cava || null;
  const isEditing = !!cavaEdit;

  const hoy = new Date().toISOString().split('T')[0];

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [macEsp32, setMacEsp32] = useState('');
  const [tempMin, setTempMin] = useState('-20');
  const [tempMax, setTempMax] = useState('-10');
  const [estado, setEstado] = useState(true);
  const [tipoProducto, setTipoProducto] = useState('Mixto');
  const [capacidadOcupada, setCapacidadOcupada] = useState('0');
  const [ultimoMantenimiento, setUltimoMantenimiento] = useState(hoy);
  
  const [focusedInput, setFocusedInput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setNombre(cavaEdit.nombre);
      setUbicacion(cavaEdit.ubicacion);
      setMacEsp32(cavaEdit.mac_esp32);
      setTempMin(cavaEdit.temp_min.toString());
      setTempMax(cavaEdit.temp_max.toString());
      setEstado(cavaEdit.estado);
      setTipoProducto(cavaEdit.tipo_producto || 'Mixto');
      setCapacidadOcupada(cavaEdit.capacidad_ocupada?.toString() || '0');
      
      if (cavaEdit.ultimo_mantenimiento) {
        setUltimoMantenimiento(cavaEdit.ultimo_mantenimiento.split('T')[0]);
      }
    }
  }, [cavaEdit]);

  const handleGuardar = async () => {
    if (!nombre.trim() || !ubicacion.trim() || !macEsp32.trim()) {
      Alert.alert('Formulario Incompleto', 'Rellena los campos principales (Nombre, Ubicación y MAC).');
      return;
    }

    setIsLoading(true);
    const payload = {
      nombre: nombre.trim(), 
      ubicacion: ubicacion.trim(), 
      mac_esp32: macEsp32.trim(),
      temp_min: parseFloat(tempMin) || -20, 
      temp_max: parseFloat(tempMax) || -10,
      estado, 
      tipo_producto: tipoProducto,
      capacidad_ocupada: parseInt(capacidadOcupada) || 0,
      ultimo_mantenimiento: ultimoMantenimiento
    };

    try {
      if (isEditing) {
        await apiClient.put(`/core/cavas/${cavaEdit.id}`, payload);
        Alert.alert('Completado', 'Cava física actualizada correctamente.');
      } else {
        await apiClient.post('/core/cavas', payload);
        Alert.alert('Completado', 'Nueva cava registrada en la red local.');
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la información de la cava.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInactivar = () => {
    const nuevoEstado = !estado;
    Alert.alert(
      nuevoEstado ? 'Activar Servicio' : 'Suspender Cava',
      `¿Confirmas cambiar la operación de esta cava a ${nuevoEstado ? 'OPERATIVA' : 'FUERA DE SERVICIO'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => setEstado(nuevoEstado) }
      ]
    );
  };

  const handleEliminar = () => {
    Alert.alert(
      'Peligro: Eliminar Equipo',
      '¿Estás absolutamente seguro de borrar esta cava? Se romperá el enlace con su telemetría e inventario en cascada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar Definitivamente', 
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await apiClient.delete(`/core/cavas/${cavaEdit.id}`);
              Alert.alert('Eliminada', 'El equipo ha sido borrado del sistema.');
              navigation.navigate('Main'); 
            } catch (error) {
              Alert.alert('Error', 'Fallo al intentar eliminar el equipo.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F9FF" translucent={false} />
      
      {/* CABECERA CURVA PREMIUM */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <Icon name="arrow-left" size={26} color="#0284C7" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Configuración de Cava' : 'Nuevo Equipo de Frío'}</Text>
      </View>

      {/* ÁREA SCROLLABLE ADAPTATIVA */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* BLOQUE 1: IDENTIFICACIÓN */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="tag-outline" size={20} color="#0284C7" />
            <Text style={styles.sectionTitle}>Identificación del Hardware</Text>
          </View>
          
          <Text style={styles.inputLabel}>Nombre Operativo</Text>
          <View style={[styles.inputBox, focusedInput === 'nombre' && styles.inputFocused]}>
            <Icon name="fridge-industrial-outline" size={20} color={focusedInput === 'nombre' ? "#0284C7" : "#94A3B8"} />
            <TextInput 
              style={styles.input} 
              value={nombre} 
              onChangeText={setNombre} 
              onFocus={() => setFocusedInput('nombre')}
              onBlur={() => setFocusedInput(null)}
              placeholder="Ej. Cava Principal Carnes" 
              placeholderTextColor="#94A3B8" 
            />
          </View>

          <Text style={styles.inputLabel}>Ubicación Física</Text>
          <View style={[styles.inputBox, focusedInput === 'ubicacion' && styles.inputFocused]}>
            <Icon name="map-marker-outline" size={20} color={focusedInput === 'ubicacion' ? "#0284C7" : "#94A3B8"} />
            <TextInput 
              style={styles.input} 
              value={ubicacion} 
              onChangeText={setUbicacion} 
              onFocus={() => setFocusedInput('ubicacion')}
              onBlur={() => setFocusedInput(null)}
              placeholder="Ej. Almacén Central - Sector B" 
              placeholderTextColor="#94A3B8" 
            />
          </View>

          <Text style={styles.inputLabel}>Dirección MAC (Sensor ESP32)</Text>
          <View style={[styles.inputBox, focusedInput === 'mac' && styles.inputFocused]}>
            <Icon name="chip" size={20} color={focusedInput === 'mac' ? "#0284C7" : "#94A3B8"} />
            <TextInput 
              style={styles.input} 
              value={macEsp32} 
              onChangeText={setMacEsp32} 
              onFocus={() => setFocusedInput('mac')}
              onBlur={() => setFocusedInput(null)}
              autoCapitalize="characters" 
              placeholder="AA:BB:CC:DD:EE:FF" 
              placeholderTextColor="#94A3B8" 
            />
          </View>
        </View>

        {/* BLOQUE 2: PARÁMETROS TÉRMICOS Y LOGÍSTICOS */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="package-variant-closed" size={20} color="#0284C7" />
            <Text style={styles.sectionTitle}>Ajustes Logísticos</Text>
          </View>

          <Text style={styles.inputLabel}>Categoría Almacenada</Text>
          <View style={styles.chipsContainer}>
            {CATEGORIAS.map((cat) => (
              <TouchableOpacity 
                key={cat.id} 
                activeOpacity={0.8}
                style={[styles.chip, tipoProducto === cat.id && styles.chipActive]}
                onPress={() => setTipoProducto(cat.id)}
              >
                <Icon name={cat.icon} size={16} color={tipoProducto === cat.id ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
                <Text style={[styles.chipText, tipoProducto === cat.id && { color: '#FFFFFF' }]}>{cat.id}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* RANGOS TÉRMICOS */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.inputLabel}>Temp. Mínima (°C)</Text>
              <View style={[styles.inputBox, focusedInput === 'tmin' && styles.inputFocused]}>
                <Icon name="thermometer-minus" size={18} color={focusedInput === 'tmin' ? "#0284C7" : "#94A3B8"} />
                <TextInput 
                  style={styles.input} 
                  value={tempMin} 
                  onChangeText={setTempMin} 
                  onFocus={() => setFocusedInput('tmin')}
                  onBlur={() => setFocusedInput(null)}
                  keyboardType="numeric" 
                  placeholderTextColor="#94A3B8" 
                />
              </View>
            </View>
            
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.inputLabel}>Temp. Máxima (°C)</Text>
              <View style={[styles.inputBox, focusedInput === 'tmax' && styles.inputFocused]}>
                <Icon name="thermometer-plus" size={18} color={focusedInput === 'tmax' ? "#0284C7" : "#94A3B8"} />
                <TextInput 
                  style={styles.input} 
                  value={tempMax} 
                  onChangeText={setTempMax} 
                  onFocus={() => setFocusedInput('tmax')}
                  onBlur={() => setFocusedInput(null)}
                  keyboardType="numeric" 
                  placeholderTextColor="#94A3B8" 
                />
              </View>
            </View>
          </View>

          {/* CAPACIDAD Y MANTENIMIENTO */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.inputLabel}>Ocupación (%)</Text>
              <View style={[styles.inputBox, focusedInput === 'cap' && styles.inputFocused]}>
                <Icon name="percent" size={18} color={focusedInput === 'cap' ? "#0284C7" : "#94A3B8"} />
                <TextInput 
                  style={styles.input} 
                  value={capacidadOcupada} 
                  onChangeText={setCapacidadOcupada} 
                  onFocus={() => setFocusedInput('cap')}
                  onBlur={() => setFocusedInput(null)}
                  keyboardType="numeric" 
                  placeholderTextColor="#94A3B8" 
                />
              </View>
            </View>
            
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.inputLabel}>Mantenimiento</Text>
              <View style={[styles.inputBox, focusedInput === 'mant' && styles.inputFocused]}>
                <Icon name="calendar" size={18} color={focusedInput === 'mant' ? "#0284C7" : "#94A3B8"} />
                <TextInput 
                  style={styles.input} 
                  value={ultimoMantenimiento} 
                  onChangeText={setUltimoMantenimiento} 
                  onFocus={() => setFocusedInput('mant')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="YYYY-MM-DD" 
                  placeholderTextColor="#94A3B8" 
                />
              </View>
            </View>
          </View>
        </View>

        {/* BLOQUE 3: CONTROL DE SERVICIO ELÉCTRICO */}
        <View style={styles.statusContainer}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.labelSwitch}>Alimentación de Cava</Text>
              <Text style={styles.subLabelSwitch}>{estado ? 'El equipo está operando' : 'El equipo está suspendido'}</Text>
            </View>
            <Switch value={estado} onValueChange={setEstado} trackColor={{ true: '#10B981', false: '#CBD5E1' }} thumbColor="#FFFFFF" />
          </View>
          
          {isEditing && (
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.btnAction, { backgroundColor: estado ? '#FFF7ED' : '#ECFDF5', borderColor: estado ? '#FFEDD5' : '#D1FAE5' }]} 
              onPress={handleInactivar}
            >
              <Icon name={estado ? "power-plug-off" : "power-plug"} size={20} color={estado ? "#EA580C" : "#059669"} />
              <Text style={[styles.textAction, { color: estado ? "#EA580C" : "#059669" }]}>
                {estado ? 'Poner en mantenimiento (Inactivar)' : 'Habilitar equipo (Activar)'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* CONTROLES FINALES */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#0284C7" style={{ marginVertical: 30 }} />
        ) : (
          <View style={styles.footerButtons}>
            <TouchableOpacity style={styles.saveButton} activeOpacity={0.85} onPress={handleGuardar}>
              <Icon name="content-save" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>{isEditing ? 'GUARDAR CAMBIOS' : 'REGISTRAR EQUIPO'}</Text>
            </TouchableOpacity>

            {isEditing && (
              <TouchableOpacity style={styles.deleteButton} activeOpacity={0.8} onPress={handleEliminar}>
                <Icon name="trash-can-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  
  header: { 
    backgroundColor: '#F0F9FF', 
    paddingTop: Platform.OS === 'ios' ? 60 : 30, 
    paddingHorizontal: 20, 
    paddingBottom: 25, 
    flexDirection: 'row', 
    alignItems: 'center',
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40, 
    elevation: 4,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    zIndex: 10
  },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', letterSpacing: 0.2 },

  scrollContent: { padding: 20, paddingBottom: 60 },
  
  card: { 
    backgroundColor: '#FFFFFF', 
    padding: 22, 
    borderRadius: 24, 
    elevation: 3, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    marginBottom: 20,
    borderWidth: 1, 
    borderColor: '#F1F5F9' 
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, borderBottomWidth: 1.5, borderBottomColor: '#F1F5F9', paddingBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginLeft: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  inputLabel: { fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 8, marginTop: 12, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: 'transparent', height: 52 },
  inputFocused: { borderColor: '#0284C7', backgroundColor: '#FFFFFF' },
  input: { flex: 1, fontSize: 14, color: '#0F172A', marginLeft: 10 },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 8, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  chipText: { color: '#64748B', fontSize: 13, fontWeight: '700' },

  statusContainer: { backgroundColor: '#FFFFFF', padding: 22, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, marginBottom: 25 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelSwitch: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  subLabelSwitch: { fontSize: 12, color: '#64748B', marginTop: 2 },
  
  btnAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, marginTop: 18, borderWidth: 1 },
  textAction: { marginLeft: 8, fontWeight: '800', fontSize: 13 },

  footerButtons: { flexDirection: 'row', marginTop: 10, alignItems: 'center' },
  saveButton: { flex: 1, flexDirection: 'row', backgroundColor: '#0284C7', height: 55, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.8 },
  deleteButton: { backgroundColor: '#FFFFFF', width: 55, height: 55, borderRadius: 16, marginLeft: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5', elevation: 1 }
});

export default FormularioCavaScreen;