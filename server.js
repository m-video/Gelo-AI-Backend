const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 1. Scraping web autónomo con Playwright y Cheerio
async function scrapeUrl(url) {
  try {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process'
      ]
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const content = await page.content();
    await browser.close();

    const $ = cheerio.load(content);
    $('script, style, nav, footer, header, noscript, iframe').remove();
    return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000);
  } catch (err) {
    console.error(`[Scraper] Error en ${url}:`, err.message);
    return null;
  }
}

// 2. Motor de IA en la nube (sin barrera de login ni captchas)
async function consultarModeloIA(promptCompleto) {
  const endpoint = "https://api-inference.huggingface.co/models/deepseek-ai/DeepSeek-R1-Distill-Qwen-32B";
  
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Gelo-AI-Assistant/1.0"
    },
    body: JSON.stringify({
      inputs: `Eres Gelo, un asistente inteligente, analítico y directo. Responde:\n\n${promptCompleto}`,
      parameters: { max_new_tokens: 1024, return_full_text: false }
    })
  });

  if (!res.ok) {
    throw new Error(`Error en el motor de respuesta (Código HTTP ${res.status})`);
  }

  const data = await res.json();
  if (Array.isArray(data) && data[0]?.generated_text) {
    return data[0].generated_text;
  }
  return data?.generated_text || (typeof data === 'string' ? data : JSON.stringify(data));
}

// Ruta principal llamada por gelo.html
app.post('/chat', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Falta el prompt en la solicitud.' });
  }

  try {
    console.log(`[Gelo] Consulta entrante: ${prompt}`);

    // Detección automática y scraping si el usuario pasa URLs
    const urls = prompt.match(/(https?:\/\/[^\s]+)/g);
    let datosWeb = '';

    if (urls && urls.length > 0) {
      for (const link of urls) {
        console.log(`[Gelo] Scrapeando contenido de: ${link}`);
        const extraido = await scrapeUrl(link);
        if (extraido) {
          datosWeb += `\n\n[Contenido web extraído de ${link}]:\n${extraido}\n`;
        }
      }
    }

    const promptFinal = datosWeb 
      ? `Información de la web:\n${datosWeb}\n\nPregunta: ${prompt}`
      : prompt;

    const respuesta = await consultarModeloIA(promptFinal);
    return res.json({ response: respuesta });

  } catch (error) {
    console.error('[Gelo] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'Gelo Backend Live' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Gelo operativo en el puerto ${PORT}`);
});
