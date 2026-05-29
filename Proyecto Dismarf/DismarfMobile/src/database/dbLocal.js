import SQLite from 'react-native-sqlite-storage';

const db = SQLite.openDatabase({ name: 'DismarfOffline.db', location: 'default' });

export const initDB = () => {
  db.transaction((tx) => {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS inventario_local (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cava_id INTEGER,
        producto TEXT,
        tipo_movimiento TEXT,
        cantidad REAL,
        unidad TEXT,           -- NUEVO
        capacidad_nueva INTEGER, -- NUEVO
        fecha TEXT
      );`
    );
  });
};

export const guardarMovimientoOffline = (cava_id, producto, tipo, cantidad, unidad, capacidad_nueva) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'INSERT INTO inventario_local (cava_id, producto, tipo_movimiento, cantidad, unidad, capacidad_nueva, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [cava_id, producto, tipo, cantidad, unidad, capacidad_nueva, new Date().toISOString()],
        (_, results) => resolve(results),
        (_, error) => reject(error)
      );
    });
  });
};

export const obtenerMovimientosOffline = () => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql('SELECT * FROM inventario_local ORDER BY id DESC', [], (_, results) => {
        let items = [];
        for (let i = 0; i < results.rows.length; i++) {
          items.push(results.rows.item(i));
        }
        resolve(items);
      });
    });
  });
};

export const eliminarMovimientoSincronizado = (id) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql('DELETE FROM inventario_local WHERE id = ?', [id], (_, res) => resolve(res));
    });
  });
};