const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/chatbot', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: message }]
    });

    res.json({ reply: response.choices[0].message.content });
  } catch (error) {
    console.error('AI error:', error.message);
    res.status(500).json({ reply: 'Oops! AI failed to respond.' });
  }
});
