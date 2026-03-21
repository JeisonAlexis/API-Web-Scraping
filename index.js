const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ==================== RUTAS ====================

// Ruta raíz
app.get("/", (req, res) => {
  res.json({
    mensaje: "¡Hola desde mi servicio de Render!",
    endpoints_disponibles: [
      { metodo: "GET", ruta: "/recuperar-cuenta-sofia", descripcion: "Obtiene información sobre recuperación de contraseña en SOFIA Plus" },
      { metodo: "GET", ruta: "/oferta-academica-unipamplona", descripcion: "Obtiene la oferta académica de pregrado de la Universidad de Pamplona" }
    ]
  });
});

// Endpoint 1: SOFIA Plus - Recuperar contraseña
app.get("/recuperar-cuenta-sofia", async (req, res) => {
  console.log("📢 [SOFIA] Recibiendo solicitud...");
  
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "es-ES,es;q=0.9",
          "Accept-Encoding": "gzip, deflate, br"
        },
        timeout: 30000, // 30 segundos de timeout
        httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false }) // Ignorar errores SSL si es necesario
      }
    );

    const $ = cheerio.load(html);
    
    let pregunta = "";
    let respuesta = "";
    let encontrado = false;

    // Buscar en diferentes selectores posibles
    const selectoresPosibles = [".preg", ".pregunta", ".faq-item", ".accordion-item"];
    
    for (const selector of selectoresPosibles) {
      if (encontrado) break;
      
      $(selector).each((i, el) => {
        if (encontrado) return false;
        
        const titulo = $(el).find(".titulopregunta, .question, .pregunta-titulo, h3, h4").first().text().trim();
        const cuerpo = $(el).find(".respuesta, .answer, .respuesta-texto, .answer-content").first().text().trim();
        
        if (titulo && cuerpo && titulo.toLowerCase().includes("contraseña")) {
          pregunta = titulo;
          respuesta = cuerpo;
          encontrado = true;
          return false;
        }
      });
    }

    if (!encontrado) {
      throw new Error("No se encontró información sobre recuperación de contraseña");
    }

    console.log("✅ [SOFIA] Información extraída correctamente");
    
    res.json({
      exito: true,
      fuente: "SOFIA Plus - Preguntas Frecuentes",
      fecha_extraccion: new Date().toISOString(),
      pregunta: pregunta,
      respuesta: respuesta
    });
    
  } catch (error) {
    console.error("❌ [SOFIA] Error:", error.message);
    
    res.status(500).json({
      exito: false,
      error: "No se pudo obtener la información sobre recuperación de contraseña",
      detalle: error.message,
      sugerencia: "Verificar que la página de SOFIA Plus esté accesible"
    });
  }
});

// Endpoint 2: Universidad de Pamplona - Oferta Académica
app.get("/oferta-academica-unipamplona", async (req, res) => {
  console.log("📢 [UNIPAMPLONA] Recibiendo solicitud...");
  
  try {
    const { data: html } = await axios.get(
      "https://www.unipamplona.edu.co/unipamplona/portalIG/home_11/recursos/general/contenidos_subgeneral/inscripciones_presencial/04112009/oferta_academica.jsp",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "es-ES,es;q=0.9"
        },
        timeout: 30000,
        httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
      }
    );

    const $ = cheerio.load(html);
    const facultades = [];

    // Extraer todas las filas de la tabla
    $(".table-row-inscripciones, tr:has(td)").each((i, row) => {
      const $row = $(row);
      const $tds = $row.find("td");
      
      if ($tds.length < 2) return;
      
      const $facultadCell = $tds.first();
      const $programasCell = $tds.last();
      
      // Extraer nombre de facultad (sin elementos hijos como imágenes)
      const facultadNombre = $facultadCell
        .clone()
        .children()
        .remove()
        .end()
        .text()
        .trim()
        .replace(/\s+/g, " ");
      
      // Extraer icono si existe
      const facultadIcono = $facultadCell.find("img").attr("src");
      const facultadIconoCompleto = facultadIcono ? 
        (facultadIcono.startsWith("http") ? facultadIcono : `https://www.unipamplona.edu.co${facultadIcono}`) : null;
      
      const programas = [];
      
      // Extraer programas
      $programasCell.find(".list-item-oferta, li:has(.link-oferta)").each((j, programa) => {
        const $programa = $(programa);
        const $link = $programa.find(".link-oferta, a").first();
        
        if (!$link.length) return;
        
        const nombre = $link.text().trim();
        if (!nombre) return;
        
        let url = $link.attr("href") || null;
        if (url && !url.startsWith("http")) {
          url = url.startsWith("/") ? `https://www.unipamplona.edu.co${url}` : `https://www.unipamplona.edu.co/${url}`;
        }
        
        const infoText = $programa.find(".info-oferta, .info").text().trim();
        let sedes = [];
        let codigoSnies = null;
        
        if (infoText) {
          // Extraer código SNIES
          const sniesMatch = infoText.match(/COD SNIES\s*(\d+)/i);
          if (sniesMatch) {
            codigoSnies = sniesMatch[1];
          }
          
          // Extraer sedes (remover código SNIES y corchetes)
          let sedesText = infoText.replace(/\[.*?\]/g, "").trim();
          if (sedesText) {
            sedes = sedesText.split(/\s*y\s*|\s*,\s*/).map(s => s.trim()).filter(s => s);
          }
        }
        
        programas.push({
          nombre: nombre,
          url: url,
          sedes: sedes.length ? sedes : ["No especificada"],
          codigo_snies: codigoSnies
        });
      });
      
      if (facultadNombre && programas.length > 0) {
        facultades.push({
          facultad: facultadNombre,
          icono: facultadIconoCompleto,
          total_programas: programas.length,
          programas: programas
        });
      }
    });
    
    // Calcular estadísticas adicionales
    const totalProgramas = facultades.reduce((sum, f) => sum + f.total_programas, 0);
    
    // Contar programas por sede
    const sedeCount = {};
    facultades.forEach(facultad => {
      facultad.programas.forEach(programa => {
        programa.sedes.forEach(sede => {
          sedeCount[sede] = (sedeCount[sede] || 0) + 1;
        });
      });
    });
    
    console.log(`✅ [UNIPAMPLONA] Extraídas ${facultades.length} facultades con ${totalProgramas} programas`);
    
    res.json({
      exito: true,
      fuente: "Universidad de Pamplona - Oferta Académica Pregrado Presencial",
      fecha_extraccion: new Date().toISOString(),
      resumen: {
        total_facultades: facultades.length,
        total_programas: totalProgramas,
        programas_por_sede: sedeCount
      },
      facultades: facultades
    });
    
  } catch (error) {
    console.error("❌ [UNIPAMPLONA] Error:", error.message);
    
    res.status(500).json({
      exito: false,
      error: "No se pudo obtener la oferta académica",
      detalle: error.message,
      sugerencia: "Verificar que la página de la Universidad de Pamplona esté accesible"
    });
  }
});

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    mensaje: `La ruta ${req.method} ${req.url} no existe en este servidor`,
    endpoints_disponibles: [
      "/",
      "/recuperar-cuenta-sofia",
      "/oferta-academica-unipamplona"
    ]
  });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error("❌ Error no manejado:", err);
  res.status(500).json({
    error: "Error interno del servidor",
    mensaje: err.message
  });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`\n🚀 Servidor iniciado correctamente`);
  console.log(`📡 Puerto: ${port}`);
  console.log(`🌐 URL base: http://localhost:${port}`);
  console.log(`\n📋 Endpoints disponibles:`);
  console.log(`   GET  /`);
  console.log(`   GET  /recuperar-cuenta-sofia`);
  console.log(`   GET  /oferta-academica-unipamplona`);
  console.log(`\n✅ Servidor listo para recibir peticiones\n`);
});

// Exportar para pruebas
module.exports = app;