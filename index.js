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
      "https://www.unipamplona.edu.co/unipamplona/portalIG/home_11/recursos/general/contenidos_subgeneral/inscripciones_distancia/23092025/oferta_distancia.jsp",
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
