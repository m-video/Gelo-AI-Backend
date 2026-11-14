const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Motor con DeepSeek-R1 / Qwen 2.5 72B (Inferencia abierta de alta potencia)
async function consultarModeloAvanzado(promptTexto) {
  // Enlace de inferencia directa sin restricciones de navegador
  const endpoint = "https://api-inference.huggingface.co/models/deepseek-ai/DeepSeek-R1-Distill-Qwen-32B";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Gelo-AI-Engine/2.0"
    },
    body: JSON.stringify({
      inputs: `Eres Gelo, una inteligencia artificial conversacional de nivel superior, analítica, clara y directa. Responde en español a la siguiente consulta:\n\n${promptTexto}`,
      parameters: {
        max_new_tokens: 1500,
        return_full_text: false,
        temperature: 0.6
      }
    })
  });

  if (!res.ok) {
    throw new Error(`Error en el motor (HTTP ${res.status})`);
  }

  const data = await res.json();
  let salida = '';

  if (Array.isArray(data) && data[0]?.generated_text) {
    salida = data[0].generated_text;
  } else if (data?.generated_text) {
    salida = data.generated_text;
  } else {
    salida = typeof data === 'string' ? data : JSON.stringify(data);
  }

  // Limpiar etiquetas de pensamiento de DeepSeek-R1 si aparecen (<think>...</think>)
  salida = salida.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  return salida || 'No se obtuvo una respuesta válida.';
}

app.post('/chat', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Falta el mensaje en la solicitud.' });
  }

  try {
    console.log(`[Gelo] Procesando: ${prompt}`);
    const respuesta = await consultarModeloAvanzado(prompt);
    return res.json({ response: respuesta });
  } catch (error) {
    console.error('[Gelo Error]:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'Gelo High-Power Engine' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Gelo corriendo en el puerto ${PORT}`);
});
