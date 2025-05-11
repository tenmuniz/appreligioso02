# Aplicativo de Acolhimento Espiritual

Uma aplicação web que oferece conforto espiritual através de mensagens personalizadas e orações em formato de texto e áudio.

## Funcionalidades

- Envio de mensagens de texto para receber conforto espiritual
- Gravação de mensagens de voz para transcrição e resposta
- Upload de arquivos de áudio para transcrição e resposta
- Respostas personalizadas geradas com IA
- Conversão das respostas em áudio com voz natural
- Botões de compartilhamento para WhatsApp e Facebook
- Download dos arquivos de áudio das orações

## Tecnologias Utilizadas

- **Backend**: Node.js com Express
- **Frontend**: HTML, CSS e JavaScript puro
- **IA e ML**: OpenAI GPT-4 para geração de texto, Whisper para transcrição de áudio, TTS-1 para síntese de voz
- **Implantação**: Vercel

## Configuração do Ambiente de Desenvolvimento

### Pré-requisitos

- Node.js 16.x ou superior
- Conta na OpenAI com chave de API válida

### Instalação

1. Clone o repositório:
   ```
   git clone https://github.com/tenmuniz/appreligioso02.git
   cd appreligioso02
   ```

2. Instale as dependências:
   ```
   npm install
   ```

3. Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
   ```
   PORT=3000
   OPENAI_API_KEY=sua-chave-api-aqui
   ```

4. Inicie o servidor de desenvolvimento:
   ```
   npm run dev
   ```

5. Acesse a aplicação em `http://localhost:3000`

## Implantação na Vercel

1. Faça fork do repositório no GitHub
2. Crie uma nova conta ou entre na sua conta da Vercel
3. Importe o repositório do GitHub
4. Configure as variáveis de ambiente na Vercel:
   - `OPENAI_API_KEY`: Sua chave de API da OpenAI

## Licença

Este projeto está licenciado sob a licença ISC. 