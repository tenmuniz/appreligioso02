const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configuração do OpenAI com chave da API armazenada em variável de ambiente
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sua-chave-api-aqui'
});

// Definir caminhos de diretórios absolutos
const publicPath = path.join(__dirname, 'public');
const uploadsPath = path.join(__dirname, 'uploads');

// Verificar e criar diretórios necessários
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log(`Diretório de uploads criado: ${uploadsPath}`);
}

if (!fs.existsSync(publicPath)) {
  fs.mkdirSync(publicPath, { recursive: true });
  console.log(`Diretório público criado: ${publicPath}`);
}

// Verificar e criar subdiretórios necessários
const audioDirPath = path.join(publicPath, 'audio');
if (!fs.existsSync(audioDirPath)) {
  fs.mkdirSync(audioDirPath, { recursive: true });
  console.log(`Diretório de áudio criado: ${audioDirPath}`);
}

// Configuração de Middleware
app.use(express.json());
app.use(express.static(publicPath));
app.use(cors());

// Configuração do Multer para upload de arquivos de áudio
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsPath);
  },
  filename: function (req, file, cb) {
    cb(null, 'audio-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /mp3|m4a|wav|ogg/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Erro: Apenas arquivos de áudio são permitidos!');
    }
  }
});

// Função para gerar resposta espiritual usando GPT-4
async function gerarRespostaEspiritual(mensagem) {
  try {
    console.log('Gerando resposta espiritual para:', mensagem);
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Você é um conselheiro espiritual compassivo e acolhedor. Sua missão é oferecer conforto, orientação espiritual, e esperança para pessoas que estão passando por dificuldades ou angústias. Responda sempre com empatia, sabedoria e compaixão. Sua resposta deve reconhecer o sofrimento da pessoa, oferecer palavras de encorajamento baseadas na fé, e terminar com uma oração personalizada que traga conforto e esperança. Use uma linguagem acolhedora e calorosa."
        },
        {
          role: "user",
          content: mensagem
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Erro ao gerar resposta espiritual:', error);
    throw new Error(`Falha ao gerar resposta espiritual: ${error.message}`);
  }
}

// Função para gerar áudio a partir do texto
async function gerarAudio(texto) {
  try {
    console.log('Gerando áudio para resposta...');
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: texto,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    const audioFileName = `resposta-${Date.now()}.mp3`;
    const audioFilePath = path.join(publicPath, 'audio', audioFileName);
    
    fs.writeFileSync(audioFilePath, buffer);
    console.log(`Áudio gerado e salvo em: ${audioFilePath}`);
    
    return `/audio/${audioFileName}`;
  } catch (error) {
    console.error('Erro ao gerar áudio:', error);
    throw new Error(`Falha ao gerar áudio: ${error.message}`);
  }
}

// Endpoint para processar texto
app.post('/enviar-texto', async (req, res) => {
  try {
    console.log('Recebida requisição de texto');
    const { mensagem } = req.body;
    
    if (!mensagem) {
      console.log('Mensagem não fornecida');
      return res.status(400).json({ erro: 'Mensagem não fornecida' });
    }

    console.log('Processando mensagem de texto:', mensagem);
    const respostaEspiritual = await gerarRespostaEspiritual(mensagem);
    const arquivoAudio = await gerarAudio(respostaEspiritual);

    console.log('Resposta gerada com sucesso');
    res.json({
      mensagem: respostaEspiritual,
      audio: arquivoAudio
    });
  } catch (error) {
    console.error('Erro no processamento de texto:', error);
    res.status(500).json({ 
      erro: 'Erro ao processar a mensagem',
      detalhes: error.message 
    });
  }
});

// Endpoint para processar áudio
app.post('/enviar-audio', upload.single('arquivo'), async (req, res) => {
  try {
    console.log('Requisição de áudio recebida');
    
    if (!req.file) {
      console.log('Nenhum arquivo recebido');
      return res.status(400).json({ erro: 'Nenhum arquivo de áudio enviado' });
    }

    console.log('Arquivo recebido:', req.file.path);

    try {
      // Transcrever o áudio usando a API Whisper
      console.log('Iniciando transcrição do áudio...');
      const transcricao = await openai.audio.transcriptions.create({
        file: fs.createReadStream(req.file.path),
        model: "whisper-1",
      });

      console.log('Transcrição completa:', transcricao.text);

      // Gerar resposta espiritual baseada na transcrição
      const respostaEspiritual = await gerarRespostaEspiritual(transcricao.text);
      
      // Gerar áudio da resposta
      const arquivoAudio = await gerarAudio(respostaEspiritual);

      // Remover o arquivo de áudio enviado
      fs.unlinkSync(req.file.path);
      console.log('Arquivo de entrada removido:', req.file.path);

      res.json({
        transcricao: transcricao.text,
        mensagem: respostaEspiritual,
        audio: arquivoAudio
      });
    } catch (error) {
      console.error('Erro ao processar áudio:', error);
      
      // Remover o arquivo de áudio em caso de erro
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log('Arquivo de entrada removido após erro:', req.file.path);
      }
      
      res.status(500).json({ erro: 'Erro ao processar o áudio', detalhes: error.message });
    }
  } catch (error) {
    console.error('Erro geral no processamento de áudio:', error);
    res.status(500).json({ erro: 'Erro interno do servidor', detalhes: error.message });
  }
});

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  console.log(`Diretório público: ${publicPath}`);
  console.log(`Diretório de uploads: ${uploadsPath}`);
}); 