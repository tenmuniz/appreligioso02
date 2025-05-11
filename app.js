// Este arquivo existe apenas para compatibilidade
// O aplicativo real está em app.mjs

console.log('⚠️ AVISO: app.js é apenas um redirecionamento. Use node app.mjs para iniciar o servidor.');

// Importar o arquivo real
import('./app.mjs').catch(err => {
  console.error('Erro ao carregar app.mjs:', err);
  process.exit(1);
}); 