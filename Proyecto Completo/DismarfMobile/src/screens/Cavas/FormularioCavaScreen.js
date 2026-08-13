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
      setNombre(cavaEdit.nombre); setUbicacion(cavaEdit.ubicacion);
      setMacEsp32(cavaEdit.mac_esp32); setTempMin(cavaEdit.temp_min.toString());
      setTempMax(cavaEdit.temp_max.toString()); setEstado(cavaEdit.estado);
      setTipoProducto(cavaEdit.tipo_producto || 'Mixto');
      setCapacidadOcupada(cavaEdit.capacidad_ocupada?.toString() || '0');
      if (cavaEdit.ultimo_mantenimiento) setUltimoMantenimiento(cavaEdit.ultimo_mantenimiento.split('T')[0]);
    }
  }, [cavaEdit]);

  const handleGuardar = async () => {
    if (!nombre.trim() || !ubicacion.trim() || !macEsp32.trim()) {
      Alert.alert('Incompleto', 'Faltan campos principales.'); return;
    }
    setIsLoading(true);
    const payload = {
      nombre: nombre.trim(), ubicacion: ubicacion.trim(), mac_esp32: macEsp32.trim(),
      temp_min: parseFloat(tempMin) || -20, temp_max: parseFloat(tempMax) || -10,
      estado, tipo_producto: tipoProducto, capacidad_ocupada: parseInt(capacidadOcupada) || 0,
      ultimo_mantenimiento: ultimoMantenimiento
    };

    try {
      if (isEditing) await apiClient.put(`/api/cavas/${cavaEdit.id}`, payload);
      else await apiClient.post('/api/cavas', payload);
      navigation.goBack();
    } catch (error) { Alert.alert('Error', 'Fallo al guardar.'); } 
    finally { setIsLoading(false); }
  };

  const handleEliminar = () => {
    Alert.alert('Eliminar Equipo', '¿Borrar definitivamente esta cava?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
          setIsLoading(true);
          try {
            await apiClient.delete(`/api/cavas/${cavaEdit.id}`);
            navigation.navigate('Main'); 
          } catch (error) { Alert.alert('Error', 'Fallo al eliminar.'); } 
          finally { setIsLoading(false); }
        }
      }
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={26} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Editar Cava' : 'Nuevo Equipo'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Nombre Operativo</Text>
          <View style={[styles.inputBox, focusedInput === 'nombre' && styles.inputFocused]}>
            <Icon name="fridge-outline" size={20} color={focusedInput === 'nombre' ? "#3B82F6" : "#94A3B8"} />
            <TextInput style={styles.input} value={nombre} onChangeText={setNombre} onFocus={() => setFocusedInput('nombre')} onBlur={() => setFocusedInput(null)} placeholder="Ej. Cava Principal" placeholderTextColor="#94A3B8" />
          </View>

          <Text style={styles.inputLabel}>Ubicación Física</Text>
          <View style={[styles.inputBox, focusedInput === 'ubicacion' && styles.inputFocused]}>
            <Icon name="map-marker-outline" size={20} color={focusedInput === 'ubicacion' ? "#3B82F6" : "#94A3B8"} />
            <TextInput style={styles.input} value={ubicacion} onChangeText={setUbicacion} onFocus={() => setFocusedInput('ubicacion')} onBlur={() => setFocusedInput(null)} placeholder="Sector o Almacén" placeholderTextColor="#94A3B8" />
          </View>

          <Text style={styles.inputLabel}>MAC del Sensor ESP32</Text>
          <View style={[styles.inputBox, focusedInput === 'mac' && styles.inputFocused]}>
            <Icon name="chip" size={20} color={focusedInput === 'mac' ? "#3B82F6" : "#94A3B8"} />
            <TextInput style={styles.input} value={macEsp32} onChangeText={setMacEsp32} onFocus={() => setFocusedInput('mac')} onBlur={() => setFocusedInput(null)} autoCapitalize="characters" placeholder="AA:BB:CC:DD:EE:FF" placeholderTextColor="#94A3B8" />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.inputLabel}>Categoría Almacenada</Text>
          <View style={styles.chipsContainer}>
            {CATEGORIAS.map((cat) => (
              <TouchableOpacity key={cat.id} activeOpacity={0.8} style={[styles.chip, tipoProducto === cat.id && styles.chipActive]} onPress={() => setTipoProducto(cat.id)}>
                <Icon name={cat.icon} size={16} color={tipoProducto === cat.id ? '#3B82F6' : '#64748B'} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, tipoProducto === cat.id && { color: '#3B82F6' }]}>{cat.id}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Text style={styles.inputLabel}>Mínima (°C)</Text>
              <View style={[styles.inputBox, focusedInput === 'tmin' && styles.inputFocused]}>
                <TextInput style={styles.input} value={tempMin} onChangeText={setTempMin} onFocus={() => setFocusedInput('tmin')} onBlur={() => setFocusedInput(null)} keyboardType="numeric" placeholderTextColor="#94A3B8" />
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Text style={styles.inputLabel}>Máxima (°C)</Text>
              <View style={[styles.inputBox, focusedInput === 'tmax' && styles.inputFocused]}>
                <TextInput style={styles.input} value={tempMax} onChangeText={setTempMax} onFocus={() => setFocusedInput('tmax')} onBlur={() => setFocusedInput(null)} keyboardType="numeric" placeholderTextColor="#94A3B8" />
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Text style={styles.inputLabel}>Ocupación (%)</Text>
              <View style={[styles.inputBox, focusedInput === 'cap' && styles.inputFocused]}>
                <TextInput style={styles.input} value={capacidadOcupada} onChangeText={setCapacidadOcupada} onFocus={() => setFocusedInput('cap')} onBlur={() => setFocusedInput(null)} keyboardType="numeric" />
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Text style={styles.inputLabel}>Mantenimiento</Text>
              <View style={[styles.inputBox, focusedInput === 'mant' && styles.inputFocused]}>
                <TextInput style={styles.input} value={ultimoMantenimiento} onChangeText={setUltimoMantenimiento} onFocus={() => setFocusedInput('mant')} onBlur={() => setFocusedInput(null)} placeholder="YYYY-MM-DD" />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statusContainer}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.labelSwitch}>Estado Operativo</Text>
              <Text style={styles.subLabelSwitch}>{estado ? 'Equipo encendido' : 'Equipo en mantenimiento'}</Text>
            </View>
            <Switch value={estado} onValueChange={setEstado} trackColor={{ true: '#3B82F6', false: '#E2E8F0' }} thumbColor="#FFFFFF" />
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#3B82F6" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.footerButtons}>
            <TouchableOpacity style={styles.saveButton} activeOpacity={0.85} onPress={handleGuardar}>
              <Text style={styles.saveButtonText}>{isEditing ? 'Guardar Cambios' : 'Registrar Equipo'}</Text>
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
  
  header: { backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },

  scrollContent: { padding: 20, paddingBottom: 60 },
  
  card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6, marginTop: 10, marginLeft: 4 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E2E8F0', height: 50 },
  inputFocused: { borderColor: '#3B82F6', backgroundColor: '#FFFFFF' },
  input: { flex: 1, fontSize: 14, color: '#1E293B', marginLeft: 10 },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginRight: 8, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  chipActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  chipText: { color: '#64748B', fontSize: 13, fontWeight: '700' },

  statusContainer: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 25 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelSwitch: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  subLabelSwitch: { fontSize: 13, color: '#64748B', marginTop: 2 },
  
  footerButtons: { flexDirection: 'row', marginTop: 5, alignItems: 'center' },
  saveButton: { flex: 1, backgroundColor: '#3B82F6', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  deleteButton: { backgroundColor: '#FEF2F2', width: 56, height: 56, borderRadius: 16, marginLeft: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' }
});

export default FormularioCavaScreen;