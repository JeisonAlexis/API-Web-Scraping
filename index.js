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

const UPLOADS_DIR = path.join(__dirname, 'uploads');

const API_BASE_URL = process.env.API_BASE_URL || 'https://api-web-scraping-vi1c.onrender.com';

async function ensureUploadsDir() {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

async function guardarImagenBase64(base64Data, nombreDocente) {
  if (!base64Data || !base64Data.startsWith('data:image')) return base64Data;
  
  try {
    const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) return base64Data;
    
    const extension = matches[1];
    const base64 = matches[2];
    const buffer = Buffer.from(base64, 'base64');
    
    const nombreLimpio = nombreDocente
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50);
    const hash = crypto.createHash('md5').update(base64Data).digest('hex').substring(0, 8);
    const filename = `${nombreLimpio}_${hash}.${extension}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    
    await fs.writeFile(filepath, buffer);
    
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
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $ = cheerio.load(html);

    const docentes = {
      tiempoCompleto: [],
      tiempoCompletoOcasionalCatedra: [],
      catedraServicio: [],
      catedraPrograma: []
    };

    const extraerDocente = async (row, fallbackNombre = 'docente') => {
      const celdas = $(row).find("td");
      if (celdas.length < 2) return null;

      const infoText = $(celdas[0]).text().trim();
      const imgSrc = $(celdas[1]).find("img").attr("src");

      let nombre = $(celdas[0]).find("strong").first().text().trim();

      if (!nombre) {
        const lines = infoText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (
            trimmed &&
            !trimmed.includes('Resolución') &&
            !trimmed.includes('Profesor') &&
            !trimmed.includes('Registro') &&
            !trimmed.includes('Contacto') &&
            !trimmed.includes('Campus')
          ) {
            nombre = trimmed;
            break;
          }
        }
      }

      const resolucionMatch = infoText.match(/Resoluci[óo]n\s*(\d+)\s*-\s*([A-Za-z]+\s*\d{4})/i);
      const resolucion = resolucionMatch ? resolucionMatch[0] : "";

      const tituloMatch = infoText.match(/(Ph\.D\.|M\.Sc\.|Esp\.|Ing\.)\s*\.?\s*([^<]+)/i);
      const titulo = tituloMatch ? tituloMatch[0] : "";

      const cargoMatch = infoText.match(/Profesor\s*([A-Za-z\s]+)\s*-\s*Acuerdo/i);
      const cargo = cargoMatch ? `Profesor ${cargoMatch[1].trim()}` : "";

      const cvlacMatch = infoText.match(/https?:\/\/scienti\.minciencias\.gov\.co\/[^\s"']+/i);
      const cvlac = cvlacMatch ? cvlacMatch[0] : "";

      const emailMatch = infoText.match(/Contacto:\s*([^\s]+)/i);
      const email = emailMatch ? emailMatch[1] : "";

      const campusMatch = infoText.match(/Campus:\s*([A-Za-z\s]+)/i);
      const campus = campusMatch ? campusMatch[1].trim() : "";

      let imagen = imgSrc || "";

      if (imagen && imagen.startsWith("data:image")) {
        imagen = await guardarImagenBase64(imagen, nombre || fallbackNombre);
      } else if (imagen && imagen.startsWith("/")) {
        imagen = "https://www.unipamplona.edu.co" + imagen;
      } else if (imagen && imagen && !imagen.startsWith("http")) {
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

    // Tiempo completo
    const tiempoCompletoRows = contenido.find("table").first().find("tbody tr");
    for (const row of tiempoCompletoRows) {
      const docente = await extraerDocente(row, 'tiempo_completo');
      if (docente && docente.nombre) {
        docentes.tiempoCompleto.push(docente);
      }
    }

    const headers = contenido.find("h1");

    let ocasionalTable = null;
    headers.each((i, header) => {
      if ($(header).text().includes("Docentes Tiempo Completo Ocasional y Cátedra")) {
        ocasionalTable = $(header).next("table");
        return false;
      }
    });

    if (ocasionalTable) {
      const rows = ocasionalTable.find("tbody tr");
      for (const row of rows) {
        const docente = await extraerDocente(row, 'ocasional');
        if (docente && docente.nombre) {
          docentes.tiempoCompletoOcasionalCatedra.push(docente);
        }
      }
    }

    headers.each((i, header) => {
      if ($(header).text().includes("Profesores Hora Cátedra")) {
        const nextH3 = $(header).next("h3");
        if (nextH3.text().includes("En el Programa")) {
          const texto = nextH3.next("p").text().trim();
          if (texto && texto !== "No hay cátedras") {
            docentes.catedraPrograma = texto.split("\n").map(t => t.trim()).filter(Boolean);
          }
        }
      }
    });

    let listaServicio = [];

    headers.each((i, header) => {
      if ($(header).text().includes("Cátedras de Servicio")) {
        $(header).next("ol").find("li").each((j, li) => {
          listaServicio.push($(li).text().trim());
        });
      }
    });

    headers.each((i, header) => {
      if ($(header).text().includes("Ocasionales Cátedra de Servicio")) {
        $(header).next("ol").find("li").each((j, li) => {
          listaServicio.push($(li).text().trim());
        });
      }
    });

    docentes.catedraServicio = [...new Set(listaServicio)];

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


app.get("/docentes-ingsistemas-villa", async (req, res) => {
  try {
    await ensureUploadsDir();
    
    const urlFuente = "https://www.unipamplona.edu.co/unipamplona/portalIG/home_77/recursos/01general/07072024/04_docentes_villa.jsp";

    const { data: html } = await axios.get(urlFuente, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(html);

    const docentes = {
      tiempoCompleto: [],
      tiempoCompletoOcasional: [],
      horaCatedra: []
    };

    const extraerDocente = async (row) => {
      const celdas = $(row).find("td");
      if (celdas.length < 2) return null;

      const infoText = $(celdas[0]).text().trim();
      const imgSrc = $(celdas[1]).find("img").attr("src");

      let nombre = "";
      const strongText = $(celdas[0]).find("strong").first().text().trim();
      if (strongText) {
        nombre = strongText;
      } else {
        const lines = infoText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.includes('Resolución') && !trimmed.includes('Profesor') && 
              !trimmed.includes('Registro') && !trimmed.includes('Contacto') && !trimmed.includes('Campus') &&
              !trimmed.includes('Hoja') && !trimmed.includes('Vida')) {
            nombre = trimmed;
            break;
          }
        }
      }
      
      nombre = nombre.replace(/<\/?strong>/g, "").trim();

      const resolucionMatch = infoText.match(/Resoluci[óo]n\s*(\d+)\s*-\s*([A-Za-z]+\s*\d{4})/i);
      const resolucion = resolucionMatch ? resolucionMatch[0] : "";

      const tituloMatch = infoText.match(/(Ph\.D\.|M\.Sc\.|Esp\.|Ing\.|Dr\.)\s*\.?\s*([^<]+)/i);
      const titulo = tituloMatch ? tituloMatch[0].replace(/\s*-\s*$/, "") : "";

      let cargo = "";
      const cargoMatch = infoText.match(/Profesor\s*([A-Za-z\s]+)\s*-\s*Acuerdo/i);
      if (cargoMatch) {
        cargo = `Profesor ${cargoMatch[1].trim()}`;
      }

      let cvlac = "";
      const cvlacRegex = /https?:\/\/scienti\.minciencias\.gov\.co\/[^\s"']+/i;
      const cvlacMatch = infoText.match(cvlacRegex);
      if (cvlacMatch) {
        cvlac = cvlacMatch[0];
      }
      if (!cvlac) {
        const htmlContent = $(celdas[0]).html();
        const htmlCvlacMatch = htmlContent.match(/href="(https?:\/\/scienti\.minciencias\.gov\.co\/[^"]+)"/i);
        if (htmlCvlacMatch) {
          cvlac = htmlCvlacMatch[1];
        }
      }

      const emailMatch = infoText.match(/Contacto:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      let email = emailMatch ? emailMatch[1] : "";
      if (!email) {
        const emailDirectMatch = infoText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        email = emailDirectMatch ? emailDirectMatch[1] : "";
      }

      let campus = "";
      const campusMatch = infoText.match(/Campus:\s*([A-Za-z\s]+)/i);
      if (campusMatch) {
        campus = campusMatch[1].trim();
        campus = campus.replace(/\s*Hoja de Vida.*$/i, "").replace(/\s*Hoja de vida.*$/i, "").trim();
      }

      let hojaVida = "";
      const hojaVidaMatch = $(celdas[0]).find("a[href*='hoja_vida']").attr("href");
      if (hojaVidaMatch) {
        if (hojaVidaMatch.startsWith("/")) {
          hojaVida = "https://www.unipamplona.edu.co" + hojaVidaMatch;
        } else {
          hojaVida = hojaVidaMatch;
        }
      }

      let imagen = imgSrc || "";
      if (imagen && imagen.startsWith("data:image")) {
        imagen = await guardarImagenBase64(imagen, nombre || 'docente');
      } else if (imagen && imagen.startsWith("/")) {
        imagen = "https://www.unipamplona.edu.co" + imagen;
      } else if (imagen && !imagen.startsWith("http") && imagen !== "") {
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
        hojaVida,
        imagen
      };
    };

    const primeraTabla = $("#texto table").first();
    if (primeraTabla.length) {
      const filas = primeraTabla.find("tbody tr");
      for (const row of filas) {
        const docente = await extraerDocente(row);
        if (docente && docente.nombre) {
          docentes.tiempoCompleto.push(docente);
        }
      }
    }

    const headers = $("#texto h1");
    let tablaOcasional = null;
    let tablaHoraCatedra = null;
    
    headers.each((i, header) => {
      const headerText = $(header).text().trim();
      if (headerText.includes("Docentes Tiempo Completo Ocasional")) {
        let next = $(header).next();
        while (next.length && next.get(0).tagName !== 'table') {
          next = next.next();
        }
        if (next.length && next.get(0).tagName === 'table') {
          tablaOcasional = next;
        }
      }
      if (headerText.includes("Profesores Hora Cátedra")) {
        let next = $(header).next();
        while (next.length && next.get(0).tagName !== 'table') {
          next = next.next();
        }
        if (next.length && next.get(0).tagName === 'table') {
          tablaHoraCatedra = next;
        }
      }
    });

    if (tablaOcasional && tablaOcasional.length) {
      const filasOcasionales = tablaOcasional.find("tbody tr");
      for (const row of filasOcasionales) {
        const docente = await extraerDocente(row);
        if (docente && docente.nombre) {
          docentes.tiempoCompletoOcasional.push(docente);
        }
      }
    }

    if (tablaHoraCatedra && tablaHoraCatedra.length) {
      const filasCatedra = tablaHoraCatedra.find("tbody tr");
      for (const row of filasCatedra) {
        const docente = await extraerDocente(row);
        if (docente && docente.nombre) {
          docentes.horaCatedra.push(docente);
        }
      }
    }

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

app.get("/programas-acreditados", async (req, res) => {
  try {
    const urlFuente = "https://www.unipamplona.edu.co/unipamplona/portalIG/home_1/recursos/acreditacion_institucional/02112021/programas_acreditados.jsp";

    const { data: html } = await axios.get(urlFuente, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(html);

    const programas = [];

    
    $(".programaacreditado").each((i, elem) => {
      const $programa = $(elem);
      
      
      let imagen = "";
      const imgSrc = $programa.find("img").attr("src");
      if (imgSrc) {
        if (imgSrc.startsWith("/")) {
          imagen = "https://www.unipamplona.edu.co" + imgSrc;
        } else {
          imagen = imgSrc;
        }
      }

      
      const titulo = $programa.find(".programaacreditado_titu").text().trim();

      
      let resolucion = "";
      const textoCompleto = $programa.find("p").last().text().trim();
      
      
      const resolucionMatch = textoCompleto.match(/(Resoluci[óo]n\s*N[°º]\s*\d+\s+del\s+\d+\s+de\s+[a-zA-Z]+\s+de\s+\d{4}\s+por\s+un\s+t[eé]rmino\s+de\s+\d+\s+años\.)/i);
      if (resolucionMatch) {
        resolucion = resolucionMatch[1];
      } else {
        
        const resolucionAltMatch = textoCompleto.match(/(Resoluci[óo]n\s*N[°º]\s*\d+\s+del\s+\d+\s+de\s+[a-zA-Z]+\s+de\s+\d{4}[^.]*\.)/i);
        if (resolucionAltMatch) {
          resolucion = resolucionAltMatch[1];
        }
      }

      if (titulo) {
        programas.push({
          id: i + 1,
          titulo: titulo,
          resolucion: resolucion || textoCompleto,
          imagen: imagen,
          url: urlFuente
        });
      }
    });

    res.json({
      fuente: urlFuente,
      totalProgramas: programas.length,
      programas: programas
    });

  } catch (error) {
    console.error("❌ Error scraping programas acreditados:", error.message);
    res.status(500).json({
      error: "No se pudo obtener la información de programas acreditados",
      mensaje: error.message
    });
  }
});

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
