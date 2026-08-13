import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  Alert, FlatList, ActivityIndicator, StatusBar, ScrollView, Modal, Platform, KeyboardAvoidingView,
  Pressable, LayoutAnimation, UIManager
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { 
  initDB, guardarMovimientoOffline, obtenerMovimientosOffline, eliminarMovimientoSincronizado 
} from '../../database/dbLocal';
import apiClient from '../../api/client';

const InventarioScreen = () => {
  const [cavas, setCavas] = useState([]);
  const [cavaSeleccionada, setCavaSeleccionada] = useState(null);
  const [modalSelectorVisible, setModalSelectorVisible] = useState(false);
  
  const [cavaDetalleVisible, setCavaDetalleVisible] = useState(false);
  const [cavaActivaDetalle, setCavaActivaDetalle] = useState(null);
  const [historialCava, setHistorialCava] = useState([]);
  const [isCargandoHistorial, setIsCargandoHistorial] = useState(false);
  const [busquedaModal, setBusquedaModal] = useState(''); 
  
  const [producto, setProducto] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState('Kg'); 
  const [tipo, setTipo] = useState('ENTRADA');
  const [capacidadNueva, setCapacidadNueva] = useState(''); 
  const [productoBloqueado, setProductoBloqueado] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  
  const [stockCavaSeleccionada, setStockCavaSeleccionada] = useState([]);
  const [stockCargadoExito, setStockCargadoExito] = useState(false);

  const [movimientosLocales, setMovimientosLocales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('Sincronizado'); 

  const colorTema = tipo === 'ENTRADA' ? '#10B981' : '#EF4444';
  const colorFondo = tipo === 'ENTRADA' ? '#ECFDF5' : '#FEF2F2';
  const colorBorde = tipo === 'ENTRADA' ? '#A7F3D0' : '#FECACA';

  useEffect(() => {
    initDB();
    cargarDatos();
  }, []);

  useEffect(() => {
    const autoSyncInterval = setInterval(() => { sincronizarEnSegundoPlano(); }, 8000);
    return () => clearInterval(autoSyncInterval);
  }, [movimientosLocales]);

  const cargarDatos = async () => {
    try {
      const resCavas = await apiClient.get('/api/cavas');
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCavas(resCavas.data);
      
      const datosOffline = await obtenerMovimientosOffline();
      setMovimientosLocales(datosOffline || []);
      setSyncStatus((datosOffline && datosOffline.length > 0) ? 'Pendientes' : 'Sincronizado');
    } catch (error) {
      console.log('Modo local activo.');
    } finally {
      setIsLoading(false);
    }
  };

  const sincronizarEnSegundoPlano = async () => {
    const pendientes = await obtenerMovimientosOffline();
    if (!pendientes || pendientes.length === 0) { setSyncStatus('Sincronizado'); return; }

    setSyncStatus('Sincronizando');
    let sincronizadosHoy = false;

    for (const item of pendientes) {
      try {
        await apiClient.post('/api/inventario/movimientos', {
          cava_id: item.cava_id, producto: item.producto, tipo_movimiento: item.tipo_movimiento,
          cantidad: item.cantidad, unidad: item.unidad, capacidad_nueva: item.capacidad_nueva, fecha: item.fecha
        });
        await eliminarMovimientoSincronizado(item.id);
        sincronizadosHoy = true;
      } catch (e) { setSyncStatus('Pendientes'); return; }
    }

    if (sincronizadosHoy) {
      cargarDatos();
      if (cavaSeleccionada) cargarStockEspecifico(cavaSeleccionada.id);
    }
  };

  useEffect(() => {
    if (cavaSeleccionada) {
      setCapacidadNueva(cavaSeleccionada.capacidad_ocupada.toString());
      cargarStockEspecifico(cavaSeleccionada.id);
    } else {
      setStockCavaSeleccionada([]);
      setStockCargadoExito(false);
    }
    setProducto(''); setProductoBloqueado(false);
  }, [cavaSeleccionada]);

  const cargarStockEspecifico = async (idCava) => {
    try {
      const response = await apiClient.get(`/api/inventario/cava/${idCava}`);
      const movimientos = response.data;
      const stock = {};
      movimientos.forEach(mov => {
        if (!stock[mov.producto]) stock[mov.producto] = { cantidad: 0, unidad: mov.unidad };
        if (mov.tipo_movimiento === 'ENTRADA') stock[mov.producto].cantidad += parseFloat(mov.cantidad);
        else stock[mov.producto].cantidad -= parseFloat(mov.cantidad);
      });
      const stockArray = Object.keys(stock).map(key => ({ producto: key, ...stock[key] })).filter(item => item.cantidad > 0);
      
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setStockCavaSeleccionada(stockArray);
      setStockCargadoExito(true);
    } catch (error) { setStockCargadoExito(false); }
  };

  const cambiarTipoMovimiento = (nuevoTipo) => {
    if (tipo !== nuevoTipo) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTipo(nuevoTipo);
      setProducto('');
      setProductoBloqueado(false);
    }
  };

  const handleCapacidadChange = (texto) => {
    const valorNumerico = texto.replace(/[^0-9]/g, '');
    if (valorNumerico === '') { setCapacidadNueva(''); return; }
    const numero = parseInt(valorNumerico, 10);
    setCapacidadNueva(numero > 100 ? '100' : numero.toString());
  };

  const ajustarCantidadRapida = (incremento) => {
    const actual = parseFloat(cantidad) || 0;
    const nuevo = actual + incremento;
    if (nuevo < 0) { setCantidad('0'); return; }
    setCantidad(nuevo.toString());
  };

  const manejarGuardadoLocal = async () => {
    if (!cavaSeleccionada || !producto.trim() || !cantidad || capacidadNueva === '') {
      Alert.alert("Formulario Incompleto", "Por favor completa todos los parámetros del lote."); return;
    }

    if (tipo === 'SALIDA' && stockCargadoExito) {
      const itemEnStock = stockCavaSeleccionada.find(i => i.producto.trim().toLowerCase() === producto.trim().toLowerCase());
      if (!itemEnStock) { Alert.alert("Error Logístico", `El producto "${producto}" no está registrado en este equipo.`); return; }
      if (parseFloat(cantidad) > itemEnStock.cantidad) { Alert.alert("Falta de Stock", `Solo dispones de ${itemEnStock.cantidad} ${itemEnStock.unidad}.`); return; }
    }

    try {
      await guardarMovimientoOffline(cavaSeleccionada.id, producto.trim(), tipo, parseFloat(cantidad), unidad, parseInt(capacidadNueva));
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setProducto(''); setCantidad(''); setProductoBloqueado(false);
      cargarDatos(); cargarStockEspecifico(cavaSeleccionada.id); sincronizarEnSegundoPlano();
    } catch (e) { Alert.alert("Error Local", "No se pudo guardar el registro."); }
  };

  const abrirDetalleCava = async (cava) => {
    setCavaActivaDetalle(cava); setBusquedaModal(''); setCavaDetalleVisible(true); setIsCargandoHistorial(true);
    try {
      const response = await apiClient.get(`/api/inventario/cava/${cava.id}`);
      setHistorialCava(response.data);
    } catch (error) { console.log("Error consultando existencias."); } 
    finally { setIsCargandoHistorial(false); }
  };

  const calcularStockActualFiltrado = () => {
    const stock = {};
    historialCava.forEach(mov => {
      if (!stock[mov.producto]) stock[mov.producto] = { cantidad: 0, unidad: mov.unidad };
      if (mov.tipo_movimiento === 'ENTRADA') stock[mov.producto].cantidad += parseFloat(mov.cantidad);
      else stock[mov.producto].cantidad -= parseFloat(mov.cantidad);
    });
    return Object.keys(stock).map(key => ({ producto: key, ...stock[key] })).filter(item => item.cantidad > 0 && item.producto.toLowerCase().includes(busquedaModal.toLowerCase())); 
  };

  const renderPildoraNube = () => {
    const isOk = syncStatus === 'Sincronizado';
    const isWork = syncStatus === 'Sincronizando';
    return (
      <View style={[styles.cloudPill, isOk ? styles.pillOk : isWork ? styles.pillWork : styles.pillPend]}>
        <Icon name={isOk ? "cloud-check" : isWork ? "cloud-sync" : "cloud-off-outline"} size={14} color={isOk ? "#10B981" : isWork ? "#3B82F6" : "#F59E0B"} style={{ marginRight: 4 }} />
        <Text style={[styles.cloudPillTxt, { color: isOk ? "#10B981" : isWork ? "#3B82F6" : "#F59E0B" }]}>
          {isOk ? "En línea" : isWork ? "Subiendo..." : `${movimientosLocales.length} en cola`}
        </Text>
        {isWork && <ActivityIndicator size="small" color="#3B82F6" style={{ marginLeft: 6 }} />}
      </View>
    );
  };

  const renderResumenCavas = () => (
    <View style={styles.resumenContainer}>
      <Text style={styles.sectionLabel}>Equipos Disponibles (Toca para auditar)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollCavas}>
        {cavas.map(cava => (
          <Pressable 
            key={cava.id} 
            style={({ pressed }) => [styles.miniCard, !cava.estado && { opacity: 0.5, borderColor: '#FECACA' }, pressed && { transform: [{ scale: 0.96 }] }]} 
            onPress={() => abrirDetalleCava(cava)}
          >
            <View style={styles.miniCardTop}>
              <Icon name="fridge-outline" size={18} color={cava.estado ? '#3B82F6' : '#94A3B8'} />
              <Text style={styles.miniCardCap}>{cava.capacidad_ocupada}%</Text>
            </View>
            <Text style={styles.miniCardTitle} numberOfLines={1}>{cava.nombre}</Text>
            <Text style={[styles.miniCardProd, !cava.estado && { color: '#EF4444' }]}>{cava.estado ? cava.tipo_producto : 'SUSPENDIDA'}</Text>
            <View style={styles.miniBarraFondo}>
              <View style={[styles.miniBarraProgreso, { width: `${cava.capacidad_ocupada}%`, backgroundColor: cava.capacidad_ocupada > 85 ? '#EF4444' : '#3B82F6' }]} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerSubTitle}>OPERACIONES ALMACÉN</Text>
          {renderPildoraNube()}
        </View>
        <Text style={styles.headerTitle}>Gestión de Lotes</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollMainContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {renderResumenCavas()}
          
          {/* TARJETA DEL FORMULARIO DINÁMICA */}
          <View style={[styles.formCard, { borderColor: focusedInput ? colorTema : '#E2E8F0', shadowColor: colorTema }]}>
            
            {/* PESTAÑAS ANIMADAS (ENTRADA / SALIDA) */}
            <View style={styles.tabTipo}>
              <Pressable style={[styles.btnTipo, tipo === 'ENTRADA' && styles.btnActiveE]} onPress={() => cambiarTipoMovimiento('ENTRADA')}>
                <Icon name="package-down" size={18} color={tipo === 'ENTRADA' ? '#FFFFFF' : '#94A3B8'} style={{ marginRight: 6 }} />
                <Text style={[styles.textTipo, tipo === 'ENTRADA' && { color: '#FFFFFF' }]}>ENTRADA</Text>
              </Pressable>
              <Pressable style={[styles.btnTipo, tipo === 'SALIDA' && styles.btnActiveS]} onPress={() => cambiarTipoMovimiento('SALIDA')}>
                <Icon name="package-up" size={18} color={tipo === 'SALIDA' ? '#FFFFFF' : '#94A3B8'} style={{ marginRight: 6 }} />
                <Text style={[styles.textTipo, tipo === 'SALIDA' && { color: '#FFFFFF' }]}>SALIDA</Text>
              </Pressable>
            </View>
            
            <View style={{ marginTop: 20 }}>
              <Text style={styles.label}>1. Equipo Asignado</Text>
              <Pressable style={({ pressed }) => [styles.selectorPressable, pressed && { backgroundColor: '#F1F5F9' }]} onPress={() => setModalSelectorVisible(true)}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="fridge-industrial-outline" size={20} color={colorTema} />
                  <Text style={[styles.selectorText, !cavaSeleccionada && { color: '#94A3B8', fontWeight: '500' }]}>
                    {cavaSeleccionada ? cavaSeleccionada.nombre : "Seleccionar equipo físico..."}
                  </Text>
                </View>
                <Icon name="chevron-down" size={20} color="#64748B" />
              </Pressable>

              {/* CHIPS INTELIGENTES DE EXISTENCIAS */}
              {cavaSeleccionada && stockCavaSeleccionada.length > 0 && (
                <View style={{ marginTop: 15 }}>
                  <Text style={styles.labelSolo}>Autocompletar Lote Existente:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6, paddingBottom: 5 }}>
                    {stockCavaSeleccionada.map((item, idx) => (
                      <Pressable 
                        key={idx} 
                        style={[styles.chipProd, productoBloqueado && producto === item.producto && { backgroundColor: colorTema, borderColor: colorTema }]}
                        onPress={() => { setProducto(item.producto); setUnidad(item.unidad); setProductoBloqueado(true); }}
                      >
                        <Text style={[styles.chipProdText, productoBloqueado && producto === item.producto && { color: '#FFFFFF' }]}>
                          {item.producto} <Text style={{ fontWeight: '600', opacity: 0.8 }}>({item.cantidad} {item.unidad})</Text>
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.label}>2. Producto / Descripción</Text>
              <View style={{ position: 'relative', justifyContent: 'center' }}>
                <TextInput 
                  placeholder={tipo === 'SALIDA' ? "Lote a extraer..." : "Ej. Costillas de Res..."} 
                  placeholderTextColor="#94A3B8"
                  style={[styles.input, focusedInput === 'prod' && { borderColor: colorTema, backgroundColor: '#FFFFFF' }, productoBloqueado && { backgroundColor: colorFondo, color: colorTema, fontWeight: '800', borderColor: colorBorde }]} 
                  value={producto} onChangeText={setProducto} editable={!productoBloqueado}
                  onFocus={() => setFocusedInput('prod')} onBlur={() => setFocusedInput(null)} 
                />
                {productoBloqueado && (
                  <Pressable style={{ position: 'absolute', right: 14 }} onPress={() => { setProducto(''); setProductoBloqueado(false); }}>
                    <Icon name="close-circle" size={22} color={colorTema} />
                  </Pressable>
                )}
              </View>

              {/* BENTO GRID DE CANTIDADES Y CAPACIDAD */}
              <View style={{ flexDirection: 'row', marginTop: 16, justifyContent: 'space-between' }}>
                <View style={{ flex: 1.5, marginRight: 8 }}>
                  <Text style={styles.labelSolo}>Cantidad</Text>
                  <TextInput 
                    placeholder="0.00" placeholderTextColor="#94A3B8"
                    style={[styles.inputSolo, focusedInput === 'cant' && { borderColor: colorTema, backgroundColor: '#FFFFFF' }]} 
                    keyboardType="numeric" value={cantidad} onChangeText={setCantidad}
                    onFocus={() => setFocusedInput('cant')} onBlur={() => setFocusedInput(null)} 
                  />
                </View>
                
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.labelSolo}>Formato</Text>
                  <Pressable style={[styles.btnUnidad, productoBloqueado && { backgroundColor: '#F1F5F9' }]} disabled={productoBloqueado} onPress={() => setUnidad(unidad === 'Kg' ? 'Cajas' : unidad === 'Cajas' ? 'Und' : 'Kg')}>
                    <Text style={[styles.textUnidad, productoBloqueado && { color: '#94A3B8' }]}>{unidad}</Text>
                  </Pressable>
                </View>
                
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.labelSolo}>Cava al (%)</Text>
                  <TextInput 
                    placeholder="0-100" placeholderTextColor="#94A3B8"
                    style={[styles.inputSolo, focusedInput === 'cap' && { borderColor: colorTema, backgroundColor: '#FFFFFF' }, { color: '#3B82F6', fontWeight: '900' }]} 
                    keyboardType="numeric" value={capacidadNueva} onChangeText={handleCapacidadChange} maxLength={3}
                    onFocus={() => setFocusedInput('cap')} onBlur={() => setFocusedInput(null)}  
                  />
                </View>
              </View>

              {/* AJUSTES RÁPIDOS COLORIZADOS */}
              <View style={styles.fastCountingRow}>
                <Text style={styles.fastCountLabel}>Ajuste:</Text>
                <View style={styles.fastCountingPills}>
                  <Pressable style={[styles.pillCountBtn, { backgroundColor: colorFondo, borderColor: colorBorde }]} onPress={() => ajustarCantidadRapida(tipo === 'ENTRADA' ? 1 : -1)}>
                    <Text style={[styles.pillCountTxt, { color: colorTema }]}>{tipo === 'ENTRADA' ? '+1' : '-1'}</Text>
                  </Pressable>
                  <Pressable style={[styles.pillCountBtn, { backgroundColor: colorFondo, borderColor: colorBorde }]} onPress={() => ajustarCantidadRapida(tipo === 'ENTRADA' ? 5 : -5)}>
                    <Text style={[styles.pillCountTxt, { color: colorTema }]}>{tipo === 'ENTRADA' ? '+5' : '-5'}</Text>
                  </Pressable>
                  <Pressable style={[styles.pillCountBtn, { backgroundColor: colorFondo, borderColor: colorBorde }]} onPress={() => ajustarCantidadRapida(tipo === 'ENTRADA' ? 10 : -10)}>
                    <Text style={[styles.pillCountTxt, { color: colorTema }]}>{tipo === 'ENTRADA' ? '+10' : '-10'}</Text>
                  </Pressable>
                </View>
              </View>

              {/* BOTÓN GIGANTE DE ACCIÓN */}
              <Pressable style={({ pressed }) => [styles.btnSave, { backgroundColor: colorTema }, pressed && { transform: [{ scale: 0.98 }] }]} onPress={manejarGuardadoLocal}>
                <Icon name={tipo === 'ENTRADA' ? "tray-arrow-down" : "tray-arrow-up"} size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.btnSaveText}>{tipo === 'ENTRADA' ? 'CONFIRMAR INGRESO' : 'PROCESAR SALIDA'}</Text>
              </Pressable>
            </View>
          </View>

          {/* LISTADO EN COLA (Estilo Logístico) */}
          {movimientosLocales.length > 0 && (
            <View style={styles.colaWrapper}>
              <Text style={styles.colaTitle}>Tickets Pendientes de Sincronización:</Text>
              {movimientosLocales.map((item) => (
                <View key={item.id} style={styles.ticketCard}>
                  <View style={[styles.itemIcon, { backgroundColor: item.tipo_movimiento === 'ENTRADA' ? '#ECFDF5' : '#FEF2F2' }]}>
                    <Icon name={item.tipo_movimiento === 'ENTRADA' ? 'package-down' : 'package-up'} size={24} color={item.tipo_movimiento === 'ENTRADA' ? '#10B981' : '#EF4444'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemProd}>{item.producto}</Text>
                    <Text style={styles.itemMeta}>Destino ID: {item.cava_id} • Ocupación: {item.capacidad_nueva}%</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.itemQty, { color: item.tipo_movimiento === 'ENTRADA' ? '#10B981' : '#EF4444' }]}>
                      {item.tipo_movimiento === 'ENTRADA' ? '+' : '-'}{item.cantidad}
                    </Text>
                    <Text style={styles.itemUnit}>{item.unidad}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL 1: SELECTOR DE CAVA */}
      <Modal visible={modalSelectorVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Elige un Equipo</Text>
              <Pressable onPress={() => setModalSelectorVisible(false)} hitSlop={10}><Icon name="close" size={24} color="#64748B"/></Pressable>
            </View>
            <FlatList
              data={cavas}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <Pressable 
                  style={({ pressed }) => [styles.cavaOption, !item.estado && { opacity: 0.4 }, pressed && { backgroundColor: '#F8FAFC' }]} 
                  disabled={!item.estado}
                  onPress={() => { setCavaSeleccionada(item); setModalSelectorVisible(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cavaOptionName}>{item.nombre}</Text>
                    {item.estado ? (
                      <Text style={styles.cavaOptionSub}>{item.ubicacion}</Text>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Icon name="cancel" size={12} color="#EF4444" />
                        <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '800', marginLeft: 4 }}>FUERA DE SERVICIO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cavaOptionCap}>{item.capacidad_ocupada}%</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL 2: AUDITORÍA ESTILO TICKET/REPORT */}
      <Modal visible={cavaDetalleVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlayFull}>
          <View style={[styles.modalContentFull]}>
            {cavaActivaDetalle && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                  <View>
                    <Text style={styles.modalTitle}>Auditoría Logística</Text>
                    <Text style={{ fontSize: 14, color: '#3B82F6', fontWeight: '800' }}>{cavaActivaDetalle.nombre}</Text>
                  </View>
                  <Pressable onPress={() => setCavaDetalleVisible(false)} style={styles.closeCircle}>
                    <Icon name="close" size={20} color="#64748B"/>
                  </Pressable>
                </View>

                <View style={[styles.miniBarraFondo, { height: 8, marginBottom: 20 }]}>
                  <View style={[styles.miniBarraProgreso, { width: `${cavaActivaDetalle.capacidad_ocupada}%`, backgroundColor: cavaActivaDetalle.capacidad_ocupada > 85 ? '#EF4444' : '#3B82F6' }]} />
                </View>

                <View style={styles.searchModalBox}>
                  <Icon name="magnify" size={22} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput 
                    style={styles.searchModalInput} 
                    placeholder="Escanear o buscar lote..." 
                    placeholderTextColor="#94A3B8"
                    value={busquedaModal} 
                    onChangeText={setBusquedaModal} 
                  />
                  {busquedaModal.length > 0 && (
                    <Pressable onPress={() => setBusquedaModal('')}><Icon name="close-circle" size={18} color="#94A3B8" /></Pressable>
                  )}
                </View>

                {isCargandoHistorial ? (
                  <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                    <Text style={styles.sectionLabelPanel}>Existencias Actuales</Text>
                    {calcularStockActualFiltrado().length === 0 ? (
                      <Text style={styles.emptyHistorial}>No se encontraron productos.</Text>
                    ) : (
                      <View style={styles.stockBox}>
                        {calcularStockActualFiltrado().map((item, index) => {
                          const isLowStock = item.cantidad <= 5;
                          return (
                            <View key={index} style={styles.stockRowPremium}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.stockProd}>{item.producto}</Text>
                                {isLowStock && (
                                  <View style={styles.badgeLowStock}>
                                    <Text style={styles.badgeLowStockTxt}>STOCK CRÍTICO</Text>
                                  </View>
                                )}
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[styles.stockCant, isLowStock && { color: '#EF4444' }]}>
                                  {item.cantidad} <Text style={{ fontSize: 13, color: '#64748B' }}>{item.unidad}</Text>
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    <Text style={[styles.sectionLabelPanel, { marginTop: 25 }]}>Últimos Movimientos Nube</Text>
                    {historialCava.length === 0 ? (
                      <Text style={styles.emptyHistorial}>Sin trazabilidad registrada.</Text>
                    ) : (
                      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', padding: 5 }}>
                        {historialCava.map(mov => (
                          <View key={mov.id} style={styles.historialRow}>
                            <View style={[styles.histIconBg, { backgroundColor: mov.tipo_movimiento === 'ENTRADA' ? '#ECFDF5' : '#FEF2F2' }]}>
                              <Icon name={mov.tipo_movimiento === 'ENTRADA' ? 'arrow-down-thick' : 'arrow-up-thick'} size={14} color={mov.tipo_movimiento === 'ENTRADA' ? '#10B981' : '#EF4444'} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={styles.histProd}>{mov.producto}</Text>
                              <Text style={styles.histDate}>{new Date(mov.fecha).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</Text>
                            </View>
                            <Text style={[styles.histCant, { color: mov.tipo_movimiento === 'ENTRADA' ? '#10B981' : '#EF4444' }]}>
                              {mov.tipo_movimiento === 'ENTRADA' ? '+' : '-'}{mov.cantidad}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  header: { backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'ios' ? 50 : 25, paddingHorizontal: 25, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', zIndex: 10 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  headerSubTitle: { color: '#64748B', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { color: '#0F172A', fontSize: 26, fontWeight: '900', letterSpacing: 0.2 },
  
  cloudPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  pillOk: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  pillWork: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  pillPend: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  cloudPillTxt: { fontSize: 11, fontWeight: '800' },

  scrollMainContainer: { paddingBottom: 100 },
  
  resumenContainer: { paddingHorizontal: 20, marginTop: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#64748B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  scrollCavas: { flexDirection: 'row' },
  miniCard: { backgroundColor: '#FFFFFF', padding: 18, borderRadius: 20, width: 160, marginRight: 12, elevation: 1, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  miniCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  miniCardTitle: { fontWeight: '800', fontSize: 16, color: '#0F172A', marginBottom: 2 },
  miniCardProd: { fontSize: 11, color: '#94A3B8', marginBottom: 10, fontWeight: '700' },
  miniBarraFondo: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  miniBarraProgreso: { height: '100%', borderRadius: 3 },
  miniCardCap: { fontSize: 12, color: '#3B82F6', fontWeight: '900' },
  
  formCard: { backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: 25, padding: 22, borderRadius: 28, elevation: 3, borderWidth: 1.5, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 15 },
  
  tabTipo: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 5, borderWidth: 1, borderColor: '#F1F5F9' },
  btnTipo: { flex: 1, flexDirection: 'row', height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  btnActiveE: { backgroundColor: '#10B981', elevation: 2, shadowColor: '#10B981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  btnActiveS: { backgroundColor: '#EF4444', elevation: 2, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  textTipo: { fontSize: 13, fontWeight: '800', color: '#64748B', letterSpacing: 0.5 },
  
  label: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 8, marginTop: 16, letterSpacing: 0.5 },
  labelSolo: { fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 8, letterSpacing: 0.5 },
  
  selectorPressable: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 16, height: 54, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  selectorText: { marginLeft: 12, color: '#0F172A', fontSize: 15, fontWeight: '700' },
  
  input: { backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 16, height: 54, fontSize: 15, color: '#0F172A', borderWidth: 1.5, borderColor: '#E2E8F0', fontWeight: '600' },
  inputSolo: { backgroundColor: '#F8FAFC', borderRadius: 14, height: 54, fontSize: 16, color: '#0F172A', borderWidth: 1.5, borderColor: '#E2E8F0', textAlign: 'center', fontWeight: '700' },

  chipProd: { backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginRight: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  chipProdText: { color: '#64748B', fontWeight: '800', fontSize: 13 },

  btnUnidad: { backgroundColor: '#F8FAFC', borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E2E8F0' },
  textUnidad: { fontWeight: '800', color: '#0F172A', fontSize: 14 },

  fastCountingRow: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fastCountLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '800' },
  fastCountingPills: { flexDirection: 'row' },
  pillCountBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginLeft: 8, borderWidth: 1 },
  pillCountTxt: { fontSize: 13, fontWeight: '900' },
  
  btnSave: { flexDirection: 'row', height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 25, elevation: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  btnSaveText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  
  colaWrapper: { marginTop: 30, paddingHorizontal: 20 },
  colaTitle: { marginBottom: 12, fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  ticketCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', marginBottom: 12, padding: 16, borderRadius: 20, alignItems: 'center', elevation: 1, borderWidth: 1, borderColor: '#E2E8F0' },
  itemIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  itemProd: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  itemMeta: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  itemQty: { fontSize: 18, fontWeight: '900' },
  itemUnit: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContentSmall: { backgroundColor: '#FFFFFF', width: '100%', borderRadius: 28, padding: 20, maxHeight: '70%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  
  modalOverlayFull: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
  modalContentFull: { backgroundColor: '#F8FAFC', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 26, maxHeight: '92%', flex: 1 },
  
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  closeCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  sectionLabelPanel: { fontSize: 13, fontWeight: '800', color: '#64748B', marginBottom: 12, letterSpacing: 0.5 },
  
  searchModalBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, height: 50, marginBottom: 20, borderWidth: 1.5, borderColor: '#E2E8F0' },
  searchModalInput: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '600' },

  stockBox: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  stockRowPremium: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  stockProd: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  stockCant: { fontSize: 18, fontWeight: '900', color: '#3B82F6' },
  badgeLowStock: { backgroundColor: '#FEF2F2', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: '#FECACA' },
  badgeLowStockTxt: { fontSize: 10, color: '#EF4444', fontWeight: '900', letterSpacing: 0.5 },
  
  historialRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  histIconBg: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  histProd: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  histDate: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  histCant: { fontSize: 16, fontWeight: '900' },
  emptyHistorial: { color: '#94A3B8', fontStyle: 'italic', marginTop: 5, fontSize: 14, textAlign: 'center', padding: 20 },
  
  cavaOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', borderRadius: 16 },
  cavaOptionName: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 2 },
  cavaOptionSub: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  cavaOptionCap: { fontWeight: '900', color: '#3B82F6', fontSize: 16 }
});

export default InventarioScreen;