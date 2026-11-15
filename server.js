const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());
app.use(cors());

app.post('/api/chat', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Falta el parámetro prompt' });
    }

    let browser;
    try {
        // Lanzar Chromium en modo headless (o con interfaz si tu entorno lo soporta)
        browser = await puppeteer.launch({
            headless: true, // Cambiar a false si tu servidor soporta entorno gráfico/VNC
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-experimental-web-platform-features']
        });

        const page = await browser.newPage();
        
        // Opcional: Navegar a Google o a una página donde ejecutes Gemini Nano / Prompt API
        await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

        // Ejecutar código dentro del contexto del navegador para usar la Built-in AI (Gemini Nano)
        // Nota: Chrome Built-in AI requiere que las flags experimentales estén activas en el navegador que corre Puppeteer.
        const aiResponse = await page.evaluate(async (userPrompt) => {
            try {
                // Verificar si la API nativa de Chrome está disponible
                if (!window.ai || !window.ai.languageModel) {
                    return "Error: Chrome Built-in AI (window.ai.languageModel) no está disponible en este entorno de Chromium.";
                }
                
                const session = await window.ai.languageModel.create();
                const result = await session.prompt(userPrompt);
                return result;
            } catch (err) {
                return "Error al ejecutar Gemini Nano: " + err.message;
            }
        }, prompt);

        await browser.close();
        res.json({ response: aiResponse });

    } catch (error) {
        if (browser) await browser.close();
        console.error(error);
        res.status(500).json({ error: 'Error interno en la máquina virtual: ' + error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
