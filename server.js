const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Lista de modelos ordenados para fallback
const FALLBACK_MODELS = ['openai', 'mistral', 'qwen', 'deepseek', 'llama', 'gemini'];

app.get('/', (req, res) => {
  res.send('Servidor Gelo AI activo con Firestore Vault.');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'Gelo Multi-Model + Firestore' });
});

// Petición con timeout estricto de 14s por modelo para no colgar el servidor
async function fetchWithTimeout(url, options, timeoutMs = 14000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

app.post('/chat', async (req, res) => {
  const { prompt, model = 'openai' } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Falta el mensaje en la consulta.' });
  }

  // Prioridad: modelo elegido primero, luego el resto
  const modelQueue = [model, ...FALLBACK_MODELS.filter(m => m !== model)];
  let lastError = null;

  for (const currentModel of modelQueue) {
    try {
      console.log(`[Gelo] Probando modelo: ${currentModel}...`);

      const response = await fetchWithTimeout('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: currentModel,
          messages: [
            {
              role: 'system',
              content: 'Eres Gelo, una inteligencia artificial general de grado AAA, veloz, precisa y directa. Si generas código o archivos extensos, devuélvelos completos sin truncar. Responde en español.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      }, 15000); // 15s máximo por modelo. Si no responde, pasa al siguiente de inmediato

      if (response.status === 402 || response.status === 429 || response.status >= 500) {
        console.warn(`[Gelo] Modelo ${currentModel} saturado (HTTP ${response.status}). Cambiando al siguiente...`);
        lastError = `HTTP ${response.status}`;
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      let replyText = data.choices?.[0]?.message?.content || '';

      if (!replyText) {
        throw new Error('Respuesta vacía');
      }

      // Limpieza de etiquetas de pensamiento
      replyText = replyText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      return res.json({ 
        response: replyText, 
        modelUsed: currentModel 
      });

    } catch (err) {
      console.warn(`[Gelo] Error con ${currentModel}: ${err.message}. Probando siguiente modelo...`);
      lastError = err.message;
    }
  }

  // Si todos los modelos fallaron en esta ronda
  return res.status(402).json({
    error: `SATURATED_POLLINATIONS: ${lastError}`,
    retryable: true
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Gelo corriendo en el puerto ${PORT}`);
});
