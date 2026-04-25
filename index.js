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

app.get("/plan-estudios-ingsistemas", async (req, res) => {
  try {
    const urlFuente = "https://www.unipamplona.edu.co/unipamplona/portalIG/home_77/recursos/01general/22072013/01_elprograma.jsp";

    const { data: html } = await axios.get(urlFuente, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(html);
    const planes = [];

    const limpiarDescripcion = (texto) => {
      return texto
        .replace(/\[Ver plan\]/gi, '')        
        .replace(/\s+/g, ' ')                 
        .trim();
    };

    const h3s = $("#texto h3");
    let planSection = null;

    h3s.each((i, elem) => {
      if ($(elem).text().trim() === "Plan de Estudios") {
        planSection = $(elem).next("ul");
        return false;
      }
    });

    if (planSection && planSection.length) {
      planSection.find("li").each((i, li) => {
        const textoLi = $(li).text().trim();
        const enlace = $(li).find("a").attr("href");
        let urlCompleta = "";
        if (enlace) {
          urlCompleta = enlace.startsWith("/") ? "https://www.unipamplona.edu.co" + enlace : enlace;
        }

        let nombre = "";
        if (textoLi.includes("Plan de estudios 2019")) {
          nombre = "Plan de estudios 2019";
        } else if (textoLi.includes("Plan de estudios 2006")) {
          nombre = "Plan de estudios 2006 (vigente antiguos)";
        } else if (textoLi.includes("Propuesta de malla curricular 2021")) {
          nombre = "Propuesta de malla curricular 2021";
        } else {
          nombre = textoLi.split("[").shift().trim();
        }

        if (nombre && (textoLi.includes("Plan de estudios") || textoLi.includes("Propuesta de malla"))) {
          planes.push({
            nombre: nombre,
            descripcion: limpiarDescripcion(textoLi),
            enlace: urlCompleta || "No disponible"
          });
        }
      });
    }

    if (planes.length === 0) {
      $("#texto ul li").each((i, li) => {
        const textoLi = $(li).text().trim();
        if (textoLi.includes("Plan de estudios") || textoLi.includes("Propuesta de malla")) {
          const enlace = $(li).find("a").attr("href");
          let urlCompleta = "";
          if (enlace) {
            urlCompleta = enlace.startsWith("/") ? "https://www.unipamplona.edu.co" + enlace : enlace;
          }
          let nombre = "";
          if (textoLi.includes("Plan de estudios 2019")) nombre = "Plan de estudios 2019";
          else if (textoLi.includes("Plan de estudios 2006")) nombre = "Plan de estudios 2006 (vigente antiguos)";
          else if (textoLi.includes("Propuesta de malla")) nombre = "Propuesta de malla curricular 2021";
          else nombre = textoLi.split("[").shift().trim();

          planes.push({
            nombre: nombre,
            descripcion: limpiarDescripcion(textoLi),
            enlace: urlCompleta || "No disponible"
          });
        }
      });
    }

    res.json({
      fuente: urlFuente,
      totalPlanes: planes.length,
      planes: planes
    });

  } catch (error) {
    console.error("❌ Error scraping plan de estudios:", error.message);
    res.status(500).json({
      error: "No se pudo obtener la información del plan de estudios",
      mensaje: error.message
    });
  }
});

app.get("/perfiles-ingsistemas", async (req, res) => {
  try {
    const urlFuente = "https://www.unipamplona.edu.co/unipamplona/portalIG/home_77/recursos/01general/22072013/01_elprograma.jsp";

    const { data: html } = await axios.get(urlFuente, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(html);

    let imagenPerfilEstudiante = "";
    const h3Estudiante = $("h3:contains('Perfil del Estudiante')");
    if (h3Estudiante.length) {
      const imgTag = h3Estudiante.next("p").find("img");
      if (imgTag.length) {
        let src = imgTag.attr("src");
        if (src) {
          imagenPerfilEstudiante = src.startsWith("/")
            ? "https://www.unipamplona.edu.co" + src
            : src;
        }
      }
    }

    let perfilEgresadoTexto = "";
    const h3Egresado = $("h3:contains('Perfil del Egresado')");
    if (h3Egresado.length) {
      let contenido = "";
      let next = h3Egresado.next();
      while (next.length && next[0].tagName !== 'h3') {
        if (next[0].tagName === 'p') {
          contenido += next.text().trim() + "\n";
        }
        if (next[0].tagName === 'ul') {
          next.find("li").each((i, li) => {
            contenido += `- ${$(li).text().trim()}\n`;
          });
        }
        next = next.next();
      }
      perfilEgresadoTexto = contenido.trim();
    }

    res.json({
      fuente: urlFuente,
      perfiles: {
        estudiante: {
          tipo: "imagen",
          url: imagenPerfilEstudiante || null
        },
        egresado: {
          tipo: "texto",
          contenido: perfilEgresadoTexto || null
        }
      }
    });

  } catch (error) {
    console.error("❌ Error scraping perfiles:", error.message);
    res.status(500).json({
      error: "No se pudo obtener la información de los perfiles",
      mensaje: error.message
    });
  }
});




app.get("/mision-vision-ingsistemas", async (req, res) => {
  try {
    const urlFuente = "https://www.unipamplona.edu.co/unipamplona/portalIG/home_77/recursos/01general/22072013/01_elprograma.jsp";

    const { data: html } = await axios.get(urlFuente, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(html);

    let misionUrl = "";
    let visionUrl = "";

    const h1VisionMision = $("h1:contains('Misión y Visión')");
    if (h1VisionMision.length) {
      let next = h1VisionMision.next();
      let imagenesEncontradas = 0;
      while (next.length && imagenesEncontradas < 2) {
        if (next[0].tagName === 'p') {
          const img = next.find("img");
          if (img.length) {
            const src = img.attr("src");
            if (src) {
              const urlAbsoluta = src.startsWith("/")
                ? "https://www.unipamplona.edu.co" + src
                : src;
              if (src.toLowerCase().includes("mision")) {
                misionUrl = urlAbsoluta;
              } else if (src.toLowerCase().includes("vision")) {
                visionUrl = urlAbsoluta;
              }
              imagenesEncontradas++;
            }
          }
        }
        next = next.next();
      }
    }

    if (!misionUrl) {
      const imgMision = $("img[src*='mision']").first();
      if (imgMision.length) {
        const src = imgMision.attr("src");
        if (src) {
          misionUrl = src.startsWith("/") ? "https://www.unipamplona.edu.co" + src : src;
        }
      }
    }
    if (!visionUrl) {
      const imgVision = $("img[src*='vision']").first();
      if (imgVision.length) {
        const src = imgVision.attr("src");
        if (src) {
          visionUrl = src.startsWith("/") ? "https://www.unipamplona.edu.co" + src : src;
        }
      }
    }

    res.json({
      fuente: urlFuente,
      mision: {
        tipo: "imagen",
        url: misionUrl || null
      },
      vision: {
        tipo: "imagen",
        url: visionUrl || null
      }
    });

  } catch (error) {
    console.error("❌ Error scraping misión y visión:", error.message);
    res.status(500).json({
      error: "No se pudo obtener la información de misión y visión",
      mensaje: error.message
    });
  }
});


app.get("/resultados-aprendizaje-ingsistemas", async (req, res) => {
  try {
    const urlFuente = "https://www.unipamplona.edu.co/unipamplona/portalIG/home_77/recursos/01general/22072013/01_elprograma.jsp";

    const { data: html } = await axios.get(urlFuente, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(html);
    const resultados = [];

    const h3Resultados = $("h3:contains('Resultados de Aprendizaje')");
    if (h3Resultados.length) {
      let next = h3Resultados.next();
      while (next.length && next[0].tagName !== 'h3') {
        if (next[0].tagName === 'p') {
          const texto = next.text().trim();
          const raMatch = texto.match(/^(RA\d+):\s*(.+)/);
          if (raMatch) {
            resultados.push({
              codigo: raMatch[1],
              descripcion: raMatch[2].trim()
            });
          }
        }
        next = next.next();
      }
    }

    if (resultados.length === 0) {
      $("#texto p").each((i, p) => {
        const texto = $(p).text().trim();
        const raMatch = texto.match(/^(RA\d+):\s*(.+)/);
        if (raMatch) {
          resultados.push({
            codigo: raMatch[1],
            descripcion: raMatch[2].trim()
          });
        }
      });
    }

    resultados.sort((a, b) => {
      const numA = parseInt(a.codigo.replace('RA', ''));
      const numB = parseInt(b.codigo.replace('RA', ''));
      return numA - numB;
    });

    res.json({
      fuente: urlFuente,
      totalResultados: resultados.length,
      resultados: resultados
    });

  } catch (error) {
    console.error("❌ Error scraping resultados de aprendizaje:", error.message);
    res.status(500).json({
      error: "No se pudo obtener la información de los resultados de aprendizaje",
      mensaje: error.message
    });
  }
});


app.get("/direccion-ingsistemas", async (req, res) => {
  try {
    const urlFuente = "https://www.unipamplona.edu.co/unipamplona/portalIG/home_77/recursos/01general/22072013/01_elprograma.jsp";

    const { data: html } = await axios.get(urlFuente, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(html);
    
    let director = {
      nombre: "",
      email: "",
      horario: "",
      imagen: ""
    };
    
    let coordinador = {
      nombre: "",
      email: "",
      horario: "",
      imagen: ""
    };

    const h3Direccion = $("h3").filter(function() {
      return $(this).text().trim() === "Dirección" || $(this).text().trim() === "Direcci\u00f3n";
    });
    
    let tablaDireccion = null;
    if (h3Direccion.length) {
      tablaDireccion = h3Direccion.next("table");
    }
    
    if (!tablaDireccion || !tablaDireccion.length) {
      tablaDireccion = $("table:contains('Director de Programa')");
    }
    
    if (tablaDireccion && tablaDireccion.length) {
      const filas = tablaDireccion.find("tbody tr");
      
      if (filas.length >= 1) {
        const primeraFila = filas.eq(0);
        const celdas = primeraFila.find("td");
        
        if (celdas.length >= 1) {
          const infoDirector = $(celdas[0]).html();
          
          const nombreMatch = infoDirector.match(/Director de Programa<\/strong><br\s*\/?>(.*?)<br/);
          if (nombreMatch) {
            director.nombre = nombreMatch[1].trim();
          }
          
          const emailMatch = infoDirector.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          if (emailMatch) {
            director.email = emailMatch[1];
          }
          
          const horarioMatch = infoDirector.match(/Horario de atenci[óo]n:<\/strong><br\s*\/?>(.*?)<\/p>/);
          if (horarioMatch) {
            director.horario = horarioMatch[1].trim();
          } else {

            const horarioSimple = infoDirector.match(/Horario de atenci[óo]n:<\/strong><br\s*\/?>(.*?)(?:<br|<\/p|$)/i);
            if (horarioSimple) {
              director.horario = horarioSimple[1].replace(/<br\s*\/?>/g, ", ").trim();
            }
          }
        }
        
        if (celdas.length >= 2) {
          const imgDirector = $(celdas[1]).find("img");
          if (imgDirector.length) {
            let src = imgDirector.attr("src");
            if (src) {
              director.imagen = src.startsWith("/") ? "https://www.unipamplona.edu.co" + src : src;
            }
          }
        }
      }


      if (filas.length >= 2) {
        const segundaFila = filas.eq(1);
        const celdas = segundaFila.find("td");
        
        if (celdas.length >= 1) {
          const infoCoordinador = $(celdas[0]).html();
          
          const nombreMatch = infoCoordinador.match(/Coordinador de Programa Villa del Rosario<\/strong><br\s*\/?>(.*?)<br/);
          if (nombreMatch) {
            coordinador.nombre = nombreMatch[1].trim();
          }
          
          const emailMatch = infoCoordinador.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          if (emailMatch) {
            coordinador.email = emailMatch[1];
          }
          
          const horarioMatch = infoCoordinador.match(/Horario de atenci[óo]n:<\/strong><br\s*\/?>(.*?)(?:<br\s*\/?><br|<\/p|$)/s);
          if (horarioMatch) {
            let horario = horarioMatch[1];
            horario = horario.replace(/<br\s*\/?>/g, ", ");
            horario = horario.replace(/\s+/g, ' ').trim();
            coordinador.horario = horario;
          }
        }
        
        if (celdas.length >= 2) {
          const imgCoordinador = $(celdas[1]).find("img");
          if (imgCoordinador.length) {
            let src = imgCoordinador.attr("src");
            if (src) {
              coordinador.imagen = src.startsWith("/") ? "https://www.unipamplona.edu.co" + src : src;
            }
          }
        }
      }
    }

    if (director.horario === "") {
      const horarioDirectorTexto = $("table:contains('Director de Programa')").text();
      const horarioMatch = horarioDirectorTexto.match(/Horario de atención:?\s*([^E]+?)(?:Coordinador|$)/i);
      if (horarioMatch) {
        director.horario = horarioMatch[1].trim().replace(/\s+/g, ' ');
      }
    }

    res.json({
      fuente: urlFuente,
      director: {
        cargo: "Director de Programa",
        nombre: director.nombre || "No disponible",
        email: director.email || "No disponible",
        horario: director.horario || "No disponible",
        imagen: director.imagen || null
      },
      coordinador: {
        cargo: "Coordinador de Programa - Villa del Rosario",
        nombre: coordinador.nombre || "No disponible",
        email: coordinador.email || "No disponible",
        horario: coordinador.horario || "No disponible",
        imagen: coordinador.imagen || null
      }
    });

  } catch (error) {
    console.error("❌ Error scraping dirección del programa:", error.message);
    res.status(500).json({
      error: "No se pudo obtener la información de dirección del programa",
      mensaje: error.message
    });
  }
});

app.get("/contacto-ingsistemas", async (req, res) => {
  try {
    const urlFuente = "https://www.unipamplona.edu.co/unipamplona/portalIG/home_77/recursos/01general/22072013/01_elprograma.jsp";

    const { data: html } = await axios.get(urlFuente, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(html);
    
    let sedePrincipal = {
      nombre: "Sede Principal Pamplona",
      email: "",
      ubicacion: ""
    };
    
    let sedeVilla = {
      nombre: "Extensión Villa del Rosario",
      email: "",
      ubicacion: ""
    };

    const textoPie = $("#pie_enlaces p").text().trim();
    
    const lineas = textoPie.split('\n').map(l => l.trim()).filter(l => l);
    
    for (const linea of lineas) {
      if (linea.includes("Sede Principal Pamplona")) {
        const textoLimpio = linea.replace(/Sede Principal Pamplona:\s*/, '');
        const emailMatch = textoLimpio.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          sedePrincipal.email = emailMatch[1];
        }
        sedePrincipal.ubicacion = textoLimpio.replace(emailMatch?.[1] || '', '').replace(/-\s*/, '').trim();
      }
      if (linea.includes("Extensión Villa del Rosario")) {
        const textoLimpio = linea.replace(/Extensión Villa del Rosario:\s*/, '');
        const emailMatch = textoLimpio.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          sedeVilla.email = emailMatch[1];
        }
        sedeVilla.ubicacion = textoLimpio.replace(emailMatch?.[1] || '', '').replace(/-\s*/, '').trim();
      }
    }

    res.json({
      fuente: urlFuente,
      sedes: {
        principal: {
          nombre: sedePrincipal.nombre,
          email: sedePrincipal.email || "dsistemas@unipamplona.edu.co",
          ubicacion: sedePrincipal.ubicacion || "Edificio Ramón González Valencia (RG) - Primer piso"
        },
        villa: {
          nombre: sedeVilla.nombre,
          email: sedeVilla.email || "dsistemasvilla@unipamplona.edu.co",
          ubicacion: sedeVilla.ubicacion || "Edificio Los Patios, oficina 202"
        }
      }
    });

  } catch (error) {
    console.error("❌ Error scraping contacto:", error.message);
    res.status(500).json({
      error: "No se pudo obtener la información de contacto",
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
