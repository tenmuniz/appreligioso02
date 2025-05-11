import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { OpenAI } from 'openai';
import cors from 'cors';
import dotenv from 'dotenv';

// Configurar variáveis de ambiente
dotenv.config();

// DEBUG: Mostrar variáveis de ambiente e informações do sistema
console.log('==== DIAGNÓSTICO DE INICIALIZAÇÃO ====');
console.log('Ambiente:', process.env.NODE_ENV);
console.log('Chave OpenAI:', process.env.OPENAI_API_KEY ? 'Presente (primeiros 4 caracteres: ' + process.env.OPENAI_API_KEY.substring(0, 4) + ')' : 'AUSENTE');
console.log('Porta:', process.env.PORT);
console.log('Plataforma:', process.platform);
console.log('Versão do Node:', process.version);

// Configurar __dirname para módulos ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('Diretório atual:', __dirname);

// Inicializar aplicação Express
const app = express();
const port = process.env.PORT || 3000;

// Configurar OpenAI
let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('Cliente OpenAI configurado com sucesso');
} catch (error) {
  console.error('ERRO CRÍTICO ao configurar cliente OpenAI:', error);
}

// Definir caminhos de diretórios
const publicPath = path.join(__dirname, 'public');
const uploadsPath = path.join(__dirname, 'uploads');

// Verificar e criar diretórios necessários
try {
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log(`Diretório de uploads criado: ${uploadsPath}`);
  }

  if (!fs.existsSync(publicPath)) {
    fs.mkdirSync(publicPath, { recursive: true });
    console.log(`Diretório público criado: ${publicPath}`);
  }

  const audioDirPath = path.join(publicPath, 'audio');
  if (!fs.existsSync(audioDirPath)) {
    fs.mkdirSync(audioDirPath, { recursive: true });
    console.log(`Diretório de áudio criado: ${audioDirPath}`);
  }
} catch (error) {
  console.error('ERRO ao criar diretórios:', error);
}

// Configuração de Middleware
app.use(express.json());
app.use(express.static(publicPath));
app.use(cors({ 
  origin: '*', 
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.options('*', cors());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.method === 'POST') {
    console.log('Body:', JSON.stringify(req.body).substring(0, 200) + '...');
  }
  next();
});

// Configuração do Multer
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
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
    console.log('Gerando resposta espiritual para:', mensagem.substring(0, 50) + '...');
    
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
    // Tratamento de fallback para contornar problemas com a API
    if (error.message.includes('API')) {
      return `Não foi possível gerar uma resposta personalizada neste momento. Mas lembre-se: os momentos difíceis são oportunidades para crescimento espiritual. A fé nos fortalece e nos guia mesmo nas situações mais desafiadoras. Mantenha sua esperança e busque apoio na oração.\n\nOração: Que a paz divina esteja com você, que encontre força em sua fé, e que seja guiado com sabedoria para superar seus desafios. Amém.`;
    }
    throw error;
  }
}

// Função para gerar áudio a partir do texto
async function gerarAudio(texto) {
  try {
    console.log('Gerando áudio para resposta...');
    
    // Tentar usar a API OpenAI para TTS
    try {
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
      
      // Garantir que o caminho seja relativo
      const audioUrl = `/audio/${audioFileName}`;
      console.log('URL de áudio gerada:', audioUrl);
      
      return audioUrl;
    } catch (ttsError) {
      console.error('Erro ao usar API TTS, usando áudio de fallback:', ttsError);
      // Fallback para um áudio genérico em caso de erro
      return '/audio/resposta-teste.mp3';
    }
  } catch (error) {
    console.error('Erro crítico ao gerar áudio:', error);
    // Fallback em caso de erro crítico
    return '/audio/resposta-teste.mp3';
  }
}

// Rota para verificar se o servidor está funcionando
app.get('/status', (req, res) => {
  res.json({ 
    status: 'online', 
    openai: openai ? 'configurado' : 'não configurado',
    env: process.env.NODE_ENV,
    apiKeyDefined: !!process.env.OPENAI_API_KEY
  });
});

// Rota para acessar arquivos de áudio
app.get('/audio/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(publicPath, 'audio', filename);
  
  console.log(`Requisição de arquivo de áudio: ${filename}`);
  
  if (fs.existsSync(filepath)) {
    res.sendFile(filepath);
  } else {
    console.log('Arquivo de áudio não encontrado:', filepath);
    res.status(404).send('Arquivo não encontrado');
  }
});

// Endpoint para processar texto
app.post('/enviar-texto', async (req, res) => {
  try {
    console.log('Recebida requisição de texto');
    const { mensagem } = req.body;
    
    if (!mensagem) {
      return res.status(400).json({ erro: 'Mensagem não fornecida' });
    }

    // Usar API OpenAI ou resposta de fallback
    let respostaEspiritual;
    try {
      respostaEspiritual = await gerarRespostaEspiritual(mensagem);
      console.log('Resposta espiritual gerada com sucesso');
    } catch (gptError) {
      console.error('Erro ao gerar resposta via GPT:', gptError);
      respostaEspiritual = `Resposta para: "${mensagem}" (Não foi possível gerar uma resposta personalizada)`;
    }
    
    // Gerar áudio (com tentativa de usar API ou fallback)
    const arquivoAudio = await gerarAudio(respostaEspiritual);

    console.log('Resposta completa enviada');
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
      return res.status(400).json({ erro: 'Nenhum arquivo de áudio enviado' });
    }

    console.log('Arquivo recebido:', req.file.path);
    let transcricao = '';
    
    // Tentar transcrever o áudio
    try {
      console.log('Iniciando transcrição do áudio...');
      const resultado = await openai.audio.transcriptions.create({
        file: fs.createReadStream(req.file.path),
        model: "whisper-1",
      });
      transcricao = resultado.text;
      console.log('Transcrição completa:', transcricao);
    } catch (whisperError) {
      console.error('Erro ao transcrever áudio:', whisperError);
      transcricao = "Não foi possível transcrever o áudio. Por favor, tente novamente.";
    }
    
    // Gerar resposta espiritual (com fallback se necessário)
    let respostaEspiritual;
    try {
      respostaEspiritual = await gerarRespostaEspiritual(transcricao);
    } catch (gptError) {
      console.error('Erro ao gerar resposta:', gptError);
      respostaEspiritual = "Recebemos seu áudio, mas não foi possível gerar uma resposta personalizada. Por favor, tente novamente mais tarde.";
    }
    
    // Gerar áudio da resposta (com fallback se necessário)
    const arquivoAudio = await gerarAudio(respostaEspiritual);

    // Remover o arquivo de áudio enviado
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log('Arquivo de entrada removido:', req.file.path);
      }
    } catch (unlinkError) {
      console.error('Erro ao remover arquivo de entrada:', unlinkError);
    }

    res.json({
      transcricao: transcricao,
      mensagem: respostaEspiritual,
      audio: arquivoAudio
    });
  } catch (error) {
    console.error('Erro no processamento de áudio:', error);
    
    // Tentar remover o arquivo de áudio em caso de erro
    try {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupError) {
      console.error('Erro ao limpar arquivo temporário:', cleanupError);
    }
    
    res.status(500).json({ 
      erro: 'Erro ao processar o áudio', 
      detalhes: error.message
    });
  }
});

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Rota de fallback - para debug
app.use((req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    requestedPath: req.path,
    method: req.method,
    availableRoutes: [
      '/',
      '/status',
      '/enviar-texto',
      '/enviar-audio',
      '/audio/:filename'
    ]
  });
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`==== SERVIDOR INICIADO ====`);
  console.log(`Rodando em: http://localhost:${port}`);
  console.log(`Diretório público: ${publicPath}`);
  console.log(`Diretório de uploads: ${uploadsPath}`);
}); 