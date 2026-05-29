// controllers/reporteController.js
const PDFDocument = require('pdfkit');
const db = require('../db');

// Función auxiliar para dibujar la cabecera corporativa en cada página
const generarHeader = (doc, titulo) => {
    doc.rect(0, 0, 612, 85).fill('#002A5C'); // Azul corporativo Dismarf
    doc.fillColor('#FFFFFF').fontSize(18).text('DISMARF LOGÍSTICA', 40, 25, { bold: true });
    doc.fontSize(10).text('Sistema Central de Monitoreo e Inventario', 40, 50);
    doc.fontSize(14).text(titulo, 350, 35, { align: 'right', bold: true });
    doc.fillColor('#0F172A'); // Restaurar color de texto principal
};

// Función auxiliar para numerar páginas dinámicamente al final del búfer
const generarFooter = (doc) => {
    const paginas = doc.bufferedPageRange();
    for (let i = 0; i < paginas.count; i++) {
        doc.switchToPage(i);
        doc.rect(0, 750, 612, 42).fill('#F8FAFC');
        doc.fillColor('#64748B').fontSize(9).text(
            `Documento Oficial Dismarf • Studios Daniels • Página ${i + 1} de ${paginas.count}`,
            40, 765, { align: 'center' }
        );
    }
};

// Función auxiliar para inyectar cabeceras y evitar respuestas 304 silenciosas
const inyectarCabecerasPDF = (res, filename) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${filename}`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
};

// ====================================================================
// 1. REPORTE DE INVENTARIO (MULTIPÁGINA AUTOMÁTICO CON RESPALDO SQL)
// ====================================================================
exports.reporteInventario = async (req, res) => {
    try {
        let result;
        try {
            // Intento principal consultando la tabla de movimientos
            result = await db.query(`
                SELECT mi.producto, mi.cantidad, mi.unidad, c.nombre as cava 
                FROM movimientos_inventario mi
                JOIN cavas c ON mi.cava_id = c.id
                ORDER BY mi.producto ASC
            `);
        } catch (errSql) {
            // Respaldo automático por si la tabla principal se llama 'inventario'
            console.log("Auditoría - Leyendo inventario desde tabla de respaldo...");
            result = await db.query(`
                SELECT i.producto, i.cantidad, i.unidad, c.nombre as cava 
                FROM inventario i
                JOIN cavas c ON i.cava_id = c.id
                ORDER BY i.producto ASC
            `);
        }

        const doc = new PDFDocument({ margin: 40, bufferPages: true });
        inyectarCabecerasPDF(res, 'Inventario_Dismarf.pdf');
        doc.pipe(res);

        generarHeader(doc, 'INVENTARIO ACTUAL');
        doc.moveDown(3);

        // Encabezados de la tabla
        doc.fillColor('#0F172A').fontSize(11)
           .text('Producto Almacenado', 40, doc.y, { continued: true, bold: true })
           .text('Cantidad', 280, doc.y, { continued: true, bold: true })
           .text('Cava / Ubicación', 420, doc.y, { bold: true });
        
        doc.moveDown(0.5);
        doc.rect(40, doc.y, 532, 1).fill('#CBD5E1');
        doc.moveDown(1);

        result.rows.forEach((row) => {
            // Salto de hoja controlado automáticamente
            if (doc.y > 680) {
                doc.addPage();
                generarHeader(doc, 'INVENTARIO ACTUAL (Cont.)');
                doc.moveDown(3);
            }

            doc.fillColor('#334155').fontSize(10)
               .text(row.producto || 'Desconocido', 40, doc.y, { continued: true })
               .fillColor('#0284C7').text(`${row.cantidad || 0} ${row.unidad || 'U'}`, 280, doc.y, { continued: true, bold: true })
               .fillColor('#64748B').text(row.cava || 'General', 420, doc.y);
            
            doc.moveDown(0.8);
            doc.rect(40, doc.y, 532, 0.5).fill('#F1F5F9');
            doc.moveDown(0.5);
        });

        generarFooter(doc);
        doc.end();
    } catch (error) { 
        console.error("Error crítico al emitir PDF Inventario:", error);
        res.status(500).json({ error: 'Fallo al procesar el documento PDF.' }); 
    }
};

// ====================================================================
// 2. REPORTE DE BITÁCORA (AUDITORÍA)
// ====================================================================
exports.reporteBitacora = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM bitacora ORDER BY fecha DESC LIMIT 100');
        const doc = new PDFDocument({ margin: 40, bufferPages: true });
        inyectarCabecerasPDF(res, 'Auditoria_Dismarf.pdf');
        doc.pipe(res);

        generarHeader(doc, 'REPORTE DE AUDITORÍA');
        doc.moveDown(3);

        result.rows.forEach((log) => {
            if (doc.y > 680) {
                doc.addPage();
                generarHeader(doc, 'REPORTE DE AUDITORÍA (Cont.)');
                doc.moveDown(3);
            }

            const fechaStr = log.fecha ? new Date(log.fecha).toLocaleString() : 'Fecha N/A';
            doc.fillColor('#64748B').fontSize(9).text(`[${fechaStr}] `, { continued: true });
            doc.fillColor('#0F172A').text(`${log.nombre_usuario || 'Sistema'}: `, { continued: true, bold: true });
            doc.fillColor('#334155').text(`${log.detalle || 'Sin registros'}`);
            doc.moveDown(0.5);
        });

        generarFooter(doc);
        doc.end();
    } catch (error) { 
        console.error("Error crítico al emitir PDF Bitácora:", error);
        res.status(500).send(error.message); 
    }
};

// ====================================================================
// 3. REPORTE DE CADENA DE FRÍO
// ====================================================================
exports.reporteCavas = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM cavas ORDER BY id ASC');
        const doc = new PDFDocument({ margin: 40, bufferPages: true });
        inyectarCabecerasPDF(res, 'ControlFrio_Dismarf.pdf');
        doc.pipe(res);

        generarHeader(doc, 'CONTROL DE FRÍO');
        doc.moveDown(3);

        result.rows.forEach((cava) => {
            if (doc.y > 650) { 
                doc.addPage(); 
                generarHeader(doc, 'CONTROL DE FRÍO (Cont.)');
                doc.moveDown(3); 
            }

            const colorEstado = cava.estado ? '#10B981' : '#EF4444';

            doc.fillColor(colorEstado).fontSize(13).text(`● ${cava.nombre || 'Equipo'}`, { bold: true });
            doc.moveDown(0.2);
            doc.fillColor('#334155').fontSize(10).text(`Ubicación: ${cava.ubicacion || 'N/A'} | Producto: ${cava.tipo_producto || 'General'}`);
            doc.fillColor('#64748B').fontSize(9).text(`Rango Seguro: ${cava.temp_min || 0}°C a ${cava.temp_max || 0}°C | Ocupación: ${cava.capacidad_ocupada || 0}%`);
            doc.moveDown(1);
        });

        generarFooter(doc);
        doc.end();
    } catch (error) { 
        console.error("Error crítico al emitir PDF Cavas:", error);
        res.status(500).send(error.message); 
    }
};