// Cache per memorizzare le barzellette una volta scaricate
let cachedJokes = [];
let lastJokesIndices = []; // Tiene traccia degli indici delle ultime barzellette per evitare ripetizioni
let currentJoke = "";

// Gestione del Menu Laterale (Sidebar)
function toggleMenu() {
    const sideMenu = document.getElementById('side-menu');
    if (sideMenu.style.width === '280px') {
        sideMenu.style.width = '0';
    } else {
        sideMenu.style.width = '280px';
    }
}

// Legge le barzellette (dall'array in barzellette_data.js o tramite fetch come fallback)
async function getJokes() {
    if (cachedJokes.length > 0) {
        return cachedJokes;
    }
    
    // Se le barzellette sono già state caricate localmente in barzellette_data.js, usale subito
    if (window.barzelletteData && window.barzelletteData.length > 0) {
        cachedJokes = window.barzelletteData;
        return cachedJokes;
    }
    
    try {
        const response = await fetch('barzellette.txt');
        if (!response.ok) {
            throw new Error('Impossibile caricare il file delle barzellette.');
        }
        const text = await response.text();
        // Filtra le righe vuote e rimuove spazi bianchi all'inizio e alla fine
        cachedJokes = text.split('\n')
                          .map(line => line.trim())
                          .filter(line => line.length > 0);
        return cachedJokes;
    } catch (error) {
        console.error('Errore durante il caricamento (fallback fetch):', error);
        return [];
    }
}

// Mostra una barzelletta casuale con animazione di transizione
async function showMessage() {
    const jokes = await getJokes();
    const messageElement = document.getElementById('message');
    
    if (jokes.length === 0) {
        messageElement.textContent = 'Errore nel caricamento delle barzellette. Riprova più tardi!';
        messageElement.style.display = 'block';
        return;
    }

    // Seleziona un indice casuale assicurandoti che non sia tra gli ultimi mostrati
    let randomIndex;
    const maxHistory = Math.min(15, Math.floor(jokes.length / 2));
    
    do {
        randomIndex = Math.floor(Math.random() * jokes.length);
    } while (lastJokesIndices.includes(randomIndex) && jokes.length > 1);

    // Aggiorna la cronologia degli indici
    lastJokesIndices.push(randomIndex);
    if (lastJokesIndices.length > maxHistory) {
        lastJokesIndices.shift();
    }

    const jokeText = jokes[randomIndex];
    currentJoke = jokeText;

    // Animazione di uscita
    messageElement.classList.add('fade-out');
    
    setTimeout(() => {
        messageElement.textContent = jokeText;
        // Rimuove la classe placeholder se presente
        messageElement.classList.remove('placeholder-text');
        
        // Reset voti basati sull'hash della barzelletta
        updateReactions(jokeText);
        
        // Animazione di entrata
        messageElement.classList.remove('fade-out');
        messageElement.classList.add('fade-in');
        
        setTimeout(() => {
            messageElement.classList.remove('fade-in');
        }, 300);
    }, 200);
}

// Genera un hash univoco per ciascuna barzelletta
function getJokeHash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}

// Gestione delle reazioni/voti (illusioni di popolarità locali persistenti)
function updateReactions(jokeText) {
    const hash = getJokeHash(jokeText);
    
    // Calcoliamo voti base fittizi partendo dall'hash per consistenza
    let baseFunny = (hash % 85) + 14;
    let baseCringe = (hash % 140) + 32;
    
    // Controlliamo se l'utente ha già votato questa specifica barzelletta
    const voteKey = `vote_${hash}`;
    const userVote = localStorage.getItem(voteKey);
    
    const funnyBtn = document.querySelector('.reaction-btn:nth-child(1)');
    const cringeBtn = document.querySelector('.reaction-btn:nth-child(2)');
    
    if (!funnyBtn || !cringeBtn) return;
    
    funnyBtn.classList.remove('voted');
    cringeBtn.classList.remove('voted');
    
    if (userVote === 'funny') {
        baseFunny += 1;
        funnyBtn.classList.add('voted');
    } else if (userVote === 'cringe') {
        baseCringe += 1;
        cringeBtn.classList.add('voted');
    }
    
    const countFunnyEl = document.getElementById('react-funny-count');
    const countCringeEl = document.getElementById('react-cringe-count');
    if (countFunnyEl) countFunnyEl.textContent = baseFunny;
    if (countCringeEl) countCringeEl.textContent = baseCringe;
}

function react(type) {
    if (!currentJoke) return;
    
    const hash = getJokeHash(currentJoke);
    const voteKey = `vote_${hash}`;
    const currentVote = localStorage.getItem(voteKey);
    
    if (currentVote) {
        // Se ha già votato la stessa cosa, rimuove il voto
        if (currentVote === type) {
            localStorage.removeItem(voteKey);
        } else {
            // Altrimenti cambia il voto
            localStorage.setItem(voteKey, type);
        }
    } else {
        // Nuovo voto
        localStorage.setItem(voteKey, type);
    }
    
    // Aggiorna l'interfaccia
    updateReactions(currentJoke);
}

// Copia la barzelletta negli appunti con feedback visivo (Toast)
function copyJoke() {
    if (!currentJoke) {
        showToast("Genera prima una barzelletta! 🤫");
        return;
    }
    
    navigator.clipboard.writeText(currentJoke).then(() => {
        showToast("Barzelletta copiata! 📋");
    }).catch(err => {
        console.error('Errore copia negli appunti:', err);
        // Fallback per vecchi browser o permessi mancanti
        const textarea = document.createElement('textarea');
        textarea.value = currentJoke;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast("Barzelletta copiata! 📋");
        } catch (e) {
            showToast("Errore durante la copia 😢");
        }
        document.body.removeChild(textarea);
    });
}

// Condivisione rapida della barzelletta
function shareJoke() {
    if (!currentJoke) {
        showToast("Genera prima una barzelletta! 🤫");
        return;
    }
    
    const shareText = `"${currentJoke}"\n\nLeggi altre barzellette pessime su: https://barzellettebrutte.it`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Barzellette Brutte',
            text: shareText,
            url: 'https://barzellettebrutte.it'
        }).catch(err => console.log('Condivisione annullata', err));
    } else {
        // Fallback WhatsApp
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
    }
}

// Mostra un toast di notifica
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// Genera un'immagine quadrata stile social della barzelletta e la scarica
function downloadJokeImage() {
    if (!currentJoke) {
        showToast("Genera prima una barzelletta! 🤫");
        return;
    }
    
    const hash = getJokeHash(currentJoke);
    
    // Creiamo un canvas temporaneo
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    
    // Disegniamo lo sfondo (Giallo Comic del Brand)
    ctx.fillStyle = '#FFDE47';
    ctx.fillRect(0, 0, 1080, 1080);
    
    // Aggiungiamo un pattern di mezzitoni o griglia leggerissima
    ctx.fillStyle = '#F2D022';
    const dotSize = 8;
    const spacing = 36;
    for (let x = spacing / 2; x < 1080; x += spacing) {
        for (let y = spacing / 2; y < 1080; y += spacing) {
            ctx.beginPath();
            ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Disegniamo la Card centrale (stile Neo-brutalist)
    const cardX = 90;
    const cardY = 90;
    const cardWidth = 900;
    const cardHeight = 900;
    const shadowOffset = 18;
    
    // Ombra piatta della card
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(cardX + shadowOffset, cardY + shadowOffset, cardWidth, cardHeight);
    
    // Sfondo della card
    ctx.fillStyle = '#FCFBF4';
    ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
    
    // Bordo spesso della card
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 10;
    ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);
    
    // Header della Card (Finestra stile Retro OS)
    const headerHeight = 70;
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(cardX, cardY, cardWidth, headerHeight);
    
    // Disegniamo i tre cerchi colorati dell'header
    const dotColors = ['#FF5F56', '#FFBD2E', '#27C93F'];
    const startDotX = cardX + 30;
    const dotY = cardY + (headerHeight / 2);
    
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(startDotX + (i * 24), dotY, 8, 0, Math.PI * 2);
        ctx.fillStyle = dotColors[i];
        ctx.fill();
    }
    
    // Scritta Header
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BARZELLETTEBRUTTE.IT', cardX + (cardWidth / 2), dotY);
    
    // Testo della barzelletta
    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'bold 44px Georgia, serif'; // Font elegante e leggibile su canvas
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const textMaxWidth = cardWidth - 120;
    const lineHeight = 65;
    const textCenterY = cardY + (cardHeight / 2) - 20;
    
    // Funzione di wrapping del testo
    wrapTextOnCanvas(ctx, currentJoke, cardX + (cardWidth / 2), textCenterY, textMaxWidth, lineHeight);
    
    // URL in basso
    ctx.fillStyle = '#666666';
    ctx.font = '22px Arial, Helvetica, sans-serif';
    ctx.fillText('Seguici su www.barzellettebrutte.it', cardX + (cardWidth / 2), cardY + cardHeight - 35);
    
    // Download dell'immagine
    const link = document.createElement('a');
    link.download = `barzelletta_brutta_${hash}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    showToast("Immagine scaricata! 📸");
}

// Funzione helper per avvolgere il testo e centrarlo verticalmente
function wrapTextOnCanvas(ctx, text, x, centerY, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let lines = [];
    
    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);
    
    // Calcoliamo la coordinata Y iniziale per centrare il blocco di testo verticalmente
    const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i].trim(), x, startY + (i * lineHeight));
    }
}

// Carica una barzelletta all'avvio della pagina
window.addEventListener('DOMContentLoaded', () => {
    showMessage();
});