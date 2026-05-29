import React, { useState, useEffect, useCallback, useContext } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Alert, StatusBar, RefreshControl, Platform, Modal, TextInput, ScrollView 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

const BitacoraScreen = () => {
  // --- SEGURIDAD POR ROLES (RBAC) ---
  const { user } = useContext(AuthContext);
  const userRoleId = parseInt(user?.rol_id || 3);
  const hasAccess = userRoleId === 1 || userRoleId === 2; // Solo ADMIN o SUPERVISOR

  // --- ESTADOS PRINCIPALES ---
  const [logs, setLogs] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cavasMap, setCavasMap] = useState({}); // Mapa de Cavas para traducción instantánea O(1)
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- ESTADOS DEL MODAL (FILTROS Y DETALLE) ---
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModulo, setFilterModulo] = useState('TODOS');
  const [sortOrder, setSortOrder] = useState('DESC'); // 'DESC' (recientes) o 'ASC' (antiguos)

  // --- DESCARGA MAESTRA DE DATOS ---
  const fetchAuditoria = async (silencioso = false) => {
    if (!hasAccess) return;
    if (!silencioso && !refreshing) setIsLoading(true);
    
    try {
      // 1. Descargamos el mapa de cavas para traducir los IDs a Nombres
      const resCavas = await apiClient.get('/core/cavas');
      const cMap = {};
      (resCavas.data || []).forEach(c => {
        cMap[c.id] = c.nombre;
      });
      setCavasMap(cMap);

      // 2. Descargamos la bitácora
      const resLogs = await apiClient.get('/core/bitacora');
      const logsData = resLogs.data || [];
      setLogs(logsData);

      // 3. Descargamos los usuarios
      try {
        const resUsers = await apiClient.get('/core/usuarios');
        let usersData = resUsers.data || [];
        
        usersData.push({
          id: 0,
          nombre: "Sistema Automático",
          email: "operaciones@dismarf.com",
          rol_id: 1,
          isSystem: true
        });

        setUsuarios(usersData);
      } catch (errUsers) {
        // Fallback en caso de desconexión parcial
        const usersMap = {
          0: { id: 0, nombre: "Sistema Automático", email: "operaciones@dismarf.com", rol_id: 1, isSystem: true }
        };

        logsData.forEach(item => {
          const uid = item.id_usuario; 
          if (uid && !usersMap[uid]) {
            usersMap[uid] = {
              id: uid,
              nombre: item.nombre_usuario || `Operador ID: ${uid}`, 
              email: "usuario@dismarf.com",
              rol_id: 3
            };
          }
        });
        setUsuarios(Object.values(usersMap));
      }
    } catch (error) {
      console.log("Error sincronizando bitácora:", error);
      Alert.alert("Error de Conexión", "No se pudo descargar el registro de auditoría.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (hasAccess) fetchAuditoria();
  }, [hasAccess]);

  const onRefresh = useCallback(() => {
    if (!hasAccess) return;
    setRefreshing(true);
    fetchAuditoria(true);
  }, [hasAccess]);

  // --- TRADUCTOR INTELIGENTE DE CAVAS (REEMPLAZO REGEX) ---
  const traducirDetalle = (texto) => {
    if (!texto) return 'Sin detalles registrados.';
    
    // Detecta patrones como "cava ID: 5" o "cava #5" y lo reemplaza por el nombre real
    return texto.replace(/cava\s*(?:ID:\s*|#)(\d+)/gi, (match, id) => {
      const nombreReal = cavasMap[id];
      return nombreReal ? `cava "${nombreReal}"` : `cava física #${id}`;
    });
  };

  // --- CÁLCULOS ANALÍTICOS GLOBALES ---
  const totalOperadores = usuarios.length;
  const totalAcciones = logs.length;
  const conteoEliminaciones = logs.filter(l => (l.accion || '').toUpperCase().includes('ELIMINAR')).length;

  // --- FILTROS Y BÚSQUEDAS ---
  const getLogsForUser = (userId) => {
    return logs.filter(log => {
      if (userId === 0) return !log.id_usuario;
      return log.id_usuario === userId;
    });
  };

  const usuariosFiltrados = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getRolConfig = (rolId) => {
    switch (parseInt(rolId)) {
      case 1: return { label: "Administrador", color: "#D97706", bg: "#FEF3C7" };
      case 2: return { label: "Supervisor", color: "#0284C7", bg: "#E0F2FE" };
      default: return { label: "Almacenista", color: "#64748B", bg: "#F1F5F9" };
    }
  };

  const getActionConfig = (accion) => {
    const act = (accion || '').toUpperCase();
    if (act.includes('CREAR')) return { color: '#059669', icon: 'plus-circle', bg: '#ECFDF5' };
    if (act.includes('ACTUALIZAR')) return { color: '#D97706', icon: 'pencil-circle', bg: '#FFFBEB' };
    if (act.includes('ELIMINAR')) return { color: '#DC2626', icon: 'trash-can', bg: '#FEF2F2' };
    if (act.includes('MOVIMIENTO')) return { color: '#0284C7', icon: 'package-variant-closed', bg: '#E0F2FE' };
    return { color: '#64748B', icon: 'cog-outline', bg: '#F1F5F9' };
  };

  const abrirHistorialUsuario = (usuario) => {
    setSelectedUser(usuario);
    setFilterModulo('TODOS'); // Reiniciamos filtros al abrir
    setSortOrder('DESC');
    setModalVisible(true);
  };

  // --- CÁLCULO DE KPIs PRIVADOS DEL MODAL ---
  const calcularKPIsUsuario = (userLogs) => {
    if (!userLogs || userLogs.length === 0) return { moduloTop: 'N/A', activosHoy: 0 };
    
    const conteos = {};
    let maxMod = 'N/A';
    let maxVal = 0;
    
    const hoyStr = new Date().toDateString();
    let hoyCount = 0;

    userLogs.forEach(l => {
      const mod = (l.modulo || 'OTROS').toUpperCase();
      conteos[mod] = (conteos[mod] || 0) + 1;
      if (conteos[mod] > maxVal) {
        maxVal = conteos[mod];
        maxMod = mod;
      }
      if (new Date(l.fecha).toDateString() === hoyStr) {
        hoyCount++;
      }
    });

    return { moduloTop: maxMod, activosHoy: hoyCount };
  };

  // ====================================================================
  // VISTA 1: PANTALLA DE RESTRICCIÓN PARA ALMACENISTAS
  // ====================================================================
  if (!hasAccess) {
    return (
      <View style={styles.unauthorizedContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
        <View style={styles.lockIconCircle}>
          <Icon name="shield-lock-outline" size={55} color="#EF4444" />
        </View>
        <Text style={styles.unauthorizedTitle}>Acceso Restringido</Text>
        <Text style={styles.unauthorizedSub}>
          La bitácora registra información de seguridad sobre la trazabilidad operativa. Su nivel actual de autorización no permite visualizar estos datos.
        </Text>
        <View style={styles.infoPill}>
          <Icon name="information-outline" size={18} color="#64748B" style={{ marginRight: 6 }} />
          <Text style={styles.infoPillText}>Contacta a un Administrador para solicitar permisos</Text>
        </View>
      </View>
    );
  }

  // ====================================================================
  // VISTA 2: TARJETA DE USUARIO PRINCIPAL
  // ====================================================================
  const renderUsuarioCard = ({ item }) => {
    const userLogs = getLogsForUser(item.id);
    const rol = getRolConfig(item.rol_id);
    const inicial = item.isSystem ? "⚙️" : item.nombre.charAt(0).toUpperCase();

    return (
      <TouchableOpacity 
        style={styles.userCard} 
        activeOpacity={0.8}
        onPress={() => abrirHistorialUsuario(item)}
      >
        <View style={styles.userCardContent}>
          <View style={[styles.avatar, item.isSystem && { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' }]}>
            <Text style={[styles.avatarTxt, item.isSystem && { color: '#0F172A' }]}>{inicial}</Text>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.nombre}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            
            <View style={styles.tagsRow}>
              <View style={[styles.badge, { backgroundColor: rol.bg }]}>
                <Text style={[styles.badgeTxt, { color: rol.color }]}>{rol.label}</Text>
              </View>
              
              <View style={[styles.badgeCount, { backgroundColor: '#F8FAFC' }]}>
                <Icon name="history" size={12} color="#64748B" />
                <Text style={styles.badgeCountTxt}>{userLogs.length} acciones</Text>
              </View>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color="#CBD5E1" />
        </View>
      </TouchableOpacity>
    );
  };

  // ====================================================================
  // VISTA 3: NODO DE LÍNEA DE TIEMPO (TRADUCIDO EN VIVO)
  // ====================================================================
  const renderLogItem = ({ item }) => {
    const config = getActionConfig(item.accion);
    const fechaObj = new Date(item.fecha);
    const textoTraducido = traducirDetalle(item.detalle); // Traducción instantánea

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
              {fechaObj.toLocaleDateString()} • {fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Text style={styles.logModule}>Módulo: {item.modulo}</Text>
          
          {/* AQUÍ SE MUESTRA EL DETALLE CON EL NOMBRE REAL DE LA CAVA */}
          <Text style={styles.logDetail}>{textoTraducido}</Text>
        </View>
      </View>
    );
  };

  // --- FILTRADO Y ORDENAMIENTO EN VIVO PARA EL MODAL ---
  const rawUserLogs = selectedUser ? getLogsForUser(selectedUser.id) : [];
  const kpis = calcularKPIsUsuario(rawUserLogs);

  let logsSeleccionadosFiltrados = rawUserLogs.filter(l => {
    if (filterModulo === 'TODOS') return true;
    return (l.modulo || '').toUpperCase() === filterModulo;
  });

  // Ordenamiento
  logsSeleccionadosFiltrados.sort((a, b) => {
    const dA = new Date(a.fecha).getTime();
    const dB = new Date(b.fecha).getTime();
    return sortOrder === 'DESC' ? dB - dA : dA - dB;
  });

  // Extraemos dinámicamente los módulos únicos de este usuario para la barra de filtros
  const modulosDisponibles = ['TODOS', ...new Set(rawUserLogs.map(l => (l.modulo || 'OTROS').toUpperCase()))];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F9FF" translucent={false} />
      
      {/* CABECERA LUMINOSA PRINCIPAL */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Auditoría de Sistema</Text>
        <Text style={styles.headerSub}>Trazabilidad y control de personal</Text>
        
        {/* PANEL DE IMPACTO VISUAL (KPIs GLOBALES) */}
        <View style={styles.kpiWrapper}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiNum}>{totalOperadores}</Text>
            <Text style={styles.kpiLabel}>PERSONAL</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiNum, { color: '#0284C7' }]}>{totalAcciones}</Text>
            <Text style={styles.kpiLabel}>REGISTROS</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiNum, { color: conteoEliminaciones > 0 ? '#DC2626' : '#64748B' }]}>
              {conteoEliminaciones}
            </Text>
            <Text style={styles.kpiLabel}>BORRADOS</Text>
          </View>
        </View>

        {/* BARRA DE BÚSQUEDA INTEGRADA */}
        <View style={styles.searchBox}>
          <Icon name="magnify" size={22} color="#0284C7" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar por nombre o correo..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* LISTADO MAESTRO DE AUDITORÍA */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.loadingTxt}>Cargando registros...</Text>
        </View>
      ) : (
        <FlatList 
          data={usuariosFiltrados}
          renderItem={renderUsuarioCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0284C7"]} tintColor="#0284C7" />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Icon name="account-search-outline" size={55} color="#CBD5E1" />
              <Text style={styles.emptyTxt}>No se encontraron operadores</Text>
            </View>
          }
        />
      )}

      {/* ==================================================================== */}
      {/* MODAL DETALLE POTENCIADO CON FILTROS, ORDENAMIENTO Y KPIs */}
      {/* ==================================================================== */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderRow}>
              
              {/* BOTÓN DE SALIDA VISIBLE */}
              <TouchableOpacity 
                style={styles.modalBackBtn} 
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="arrow-left" size={24} color="#0F172A" />
              </TouchableOpacity>
              
              <View style={styles.modalTitleWrapper}>
                <Text style={styles.modalTitle} numberOfLines={1}>{selectedUser?.nombre}</Text>
                <Text style={styles.modalSubTitle}>
                  {rawUserLogs.length} operaciones totales
                </Text>
              </View>

              {/* BOTÓN DE ORDENAMIENTO CRONOLÓGICO */}
              <TouchableOpacity 
                style={styles.sortBtn}
                activeOpacity={0.8}
                onPress={() => setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')}
              >
                <Icon name={sortOrder === 'DESC' ? "sort-calendar-descending" : "sort-calendar-ascending"} size={20} color="#0284C7" />
                <Text style={styles.sortBtnTxt}>{sortOrder === 'DESC' ? "Recientes" : "Antiguos"}</Text>
              </TouchableOpacity>

            </View>

            {/* MINITABLERO ANALÍTICO PRIVADO DEL USUARIO */}
            <View style={styles.privateKpisRow}>
              <View style={styles.privateKpiBox}>
                <Text style={styles.privateKpiLabel}>MÓDULO FRECUENTE</Text>
                <Text style={styles.privateKpiVal} numberOfLines={1}>{kpis.moduloTop}</Text>
              </View>
              <View style={styles.privateKpiBox}>
                <Text style={styles.privateKpiLabel}>ACCIONES HOY</Text>
                <Text style={[styles.privateKpiVal, { color: kpis.activosHoy > 0 ? '#059669' : '#64748B' }]}>
                  {kpis.activosHoy}
                </Text>
              </View>
            </View>

            {/* BARRA HORIZONTAL DE FILTROS POR MÓDULO */}
            <View style={{ marginTop: 12 }}>
              <Text style={styles.filterLabel}>Filtrar por Área:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                {modulosDisponibles.map((mod, index) => (
                  <TouchableOpacity 
                    key={index} 
                    activeOpacity={0.8}
                    style={[styles.filterChip, filterModulo === mod && styles.filterChipActive]}
                    onPress={() => setFilterModulo(mod)}
                  >
                    <Text style={[styles.filterChipTxt, filterModulo === mod && styles.filterChipTxtActive]}>
                      {mod}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

          </View>

          {/* CUERPO DE LA LÍNEA DE TIEMPO */}
          <View style={styles.modalBody}>
            <FlatList 
              data={logsSeleccionadosFiltrados}
              renderItem={renderLogItem}
              keyExtractor={(item) => (item.id_bitacora ? item.id_bitacora.toString() : Math.random().toString())}
              contentContainerStyle={styles.timelineContainer}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyTimeline}>
                  <Icon name="filter-remove-outline" size={55} color="#CBD5E1" />
                  <Text style={styles.emptyTxt}>Sin coincidencias en {filterModulo}</Text>
                  <Text style={styles.emptySubTxt}>Intenta cambiar de filtro en la barra superior</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ESTILOS ALTAMENTE PULIDOS
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingTxt: { marginTop: 12, color: '#64748B', fontSize: 14, fontWeight: '600' },

  // Vista No Autorizada
  unauthorizedContainer: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', padding: 30 },
  lockIconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#FEE2E2' },
  unauthorizedTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 12, textAlign: 'center' },
  unauthorizedSub: { fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 22, marginBottom: 30, paddingHorizontal: 10 },
  infoPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  infoPillText: { fontSize: 12, fontWeight: '700', color: '#64748B' },

  // Cabecera Principal
  header: { 
    backgroundColor: '#F0F9FF', 
    paddingTop: Platform.OS === 'ios' ? 60 : 25, 
    paddingHorizontal: 22, 
    paddingBottom: 25, 
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40, 
    elevation: 5,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    zIndex: 10 
  },
  headerTitle: { color: '#0F172A', fontSize: 28, fontWeight: '900', letterSpacing: 0.2 },
  headerSub: { color: '#64748B', fontSize: 13, fontWeight: '600', marginTop: 2, marginBottom: 15 },
  
  // Panel de KPIs Flotante
  kpiWrapper: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 10, marginBottom: 15, borderWidth: 1, borderColor: '#E0F2FE', elevation: 3, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 6 },
  kpiBox: { flex: 1, alignItems: 'center' },
  kpiNum: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  kpiLabel: { fontSize: 10, color: '#64748B', fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },
  kpiDivider: { width: 1.5, backgroundColor: '#F1F5F9', marginVertical: 5 },

  // Barra de Búsqueda
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 15, height: 52, borderWidth: 1, borderColor: '#E0F2FE', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },

  listContainer: { padding: 20, paddingBottom: 100 },

  // Tarjetas de Operador
  userCard: { backgroundColor: '#FFFFFF', borderRadius: 24, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  userCardContent: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  avatar: { width: 55, height: 55, borderRadius: 20, backgroundColor: '#0284C7', justifyContent: 'center', alignItems: 'center', marginRight: 16, elevation: 2 },
  avatarTxt: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  userInfo: { flex: 1 },
  userName: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  userEmail: { fontSize: 12, color: '#64748B', marginBottom: 10, fontWeight: '500' },
  
  tagsRow: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginRight: 8 },
  badgeTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  badgeCount: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  badgeCountTxt: { fontSize: 10, fontWeight: '800', color: '#475569', marginLeft: 4 },

  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyTxt: { fontSize: 16, fontWeight: '800', color: '#475569', marginTop: 12 },

  // ====================================================================
  // ESTILOS DEL MODAL POTENCIADO
  // ====================================================================
  modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: { 
    backgroundColor: '#F0F9FF', 
    paddingTop: Platform.OS === 'ios' ? 60 : 25, 
    paddingHorizontal: 20, 
    paddingBottom: 20,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    elevation: 4,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    zIndex: 10
  },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  
  modalBackBtn: { 
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFFFFF', 
    justifyContent: 'center', alignItems: 'center', marginRight: 12, 
    borderWidth: 1, borderColor: '#E2E8F0', elevation: 2 
  },
  
  modalTitleWrapper: { flex: 1, marginRight: 6 },
  modalTitle: { color: '#0F172A', fontSize: 22, fontWeight: '900' },
  modalSubTitle: { color: '#64748B', fontSize: 12, fontWeight: '600', marginTop: 2 },
  
  sortBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: '#E0F2FE' },
  sortBtnTxt: { color: '#0284C7', fontSize: 11, fontWeight: '800', marginLeft: 4 },

  // Tablero de KPIs privados
  privateKpisRow: { flexDirection: 'row', marginTop: 16, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E0F2FE' },
  privateKpiBox: { flex: 1 },
  privateKpiLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '800', marginBottom: 2 },
  privateKpiVal: { fontSize: 15, fontWeight: '900', color: '#0F172A' },

  // Barra de Filtros
  filterLabel: { fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  filterChip: { backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  filterChipTxt: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  filterChipTxtActive: { color: '#FFFFFF' },

  modalBody: { flex: 1 },

  // Nodos de Línea de Tiempo
  timelineContainer: { padding: 20, paddingBottom: 60 },
  timelineRow: { flexDirection: 'row', marginBottom: 18 },
  timelineNodeBox: { width: 30, alignItems: 'center', marginRight: 12 },
  timelineVerticalLine: { position: 'absolute', top: 24, bottom: -24, width: 2, backgroundColor: '#E2E8F0' },
  timelineDot: { width: 16, height: 16, borderRadius: 8, marginTop: 20, borderWidth: 3, borderColor: '#FFFFFF', elevation: 2 },

  logCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  miniActionBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  miniActionTxt: { fontSize: 10, fontWeight: '900', marginLeft: 5, letterSpacing: 0.5 },
  logDate: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
  logModule: { fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  logDetail: { fontSize: 14, color: '#334155', lineHeight: 20, fontWeight: '600' },

  emptyTimeline: { alignItems: 'center', marginTop: 80 },
  emptySubTxt: { fontSize: 13, color: '#94A3B8', marginTop: 5 }
});

export default BitacoraScreen;