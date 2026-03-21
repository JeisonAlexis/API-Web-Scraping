const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");
const { URL } = require("url");

const app = express();

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("¡Hola desde mi servicio de Render!");
});

const fs = require("fs");
const path = require("path");

app.get("/recuperar-cuenta-sofia", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      },
    );

    const $ = cheerio.load(html);

    const preguntas = $(".preg");
    let pregunta = "";
    let respuesta = "";

    preguntas.each((i, el) => {
      const titulo = $(el).find(".titulopregunta").text().trim();
      const cuerpo = $(el).find(".respuesta").text().trim();

      if (titulo.toLowerCase().includes("contraseña")) {
        pregunta = titulo;
        respuesta = cuerpo;
        return false;
      }
    });

    if (!pregunta || !respuesta) {
      throw new Error("No se encontró la pregunta sobre la contraseña.");
    }

    res.json({ pregunta, respuesta });
  } catch (error) {
    console.error("❌ Error scraping:", error.message);
    res.status(500).json({
      error: "No se pudo obtener la pregunta sobre la contraseña en SOFIA Plus",
    });
  }
});

app.get("/oferta-academica-unipamplona", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://www.unipamplona.edu.co/unipamplona/portalIG/home_11/recursos/general/contenidos_subgeneral/inscripciones_presencial/04112009/oferta_academica.jsp",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      },
    );

    const $ = cheerio.load(html);

    const facultades = [];

    $(".table-row-inscripciones").each((i, row) => {
      const $row = $(row);

      const $facultadCell = $row.find("td:first-child");
      const facultadNombre = $facultadCell
        .clone()
        .children()
        .remove()
        .end()
        .text()
        .trim();
      const facultadIcono = $facultadCell.find("img").attr("src") || null;

      const $programasCell = $row.find("td:last-child");
      const programas = [];

      $programasCell.find(".list-item-oferta").each((j, programa) => {
        const $programa = $(programa);
        const $link = $programa.find(".link-oferta");

        const programaData = {
          nombre: $link.text().trim(),
          url: $link.attr("href") || null,
          sedes: [],
          codigo_snies: null,
        };

        const infoText = $programa.find(".info-oferta").text().trim();
        if (infoText) {
          const sedeMatch = infoText.match(/^([^[]+)/);
          const sniesMatch = infoText.match(/\[COD SNIES (\d+)\]/);

          if (sedeMatch) {
            const sedesText = sedeMatch[0].trim();
            programaData.sedes = sedesText.split(" y ").map((s) => s.trim());
          }

          if (sniesMatch) {
            programaData.codigo_snies = sniesMatch[1];
          }
        }

        programas.push(programaData);
      });

      if (facultadNombre && programas.length > 0) {
        facultades.push({
          facultad: facultadNombre,
          icono: facultadIcono,
          programas: programas,
          total_programas: programas.length,
        });
      }
    });

    // Agregar resumen general
    const resumen = {
      total_facultades: facultades.length,
      total_programas: facultades.reduce(
        (sum, f) => sum + f.total_programas,
        0,
      ),
      facultades: facultades,
    };

    res.json(resumen);
  } catch (error) {
    console.error("❌ Error scraping:", error.message);
    res.status(500).json({
      error: "No se pudo obtener la oferta académica",
      detalle: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
