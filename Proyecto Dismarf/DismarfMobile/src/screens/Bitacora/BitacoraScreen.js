import React, { useState, useEffect, useCallback, useContext } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, 
  StatusBar, RefreshControl, Platform, Modal, TextInput, ScrollView,
  Pressable, LayoutAnimation, UIManager
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

const BitacoraScreen = () => {
  const { user } = useContext(AuthContext);
  const userRoleId = parseInt(user?.rol_id || 3);
  const hasAccess = userRoleId === 1 || userRoleId === 2;

  const [logs, setLogs] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cavasMap, setCavasMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModulo, setFilterModulo] = useState('TODOS');
  const [filterTiempo, setFilterTiempo] = useState('TODOS');
  const [sortOrder, setSortOrder] = useState('DESC');

  const fetchAuditoria = async (silencioso = false) => {
    if (!hasAccess) return;
    if (!silencioso && !refreshing) setIsLoading(true);
    
    try {
      const resCavas = await apiClient.get('/api/cavas');
      const cMap = {};
      (resCavas.data || []).forEach(c => { cMap[c.id] = c.nombre; });
      setCavasMap(cMap);

      const resLogs = await apiClient.get('/api/bitacora');
      const logsData = resLogs.data || [];
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setLogs(logsData);

      try {
        const resUsers = await apiClient.get('/api/usuarios');
        let usersData = resUsers.data || [];
        usersData.unshift({
          id: 0, nombre: "Sistema Dismarf", email: "auto@dismarf.com", rol_id: 1, isSystem: true, icono_perfil: 'server-network'
        });
        setUsuarios(usersData);
      } catch (errUsers) {
        const usersMap = { 0: { id: 0, nombre: "Sistema Dismarf", email: "auto@dismarf.com", rol_id: 1, isSystem: true, icono_perfil: 'server-network' } };
        logsData.forEach(item => {
          const uid = item.id_usuario; 
          if (uid && !usersMap[uid]) {
            usersMap[uid] = { id: uid, nombre: item.nombre_usuario || `Operador ID: ${uid}`, email: "usuario@dismarf.com", rol_id: 3, icono_perfil: null };
          }
        });
        setUsuarios(Object.values(usersMap));
      }
    } catch (error) {
      Alert.alert("Error de Red", "No se pudo descargar la matriz de trazabilidad.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { if (hasAccess) fetchAuditoria(); }, [hasAccess]);

  const onRefresh = useCallback(() => {
    if (!hasAccess) return;
    setRefreshing(true);
    fetchAuditoria(true);
  }, [hasAccess]);

  const traducirDetalle = (texto) => {
    if (!texto) return 'Sin detalles registrados.';
    return texto.replace(/cava\s*(?:ID:\s*|#)(\d+)/gi, (match, id) => {
      const nombreReal = cavasMap[id];
      return nombreReal ? `"${nombreReal}"` : `cava física #${id}`;
    });
  };

  const totalOperadores = usuarios.length;
  const totalAcciones = logs.length;
  const conteoEliminaciones = logs.filter(l => (l.accion || '').toUpperCase().includes('ELIMINAR')).length;

  const getLogsForUser = (userId) => logs.filter(log => userId === 0 ? !log.id_usuario : log.id_usuario === userId);
  
  const usuariosFiltrados = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getRolConfig = (rolId) => {
    switch (parseInt(rolId)) {
      case 1: return { label: "Admin", color: "#D97706", bg: "#FEF3C7", icon: "shield-crown" };
      case 2: return { label: "Super", color: "#0284C7", bg: "#E0F2FE", icon: "eye-check" };
      default: return { label: "Almacén", color: "#64748B", bg: "#F1F5F9", icon: "package-variant" };
    }
  };

  const getActionConfig = (accion) => {
    const act = (accion || '').toUpperCase();
    if (act.includes('CREAR')) return { color: '#10B981', icon: 'plus-circle', bg: '#ECFDF5' };
    if (act.includes('ACTUALIZAR')) return { color: '#F59E0B', icon: 'pencil-circle', bg: '#FFFBEB' };
    if (act.includes('ELIMINAR')) return { color: '#EF4444', icon: 'trash-can', bg: '#FEF2F2' };
    if (act.includes('MOVIMIENTO')) return { color: '#3B82F6', icon: 'package-variant-closed', bg: '#EFF6FF' };
    if (act.includes('AUDITORÍA')) return { color: '#8B5CF6', icon: 'clipboard-check', bg: '#F5F3FF' };
    return { color: '#64748B', icon: 'cog-outline', bg: '#F1F5F9' };
  };

  const abrirHistorialUsuario = (usuario) => {
    setSelectedUser(usuario);
    setFilterModulo('TODOS');
    setFilterTiempo('TODOS');
    setSortOrder('DESC');
    setModalVisible(true);
  };

  const calcularKPIsUsuario = (userLogs) => {
    if (!userLogs || userLogs.length === 0) return { moduloTop: 'N/A', activosHoy: 0 };
    const conteos = {}; let maxMod = 'N/A'; let maxVal = 0;
    const hoyStr = new Date().toDateString(); let hoyCount = 0;

    userLogs.forEach(l => {
      const mod = (l.modulo || 'OTROS').toUpperCase();
      conteos[mod] = (conteos[mod] || 0) + 1;
      if (conteos[mod] > maxVal) { maxVal = conteos[mod]; maxMod = mod; }
      if (new Date(l.fecha).toDateString() === hoyStr) hoyCount++;
    });
    return { moduloTop: maxMod, activosHoy: hoyCount };
  };

  const renderAvatarUsuario = (item) => {
    if (item.isSystem) {
      return <Icon name="robot-outline" size={26} color="#0F172A" />;
    }
    if (item.icono_perfil) {
      return <Icon name={item.icono_perfil} size={28} color="#FFFFFF" />;
    }
    return <Text style={styles.avatarTxt}>{item.nombre.charAt(0).toUpperCase()}</Text>;
  };

  // --- VISTA NO AUTORIZADA ---
  if (!hasAccess) {
    return (
      <View style={styles.unauthorizedContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />
        <View style={styles.lockIconCircle}>
          <Icon name="shield-lock-outline" size={55} color="#EF4444" />
        </View>
        <Text style={styles.unauthorizedTitle}>Acceso Denegado</Text>
        <Text style={styles.unauthorizedSub}>
          La bitácora contiene información crítica de seguridad logística. Su nivel de autorización actual no permite visualizar estos datos.
        </Text>
      </View>
    );
  }

  const renderUsuarioCard = ({ item }) => {
    const userLogs = getLogsForUser(item.id);
    const rol = getRolConfig(item.rol_id);

    return (
      <Pressable 
        style={({ pressed }) => [styles.userCard, pressed && { transform: [{ scale: 0.98 }], backgroundColor: '#F8FAFC' }]}
        onPress={() => abrirHistorialUsuario(item)}
      >
        <View style={styles.userCardContent}>
          
          {/* Avatar Dinámico */}
          <View style={[styles.avatar, item.isSystem && { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' }]}>
            {renderAvatarUsuario(item)}
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.nombre}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            
            <View style={styles.tagsRow}>
              <View style={[styles.badge, { backgroundColor: rol.bg }]}>
                <Icon name={rol.icon} size={11} color={rol.color} style={{ marginRight: 4 }} />
                <Text style={[styles.badgeTxt, { color: rol.color }]}>{rol.label}</Text>
              </View>
              <View style={styles.badgeCount}>
                <Icon name="history" size={12} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.badgeCountTxt}>{userLogs.length} reg.</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardActionArea}>
            <View style={styles.cardArrowBg}>
              <Icon name="chevron-right" size={20} color="#3B82F6" />
            </View>
          </View>

        </View>
      </Pressable>
    );
  };

  // --- RENDER NODO TIMELINE ---
  const renderLogItem = ({ item }) => {
    const config = getActionConfig(item.accion);
    const fechaObj = new Date(item.fecha);
    const textoTraducido = traducirDetalle(item.detalle);

    return (
      <View style={styles.timelineRow}>
        <View style={styles.timelineNodeBox}>
          <View style={styles.timelineVerticalLine} />
          <View style={[styles.timelineDot, { backgroundColor: config.color }]} />
        </View>

        <View style={styles.logCard}>
          <View style={styles.logHeader}>
            <View style={[styles.miniActionBadge, { backgroundColor: config.bg }]}>
              <Icon name={config.icon} size={14} color={config.color} />
              <Text style={[styles.miniActionTxt, { color: config.color }]}>{item.accion}</Text>
            </View>
            <Text style={styles.logDate}>
              {fechaObj.toLocaleDateString([], { month: 'short', day: '2-digit' })} • {fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Text style={styles.logModule}>Área: {item.modulo}</Text>
          <Text style={styles.logDetail}>{textoTraducido}</Text>
        </View>
      </View>
    );
  };

  // --- LÓGICA DE FILTRADO PARA EL MODAL ---
  const rawUserLogs = selectedUser ? getLogsForUser(selectedUser.id) : [];
  const kpis = calcularKPIsUsuario(rawUserLogs);

  let logsSeleccionadosFiltrados = rawUserLogs.filter(l => {
    let cumpleModulo = filterModulo === 'TODOS' ? true : (l.modulo || '').toUpperCase() === filterModulo;
    
    // Filtro de Tiempo
    if (!cumpleModulo) return false;
    if (filterTiempo === 'TODOS') return true;

    const fechaLog = new Date(l.fecha).getTime();
    const hoy = new Date().setHours(0,0,0,0);
    
    if (filterTiempo === 'HOY') return fechaLog >= hoy;
    if (filterTiempo === 'SEMANA') return fechaLog >= (hoy - (7 * 24 * 60 * 60 * 1000));
    if (filterTiempo === 'MES') return fechaLog >= (hoy - (30 * 24 * 60 * 60 * 1000));
    
    return true;
  });

  logsSeleccionadosFiltrados.sort((a, b) => {
    const dA = new Date(a.fecha).getTime(); const dB = new Date(b.fecha).getTime();
    return sortOrder === 'DESC' ? dB - dA : dA - dB;
  });

  const modulosDisponibles = ['TODOS', ...new Set(rawUserLogs.map(l => (l.modulo || 'OTROS').toUpperCase()))];
  const tiemposDisponibles = ['TODOS', 'HOY', 'SEMANA', 'MES'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />
      
      {/* CABECERA BENTO GRID */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Auditoría Global</Text>
        <Text style={styles.headerSub}>Control y trazabilidad del personal</Text>
        
        <View style={styles.bentoGrid}>
          <View style={[styles.bentoBox, styles.bentoMain]}>
            <View style={styles.bentoIconBg}>
              <Icon name="account-group" size={24} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.bentoNumberMain}>{totalOperadores}</Text>
              <Text style={styles.bentoLabel}>USUARIOS ACTIVOS</Text>
            </View>
          </View>
          
          <View style={styles.bentoColumn}>
            <View style={[styles.bentoBox, styles.bentoSecondary, { marginBottom: 10, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Text style={[styles.bentoNumberSmall, { color: '#1D4ED8' }]}>{totalAcciones}</Text>
              <Text style={[styles.bentoLabel, { color: '#3B82F6' }]}>ACCIONES</Text>
            </View>
            <View style={[styles.bentoBox, styles.bentoSecondary, { backgroundColor: conteoEliminaciones > 0 ? '#FEF2F2' : '#F8FAFC', borderColor: conteoEliminaciones > 0 ? '#FECACA' : '#F1F5F9' }]}>
              <Text style={[styles.bentoNumberSmall, { color: conteoEliminaciones > 0 ? '#B91C1C' : '#64748B' }]}>{conteoEliminaciones}</Text>
              <Text style={styles.bentoLabel}>BORRADOS</Text>
            </View>
          </View>
        </View>

        {/* BUSCADOR */}
        <View style={styles.searchBox}>
          <Icon name="magnify" size={22} color="#94A3B8" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar operador o correo..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={15}>
              <Icon name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* LISTA DE USUARIOS */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList 
          data={usuariosFiltrados}
          renderItem={renderUsuarioCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3B82F6"]} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <Icon name="account-search-outline" size={45} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTxt}>Ningún operador coincide</Text>
            </View>
          }
        />
      )}

      {/* MODAL TIMELINE PREMIUM (CON FILTROS Y EXPORTACIÓN) */}
      <Modal visible={modalVisible} transparent={true} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentFull}>
            
            {/* CABECERA DEL MODAL */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={[styles.avatarSmall, selectedUser?.isSystem && { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' }]}>
                  {selectedUser && renderAvatarUsuario(selectedUser)}
                </View>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>{selectedUser?.nombre}</Text>
                  <Text style={styles.modalSubTitle}>{rawUserLogs.length} eventos registrados</Text>
                </View>
              </View>

              <Pressable style={styles.closeCircle} onPress={() => setModalVisible(false)}>
                <Icon name="close" size={20} color="#64748B"/>
              </Pressable>
            </View>

            {/* BOTONES DE ACCIÓN RÁPIDA */}
            <View style={styles.quickActionsRow}>
              <Pressable 
                style={({ pressed }) => [styles.btnExport, pressed && { backgroundColor: '#E0F2FE' }]}
                onPress={() => Alert.alert("Generar Reporte", `Generando PDF de auditoría para ${selectedUser?.nombre}...`)}
              >
                <Icon name="file-pdf-box" size={18} color="#0284C7" />
                <Text style={styles.btnExportTxt}>Exportar</Text>
              </Pressable>

              <Pressable 
                style={styles.sortBtn} 
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC'); }}
              >
                <Icon name={sortOrder === 'DESC' ? "sort-calendar-descending" : "sort-calendar-ascending"} size={20} color="#0F172A" />
                <Text style={styles.sortBtnTxt}>{sortOrder === 'DESC' ? 'Recientes' : 'Antiguos'}</Text>
              </Pressable>
            </View>

            {/* FILTROS INTERACTIVOS */}
            <View style={styles.filtersContainer}>
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Área Operativa:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 5 }}>
                  {modulosDisponibles.map((mod, index) => (
                    <Pressable key={index} style={[styles.filterChip, filterModulo === mod && styles.filterChipActive]} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setFilterModulo(mod); }}>
                      <Text style={[styles.filterChipTxt, filterModulo === mod && styles.filterChipTxtActive]}>{mod}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Período de Tiempo:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 5 }}>
                  {tiemposDisponibles.map((t, index) => (
                    <Pressable key={index} style={[styles.filterChip, filterTiempo === t && styles.filterChipActive]} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setFilterTiempo(t); }}>
                      <Text style={[styles.filterChipTxt, filterTiempo === t && styles.filterChipTxtActive]}>{t}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* TIMELINE FLUIDA */}
            <FlatList 
              data={logsSeleccionadosFiltrados}
              renderItem={renderLogItem}
              keyExtractor={(item) => (item.id_bitacora ? item.id_bitacora.toString() : Math.random().toString())}
              contentContainerStyle={styles.timelineContainer}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyTimeline}>
                  <Icon name="text-box-search-outline" size={45} color="#CBD5E1" />
                  <Text style={styles.emptyTxt}>Sin resultados</Text>
                  <Text style={styles.emptySubTxt}>Intenta cambiar los filtros seleccionados</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  unauthorizedContainer: { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', padding: 30 },
  lockIconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#FECACA' },
  unauthorizedTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 12 },
  unauthorizedSub: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },

  header: { backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'ios' ? 60 : 25, paddingHorizontal: 25, paddingBottom: 25, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', zIndex: 10 },
  headerTitle: { color: '#0F172A', fontSize: 26, fontWeight: '900', letterSpacing: 0.2 },
  headerSub: { color: '#64748B', fontSize: 13, fontWeight: '600', marginTop: 2, marginBottom: 20 },
  
  bentoGrid: { flexDirection: 'row', height: 110, marginBottom: 15 },
  bentoBox: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, elevation: 1 },
  bentoMain: { flex: 1.2, marginRight: 10, justifyContent: 'space-between' },
  bentoIconBg: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  bentoColumn: { flex: 1, justifyContent: 'space-between' },
  bentoSecondary: { flex: 1, padding: 0, alignItems: 'center', justifyContent: 'center' },
  bentoNumberMain: { fontSize: 30, fontWeight: '900', color: '#0F172A' },
  bentoNumberSmall: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  bentoLabel: { fontSize: 10, color: '#64748B', marginTop: 2, fontWeight: '800', letterSpacing: 0.5 },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: '#E2E8F0' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '600' },

  listContainer: { padding: 20, paddingBottom: 100 },
  
  userCard: { backgroundColor: '#FFFFFF', borderRadius: 24, marginBottom: 16, elevation: 1, borderWidth: 1, borderColor: '#E2E8F0' },
  userCardContent: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#0284C7', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarTxt: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  userEmail: { fontSize: 12, color: '#64748B', marginBottom: 10, fontWeight: '600' },
  
  tagsRow: { flexDirection: 'row', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
  badgeTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  badgeCount: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F1F5F9' },
  badgeCountTxt: { fontSize: 10, fontWeight: '800', color: '#475569' },
  
  cardActionArea: { alignItems: 'flex-end', justifyContent: 'center' },
  cardArrowBg: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },

  emptyBox: { alignItems: 'center', marginTop: 40 },
  emptyIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  emptyTxt: { fontSize: 16, fontWeight: '800', color: '#0F172A' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
  modalContentFull: { backgroundColor: '#F8FAFC', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 26, maxHeight: '92%', flex: 1 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  avatarSmall: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#0284C7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  modalTitle: { color: '#0F172A', fontSize: 20, fontWeight: '900' },
  modalSubTitle: { color: '#3B82F6', fontSize: 12, fontWeight: '700' },
  closeCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },

  quickActionsRow: { flexDirection: 'row', marginBottom: 20, gap: 10 },
  btnExport: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F9FF', paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#BAE6FD' },
  btnExportTxt: { color: '#0284C7', fontSize: 13, fontWeight: '800', marginLeft: 6 },
  sortBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  sortBtnTxt: { color: '#0F172A', fontSize: 13, fontWeight: '800', marginLeft: 6 },

  filtersContainer: { marginBottom: 10 },
  filterSection: { marginBottom: 12 },
  filterTitle: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  filterChip: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  filterChipTxt: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  filterChipTxtActive: { color: '#FFFFFF' },

  timelineContainer: { paddingBottom: 60, paddingTop: 10 },
  timelineRow: { flexDirection: 'row', marginBottom: 20 },
  timelineNodeBox: { width: 30, alignItems: 'center', marginRight: 12 },
  timelineVerticalLine: { position: 'absolute', top: 24, bottom: -24, width: 2, backgroundColor: '#E2E8F0' },
  timelineDot: { width: 14, height: 14, borderRadius: 7, marginTop: 18, borderWidth: 3, borderColor: '#F8FAFC', elevation: 1 },

  logCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#F1F5F9', elevation: 1 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  miniActionBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  miniActionTxt: { fontSize: 10, fontWeight: '900', marginLeft: 4, letterSpacing: 0.5 },
  logDate: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
  logModule: { fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  logDetail: { fontSize: 14, color: '#0F172A', lineHeight: 22, fontWeight: '600' },

  emptyTimeline: { alignItems: 'center', marginTop: 50 },
});

export default BitacoraScreen;