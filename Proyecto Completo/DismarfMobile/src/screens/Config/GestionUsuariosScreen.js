import React, { useState, useEffect, useCallback, useContext } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Switch, 
  ActivityIndicator, Alert, StatusBar, RefreshControl, Modal, ScrollView, Platform,
  Pressable, LayoutAnimation, UIManager, TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

const GestionUsuariosScreen = ({ navigation }) => {
  const { user, userRole } = useContext(AuthContext);
  
  const currentUserId = parseInt(user?.id, 10);
  const isAdmin = userRole === 1 || parseInt(user?.rol_id, 10) === 1;

  const [usuarios, setUsuarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('TODOS');

  const [modalVisible, setModalVisible] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchUsuarios = async (silencioso = false) => {
    if (!silencioso && !refreshing) setIsLoading(true);
    try {
      const response = await apiClient.get('/api/usuarios');
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setUsuarios(response.data);
    } catch (error) {
      Alert.alert('Error de Red', 'No se pudo cargar la nómina del personal.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsuarios(true);
  }, []);

  const abrirVentanaOpciones = (operador) => {
    setUsuarioSeleccionado(operador);
    setModalVisible(true);
  };

  const handleToggleEstado = async () => {
    if (!usuarioSeleccionado) return;
    const targetId = parseInt(usuarioSeleccionado.id, 10);

    if (!isAdmin) {
      Alert.alert("Acceso Denegado", "Solo cuentas de Administrador pueden suspender personal."); return;
    }
    if (currentUserId === targetId) {
      Alert.alert("Protección Crítica", "Por seguridad, no puedes suspender tu propia sesión."); return;
    }

    setIsActionLoading(true);
    const nuevoEstado = !usuarioSeleccionado.activo;
    
    try {
      await apiClient.put(`/api/usuarios/${targetId}/estado`, { activo: nuevoEstado });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setUsuarios(prev => prev.map(item => item.id === targetId ? { ...item, activo: nuevoEstado } : item));
      setUsuarioSeleccionado(prev => ({ ...prev, activo: nuevoEstado }));
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo actualizar el estado.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCambiarRol = async (nuevoRolId) => {
    if (!usuarioSeleccionado) return;
    const targetId = parseInt(usuarioSeleccionado.id, 10);

    if (!isAdmin) {
      Alert.alert("Acceso Denegado", "Solo los Administradores pueden reasignar jerarquías."); return;
    }
    if (currentUserId === targetId) {
      Alert.alert("Protección Crítica", "No puedes modificar tus propios privilegios."); return;
    }

    setIsActionLoading(true);
    try {
      await apiClient.put(`/api/usuarios/${targetId}/rol`, { rol_id: nuevoRolId, id_rol: nuevoRolId });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setUsuarios(prev => prev.map(item => item.id === targetId ? { ...item, rol_id: nuevoRolId } : item));
      setUsuarioSeleccionado(prev => ({ ...prev, rol_id: nuevoRolId }));
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar la reasignación de rol.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEliminarUsuario = () => {
    if (!usuarioSeleccionado) return;
    const targetId = parseInt(usuarioSeleccionado.id, 10);

    if (currentUserId === targetId) {
      Alert.alert("Acceso Bloqueado", "No puedes destruir la cuenta con la que estás conectado."); return;
    }

    Alert.alert(
      'Eliminar Operador',
      `¿Confirmas la eliminación permanente de ${usuarioSeleccionado.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            setIsActionLoading(true);
            try {
              await apiClient.delete(`/api/usuarios/${targetId}`);
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setUsuarios(prev => prev.filter(item => item.id !== targetId));
              setModalVisible(false);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el operador de la base de datos.');
            } finally { setIsActionLoading(false); }
          }
        }
      ]
    );
  };

  const getRolConfig = (rol_id) => {
    switch (parseInt(rol_id, 10)) {
      case 1: return { label: 'Administrador', color: '#D97706', bg: '#FEF3C7', icon: 'shield-crown' };
      case 2: return { label: 'Supervisor', color: '#0284C7', bg: '#E0F2FE', icon: 'eye-check' };
      default: return { label: 'Almacenista', color: '#64748B', bg: '#F1F5F9', icon: 'package-variant' };
    }
  };

  const totalPersonal = usuarios.length;
  const totalAdmins = usuarios.filter(u => parseInt(u.rol_id, 10) === 1).length;
  const totalInactivos = usuarios.filter(u => !u.activo).length;

  const usuariosFiltrados = usuarios.filter(u => {
    const matchBusqueda = u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchBusqueda) return false;

    if (activeFilter === 'OPERATIVOS') return u.activo;
    if (activeFilter === 'SUSPENDIDOS') return !u.activo;
    if (activeFilter === 'ADMINS') return parseInt(u.rol_id, 10) === 1;
    return true;
  });

  const renderUsuarioCard = ({ item }) => {
    const cfg = getRolConfig(item.rol_id);
    const esCuentaPropia = currentUserId === parseInt(item.id, 10);

    return (
      <Pressable 
        style={({ pressed }) => [styles.card, esCuentaPropia && styles.cardSelf, pressed && { transform: [{ scale: 0.98 }] }]} 
        onPress={() => abrirVentanaOpciones(item)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrapper, { backgroundColor: item.activo ? '#0284C7' : '#94A3B8' }]}>
            {item.icono_perfil ? (
              <Icon name={item.icono_perfil} size={24} color="#FFFFFF" />
            ) : (
              <Text style={styles.avatarTxt}>{item.nombre.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          
          <View style={styles.cardMainInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.cardTitle, !item.activo && { color: '#64748B' }]} numberOfLines={1}>{item.nombre}</Text>
              {esCuentaPropia && (
                <View style={styles.badgeSelf}>
                  <Text style={styles.badgeSelfTxt}>TÚ</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardSubtitle} numberOfLines={1}>{item.email}</Text>
          </View>
          
          <View style={styles.editButton}>
            <Icon name="chevron-right" size={22} color="#CBD5E1" />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Icon name={cfg.icon} size={16} color={cfg.color} />
            <Text style={[styles.footerText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: item.activo ? '#ECFDF5' : '#FEF2F2' }]}>
            <View style={[styles.statusDot, { backgroundColor: item.activo ? '#10B981' : '#EF4444' }]} />
            <Text style={[styles.statusText, { color: item.activo ? '#047857' : '#B91C1C' }]}>
              {item.activo ? 'OPERATIVO' : 'SUSPENDIDO'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const FiltroChip = ({ label, id }) => (
    <Pressable 
      style={[styles.filterChip, activeFilter === id && styles.filterChipActive]}
      onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveFilter(id); }}
    >
      <Text style={[styles.filterChipTxt, activeFilter === id && styles.filterChipTxtActive]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F9FF" translucent={false} />
      
      {/* CABECERA BENTO GRID */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.5 }]} onPress={() => navigation.goBack()} hitSlop={15}>
            <Icon name="arrow-left" size={22} color="#0284C7" />
          </Pressable>
          <View style={styles.headerTitlesBox}>
            <Text style={styles.greeting}>RECURSOS HUMANOS</Text>
            <Text style={styles.headerTitle}>Nómina de Personal</Text>
          </View>
        </View>

        {/* BENTO GRID DE ESTADÍSTICAS */}
        <View style={styles.bentoGrid}>
          <View style={[styles.bentoBox, styles.bentoMain]}>
            <View style={styles.bentoIconBg}>
              <Icon name="account-group" size={24} color="#0284C7" />
            </View>
            <View>
              <Text style={styles.bentoNumberMain}>{totalPersonal}</Text>
              <Text style={styles.bentoLabel}>PLANTILLA TOTAL</Text>
            </View>
          </View>
          
          <View style={styles.bentoColumn}>
            <View style={[styles.bentoBox, styles.bentoSecondary, { marginBottom: 10, backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <Text style={[styles.bentoNumberSmall, { color: '#B45309' }]}>{totalAdmins}</Text>
              <Text style={[styles.bentoLabel, { color: '#D97706' }]}>ADMINS</Text>
            </View>
            <View style={[styles.bentoBox, styles.bentoSecondary, { backgroundColor: totalInactivos > 0 ? '#FEF2F2' : '#F8FAFC', borderColor: totalInactivos > 0 ? '#FECACA' : '#F1F5F9' }]}>
              <Text style={[styles.bentoNumberSmall, { color: totalInactivos > 0 ? '#B91C1C' : '#64748B' }]}>{totalInactivos}</Text>
              <Text style={styles.bentoLabel}>SUSPENDIDOS</Text>
            </View>
          </View>
        </View>

        {/* BUSCADOR Y FILTROS */}
        <View style={styles.searchBox}>
          <Icon name="magnify" size={22} color="#94A3B8" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput} placeholder="Buscar por nombre o correo..." placeholderTextColor="#94A3B8"
            value={searchQuery} onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={15}><Icon name="close-circle" size={18} color="#94A3B8" /></Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll} style={{ marginTop: 15, maxHeight: 40 }}>
          <FiltroChip label="Todos" id="TODOS" />
          <FiltroChip label="Operativos" id="OPERATIVOS" />
          <FiltroChip label="Suspendidos" id="SUSPENDIDOS" />
          <FiltroChip label="Administradores" id="ADMINS" />
        </ScrollView>
      </View>

      {/* LISTA DE EMPLEADOS */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0284C7" />
        </View>
      ) : (
        <FlatList
          data={usuariosFiltrados}
          renderItem={renderUsuarioCard}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0284C7"]} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Icon name="account-off-outline" size={50} color="#CBD5E1" />
              <Text style={styles.emptyTxt}>No se encontraron coincidencias.</Text>
            </View>
          }
        />
      )}

      {/* MODAL DE EDICIÓN (PERFIL Y PERMISOS*/}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.pullIndicator} />
            
            {usuarioSeleccionado && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                
                <View style={styles.modalHeaderBox}>
                  <View style={[styles.modalAvatar, !usuarioSeleccionado.activo && { backgroundColor: '#94A3B8' }]}>
                    {usuarioSeleccionado.icono_perfil ? (
                      <Icon name={usuarioSeleccionado.icono_perfil} size={30} color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalAvatarTxt}>{usuarioSeleccionado.nombre.charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={styles.modalOperatorName}>{usuarioSeleccionado.nombre}</Text>
                    <Text style={styles.modalOperatorEmail}>{usuarioSeleccionado.email}</Text>
                    <View style={[styles.rolePill, { backgroundColor: getRolConfig(usuarioSeleccionado.rol_id).bg }]}>
                      <Text style={[styles.rolePillTxt, { color: getRolConfig(usuarioSeleccionado.rol_id).color }]}>{getRolConfig(usuarioSeleccionado.rol_id).label}</Text>
                    </View>
                  </View>
                </View>

                {currentUserId === parseInt(usuarioSeleccionado.id, 10) && (
                  <View style={styles.noticeContainer}>
                    <Icon name="shield-alert-outline" size={18} color="#0284C7" style={{ marginRight: 8 }} />
                    <Text style={styles.noticeText}>Estás gestionando tu propia cuenta. Los cambios jerárquicos están bloqueados.</Text>
                  </View>
                )}

                <View style={styles.optionBlock}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.optionTitle}>Estado Operativo</Text>
                    <Text style={styles.optionDesc}>{usuarioSeleccionado.activo ? 'El usuario tiene acceso al sistema.' : 'Acceso revocado temporalmente.'}</Text>
                  </View>
                  <Switch 
                    value={usuarioSeleccionado.activo} 
                    onValueChange={handleToggleEstado}
                    disabled={currentUserId === parseInt(usuarioSeleccionado.id, 10) || !isAdmin}
                    trackColor={{ true: '#10B981', false: '#CBD5E1' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <Text style={styles.sectionLabel}>Jerarquía y Privilegios</Text>
                <View style={styles.gridRoles}>
                  {[1, 2, 3].map((rolId) => {
                    const cfg = getRolConfig(rolId);
                    const isCurrent = parseInt(usuarioSeleccionado.rol_id, 10) === rolId;
                    const isDisabled = isCurrent || currentUserId === parseInt(usuarioSeleccionado.id, 10) || !isAdmin;

                    return (
                      <Pressable 
                        key={rolId} 
                        style={({ pressed }) => [
                          styles.roleButton, 
                          isCurrent && { borderColor: cfg.color, backgroundColor: cfg.bg },
                          isDisabled && !isCurrent && { opacity: 0.5 },
                          pressed && !isDisabled && { transform: [{ scale: 0.95 }] }
                        ]}
                        disabled={isDisabled}
                        onPress={() => handleCambiarRol(rolId)}
                      >
                        <Icon name={cfg.icon} size={22} color={isCurrent ? cfg.color : '#94A3B8'} />
                        <Text style={[styles.roleButtonTxt, { color: isCurrent ? cfg.color : '#64748B' }]}>{cfg.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {isAdmin && currentUserId !== parseInt(usuarioSeleccionado.id, 10) && (
                  <Pressable style={({ pressed }) => [styles.deleteBtn, pressed && { backgroundColor: '#FEE2E2' }]} onPress={handleEliminarUsuario}>
                    <Icon name="trash-can-outline" size={20} color="#EF4444" />
                    <Text style={styles.deleteBtnTxt}>Eliminar Cuenta Definitivamente</Text>
                  </Pressable>
                )}

                <Pressable style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeBtnTxt}>Cerrar Panel</Text>
                </Pressable>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { backgroundColor: '#F0F9FF', paddingTop: Platform.OS === 'ios' ? 60 : 25, paddingHorizontal: 20, paddingBottom: 15, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, elevation: 5, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, zIndex: 10 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  backButton: { backgroundColor: '#FFFFFF', width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 15 },
  headerTitlesBox: { flex: 1 },
  greeting: { color: '#0284C7', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { color: '#0F172A', fontSize: 24, fontWeight: '900', letterSpacing: 0.2 },
  
  bentoGrid: { flexDirection: 'row', height: 100, marginBottom: 15 },
  bentoBox: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, elevation: 1 },
  bentoMain: { flex: 1.2, marginRight: 10, justifyContent: 'space-between' },
  bentoIconBg: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center' },
  bentoColumn: { flex: 1, justifyContent: 'space-between' },
  bentoSecondary: { flex: 1, padding: 0, alignItems: 'center', justifyContent: 'center' },
  bentoNumberMain: { fontSize: 26, fontWeight: '900', color: '#0F172A' },
  bentoNumberSmall: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  bentoLabel: { fontSize: 9, color: '#64748B', marginTop: 2, fontWeight: '800', letterSpacing: 0.5 },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: '#E0F2FE' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },
  filterScroll: { paddingHorizontal: 5 },
  filterChip: { backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center' },
  filterChipActive: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  filterChipTxt: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  filterChipTxtActive: { color: '#FFFFFF' },

  listContainer: { padding: 20, paddingBottom: 60, paddingTop: 10 },

  card: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, borderWidth: 1, borderColor: '#F1F5F9' },
  cardSelf: { borderColor: '#BAE6FD', borderWidth: 1.5, backgroundColor: '#F8FAFC' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconWrapper: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarTxt: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  cardMainInfo: { flex: 1, marginRight: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', flexShrink: 1 },
  badgeSelf: { backgroundColor: '#0284C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  badgeSelfTxt: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  cardSubtitle: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  editButton: { padding: 8, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 14 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerItem: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 12, marginLeft: 6, fontWeight: '800' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  emptyBox: { alignItems: 'center', marginTop: 50 },
  emptyTxt: { fontSize: 15, fontWeight: '700', color: '#94A3B8', marginTop: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 25, maxHeight: '88%' },
  pullIndicator: { width: 45, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  
  modalHeaderBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#F8FAFC', padding: 18, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  modalAvatar: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#0284C7', justifyContent: 'center', alignItems: 'center' },
  modalAvatarTxt: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  modalOperatorName: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 2 },
  modalOperatorEmail: { fontSize: 13, color: '#64748B', fontWeight: '500', marginBottom: 6 },
  rolePill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  rolePillTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },

  noticeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2FE', padding: 14, borderRadius: 16, marginBottom: 20 },
  noticeText: { color: '#0284C7', fontSize: 12, fontWeight: '700', flex: 1, lineHeight: 18 },

  optionBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20, elevation: 1 },
  optionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  optionDesc: { fontSize: 12, color: '#94A3B8', marginTop: 4, fontWeight: '500', lineHeight: 16 },

  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10, marginLeft: 5, letterSpacing: 0.5 },
  gridRoles: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  roleButton: { width: '31%', paddingVertical: 16, alignItems: 'center', borderRadius: 18, borderWidth: 1.5, borderColor: '#F1F5F9', backgroundColor: '#F8FAFC' },
  roleButtonTxt: { fontSize: 11, fontWeight: '800', marginTop: 8 },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FECACA', marginBottom: 10 },
  deleteBtnTxt: { color: '#EF4444', fontWeight: '800', fontSize: 13, marginLeft: 8 },

  closeBtn: { paddingVertical: 16, alignItems: 'center', marginTop: 5, backgroundColor: '#F1F5F9', borderRadius: 16 },
  closeBtnTxt: { color: '#64748B', fontWeight: '800', fontSize: 14 },

  loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.8)', justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 36, borderTopRightRadius: 36 }
});

export default GestionUsuariosScreen;