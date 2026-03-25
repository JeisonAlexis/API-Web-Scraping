const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');


const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


app.get("/oferta-pregrado-presencial-unipamplona", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://www.unipamplona.edu.co/unipamplona/portalIG/home_11/recursos/general/contenidos_subgeneral/inscripciones_presencial/21042014/ofertaacademica_2016.jsp",
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    const $ = cheerio.load(html);
    const resultado = [];

    $(".table-row-inscripciones").each((i, el) => {
      const facultad = $(el)
        .find("td")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim();

      const programas = [];

      $(el)
        .find(".list-item-oferta")
        .each((j, item) => {
          const nombre = $(item)
            .find(".link-oferta")
            .text()
            .replace(/\s+/g, " ")
            .trim();

          let info = $(item)
            .find(".info-oferta")
            .text()
            .replace(/\s+/g, " ")
            .trim();

          info = info.replace(/\[.*?\]/g, "").trim();

          let url = $(item).find(".link-oferta").attr("href");

          if (url && url.startsWith("/")) {
            url = "https://www.unipamplona.edu.co" + url;
          }

          programas.push({
            nombre,
            info,
            url,
          });
        });

      if (facultad && programas.length > 0) {
        resultado.push({
          facultad,
          programas,
        });
      }
    });

    res.json(resultado);
  } catch (error) {
    console.error("❌ Error scraping:", error.message);
    res.status(500).json({
      error: "No se pudo obtener la oferta académica",
    });
  }
});

app.get("/oferta-pregrado-distancia-unipamplona", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://www.unipamplona.edu.co/unipamplona/portalIG/home_11/recursos/general/contenidos_subgeneral/inscripciones_distancia/20052010/oferta_distancia.jsp",
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    const $ = cheerio.load(html);
    const resultado = [];

    $(".table-row-inscripciones").each((i, el) => {
      const facultad = $(el)
        .find("td")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim();

      const programas = [];

      $(el)
        .find(".list-item-oferta")
        .each((j, item) => {
          const nombre = $(item)
            .find(".link-oferta")
            .text()
            .replace(/\s+/g, " ")
            .trim();

          let info = $(item)
            .find(".info-oferta")
            .text()
            .replace(/\s+/g, " ")
            .trim();


          info = info.replace(/\[.*?\]/g, "").trim();

          let url = $(item).find(".link-oferta").attr("href");

          if (url && url.startsWith("/")) {
            url = "https://www.unipamplona.edu.co" + url;
          }

          programas.push({
            nombre,
            info,
            url,
          });
        });

      if (facultad && programas.length > 0) {
        resultado.push({
          facultad,
          programas,
        });
      }
    });

    res.json(resultado);

  } catch (error) {
    console.error("❌ Error scraping distancia:", error.message);
    res.status(500).json({
      error: "No se pudo obtener la oferta a distancia",
    });
  }
});


app.get("/oferta-posgrados-unipamplona", async (req, res) => {
  try {
    const urlFuente = "https://www.unipamplona.edu.co/unipamplona/portalIG/home_11/recursos/general/postgrados/01022011/oferta_academica_posgrados.jsp";

    const { data: html } = await axios.get(urlFuente, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(html);

    let imagen = $("#pagcontenido img").first().attr("src");

    if (imagen && imagen.startsWith("/")) {
      imagen = "https://www.unipamplona.edu.co" + imagen;
    }

    if (!imagen) {
      throw new Error("No se encontró la imagen de posgrados");
    }

    res.json({
      fuente: urlFuente,
      imagen
    });

  } catch (error) {
    console.error("❌ Error scraping posgrados:", error.message);
    res.status(500).json({
      error: "No se pudo obtener la oferta de posgrados",
    });
  }
});

// Directorio para guardar imágenes
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Dominio base de la API
const API_BASE_URL = process.env.API_BASE_URL || 'https://api-web-scraping-vi1c.onrender.com';

// Asegurar que el directorio de uploads existe
async function ensureUploadsDir() {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

// Función para guardar imagen base64 y retornar URL completa
async function guardarImagenBase64(base64Data, nombreDocente) {
  if (!base64Data || !base64Data.startsWith('data:image')) return base64Data;
  
  try {
    // Extraer tipo y datos
    const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) return base64Data;
    
    const extension = matches[1];
    const base64 = matches[2];
    const buffer = Buffer.from(base64, 'base64');
    
    // Generar nombre de archivo único basado en el nombre del docente
    const nombreLimpio = nombreDocente
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50);
    const hash = crypto.createHash('md5').update(base64Data).digest('hex').substring(0, 8);
    const filename = `${nombreLimpio}_${hash}.${extension}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    
    // Guardar en disco
    await fs.writeFile(filepath, buffer);
    
    // Retornar URL completa
    return `${API_BASE_URL}/uploads/${filename}`;
    
  } catch (error) {
    console.error('Error al guardar imagen base64:', error.message);
    return base64Data;
  }
}

app.get("/docentes-ingsistemas-pamplona", async (req, res) => {
  try {
    await ensureUploadsDir();
    
    const urlFuente = "https://www.unipamplona.edu.co/unipamplona/portalIG/home_77/recursos/01general/07072024/04_docentes_pamplona.jsp";

    const { data: html } = await axios.get(urlFuente, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(html);

    const docentes = {
      tiempoCompleto: [],
      tiempoCompletoOcasionalCatedra: [],
      catedraServicio: [],
      catedraPrograma: []
    };

    const extraerDocente = async (row, nombreDocenteParaImagen) => {
      const celdas = $(row).find("td");
      if (celdas.length < 2) return null;

      const infoText = $(celdas[0]).text().trim();
      const imgSrc = $(celdas[1]).find("img").attr("src");

      // Extraer nombre - buscar el texto en <strong> o la primera línea
      let nombre = "";
      const strongText = $(celdas[0]).find("strong").first().text().trim();
      if (strongText) {
        nombre = strongText;
      } else {
        const lines = infoText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.includes('Resolución') && !trimmed.includes('Profesor') && 
              !trimmed.includes('Registro') && !trimmed.includes('Contacto') && !trimmed.includes('Campus')) {
            nombre = trimmed;
            break;
          }
        }
      }
      
      nombre = nombre.replace(/<\/?strong>/g, "").trim();

      // Extraer resolución
      const resolucionMatch = infoText.match(/Resoluci[óo]n\s*(\d+)\s*-\s*([A-Za-z]+\s*\d{4})/i);
      const resolucion = resolucionMatch ? resolucionMatch[0] : "";

      // Extraer título académico
      const tituloMatch = infoText.match(/(Ph\.D\.|M\.Sc\.|Esp\.|Ing\.)\s*\.?\s*([^<]+)/i);
      const titulo = tituloMatch ? tituloMatch[0] : "";

      // Extraer cargo - buscar patrón "Profesor X - Acuerdo"
      const cargoMatch = infoText.match(/Profesor\s*([A-Za-z\s]+)\s*-\s*Acuerdo/i);
      const cargo = cargoMatch ? `Profesor ${cargoMatch[1].trim()}` : "";

      // Extraer CvLAC - buscar enlace dentro del texto
      let cvlac = "";
      // Buscar cualquier href que contenga scienti.minciencias.gov.co
      const cvlacRegex = /https?:\/\/scienti\.minciencias\.gov\.co\/[^\s"']+/i;
      const cvlacMatch = infoText.match(cvlacRegex);
      if (cvlacMatch) {
        cvlac = cvlacMatch[0];
      }
      // Si no se encontró con la regex, buscar en el HTML original
      if (!cvlac) {
        const htmlContent = $(celdas[0]).html();
        const htmlCvlacMatch = htmlContent.match(/href="(https?:\/\/scienti\.minciencias\.gov\.co\/[^"]+)"/i);
        if (htmlCvlacMatch) {
          cvlac = htmlCvlacMatch[1];
        }
      }

      // Extraer email
      const emailMatch = infoText.match(/Contacto:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      const email = emailMatch ? emailMatch[1] : "";

      // Extraer campus
      const campusMatch = infoText.match(/Campus:\s*([A-Za-z\s]+)/i);
      const campus = campusMatch ? campusMatch[1].trim() : "";

      // Procesar imagen - convertir base64 a archivo si es necesario
      let imagen = imgSrc || "";
      if (imagen && imagen.startsWith("data:image")) {
        // Convertir base64 a archivo y obtener URL completa
        imagen = await guardarImagenBase64(imagen, nombre || nombreDocenteParaImagen || 'docente');
      } else if (imagen && imagen.startsWith("/")) {
        imagen = "https://www.unipamplona.edu.co" + imagen;
      } else if (imagen && !imagen.startsWith("http")) {
        imagen = "https://www.unipamplona.edu.co/unipamplona/portalIG/home_77/recursos/imagenes/" + imagen;
      }

      return {
        nombre,
        titulo,
        cargo,
        resolucion,
        cvlac,
        email,
        campus,
        imagen
      };
    };

    const contenido = $("#texto");

    // Extraer Docentes Tiempo Completo
    const tiempoCompletoRows = contenido.find("table").first().find("tbody tr");
    for (const row of tiempoCompletoRows) {
      const docente = await extraerDocente(row, 'tiempo_completo');
      if (docente && docente.nombre) {
        docentes.tiempoCompleto.push(docente);
      }
    }

    // Extraer Docentes Tiempo Completo Ocasional y Cátedra
    const headers = contenido.find("h1");
    let ocasionalTable = null;
    
    headers.each((i, header) => {
      const headerText = $(header).text();
      if (headerText.includes("Docentes Tiempo Completo Ocasional y Cátedra")) {
        ocasionalTable = $(header).next("table");
        return false;
      }
    });

    if (ocasionalTable && ocasionalTable.length) {
      const ocasionalRows = ocasionalTable.find("tbody tr");
      for (const row of ocasionalRows) {
        const docente = await extraerDocente(row, 'ocasional');
        if (docente && docente.nombre) {
          docentes.tiempoCompletoOcasionalCatedra.push(docente);
        }
      }
    }

    // Extraer Cátedras del Programa
    let catedraProgramaList = [];
    headers.each((i, header) => {
      const headerText = $(header).text();
      if (headerText.includes("Profesores Hora Cátedra")) {
        const nextH3 = $(header).next("h3");
        if (nextH3.text().includes("En el Programa")) {
          const parrafo = nextH3.next("p");
          const texto = parrafo.text().trim();
          if (texto && texto !== "No hay cátedras") {
            catedraProgramaList = texto.split("\n").map(l => l.trim()).filter(l => l);
          }
        }
      }
    });

    docentes.catedraPrograma = catedraProgramaList;

    // Extraer Cátedras de Servicio
    let catedraServicioList = [];
    headers.each((i, header) => {
      const headerText = $(header).text();
      if (headerText.includes("Profesores Hora Cátedra")) {
        const nextH3 = $(header).next("h3");
        if (nextH3.text().includes("Cátedras de Servicio - Pamplona")) {
          const lista = nextH3.next("ol");
          if (lista.length) {
            lista.find("li").each((j, li) => {
              catedraServicioList.push($(li).text().trim());
            });
          }
        }
      }
    });

    // También buscar "Ocasionales Cátedra de Servicio - Pamplona"
    headers.each((i, header) => {
      const headerText = $(header).text();
      if (headerText.includes("Ocasionales Cátedra de Servicio - Pamplona")) {
        const lista = $(header).next("ol");
        if (lista.length) {
          lista.find("li").each((j, li) => {
            catedraServicioList.push($(li).text().trim());
          });
        }
      }
    });

    docentes.catedraServicio = [...new Set(catedraServicioList)];

    res.json({
      fuente: urlFuente,
      docentes
    });

  } catch (error) {
    console.error("❌ Error scraping docentes:", error.message);
    res.status(500).json({
      error: "No se pudo obtener la información de docentes",
      mensaje: error.message
    });
  }
});

// Servir archivos estáticos para las imágenes guardadas
app.use('/uploads', express.static(UPLOADS_DIR));

app.use((err, req, res, next) => {
  console.error("❌ Error no manejado:", err);
  res.status(500).json({
    error: "Error interno del servidor",
    mensaje: err.message
  });
});


app.listen(port, () => {
  console.log(`\nServidor iniciado correctamente`);
  console.log(`Puerto: ${port}`);
  console.log(`URL base: http://localhost:${port}`);
  console.log(`\nervidor listo para recibir peticiones\n`);
});
