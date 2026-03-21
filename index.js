const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());


app.get("/oferta-unipamplona", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://www.unipamplona.edu.co/unipamplona/portalIG/home_11/recursos/general/contenidos_subgeneral/inscripciones_presencial/21042014/ofertaacademica_2016.jsp",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
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
            .trim();

          const info = $(item)
            .find(".info-oferta")
            .text()
            .replace(/\s+/g, " ")
            .trim();

          programas.push({
            nombre,
            info,
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
