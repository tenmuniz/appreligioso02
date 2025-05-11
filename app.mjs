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
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.options('*', cors());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Configuração do Multer
const upload = multer({ 
  dest: uploadsPath,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// Rota para verificar se o servidor está funcionando
app.get('/status', (req, res) => {
  res.json({ 
    status: 'online', 
    openai: openai ? 'configurado' : 'não configurado',
    env: process.env.NODE_ENV,
    apiKeyDefined: !!process.env.OPENAI_API_KEY
  });
});

// Endpoint para processar texto
app.post('/enviar-texto', async (req, res) => {
  try {
    console.log('Recebida requisição de texto');
    console.log('Body:', req.body);
    
    const { mensagem } = req.body;
    
    if (!mensagem) {
      return res.status(400).json({ erro: 'Mensagem não fornecida' });
    }

    res.json({
      mensagem: `Resposta para: "${mensagem}" (API OpenAI desativada temporariamente para testes)`,
      audio: '/audio/resposta-teste.mp3'
    });
  } catch (error) {
    console.error('Erro no processamento de texto:', error);
    res.status(500).json({ 
      erro: 'Erro ao processar a mensagem',
      detalhes: error.message,
      stack: error.stack
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

    console.log('Arquivo recebido:', req.file);

    res.json({
      transcricao: "Texto de teste (transcrição não ativa para debug)",
      mensagem: "Resposta espiritual de teste (API OpenAI desativada temporariamente para testes)",
      audio: '/audio/resposta-teste.mp3'
    });
  } catch (error) {
    console.error('Erro no processamento de áudio:', error);
    res.status(500).json({ 
      erro: 'Erro ao processar áudio',
      detalhes: error.message,
      stack: error.stack
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
    availableRoutes: [
      '/',
      '/status',
      '/enviar-texto',
      '/enviar-audio'
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