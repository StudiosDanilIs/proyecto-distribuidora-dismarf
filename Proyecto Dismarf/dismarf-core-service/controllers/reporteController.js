const PDFDocument = require('pdfkit');
const db = require('../db');

const textoSeguro = (valor, fallback = 'N/A') => {
    if (valor === null || valor === undefined || valor === '') return fallback;
    return String(valor);
};

const dibujarEstructuraPagina = (doc, titulo, filtrosTxt) => {
    doc.rect(40, 40, 532, 55).fill('#0F172A');
    doc.rect(40, 40, 6, 55).fill('#0284C7');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(16).text('DISMARF S.A.', 60, 52);
    doc.font('Helvetica').fontSize(9).fillColor('#94A3B8').text('Sistemas Integrados de Distribución Alimentaria', 60, 72);
    
    // Título seguro
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(12).text(textoSeguro(titulo), 250, 52, { align: 'right', width: 310 });
    doc.font('Helvetica-Oblique').fontSize(8).fillColor('#38BDF8').text(`Filtros: ${textoSeguro(filtrosTxt)}`, 250, 72, { align: 'right', width: 310 });
    doc.rect(40, 110, 532, 1).fill('#E2E8F0');
};

const dibujarFooterGlobal = (doc) => {
    const paginas = doc.bufferedPageRange();
    for (let i = 0; i < paginas.count; i++) {
        doc.switchToPage(i);
        doc.rect(40, 740, 532, 1).fill('#CBD5E1');
        doc.fillColor('#94A3B8').font('Helvetica-Bold').fontSize(8).text('DOCUMENTO CONFIDENCIAL AUDITADO POR STUDIOS DANIELS', 40, 750, { align: 'left' });
        doc.font('Helvetica').text(`Página ${i + 1} de ${paginas.count}`, 40, 750, { align: 'right', width: 532 });
    }
};

const procesarFiltrosCronologicos = (periodo, columnaFecha = 'fecha') => {
    let sqlSnippet = '';
    let descripcion = 'Historial Completo';
    if (periodo === 'dia') { sqlSnippet = ` AND ${columnaFecha} >= CURRENT_DATE`; descripcion = 'Últimas 24 Horas'; } 
    else if (periodo === 'semana') { sqlSnippet = ` AND ${columnaFecha} >= CURRENT_DATE - INTERVAL '7 days'`; descripcion = 'Últimos 7 Días'; } 
    else if (periodo === 'mes') { sqlSnippet = ` AND ${columnaFecha} >= CURRENT_DATE - INTERVAL '30 days'`; descripcion = 'Últimos 30 Días'; }
    return { sqlSnippet, descripcion };
};

exports.reporteInventario = async (req, res) => {
    try {
        const { periodo, cavaId } = req.query;
        let queryParams = [];
        let sql = `SELECT mi.producto, mi.cantidad, mi.unidad, c.nombre as cava, mi.fecha FROM movimientos_inventario mi JOIN cavas c ON mi.cava_id = c.id WHERE 1=1`;

        if (cavaId && cavaId !== 'todas') {
            queryParams.push(parseInt(cavaId));
            sql += ` AND c.id = $${queryParams.length}`;
        }

        const filtroTiempo = procesarFiltrosCronologicos(periodo, 'mi.fecha');
        sql += filtroTiempo.sqlSnippet + ` ORDER BY mi.producto ASC`;

        const result = await db.query(sql, queryParams);

        // Iniciamos el Stream al cliente
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=Inventario_Dismarf.pdf');
        const doc = new PDFDocument({ margin: 40, bufferPages: true, size: 'LETTER' });
        doc.pipe(res);

        const filtroAplicadoTxt = `Cavas: ${textoSeguro(cavaId).toUpperCase()} | Rango: ${filtroTiempo.descripcion}`;
        dibujarEstructuraPagina(doc, 'REPORTE DE EXISTENCIAS DISPONIBLES', filtroAplicadoTxt);

        doc.rect(40, 125, 532, 45).fill('#F8FAFC');
        doc.rect(40, 125, 532, 1).fill('#E2E8F0');
        doc.rect(40, 169, 532, 1).fill('#E2E8F0');
        
        doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(8).text('TOTAL ÍTEMS EVALUADOS', 55, 135);
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(14).text(`${result.rows.length}`, 55, 148);

        doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(8).text('FECHA DE AUDITORÍA', 400, 135, { align: 'right', width: 150 });
        doc.fillColor('#0284C7').font('Helvetica-Bold').fontSize(11).text(new Date().toLocaleDateString(), 400, 148, { align: 'right', width: 150 });

        let currentY = 190;
        doc.rect(40, currentY, 532, 22).fill('#0F172A');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9)
           .text('DESCRIPCIÓN DEL PRODUCTO', 55, currentY + 7)
           .text('VOLUMEN', 310, currentY + 7)
           .text('CUBÍCULO ASIGNADO', 440, currentY + 7);

        currentY += 22;
        let esZebra = false;

        result.rows.forEach((row) => {
            if (currentY > 670) {
                doc.addPage();
                dibujarEstructuraPagina(doc, 'REPORTE DE EXISTENCIAS (Cont.)', filtroAplicadoTxt);
                currentY = 130;
            }

            doc.rect(40, currentY, 532, 22).fill(esZebra ? '#F8FAFC' : '#FFFFFF');
            doc.rect(40, currentY + 21, 532, 0.5).fill('#E2E8F0');

            doc.fillColor('#334155').font('Helvetica').fontSize(9).text(textoSeguro(row.producto), 55, currentY + 7);
            doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9).text(`${textoSeguro(row.cantidad, '0')} ${textoSeguro(row.unidad, 'U')}`, 310, currentY + 7);
            doc.fillColor('#64748B').font('Helvetica').fontSize(9).text(textoSeguro(row.cava), 440, currentY + 7);

            currentY += 22; esZebra = !esZebra;
        });

        dibujarFooterGlobal(doc);
        doc.end();
    } catch (error) { 
        console.error("Error PDF Inventario:", error);
        if (!res.headersSent) res.status(500).json({ error: 'Error interno compilando el PDF de Inventario' }); 
    }
};

exports.reporteBitacora = async (req, res) => {
    try {
        const { periodo } = req.query;
        let sql = `SELECT * FROM bitacora WHERE 1=1`;
        const filtroTiempo = procesarFiltrosCronologicos(periodo, 'fecha');
        sql += filtroTiempo.sqlSnippet + ` ORDER BY fecha DESC LIMIT 100`;

        const result = await db.query(sql);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=Bitacora_Dismarf.pdf');
        const doc = new PDFDocument({ margin: 40, bufferPages: true, size: 'LETTER' });
        doc.pipe(res);

        const filtroAplicadoTxt = `Rango Temporal: ${filtroTiempo.descripcion}`;
        dibujarEstructuraPagina(doc, 'HISTORIAL GENERAL DE ACCIONES', filtroAplicadoTxt);

        let currentY = 130;

        result.rows.forEach((log) => {
            if (currentY > 690) {
                doc.addPage();
                dibujarEstructuraPagina(doc, 'REGISTRO DE AUDITORÍA (Cont.)', filtroAplicadoTxt);
                currentY = 130;
            }

            const fechaStr = log.fecha ? new Date(log.fecha).toLocaleString() : 'N/A';
            doc.circle(50, currentY + 6, 3.5).fill('#0284C7');
            doc.rect(49.5, currentY + 95, 1, 20).fill('#E2E8F0'); 

            doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(8.5).text(fechaStr, 68, currentY + 2);
            doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9.5).text(`Operador: ${textoSeguro(log.nombre_usuario, 'Sistema')}`, 180, currentY + 1);
            doc.fillColor('#334155').font('Helvetica').fontSize(9).text(textoSeguro(log.detalle, 'Sin observaciones registradas.'), 68, currentY + 14, { width: 490 });

            currentY += 32;
        });

        dibujarFooterGlobal(doc);
        doc.end();
    } catch (error) { 
        console.error("Error PDF Bitácora:", error);
        if (!res.headersSent) res.status(500).json({ error: 'Fallo compilando bitácora.' }); 
    }
};

exports.reporteCavas = async (req, res) => {
    try {
        const { cavaId } = req.query;
        let queryParams = [];
        let sql = `SELECT * FROM cavas WHERE 1=1`;

        if (cavaId && cavaId !== 'todas') {
            queryParams.push(parseInt(cavaId));
            sql += ` AND id = $1`;
        }
        sql += ` ORDER BY id ASC`;
        const result = await db.query(sql, queryParams);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=Cadena_Frio.pdf');
        const doc = new PDFDocument({ margin: 40, bufferPages: true, size: 'LETTER' });
        doc.pipe(res);

        const filtroAplicadoTxt = `Cavas Solicitadas: ${textoSeguro(cavaId).toUpperCase()}`;
        dibujarEstructuraPagina(doc, 'INSPECCIÓN TÉRMICA DE CUADRILLA', filtroAplicadoTxt);

        let currentY = 130;

        result.rows.forEach((cava) => {
            if (currentY > 640) {
                doc.addPage();
                dibujarEstructuraPagina(doc, 'CADENA DE FRÍO (Cont.)', filtroAplicadoTxt);
                currentY = 130;
            }

            doc.roundedRect(40, currentY, 532, 70, 6).lineWidth(1).stroke('#E2E8F0');
            doc.rect(41, currentY + 1, 4, 68).fill(cava.estado ? '#10B981' : '#EF4444'); 

            doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text(textoSeguro(cava.nombre, 'EQUIPO SIN NOMBRE').toUpperCase(), 60, currentY + 12);
            doc.fillColor('#475569').font('Helvetica').fontSize(9)
               .text(`Área de Trabajo: ${textoSeguro(cava.ubicacion)}`, 60, currentY + 30)
               .text(`Matriz Crítica: ${textoSeguro(cava.tipo_producto)}`, 60, currentY + 44);

            doc.rect(380, currentY + 10, 180, 50).fill('#F8FAFC');
            doc.roundedRect(380, currentY + 10, 180, 50, 4).lineWidth(0.5).stroke('#CBD5E1');

            doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(7.5).text('LÍMITES DE SEGURIDAD', 390, currentY + 18);
            doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text(`${textoSeguro(cava.temp_min)}°C a ${textoSeguro(cava.temp_max)}°C`, 390, currentY + 28);
            
            doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(7.5).text('CARGA TOTAL', 495, currentY + 18);
            doc.fillColor('#0284C7').font('Helvetica-Bold').fontSize(10).text(`${textoSeguro(cava.capacidad_ocupada, 0)}% Cap.`, 495, currentY + 28);

            currentY += 82; 
        });

        if (currentY < 600) {
            doc.lineCap('butt').moveTo(216, 680).lineTo(396, 680).lineWidth(1).stroke('#64748B');
            doc.fillColor('#64748B').font('Helvetica').fontSize(8.5).text('Firma Autorizada de Operación', 216, 688, { align: 'center', width: 180 });
        }

        dibujarFooterGlobal(doc);
        doc.end();
    } catch (error) { 
        console.error("Error PDF Cavas:", error);
        if (!res.headersSent) res.status(500).json({ error: 'Fallo compilando reporte térmico.' }); 
    }
};