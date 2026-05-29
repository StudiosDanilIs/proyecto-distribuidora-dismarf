import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  Alert, FlatList, ActivityIndicator, StatusBar, ScrollView, Modal, Platform, KeyboardAvoidingView 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { 
  initDB, 
  guardarMovimientoOffline, 
  obtenerMovimientosOffline, 
  eliminarMovimientoSincronizado 
} from '../../database/dbLocal';
import apiClient from '../../api/client';

const InventarioScreen = () => {
  // Estados de Cavas y Selección
  const [cavas, setCavas] = useState([]);
  const [cavaSeleccionada, setCavaSeleccionada] = useState(null);
  const [modalSelectorVisible, setModalSelectorVisible] = useState(false);
  
  // Estados del Modal de Inspección Premium
  const [cavaDetalleVisible, setCavaDetalleVisible] = useState(false);
  const [cavaActivaDetalle, setCavaActivaDetalle] = useState(null);
  const [historialCava, setHistorialCava] = useState([]);
  const [isCargandoHistorial, setIsCargandoHistorial] = useState(false);
  const [busquedaModal, setBusquedaModal] = useState(''); // Búsqueda en vivo dentro de la cava
  
  // Estados del Formulario
  const [producto, setProducto] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState('Kg'); 
  const [tipo, setTipo] = useState('ENTRADA');
  const [capacidadNueva, setCapacidadNueva] = useState(''); 
  const [productoBloqueado, setProductoBloqueado] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  
  const [stockCavaSeleccionada, setStockCavaSeleccionada] = useState([]);
  const [stockCargadoExito, setStockCargadoExito] = useState(false);

  // Estados de Sincronización Autónoma
  const [movimientosLocales, setMovimientosLocales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('Sincronizado'); // 'Sincronizado', 'Pendientes', 'Sincronizando'

  useEffect(() => {
    initDB();
    cargarDatos();
  }, []);

  // Demonio de Sincronización Automática (Segundo Plano)
  useEffect(() => {
    const autoSyncInterval = setInterval(() => {
      sincronizarEnSegundoPlano();
    }, 8000);
    return () => clearInterval(autoSyncInterval);
  }, [movimientosLocales]);

  const cargarDatos = async () => {
    try {
      const resCavas = await apiClient.get('/core/cavas');
      setCavas(resCavas.data);
      
      const datosOffline = await obtenerMovimientosOffline();
      setMovimientosLocales(datosOffline || []);
      
      if (datosOffline && datosOffline.length > 0) {
        setSyncStatus('Pendientes');
      } else {
        setSyncStatus('Sincronizado');
      }
    } catch (error) {
      console.log('Modo local activo: Sin conexión al backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const sincronizarEnSegundoPlano = async () => {
    const pendientes = await obtenerMovimientosOffline();
    if (!pendientes || pendientes.length === 0) {
      setSyncStatus('Sincronizado');
      return;
    }

    setSyncStatus('Sincronizando');
    let sincronizadosHoy = false;

    for (const item of pendientes) {
      try {
        await apiClient.post('/core/inventario/movimientos', {
          cava_id: item.cava_id, 
          producto: item.producto, 
          tipo_movimiento: item.tipo_movimiento,
          cantidad: item.cantidad, 
          unidad: item.unidad, 
          capacidad_nueva: item.capacidad_nueva, 
          fecha: item.fecha
        });
        
        await eliminarMovimientoSincronizado(item.id);
        sincronizadosHoy = true;
      } catch (e) { 
        setSyncStatus('Pendientes');
        return; 
      }
    }

    if (sincronizadosHoy) {
      cargarDatos();
      if (cavaSeleccionada) {
        cargarStockEspecifico(cavaSeleccionada.id);
      }
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
    setProducto(''); 
    setProductoBloqueado(false);
  }, [cavaSeleccionada]);

  const cargarStockEspecifico = async (idCava) => {
    try {
      const response = await apiClient.get(`/core/inventario/cava/${idCava}`);
      const movimientos = response.data;
      
      const stock = {};
      movimientos.forEach(mov => {
        if (!stock[mov.producto]) stock[mov.producto] = { cantidad: 0, unidad: mov.unidad };
        if (mov.tipo_movimiento === 'ENTRADA') stock[mov.producto].cantidad += parseFloat(mov.cantidad);
        else stock[mov.producto].cantidad -= parseFloat(mov.cantidad);
      });
      
      const stockArray = Object.keys(stock)
        .map(key => ({ producto: key, ...stock[key] }))
        .filter(item => item.cantidad > 0);
        
      setStockCavaSeleccionada(stockArray);
      setStockCargadoExito(true);
    } catch (error) {
      setStockCargadoExito(false);
    }
  };

  const handleCapacidadChange = (texto) => {
    const valorNumerico = texto.replace(/[^0-9]/g, '');
    if (valorNumerico === '') { setCapacidadNueva(''); return; }
    const numero = parseInt(valorNumerico, 10);
    if (numero > 100) setCapacidadNueva('100');
    else setCapacidadNueva(numero.toString());
  };

  // Ajuste rápido de conteo logístico (Botones +1, +5, etc.)
  const ajustarCantidadRapida = (incremento) => {
    const actual = parseFloat(cantidad) || 0;
    const nuevo = actual + incremento;
    if (nuevo < 0) { setCantidad('0'); return; }
    setCantidad(nuevo.toString());
  };

  const manejarGuardadoLocal = async () => {
    if (!cavaSeleccionada || !producto.trim() || !cantidad || capacidadNueva === '') {
      Alert.alert("Formulario Incompleto", "Por favor completa todos los parámetros del lote.");
      return;
    }

    if (tipo === 'SALIDA' && stockCargadoExito) {
      const itemEnStock = stockCavaSeleccionada.find(
        i => i.producto.trim().toLowerCase() === producto.trim().toLowerCase()
      );

      if (!itemEnStock) {
        Alert.alert("Alerta Logística", `El producto "${producto}" no se encuentra en esta cava.`);
        return;
      }

      if (parseFloat(cantidad) > itemEnStock.cantidad) {
        Alert.alert("Existencias Insuficientes", `Solo dispones de ${itemEnStock.cantidad} ${itemEnStock.unidad} de este producto.`);
        return;
      }
    }

    try {
      await guardarMovimientoOffline(
        cavaSeleccionada.id, 
        producto.trim(), 
        tipo, 
        parseFloat(cantidad), 
        unidad, 
        parseInt(capacidadNueva)
      );
      
      Alert.alert("Movimiento Registrado", "El inventario ha sido actualizado y encolado en la red.");
      
      setProducto(''); 
      setCantidad('');
      setProductoBloqueado(false);
      
      cargarDatos();
      cargarStockEspecifico(cavaSeleccionada.id); 
      sincronizarEnSegundoPlano();
    } catch (e) {
      Alert.alert("Error Local", "No se pudo guardar el registro en el dispositivo.");
    }
  };

  const abrirDetalleCava = async (cava) => {
    setCavaActivaDetalle(cava);
    setBusquedaModal(''); // Limpiamos la búsqueda al abrir
    setCavaDetalleVisible(true);
    setIsCargandoHistorial(true);
    try {
      const response = await apiClient.get(`/core/inventario/cava/${cava.id}`);
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
    
    return Object.keys(stock)
      .map(key => ({ producto: key, ...stock[key] }))
      .filter(item => item.cantidad > 0 && item.producto.toLowerCase().includes(busquedaModal.toLowerCase())); 
  };

  // ====================================================================
  // NUEVA PÍLDORA DE NUBE SUPERIOR ELEGANTE
  // ====================================================================
  const renderPildoraNube = () => {
    const isOk = syncStatus === 'Sincronizado';
    const isWork = syncStatus === 'Sincronizando';
    
    return (
      <View style={[styles.cloudPill, isOk ? styles.pillOk : isWork ? styles.pillWork : styles.pillPend]}>
        <Icon 
          name={isOk ? "cloud-check" : isWork ? "cloud-sync" : "cloud-off-outline"} 
          size={14} 
          color={isOk ? "#059669" : isWork ? "#0284C7" : "#D97706"} 
          style={{ marginRight: 4 }} 
        />
        <Text style={[styles.cloudPillTxt, { color: isOk ? "#059669" : isWork ? "#0284C7" : "#D97706" }]}>
          {isOk ? "Sincronizado" : isWork ? "Subiendo..." : `${movimientosLocales.length} en cola`}
        </Text>
        {isWork && <ActivityIndicator size="small" color="#0284C7" style={{ marginLeft: 6 }} />}
      </View>
    );
  };

  const renderResumenCavas = () => (
    <View style={styles.resumenContainer}>
      <Text style={styles.sectionLabel}>Equipos Físicos (Toca para auditar existencias)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollCavas}>
        {cavas.map(cava => (
          <TouchableOpacity 
            key={cava.id} 
            activeOpacity={0.8}
            style={[styles.miniCard, !cava.estado && { opacity: 0.5, borderColor: '#FEE2E2' }]} 
            onPress={() => abrirDetalleCava(cava)}
          >
            <Text style={styles.miniCardTitle} numberOfLines={1}>{cava.nombre}</Text>
            <Text style={[styles.miniCardProd, !cava.estado && { color: '#EF4444', fontWeight: '800' }]}>
              {cava.estado ? cava.tipo_producto : 'SUSPENDIDA'}
            </Text>
            <View style={styles.miniBarraFondo}>
              <View style={[
                styles.miniBarraProgreso, 
                { width: `${cava.capacidad_ocupada}%`, backgroundColor: cava.capacidad_ocupada > 85 ? '#EF4444' : '#0EA5E9' }
              ]} />
            </View>
            <Text style={styles.miniCardCap}>{cava.capacidad_ocupada}% ocupado</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F9FF" translucent={false} />
      
      {/* ENCABEZADO ICE-TECH CON PÍLDORA INTEGRADA */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerSubTitle}>LOGÍSTICA DE FRÍO</Text>
          {renderPildoraNube()}
        </View>
        <Text style={styles.headerTitle}>Control de Existencias</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollMainContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderResumenCavas()}
          
          {/* TARJETA DEL FORMULARIO PRINCIPAL */}
          <View style={styles.formCard}>
            <View style={styles.formHeaderRow}>
              <Text style={styles.sectionTitle}>Registrar Lote</Text>
              <TouchableOpacity 
                onPress={() => { setProducto(''); setCantidad(''); setProductoBloqueado(false); }}
                style={styles.btnReset}
              >
                <Icon name="refresh" size={14} color="#64748B" />
                <Text style={styles.btnResetTxt}>Limpiar</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.label}>Cava Asignada</Text>
            <TouchableOpacity style={styles.selectorPressable} activeOpacity={0.8} onPress={() => setModalSelectorVisible(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="fridge-outline" size={20} color="#0284C7" />
                <Text style={styles.selectorText}>
                  {cavaSeleccionada ? cavaSeleccionada.nombre : "Seleccionar equipo..."}
                </Text>
              </View>
              <Icon name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>

            {/* PESTAÑAS DE ACCIÓN */}
            <View style={styles.tabTipo}>
              <TouchableOpacity activeOpacity={0.8} style={[styles.btnTipo, tipo === 'ENTRADA' && styles.btnActiveE]} onPress={() => { setTipo('ENTRADA'); setProducto(''); setProductoBloqueado(false); }}>
                <Icon name="package-down" size={18} color={tipo === 'ENTRADA' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 4 }} />
                <Text style={[styles.textTipo, tipo === 'ENTRADA' && { color: '#FFFFFF' }]}>ENTRADA</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} style={[styles.btnTipo, tipo === 'SALIDA' && styles.btnActiveS]} onPress={() => { setTipo('SALIDA'); setProducto(''); setProductoBloqueado(false); }}>
                <Icon name="package-up" size={18} color={tipo === 'SALIDA' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 4 }} />
                <Text style={[styles.textTipo, tipo === 'SALIDA' && { color: '#FFFFFF' }]}>SALIDA</Text>
              </TouchableOpacity>
            </View>

            {/* CHIPS INTELIGENTES */}
            {cavaSeleccionada && stockCavaSeleccionada.length > 0 && (
              <View style={{ marginTop: 15 }}>
                <Text style={styles.labelSolo}>Existencias en cuarto (Toca para autocompletar):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 5 }}>
                  {stockCavaSeleccionada.map((item, idx) => (
                    <TouchableOpacity 
                      key={idx} activeOpacity={0.8}
                      style={[styles.chipProd, productoBloqueado && producto === item.producto && styles.chipProdActive]}
                      onPress={() => { setProducto(item.producto); setUnidad(item.unidad); setProductoBloqueado(true); }}
                    >
                      <Icon name="cube-outline" size={14} color={productoBloqueado && producto === item.producto ? '#FFFFFF' : '#0284C7'} style={{ marginRight: 6 }}/>
                      <Text style={[styles.chipProdText, productoBloqueado && producto === item.producto && { color: '#FFFFFF' }]}>
                        {item.producto} <Text style={{ fontWeight: 'normal' }}>({item.cantidad} {item.unidad})</Text>
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={styles.label}>Producto / Descripción</Text>
            <View style={{ position: 'relative', justifyContent: 'center' }}>
              <TextInput 
                placeholder={tipo === 'SALIDA' ? "Selecciona un lote superior..." : "Ej. Costillas de Res, Pollo..."} 
                placeholderTextColor="#94A3B8"
                style={[styles.input, focusedInput === 'prod' && styles.inputFocused, productoBloqueado && { backgroundColor: '#F1F5F9', color: '#64748B' }]} 
                value={producto} onChangeText={setProducto} editable={!productoBloqueado}
                onFocus={() => setFocusedInput('prod')} onBlur={() => setFocusedInput(null)} 
              />
              {productoBloqueado && (
                <TouchableOpacity style={{ position: 'absolute', right: 14 }} onPress={() => { setProducto(''); setProductoBloqueado(false); }}>
                  <Icon name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>

            {/* CANTIDAD, FORMATO Y CAPACIDAD */}
            <View style={{ flexDirection: 'row', marginTop: 16, justifyContent: 'space-between' }}>
              <View style={{ flex: 1.5, marginRight: 8 }}>
                <Text style={styles.labelSolo}>Cantidad</Text>
                <TextInput 
                  placeholder="0.00" placeholderTextColor="#94A3B8"
                  style={[styles.inputSolo, focusedInput === 'cant' && styles.inputFocused]} 
                  keyboardType="numeric" value={cantidad} onChangeText={setCantidad}
                  onFocus={() => setFocusedInput('cant')} onBlur={() => setFocusedInput(null)} 
                />
              </View>
              
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.labelSolo}>Formato</Text>
                <TouchableOpacity activeOpacity={0.8} style={[styles.btnUnidad, productoBloqueado && { backgroundColor: '#F1F5F9' }]} disabled={productoBloqueado} onPress={() => setUnidad(unidad === 'Kg' ? 'Cajas' : unidad === 'Cajas' ? 'Und' : 'Kg')}>
                  <Text style={[styles.textUnidad, productoBloqueado && { color: '#94A3B8' }]}>{unidad}</Text>
                </TouchableOpacity>
              </View>
              
              <View style={{ flex: 1.5 }}>
                <Text style={styles.labelSolo}>Ocupación (%)</Text>
                <TextInput 
                  placeholder="0-100" placeholderTextColor="#94A3B8"
                  style={[styles.inputSolo, focusedInput === 'cap' && styles.inputFocused, { color: '#0284C7', fontWeight: '900' }]} 
                  keyboardType="numeric" value={capacidadNueva} onChangeText={handleCapacidadChange} maxLength={3}
                  onFocus={() => setFocusedInput('cap')} onBlur={() => setFocusedInput(null)}  
                />
              </View>
            </View>

            {/* NUEVO AGREGADO LOGÍSTICO: BOTONES DE CONTEO RÁPIDO */}
            <View style={styles.fastCountingRow}>
              <Text style={styles.fastCountLabel}>Ajuste rápido:</Text>
              <View style={styles.fastCountingPills}>
                <TouchableOpacity style={styles.pillCountBtn} onPress={() => ajustarCantidadRapida(-1)}>
                  <Text style={styles.pillCountTxt}>-1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pillCountBtn} onPress={() => ajustarCantidadRapida(1)}>
                  <Text style={styles.pillCountTxt}>+1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pillCountBtn} onPress={() => ajustarCantidadRapida(5)}>
                  <Text style={styles.pillCountTxt}>+5</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pillCountBtn} onPress={() => ajustarCantidadRapida(10)}>
                  <Text style={styles.pillCountTxt}>+10</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.btnSave} activeOpacity={0.85} onPress={manejarGuardadoLocal}>
              <Icon name="content-save-check-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.btnSaveText}>REGISTRAR EXISTENCIA</Text>
            </TouchableOpacity>
          </View>

          {/* LISTADO EN COLA LOCAL */}
          {movimientosLocales.length > 0 && (
            <View style={styles.colaWrapper}>
              <Text style={styles.colaTitle}>Movimientos Pendientes de Nube:</Text>
              {movimientosLocales.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={[styles.itemIcon, { backgroundColor: item.tipo_movimiento === 'ENTRADA' ? '#ECFDF5' : '#FEF2F2' }]}>
                    <Icon name={item.tipo_movimiento === 'ENTRADA' ? 'package-down' : 'package-up'} size={22} color={item.tipo_movimiento === 'ENTRADA' ? '#059669' : '#EF4444'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemProd}>{item.producto}</Text>
                    <Text style={styles.itemMeta}>Cava Destino #{item.cava_id} • Ajuste: {item.capacidad_nueva}%</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.itemQty, { color: item.tipo_movimiento === 'ENTRADA' ? '#059669' : '#EF4444' }]}>
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

      {/* MODAL 1: SELECTOR DE CAVA PREMIUM */}
      <Modal visible={modalSelectorVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Asignar Equipo Físico</Text>
            <FlatList
              data={cavas}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  activeOpacity={0.8} style={[styles.cavaOption, !item.estado && { opacity: 0.4 }]} disabled={!item.estado}
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
                  <Text style={styles.cavaOptionCap}>{item.capacidad_ocupada}% ocupado</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.btnClose} activeOpacity={0.8} onPress={() => setModalSelectorVisible(false)}>
              <Text style={styles.btnCloseText}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 2: AUDITORÍA EN VIVO PREMIUM CON BUSCADOR Y ALERTAS */}
      {/* ==================================================================== */}
      <Modal visible={cavaDetalleVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '92%', flex: 1 }]}>
            {cavaActivaDetalle && (
              <>
                <Text style={styles.modalTitle}>Auditoría: {cavaActivaDetalle.nombre}</Text>
                
                {/* Master Progress Bar */}
                <View style={[styles.miniBarraFondo, { height: 8, marginBottom: 15 }]}>
                  <View style={[styles.miniBarraProgreso, { width: `${cavaActivaDetalle.capacidad_ocupada}%`, backgroundColor: cavaActivaDetalle.capacidad_ocupada > 85 ? '#EF4444' : '#0EA5E9' }]} />
                </View>

                {/* BUSCADOR EN VIVO DENTRO DEL CUARTO FRÍO */}
                <View style={styles.searchModalBox}>
                  <Icon name="magnify" size={20} color="#0284C7" style={{ marginRight: 8 }} />
                  <TextInput 
                    style={styles.searchModalInput} 
                    placeholder="Filtrar productos almacenados..." 
                    placeholderTextColor="#94A3B8"
                    value={busquedaModal} 
                    onChangeText={setBusquedaModal} 
                  />
                  {busquedaModal.length > 0 && (
                    <TouchableOpacity onPress={() => setBusquedaModal('')}>
                      <Icon name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>

                {isCargandoHistorial ? (
                  <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 50 }} />
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                    <Text style={styles.sectionLabelPanel}>📦 Lotes Disponibles en Sala</Text>
                    {calcularStockActualFiltrado().length === 0 ? (
                      <Text style={styles.emptyHistorial}>No se encontraron existencias coincidentes.</Text>
                    ) : (
                      <View style={styles.stockBox}>
                        {calcularStockActualFiltrado().map((item, index) => {
                          const isLowStock = item.cantidad <= 5; // Alerta automática de rotación
                          return (
                            <View key={index} style={styles.stockRowPremium}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.stockProd}>{item.producto}</Text>
                                {isLowStock && (
                                  <View style={styles.badgeLowStock}>
                                    <Text style={styles.badgeLowStockTxt}>⚠️ Stock Crítico</Text>
                                  </View>
                                )}
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[styles.stockCant, isLowStock && { color: '#EF4444' }]}>
                                  {item.cantidad} <Text style={{ fontSize: 12, color: '#64748B' }}>{item.unidad}</Text>
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    <Text style={[styles.sectionLabelPanel, { marginTop: 25 }]}>⏳ Historial Logístico Reciente</Text>
                    {historialCava.length === 0 ? (
                      <Text style={styles.emptyHistorial}>Sin trazabilidad de nube registrada.</Text>
                    ) : (
                      historialCava.map(mov => (
                        <View key={mov.id} style={styles.historialRow}>
                          <Icon name={mov.tipo_movimiento === 'ENTRADA' ? 'arrow-down-bold' : 'arrow-up-bold'} size={16} color={mov.tipo_movimiento === 'ENTRADA' ? '#059669' : '#EF4444'} />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.histProd}>{mov.producto}</Text>
                            <Text style={styles.histDate}>{new Date(mov.fecha).toLocaleString()}</Text>
                          </View>
                          <Text style={[styles.histCant, { color: mov.tipo_movimiento === 'ENTRADA' ? '#059669' : '#EF4444' }]}>
                            {mov.tipo_movimiento === 'ENTRADA' ? '+' : '-'}{mov.cantidad} {mov.unidad}
                          </Text>
                        </View>
                      ))
                    )}
                  </ScrollView>
                )}
                <TouchableOpacity style={styles.btnClose} activeOpacity={0.8} onPress={() => setCavaDetalleVisible(false)}>
                  <Text style={styles.btnCloseText}>CERRAR AUDITORÍA</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

// ESTILOS ALTAMENTE OPTIMIZADOS
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  // Encabezado con Píldora de Nube Minimalista
  header: { 
    backgroundColor: '#F0F9FF', 
    paddingTop: Platform.OS === 'ios' ? 60 : 25, 
    paddingHorizontal: 25, 
    paddingBottom: 25, 
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40, 
    elevation: 4,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    zIndex: 10 
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  headerSubTitle: { color: '#0284C7', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { color: '#0F172A', fontSize: 28, fontWeight: '900', letterSpacing: 0.2 },
  
  // Píldora de Nube (Reemplazo del Banner Ruidoso)
  cloudPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  pillOk: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  pillWork: { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' },
  pillPend: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  cloudPillTxt: { fontSize: 10, fontWeight: '800' },

  scrollMainContainer: { paddingBottom: 100 },
  
  resumenContainer: { paddingHorizontal: 20, marginTop: 15 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#64748B', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  scrollCavas: { flexDirection: 'row' },
  miniCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 18, width: 170, marginRight: 12, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  miniCardTitle: { fontWeight: '900', fontSize: 15, color: '#0F172A' },
  miniCardProd: { fontSize: 11, color: '#64748B', marginBottom: 8, fontWeight: '600' },
  miniBarraFondo: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  miniBarraProgreso: { height: '100%', borderRadius: 3 },
  miniCardCap: { fontSize: 11, color: '#94A3B8', marginTop: 6, fontWeight: '800' },
  
  formCard: { backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: 20, padding: 22, borderRadius: 24, elevation: 3, borderWidth: 1, borderColor: '#F1F5F9' },
  formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
  btnReset: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  btnResetTxt: { fontSize: 11, color: '#64748B', fontWeight: '700', marginLeft: 4 },

  label: { fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  labelSolo: { fontSize: 10, fontWeight: '800', color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  selectorPressable: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 15, height: 52, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  selectorText: { marginLeft: 10, color: '#0F172A', fontSize: 14, fontWeight: '800' },
  
  tabTipo: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, padding: 5, marginTop: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  btnTipo: { flex: 1, flexDirection: 'row', height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  btnActiveE: { backgroundColor: '#059669', elevation: 2 },
  btnActiveS: { backgroundColor: '#EF4444', elevation: 2 },
  textTipo: { fontSize: 12, fontWeight: '900', color: '#64748B', letterSpacing: 0.5 },
  
  input: { backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 15, height: 52, fontSize: 14, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0', fontWeight: '600' },
  inputSolo: { backgroundColor: '#F8FAFC', borderRadius: 14, height: 52, fontSize: 14, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0', textAlign: 'center', fontWeight: '600' },
  inputFocused: { borderColor: '#0284C7', backgroundColor: '#FFFFFF' },

  chipProd: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, marginRight: 8, borderWidth: 1, borderColor: '#E0F2FE' },
  chipProdActive: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  chipProdText: { color: '#0284C7', fontWeight: '800', fontSize: 12 },

  btnUnidad: { backgroundColor: '#F8FAFC', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  textUnidad: { fontWeight: '900', color: '#0F172A', fontSize: 13 },

  // Botones de Conteo Rápido Logístico
  fastCountingRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fastCountLabel: { fontSize: 11, color: '#64748B', fontWeight: '700' },
  fastCountingPills: { flexDirection: 'row' },
  pillCountBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginLeft: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  pillCountTxt: { fontSize: 12, fontWeight: '900', color: '#0284C7' },
  
  btnSave: { flexDirection: 'row', backgroundColor: '#0284C7', height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20, elevation: 3 },
  btnSaveText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13, letterSpacing: 0.8 },
  
  colaWrapper: { marginTop: 25, paddingHorizontal: 20 },
  colaTitle: { marginBottom: 10, fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  itemCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', marginBottom: 10, padding: 14, borderRadius: 18, alignItems: 'center', elevation: 1, borderWidth: 1, borderColor: '#F1F5F9' },
  itemIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemProd: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  itemMeta: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '500' },
  itemQty: { fontSize: 16, fontWeight: '900' },
  itemUnit: { fontSize: 11, color: '#94A3B8', fontWeight: '800' },
  
  // Modal de Inspección Premium
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 10 },
  sectionLabelPanel: { fontSize: 12, fontWeight: '800', color: '#64748B', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  searchModalBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 12, height: 44, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  searchModalInput: { flex: 1, fontSize: 13, color: '#0F172A' },

  stockBox: { backgroundColor: '#F8FAFC', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  stockRowPremium: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  stockProd: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  stockCant: { fontSize: 16, fontWeight: '900', color: '#0284C7' },
  badgeLowStock: { backgroundColor: '#FEF2F2', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 2, borderWidth: 1, borderColor: '#FECACA' },
  badgeLowStockTxt: { fontSize: 9, color: '#EF4444', fontWeight: '800' },
  
  historialRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  histProd: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  histDate: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  histCant: { fontSize: 14, fontWeight: '900' },
  emptyHistorial: { color: '#94A3B8', fontStyle: 'italic', marginTop: 5, fontSize: 13 },
  
  cavaOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cavaOptionName: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  cavaOptionSub: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  cavaOptionCap: { fontWeight: '900', color: '#0284C7', fontSize: 14 },
  
  btnClose: { marginTop: 20, height: 52, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 16 },
  btnCloseText: { color: '#EF4444', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }
});

export default InventarioScreen;