const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ruta raíz informativa para evitar el "Cannot GET /"
app.get('/', (req, res) => {
  res.send('Servidor Gelo AI activo y listo.');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'Gelo Backend Live' });
});

// Endpoint principal del chat
app.post('/chat', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Falta el mensaje en la consulta.' });
  }

  try {
    console.log(`[Gelo] Consulta entrante: ${prompt}`);

    // Llamada directa a red de inferencia pública sin autenticación ni bloqueos de IP
    const url = "https://text.pollinations.ai/openai";
    const aiResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai",
        messages: [
          {
            role: "system",
            content: "Eres Gelo, una inteligencia artificial general avanzada, útil, directa y clara. Responde siempre en español."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`Fallo del proveedor (HTTP ${aiResponse.status})`);
    }

    const data = await aiResponse.json();
    const textoRespuesta = data.choices?.[0]?.message?.content || 'Sin respuesta del modelo.';

    return res.json({ response: textoRespuesta });

  } catch (error) {
    console.error('[Gelo Error]:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Gelo corriendo en el puerto ${PORT}`);
});
