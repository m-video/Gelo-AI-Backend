const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Mapeo de nombres del frontend a los identificadores libres
const MODEL_MAPPING = {
  openai: 'openai',
  deepseek: 'deepseek',
  llama: 'llama',
  gemini: 'gemini',
  mistral: 'mistral',
  qwen: 'qwen'
};

app.get('/', (req, res) => {
  res.send('Servidor Gelo AI activo y listo.');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'Gelo Multi-Model Live' });
});

app.post('/chat', async (req, res) => {
  const { prompt, model = 'openai' } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Falta el mensaje en la consulta.' });
  }

  const selectedModel = MODEL_MAPPING[model] || 'openai';

  try {
    console.log(`[Gelo] Procesando consulta con modelo: ${selectedModel}`);

    const url = 'https://text.pollinations.ai/openai';
    const aiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content: 'Eres Gelo, una inteligencia artificial general avanzada, analítica, directa y precisa. Responde siempre en español manteniendo el contexto completo de la conversación.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`Fallo del proveedor (HTTP ${aiResponse.status})`);
    }

    const data = await aiResponse.json();
    let textoRespuesta = data.choices?.[0]?.message?.content || 'Sin respuesta del modelo.';

    // Limpieza de etiquetas de pensamiento para modelos tipo DeepSeek R1
    textoRespuesta = textoRespuesta.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    return res.json({ response: textoRespuesta });

  } catch (error) {
    console.error('[Gelo Error]:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Gelo corriendo en el puerto ${PORT}`);
});
