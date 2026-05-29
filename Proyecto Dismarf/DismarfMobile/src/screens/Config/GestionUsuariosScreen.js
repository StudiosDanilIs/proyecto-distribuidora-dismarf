// src/screens/Config/GestionUsuariosScreen.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Switch, 
  ActivityIndicator, Alert, TouchableOpacity, StatusBar, RefreshControl, Modal, ScrollView, Platform 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

const GestionUsuariosScreen = ({ navigation }) => {
  // Extraemos el usuario y el rol directamente desde el contexto global
  const { user, userRole } = useContext(AuthContext);
  
  // Garantizamos que la validación de administrador sea 100% precisa
  const currentUserId = parseInt(user?.id, 10);
  const isAdmin = userRole === 1 || parseInt(user?.rol_id, 10) === 1;

  const [usuarios, setUsuarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados para la ventana de gestión (Action Sheet)
  const [modalVisible, setModalVisible] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchUsuarios = async (silencioso = false) => {
    if (!silencioso && !refreshing) setIsLoading(true);
    try {
      const response = await apiClient.get('/core/usuarios');
      setUsuarios(response.data);
    } catch (error) {
      Alert.alert('Error de Red', 'No se pudo cargar la nómina del personal.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsuarios(true);
  }, []);

  const abrirVentanaOpciones = (operador) => {
    setUsuarioSeleccionado(operador);
    setModalVisible(true);
  };

  // ====================================================================
  // ACCIÓN 1: CAMBIAR ESTADO OPERATIVO (ACTIVAR / SUSPENDER)
  // ====================================================================
  const handleToggleEstado = async () => {
    if (!usuarioSeleccionado) return;
    const targetId = parseInt(usuarioSeleccionado.id, 10);

    if (!isAdmin) {
      Alert.alert("Acceso Denegado", "Solo las cuentas de Administrador tienen permisos en el servidor para suspender o activar personal.");
      return;
    }
    if (currentUserId === targetId) {
      Alert.alert("Protección Crítica", "Por seguridad, no puedes suspender tu propia sesión activa.");
      return;
    }

    setIsActionLoading(true);
    const nuevoEstado = !usuarioSeleccionado.activo;
    
    try {
      await apiClient.put(`/core/usuarios/${targetId}/estado`, { activo: nuevoEstado });
      
      // Sincronizamos la lista principal y la vista modal instantáneamente
      setUsuarios(prev => prev.map(item => item.id === targetId ? { ...item, activo: nuevoEstado } : item));
      setUsuarioSeleccionado(prev => ({ ...prev, activo: nuevoEstado }));
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo actualizar el estado operativo en el servidor.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // ====================================================================
  // ACCIÓN 2: CAMBIAR ROL JERÁRQUICO
  // ====================================================================
  const handleCambiarRol = async (nuevoRolId) => {
    if (!usuarioSeleccionado) return;
    const targetId = parseInt(usuarioSeleccionado.id, 10);

    if (!isAdmin) {
      Alert.alert("Acceso Denegado", "Solo los Administradores pueden reasignar jerarquías operativas.");
      return;
    }
    if (currentUserId === targetId) {
      Alert.alert("Protección Crítica", "No puedes modificar tus propios privilegios.");
      return;
    }

    setIsActionLoading(true);
    try {
      // Enviamos ambos parámetros para garantizar compatibilidad total con el backend
      await apiClient.put(`/core/usuarios/${targetId}/rol`, { rol_id: nuevoRolId, id_rol: nuevoRolId });
      
      setUsuarios(prev => prev.map(item => item.id === targetId ? { ...item, rol_id: nuevoRolId } : item));
      setUsuarioSeleccionado(prev => ({ ...prev, rol_id: nuevoRolId }));
      Alert.alert('Privilegios Asignados', 'La jerarquía del operador ha sido actualizada.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar la reasignación de rol.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // ====================================================================
  // ACCIÓN 3: ELIMINAR CUENTA PERMANENTEMENTE
  // ====================================================================
  const handleEliminarUsuario = () => {
    if (!usuarioSeleccionado) return;
    const targetId = parseInt(usuarioSeleccionado.id, 10);

    if (currentUserId === targetId) {
      Alert.alert("Acceso Bloqueado", "No puedes destruir la cuenta con la que estás conectado.");
      return;
    }

    Alert.alert(
      'Eliminar Operador',
      `¿Confirmas la eliminación permanente de la cuenta de ${usuarioSeleccionado.nombre}? Esta acción es irreversible.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            setIsActionLoading(true);
            try {
              await apiClient.delete(`/core/usuarios/${targetId}`);
              setUsuarios(prev => prev.filter(item => item.id !== targetId));
              setModalVisible(false);
              Alert.alert('Cuenta Eliminada', 'El registro ha sido removido del sistema.');
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el operador de la base de datos.');
            } finally {
              setIsActionLoading(false);
            }
          }
        }
      ]
    );
  };

  // Configuración de colores e iconografía por rol
  const getRolConfig = (rol_id) => {
    switch (parseInt(rol_id, 10)) {
      case 1: return { label: 'Administrador', color: '#D97706', bg: '#FEF3C7', icon: 'shield-crown' };
      case 2: return { label: 'Supervisor', color: '#0284C7', bg: '#E0F2FE', icon: 'eye-check' };
      default: return { label: 'Almacenista', color: '#64748B', bg: '#F1F5F9', icon: 'package-variant' };
    }
  };

  const renderUsuarioCard = ({ item }) => {
    const cfg = getRolConfig(item.rol_id);
    const esCuentaPropia = currentUserId === parseInt(item.id, 10);

    return (
      <TouchableOpacity 
        style={[styles.card, esCuentaPropia && styles.cardSelf]} 
        activeOpacity={0.8}
        onPress={() => abrirVentanaOpciones(item)}
      >
        <View style={styles.cardHeader}>
          
          {/* AVATAR NATIVO */}
          <View style={[styles.iconWrapper, { backgroundColor: item.activo ? '#0284C7' : '#94A3B8' }]}>
            {item.icono_perfil ? (
              <Icon name={item.icono_perfil} size={24} color="#FFFFFF" />
            ) : (
              <Text style={styles.avatarTxt}>{item.nombre.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          
          <View style={styles.cardMainInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.nombre}</Text>
              {esCuentaPropia && (
                <View style={styles.badgeSelf}>
                  <Text style={styles.badgeSelfTxt}>TÚ</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardSubtitle} numberOfLines={1}>{item.email}</Text>
          </View>
          
          <View style={styles.editButton}>
            <Icon name="pencil-outline" size={18} color="#0284C7" />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Icon name={cfg.icon} size={16} color={cfg.color} />
            <Text style={[styles.footerText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          
          {/* PÍLDORA DE ESTADO ESTILO DASHBOARD */}
          <View style={[styles.statusBadge, { backgroundColor: item.activo ? '#ECFDF5' : '#FEF2F2' }]}>
            <View style={[styles.statusDot, { backgroundColor: item.activo ? '#10B981' : '#EF4444' }]} />
            <Text style={[styles.statusText, { color: item.activo ? '#047857' : '#B91C1C' }]}>
              {item.activo ? 'OPERATIVO' : 'SUSPENDIDO'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F9FF" translucent={false} />
      
      {/* CABECERA CON FLECHA DE RETROCESO (Alineada al Dashboard) */}
      <View style={styles.header}>
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
            <Text style={styles.greeting}>ADMINISTRACIÓN</Text>
            <Text style={styles.headerTitle}>Nómina de Personal</Text>
          </View>

        </View>
        
        <Text style={styles.headerDescription}>
          Gestión logística, asignación de privilegios y control de operadores
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.loadingText}>Sincronizando personal...</Text>
        </View>
      ) : (
        <FlatList
          data={usuarios}
          renderItem={renderUsuarioCard}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0284C7"]} tintColor="#0284C7" />}
          ListFooterComponent={<Text style={styles.brandFooter}>Nómina Dismarf • Studios Daniels</Text>}
        />
      )}

      {/* ==================================================================== */}
      {/* VENTANA EMERGENTE DE EDICIÓN PREMIUM                                 */}
      {/* ==================================================================== */}
      <Modal 
        visible={modalVisible} 
        animationType="slide" 
        transparent={true} 
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.pullIndicator} />
            
            {usuarioSeleccionado && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                
                <View style={styles.modalHeaderBox}>
                  <View style={styles.modalAvatar}>
                    {usuarioSeleccionado.icono_perfil ? (
                      <Icon name={usuarioSeleccionado.icono_perfil} size={28} color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalAvatarTxt}>{usuarioSeleccionado.nombre.charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={styles.modalOperatorName}>{usuarioSeleccionado.nombre}</Text>
                    <Text style={styles.modalOperatorEmail}>{usuarioSeleccionado.email}</Text>
                  </View>
                </View>

                {currentUserId === parseInt(usuarioSeleccionado.id, 10) && (
                  <View style={styles.noticeContainer}>
                    <Icon name="shield-alert-outline" size={18} color="#0284C7" style={{ marginRight: 8 }} />
                    <Text style={styles.noticeText}>Estás gestionando tu propia cuenta. Las opciones críticas están bloqueadas.</Text>
                  </View>
                )}

                {/* OPCIÓN 1: ACTIVAR / SUSPENDER */}
                <View style={styles.optionBlock}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.optionTitle}>Estado Operativo</Text>
                    <Text style={styles.optionDesc}>Permitir o denegar el acceso al sistema.</Text>
                  </View>
                  <Switch 
                    value={usuarioSeleccionado.activo} 
                    onValueChange={handleToggleEstado}
                    disabled={currentUserId === parseInt(usuarioSeleccionado.id, 10) || !isAdmin}
                    trackColor={{ true: '#10B981', false: '#CBD5E1' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* OPCIÓN 2: CAMBIAR ROL */}
                <Text style={styles.sectionLabel}>Asignar Rol Jerárquico</Text>
                <View style={styles.gridRoles}>
                  {[1, 2, 3].map((rolId) => {
                    const cfg = getRolConfig(rolId);
                    const isCurrent = parseInt(usuarioSeleccionado.rol_id, 10) === rolId;
                    const isDisabled = isCurrent || currentUserId === parseInt(usuarioSeleccionado.id, 10) || !isAdmin;

                    return (
                      <TouchableOpacity 
                        key={rolId} 
                        style={[
                          styles.roleButton, 
                          isCurrent && { borderColor: cfg.color, backgroundColor: cfg.bg },
                          isDisabled && !isCurrent && { opacity: 0.5 }
                        ]}
                        disabled={isDisabled}
                        onPress={() => handleCambiarRol(rolId)}
                      >
                        <Icon name={cfg.icon} size={20} color={isCurrent ? cfg.color : '#94A3B8'} />
                        <Text style={[styles.roleButtonTxt, { color: isCurrent ? cfg.color : '#64748B' }]}>
                          {cfg.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* OPCIÓN 3: ELIMINAR */}
                {isAdmin && currentUserId !== parseInt(usuarioSeleccionado.id, 10) && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={handleEliminarUsuario}>
                    <Icon name="trash-can-outline" size={20} color="#EF4444" />
                    <Text style={styles.deleteBtnTxt}>Eliminar Cuenta Permanentemente</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeBtnTxt}>Cerrar Opciones</Text>
                </TouchableOpacity>

              </ScrollView>
            )}

            {isActionLoading && (
              <View style={styles.loaderOverlay}>
                <ActivityIndicator size="large" color="#0284C7" />
              </View>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
};

// ESTILOS PREMIUM ALINEADOS AL DASHBOARD
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14, fontWeight: '600' },
  
  // Cabecera Ice-Tech con Flecha Integrada
  header: { 
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
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 15
  },

  headerTitlesBox: { flex: 1 },
  greeting: { color: '#0284C7', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerTitle: { color: '#0F172A', fontSize: 26, fontWeight: '900', letterSpacing: 0.2 },
  headerDescription: { fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 18 },

  listContainer: { padding: 20, paddingBottom: 60 },
  brandFooter: { textAlign: 'center', color: '#CBD5E1', fontSize: 11, marginTop: 15, fontWeight: '800' },

  // Tarjetas idénticas al Dashboard
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
  cardSelf: { borderColor: '#BAE6FD', borderWidth: 1.5, backgroundColor: '#F0F9FF' },
  
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconWrapper: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarTxt: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  
  cardMainInfo: { flex: 1, marginRight: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', flexShrink: 1 },
  
  badgeSelf: { backgroundColor: '#0284C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  badgeSelfTxt: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  cardSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  
  editButton: { padding: 10, backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' },

  divider: { height: 1.5, backgroundColor: '#F1F5F9', marginVertical: 15 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerItem: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 13, marginLeft: 6, fontWeight: '800' },

  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  // Ventana Modal de Edición
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, maxHeight: '90%' },
  pullIndicator: { width: 45, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  
  modalHeaderBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#F8FAFC', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  modalAvatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#0284C7', justifyContent: 'center', alignItems: 'center' },
  modalAvatarTxt: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  modalOperatorName: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  modalOperatorEmail: { fontSize: 13, color: '#64748B', marginTop: 2, fontWeight: '500' },

  noticeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2FE', padding: 12, borderRadius: 14, marginBottom: 20 },
  noticeText: { color: '#0284C7', fontSize: 12, fontWeight: '700', flex: 1 },

  optionBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  optionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  optionDesc: { fontSize: 12, color: '#94A3B8', marginTop: 2, fontWeight: '500' },

  sectionLabel: { fontSize: 11, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 12, marginLeft: 5, letterSpacing: 0.5 },
  gridRoles: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  roleButton: { width: '31%', paddingVertical: 14, alignItems: 'center', borderRadius: 16, borderWidth: 1.5, borderColor: '#F1F5F9', backgroundColor: '#F8FAFC' },
  roleButtonTxt: { fontSize: 11, fontWeight: '800', marginTop: 6 },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FECACA', marginBottom: 10 },
  deleteBtnTxt: { color: '#EF4444', fontWeight: '800', fontSize: 14, marginLeft: 8 },

  closeBtn: { paddingVertical: 15, alignItems: 'center', marginTop: 5 },
  closeBtnTxt: { color: '#64748B', fontWeight: '800', fontSize: 15 },

  loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.75)', justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 35, borderTopRightRadius: 35 }
});

export default GestionUsuariosScreen;