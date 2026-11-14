const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 1. Scraping autónomo de páginas web
async function scrapeUrl(url) {
  try {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const content = await page.content();
    await browser.close();

    const $ = cheerio.load(content);
    $('script, style, nav, footer, header, noscript, iframe').remove();
    return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 12000);
  } catch (err) {
    console.error(`[Scraper] Error extrayendo ${url}:`, err.message);
    return null;
  }
}

// 2. Consulta y automatización de interfaz
async function interactuarConGeminiWeb(promptTexto, cookiesArray = []) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });

  if (cookiesArray && cookiesArray.length > 0) {
    await context.addCookies(cookiesArray);
  }

  const page = await context.newPage();

  try {
    await page.goto('https://gemini.google.com/app', { waitUntil: 'networkidle', timeout: 35000 });

    const inputSelector = 'rich-textarea p, div[contenteditable="true"], textarea';
    await page.waitForSelector(inputSelector, { timeout: 15000 });

    await page.click(inputSelector);
    await page.keyboard.type(promptTexto);
    await page.keyboard.press('Enter');

    const responseSelector = 'model-response message-content, .model-response-text';
    await page.waitForSelector(responseSelector, { timeout: 45000 });
    await page.waitForTimeout(3500);

    const respuesta = await page.evaluate((sel) => {
      const nodes = document.querySelectorAll(sel);
      if (!nodes.length) return null;
      return nodes[nodes.length - 1].innerText;
    }, responseSelector);

    await browser.close();
    return respuesta || 'No se pudo leer la respuesta.';
  } catch (err) {
    await browser.close();
    throw new Error('Error al interactuar con la interfaz: ' + err.message);
  }
}

// Ruta principal para el chat de Gelo
app.post('/chat', async (req, res) => {
  const { prompt, cookies = [] } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Falta el prompt en la petición.' });
  }

  try {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urlsEncontradas = prompt.match(urlRegex);
    let contextoScraping = '';

    if (urlsEncontradas && urlsEncontradas.length > 0) {
      for (const targetUrl of urlsEncontradas) {
        const textoWeb = await scrapeUrl(targetUrl);
        if (textoWeb) {
          contextoScraping += `\n\n[Información extraída de ${targetUrl}]:\n${textoWeb}\n`;
        }
      }
    }

    const promptFinal = contextoScraping
      ? `Eres Gelo, una IA avanzada e independiente. Responde incorporando la información extraída de la web:\n${contextoScraping}\n\nConsulta del usuario: ${prompt}`
      : prompt;

    const respuestaTexto = await interactuarConGeminiWeb(promptFinal, cookies);
    return res.json({ response: respuestaTexto });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Gelo Backend' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Gelo corriendo en el puerto ${PORT}`);
});
