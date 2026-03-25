const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");

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

app.get("/docentes-ingsistemas-pamplona", async (req, res) => {
  try {
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

    const extraerDocente = (row) => {
      const celdas = $(row).find("td");
      if (celdas.length < 2) return null;

      const infoText = $(celdas[0]).text().trim();
      const imgSrc = $(celdas[1]).find("img").attr("src");

      const nombreMatch = infoText.match(/(?:Ph\.D\.|M\.Sc\.|Esp\.|Ing\.)?\s*(?:<strong>)?([^<]+)/);
      let nombre = nombreMatch ? nombreMatch[1].trim() : "";
      
      nombre = nombre.replace(/<\/?strong>/g, "").trim();

      const resolucionMatch = infoText.match(/Resoluci[óo]n\s*(\d+)\s*-\s*([A-Za-z]+\s*\d{4})/i);
      const resolucion = resolucionMatch ? resolucionMatch[0] : "";

      const tituloMatch = infoText.match(/(Ph\.D\.|M\.Sc\.|Esp\.|Ing\.)\s*\.?\s*([^<]+)/);
      const titulo = tituloMatch ? tituloMatch[0] : "";

      const cargoMatch = infoText.match(/Profesor\s*([A-Za-z\s]+)\s*-\s*Acuerdo/i);
      const cargo = cargoMatch ? `Profesor ${cargoMatch[1].trim()}` : "";

      const cvlacMatch = infoText.match(/Registro CvLAC\s*\[\s*<a\s+href="([^"]+)"[^>]*>Ir al registro<\/a>\s*\]/i);
      const cvlac = cvlacMatch ? cvlacMatch[1] : "";

      const emailMatch = infoText.match(/Contacto:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      const email = emailMatch ? emailMatch[1] : "";

      const campusMatch = infoText.match(/Campus:\s*([A-Za-z\s]+)/i);
      const campus = campusMatch ? campusMatch[1].trim() : "";

      let imagen = imgSrc || "";
      if (imagen && imagen.startsWith("/")) {
        imagen = "https://www.unipamplona.edu.co" + imagen;
      } else if (imagen && !imagen.startsWith("http")) {
        imagen = "https://www.unipamplona.edu.co/unipamplona/portalIG/home_77/recursos/imagenes/" + imagen;
      } else if (imagen && imagen.startsWith("data:image")) {
        imagen = imagen; 
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

    const tiempoCompletoRows = contenido.find("table").first().find("tbody tr");
    tiempoCompletoRows.each((i, row) => {
      const docente = extraerDocente(row);
      if (docente && docente.nombre) {
        docentes.tiempoCompleto.push(docente);
      }
    });

    const headers = contenido.find("h1");
    let ocasionalTable = null;
    
    headers.each((i, header) => {
      const headerText = $(header).text();
      if (headerText.includes("Docentes Tiempo Completo Ocasional y Cátedra")) {
        ocasionalTable = $(header).next("table");
        return false; // break
      }
    });

    if (ocasionalTable && ocasionalTable.length) {
      const ocasionalRows = ocasionalTable.find("tbody tr");
      ocasionalRows.each((i, row) => {
        const docente = extraerDocente(row);
        if (docente && docente.nombre) {
          docentes.tiempoCompletoOcasionalCatedra.push(docente);
        }
      });
    }

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

    docentes.catedraServicio = catedraServicioList;

    let ocasionalServicioList = [];
    headers.each((i, header) => {
      const headerText = $(header).text();
      if (headerText.includes("Ocasionales Cátedra de Servicio - Pamplona")) {
        const lista = $(header).next("ol");
        if (lista.length) {
          lista.find("li").each((j, li) => {
            ocasionalServicioList.push($(li).text().trim());
          });
        }
      }
    });

    if (ocasionalServicioList.length) {
      docentes.catedraServicio = [...new Set([...docentes.catedraServicio, ...ocasionalServicioList])];
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
