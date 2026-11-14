const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Lista de modelos para respaldo automático en caso de corte o cuota agotada
const FALLBACK_ORDER = ['openai', 'mistral', 'qwen', 'deepseek', 'llama', 'gemini'];

app.get('/', (req, res) => {
  res.send('Servidor Gelo AI activo y listo.');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'Gelo Multi-Model Live' });
});

// Función para llamar al proveedor público
async function solicitarInferencia(modelo, prompt) {
  const url = 'https://text.pollinations.ai/openai';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelo,
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

  return response;
}

app.post('/chat', async (req, res) => {
  const { prompt, model = 'openai' } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Falta el mensaje en la consulta.' });
  }

  // Se intenta primero el modelo seleccionado; si devuelve 402/429/5xx, se salta a los de respaldo
  const modelosAIntentar = [model, ...FALLBACK_ORDER.filter(m => m !== model)];
  let ultimoError = null;

  for (const m of modelosAIntentar) {
    try {
      console.log(`[Gelo] Intentando inferencia con modelo: ${m}`);
      const aiResponse = await solicitarInferencia(m, prompt);

      // Si el proveedor pide pago (402), satura cuota (429) o cae (5xx), probamos el siguiente sin romper la petición
      if (aiResponse.status === 402 || aiResponse.status === 429 || aiResponse.status >= 500) {
        console.warn(`[Gelo] El modelo ${m} devolvió HTTP ${aiResponse.status}. Cambiando a modelo de respaldo...`);
        ultimoError = `HTTP ${aiResponse.status}`;
        continue;
      }

      if (!aiResponse.ok) {
        throw new Error(`Fallo del proveedor (HTTP ${aiResponse.status})`);
      }

      const data = await aiResponse.json();
      let textoRespuesta = data.choices?.[0]?.message?.content || 'Sin respuesta del modelo.';

      // Limpieza de etiquetas <think> de razonamiento
      textoRespuesta = textoRespuesta.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      return res.json({ response: textoRespuesta });

    } catch (err) {
      console.error(`[Gelo Error con ${m}]:`, err.message);
      ultimoError = err.message;
    }
  }

  return res.status(500).json({ 
    error: `Todos los modelos libres se encuentran momentáneamente saturados (${ultimoError}). Aguarda unos instantes y vuelve a intentar.` 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Gelo corriendo en el puerto ${PORT}`);
});
