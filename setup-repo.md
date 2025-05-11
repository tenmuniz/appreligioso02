# Instruções para Configuração do Repositório

## Configurar o Git e enviar para o GitHub

Abra o terminal e execute os seguintes comandos na raiz do projeto:

```bash
# Inicializar o repositório Git
git init

# Adicionar os arquivos
git add .

# Fazer o primeiro commit
git commit -m "Primeira versão do aplicativo de acolhimento espiritual"

# Adicionar o repositório remoto
git remote add origin https://github.com/tenmuniz/appreligioso02.git

# Enviar para o GitHub
git push -u origin master  # ou main, dependendo da branch padrão
```

## Configurar na Vercel

1. Acesse [Vercel](https://vercel.com/) e faça login com sua conta GitHub
2. Importe o projeto `appreligioso02` do GitHub
3. Configure as variáveis de ambiente:
   - `OPENAI_API_KEY`: Sua chave da API OpenAI
4. Clique em "Deploy" para implantar o projeto

## Verificar a implantação

Após a implantação bem-sucedida, a Vercel fornecerá uma URL para acessar o aplicativo, como:
```
https://appreligioso02.vercel.app/
```

## Atualizações futuras

Para enviar atualizações para o GitHub e Vercel:

```bash
# Adicionar mudanças
git add .

# Commit com mensagem descritiva
git commit -m "Descrição das alterações"

# Enviar para o GitHub
git push

# A Vercel implantará automaticamente as mudanças
``` 