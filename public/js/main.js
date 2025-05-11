document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const messageInput = document.getElementById('message-input');
    const sendTextBtn = document.getElementById('send-text-btn');
    const audioFileInput = document.getElementById('audio-file');
    const recordAudioBtn = document.getElementById('record-audio-btn');
    const sendAudioFileBtn = document.getElementById('send-audio-file-btn');
    const responsePlaceholder = document.getElementById('response-placeholder');
    const responseContent = document.getElementById('response-content');
    const responseMessage = document.getElementById('response-message');
    const prayerAudio = document.getElementById('prayer-audio');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const audioProgress = document.getElementById('audio-progress');
    const audioProgressFilled = document.getElementById('audio-progress-filled');
    const audioTime = document.getElementById('audio-time');
    const shareWhatsApp = document.getElementById('share-whatsapp');
    const shareFacebook = document.getElementById('share-facebook');
    const downloadAudioBtn = document.getElementById('download-audio-btn');
    const whatsappText = document.getElementById('whatsapp-text');
    const whatsappAudio = document.getElementById('whatsapp-audio');
    
    // Variáveis para gravação de áudio
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    
    // Envio de mensagem de texto
    sendTextBtn.addEventListener('click', function() {
        const mensagem = messageInput.value.trim();
        if (!mensagem) {
            alert('Por favor, escreva uma mensagem antes de enviar.');
            return;
        }
        
        mostrarLoading();
        
        fetch('/enviar-texto', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ mensagem: mensagem })
        })
        .then(response => {
            console.log('Status da resposta:', response.status);
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.erro || 'Erro ao enviar mensagem');
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Dados recebidos:', data);
            displayResponse(data.mensagem);
            prayerAudio.src = data.audio;
            setupShareButtons(data.mensagem);
            setupDownloadButton(data.audio);
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Ocorreu um erro ao processar sua mensagem: ' + error.message);
            resetUI();
        });
    });
    
    // Abrir seletor de arquivo de áudio
    sendAudioFileBtn.addEventListener('click', function() {
        audioFileInput.click();
    });
    
    // Quando um arquivo de áudio é selecionado
    audioFileInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            enviarArquivoAudio(this.files[0]);
        }
    });
    
    // Gravar áudio do microfone
    recordAudioBtn.addEventListener('click', function() {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    });
    
    // Configuração do player de áudio
    playPauseBtn.addEventListener('click', togglePlayPause);
    
    prayerAudio.addEventListener('timeupdate', updateProgress);
    prayerAudio.addEventListener('loadedmetadata', setupAudio);
    prayerAudio.addEventListener('ended', resetPlayer);
    
    audioProgress.addEventListener('click', setProgress);
    
    // Funções de áudio
    function startRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                isRecording = true;
                recordAudioBtn.innerHTML = '<i class="fas fa-stop"></i> Parar Gravação';
                recordAudioBtn.classList.add('recording-animation');
                
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.addEventListener('dataavailable', e => {
                    audioChunks.push(e.data);
                });
                
                mediaRecorder.addEventListener('stop', () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                    enviarArquivoAudio(audioBlob);
                });
                
                mediaRecorder.start();
            })
            .catch(error => {
                console.error('Erro ao acessar o microfone:', error);
                alert('Não foi possível acessar seu microfone. Verifique as permissões do navegador.');
            });
    }
    
    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            recordAudioBtn.innerHTML = '<i class="fas fa-microphone"></i> Gravar Áudio';
            recordAudioBtn.classList.remove('recording-animation');
            
            // Parar todas as faixas do stream
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }
    
    function enviarArquivoAudio(audioBlob) {
        const formData = new FormData();
        formData.append('arquivo', audioBlob);
        
        mostrarLoading();
        
        fetch('/enviar-audio', {
            method: 'POST',
            headers: {
                'Accept': 'application/json'
            },
            body: formData
        })
        .then(response => {
            console.log('Status da resposta:', response.status);
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error('Erro ao enviar áudio: ' + (err.detalhes || err.erro || 'Erro desconhecido'));
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Dados recebidos:', data);
            displayResponse(data.mensagem);
            prayerAudio.src = data.audio;
            setupShareButtons(data.mensagem);
            setupDownloadButton(data.audio);
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Ocorreu um erro ao processar seu áudio: ' + error.message);
            resetUI();
        });
    }
    
    // Funções do player de áudio
    function togglePlayPause() {
        if (prayerAudio.paused) {
            prayerAudio.play();
            playIcon.className = 'fas fa-pause';
        } else {
            prayerAudio.pause();
            playIcon.className = 'fas fa-play';
        }
    }
    
    function updateProgress() {
        const percent = (prayerAudio.currentTime / prayerAudio.duration) * 100;
        audioProgressFilled.style.width = `${percent}%`;
        
        // Atualizar o tempo
        const currentMinutes = Math.floor(prayerAudio.currentTime / 60);
        const currentSeconds = Math.floor(prayerAudio.currentTime % 60);
        const durationMinutes = Math.floor(prayerAudio.duration / 60) || 0;
        const durationSeconds = Math.floor(prayerAudio.duration % 60) || 0;
        
        audioTime.textContent = `${pad(currentMinutes)}:${pad(currentSeconds)} / ${pad(durationMinutes)}:${pad(durationSeconds)}`;
    }
    
    function setupAudio() {
        audioTime.textContent = '00:00 / 00:00';
        audioProgressFilled.style.width = '0%';
    }
    
    function setProgress(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = prayerAudio.duration;
        
        prayerAudio.currentTime = (clickX / width) * duration;
    }
    
    function resetPlayer() {
        playIcon.className = 'fas fa-play';
        audioProgressFilled.style.width = '0%';
    }
    
    function pad(number) {
        return ('0' + number).slice(-2);
    }
    
    // Funções de compartilhamento
    function setupShareButtons(mensagem) {
        // Preparar mensagem para compartilhamento
        const titulo = 'Mensagem de Acolhimento Espiritual ✨🙏';
        const url = window.location.href;
        const audioUrl = prayerAudio.src;
        const audioFullUrl = `${window.location.origin}${audioUrl}`;
        
        // Formatação bonita para o WhatsApp com emojis
        const mensagemFormatadaWhatsApp = formatarMensagemWhatsApp(mensagem);
        const mensagemAudioWhatsApp = formatarMensagemAudio(mensagem);
        
        // Função para atualizar o link do WhatsApp com base na opção selecionada
        function atualizarLinkWhatsApp() {
            if (whatsappText.checked) {
                shareWhatsApp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagemFormatadaWhatsApp)}`;
            } else {
                shareWhatsApp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagemAudioWhatsApp)}`;
            }
        }
        
        // Atualizar inicialmente
        atualizarLinkWhatsApp();
        
        // Adicionar event listeners para opções de WhatsApp
        whatsappText.addEventListener('change', atualizarLinkWhatsApp);
        whatsappAudio.addEventListener('change', atualizarLinkWhatsApp);
        
        // WhatsApp
        shareWhatsApp.target = "_blank";
        shareWhatsApp.onclick = function(e) {
            e.preventDefault();
            window.open(this.href, '_blank');
        };
        
        // Facebook
        const mensagemCurta = mensagem.substring(0, 100) + '...';
        shareFacebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(mensagemCurta)}`;
        shareFacebook.target = "_blank";
        shareFacebook.onclick = function(e) {
            e.preventDefault();
            window.open(this.href, '_blank');
        };
    }
    
    // Função para formatar mensagem para o WhatsApp com emojis
    function formatarMensagemWhatsApp(mensagem) {
        // Dividir mensagem em parágrafos
        const paragrafos = mensagem.split('\n\n');
        
        // Identificar se há uma oração no final (geralmente os últimos 2-3 parágrafos)
        let mensagemPrincipal = [];
        let oracao = [];
        
        if (paragrafos.length > 3) {
            // Assume que os últimos 2 parágrafos são a oração
            mensagemPrincipal = paragrafos.slice(0, -2);
            oracao = paragrafos.slice(-2);
        } else if (paragrafos.length > 1) {
            // Se tiver poucos parágrafos, assume que o último é a oração
            mensagemPrincipal = paragrafos.slice(0, -1);
            oracao = [paragrafos[paragrafos.length - 1]];
        } else {
            // Se for só um parágrafo, usa ele todo
            mensagemPrincipal = paragrafos;
        }
        
        // Adicionar emojis e formatação à mensagem principal
        let mensagemFormatada = '✨ *MENSAGEM DE ACOLHIMENTO ESPIRITUAL* ✨\n\n';
        
        mensagemPrincipal.forEach(paragrafo => {
            // Adicionar emojis contextualmente baseados no conteúdo
            if (paragrafo.toLowerCase().includes('deus')) {
                mensagemFormatada += '🙏 ';
            } else if (paragrafo.toLowerCase().includes('paz')) {
                mensagemFormatada += '☮️ ';
            } else if (paragrafo.toLowerCase().includes('amor')) {
                mensagemFormatada += '❤️ ';
            } else if (paragrafo.toLowerCase().includes('esperança')) {
                mensagemFormatada += '✨ ';
            } else if (paragrafo.toLowerCase().includes('fé')) {
                mensagemFormatada += '✝️ ';
            } else {
                mensagemFormatada += '💫 ';
            }
            
            mensagemFormatada += paragrafo + '\n\n';
        });
        
        // Adicionar a oração com formatação especial
        if (oracao.length > 0) {
            mensagemFormatada += '🕊️ *ORAÇÃO PERSONALIZADA* 🕊️\n\n';
            oracao.forEach(paragrafoOracao => {
                mensagemFormatada += paragrafoOracao + '\n\n';
            });
        }
        
        // Adicionar link do áudio para reprodução direta
        mensagemFormatada += '🎵 *Clique para ouvir esta mensagem em áudio:*\n';
        
        // Garantir que a URL seja absoluta
        const audioUrlAbsoluta = prayerAudio.src.startsWith('http') 
            ? prayerAudio.src 
            : window.location.origin + prayerAudio.src;
            
        mensagemFormatada += audioUrlAbsoluta + '\n\n';
        
        // Adicionar assinatura
        mensagemFormatada += '🙏 Compartilhe esta mensagem de fé e esperança com quem precisa 🙏';
        
        return mensagemFormatada;
    }
    
    // Função para formatar mensagem apenas com o link de áudio
    function formatarMensagemAudio(mensagem) {
        // Extrair apenas o título e o link do áudio
        const paragrafos = mensagem.split('\n\n');
        let titulo = paragrafos[0];
        
        if (titulo.length > 50) {
            titulo = titulo.substring(0, 50) + '...';
        }
        
        // Garantir que a URL seja absoluta
        const audioUrlAbsoluta = prayerAudio.src.startsWith('http') 
            ? prayerAudio.src 
            : window.location.origin + prayerAudio.src;
        
        let mensagemAudio = '🎵 *MENSAGEM DE ACOLHIMENTO ESPIRITUAL* 🎵\n\n';
        mensagemAudio += `"${titulo}"\n\n`;
        mensagemAudio += '🔊 *Clique no link abaixo para ouvir a mensagem completa:*\n';
        mensagemAudio += audioUrlAbsoluta + '\n\n';
        mensagemAudio += '✝️ Uma mensagem de fé para fortalecer seu dia 🙏';
        
        return mensagemAudio;
    }
    
    // Funções da UI
    function mostrarLoading() {
        responsePlaceholder.style.display = 'block';
        responseContent.style.display = 'none';
        
        // Adicionar indicador de carregamento
        responsePlaceholder.innerHTML = `
            <div class="loading-icon">
                <div class="loading-circle"></div>
            </div>
            <p class="response-text">Preparando sua mensagem de conforto espiritual...</p>
        `;
        
        // Rolar para o card de resposta
        const responseCard = document.getElementById('response-card');
        responseCard.scrollIntoView({ behavior: 'smooth' });
    }
    
    function resetUI() {
        responsePlaceholder.innerHTML = `
            <div class="response-icon">
                <i class="fas fa-dove"></i>
            </div>
            <p class="response-text">Envie sua mensagem para receber palavras de conforto e acolhimento espiritual</p>
        `;
        responsePlaceholder.style.display = 'block';
        responseContent.style.display = 'none';
    }
    
    function displayResponse(text) {
        // Formatar o texto da resposta
        const formattedText = text.split('\n\n')
            .map(paragraph => `<p class="mb-3">${paragraph.replace(/\n/g, '<br>')}</p>`)
            .join('');
        
        responseMessage.innerHTML = formattedText;
        responsePlaceholder.style.display = 'none';
        responseContent.style.display = 'block';
        
        // Animar o aparecimento da resposta usando GSAP
        gsap.from(responseContent, {
            opacity: 0,
            y: 20,
            duration: 0.5,
            ease: "power2.out"
        });
    }
    
    // Configurar o botão de download
    function setupDownloadButton(audioPath) {
        // Define o caminho do arquivo para download
        downloadAudioBtn.href = audioPath;
        
        // Define o nome do arquivo para download (extraído da URL)
        const fileName = audioPath.split('/').pop();
        downloadAudioBtn.setAttribute('download', fileName);
        
        // Evento de clique - apenas para fins de log
        downloadAudioBtn.addEventListener('click', function(e) {
            console.log('Baixando arquivo de áudio:', fileName);
        });
    }
    
    // Remover a tela de carregamento após o carregamento da página
    setTimeout(function() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.opacity = '0';
        setTimeout(function() {
            loadingScreen.style.display = 'none';
        }, 500);
    }, 1500);
}); 