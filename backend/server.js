const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const distPath = path.join(__dirname, '../frontend/dist');
if (!require('fs').existsSync(distPath)) {
  console.error(`ERRO CRÍTICO: Pasta do frontend não encontrada em: ${distPath}`);
  console.error('Certifique-se de rodar "npm run build" na raiz ou no frontend antes de iniciar.');
}
app.use(express.static(distPath));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Dados Mockados (Em memória para protótipo)
const LOCAIS = [
  { id: '1', name: 'Bar do Zé', type: 'Bar', description: 'Cerveja gelada e petiscos.' },
  { id: '2', name: 'Boate Neon', type: 'Boate', description: 'Música eletrônica e drinks.' },
  { id: '3', name: 'Shopping Central', type: 'Shopping', description: 'Praça de alimentação e lojas.' },
  { id: '4', name: 'Restaurante Sabor', type: 'Restaurante', description: 'Comida caseira.' },
];

// Dados dos Jogos
const QUESTIONS = [
  { text: "Qual é a capital da França?", options: ["Londres", "Berlim", "Paris", "Madrid"], correct: 2 },
  { text: "Qual o maior planeta do Sistema Solar?", options: ["Terra", "Marte", "Júpiter", "Saturno"], correct: 2 },
  { text: "Quem pintou a Mona Lisa?", options: ["Van Gogh", "Da Vinci", "Picasso", "Michelangelo"], correct: 1 },
  { text: "Quanto é 2 + 2?", options: ["3", "4", "5", "6"], correct: 1 },
  { text: "Qual é o elemento químico com símbolo 'O'?", options: ["Ouro", "Oxigênio", "Ósmio", "Prata"], correct: 1 },
  { text: "Em que ano o homem pisou na lua pela primeira vez?", options: ["1959", "1969", "1979", "1989"], correct: 1 },
  { text: "Qual é o maior mamífero do mundo?", options: ["Elefante Africano", "Baleia Azul", "Girafa", "Rinoceronte"], correct: 1 },
  { text: "Quem escreveu 'Dom Casmurro'?", options: ["Machado de Assis", "José de Alencar", "Clarice Lispector", "Jorge Amado"], correct: 0 },
  { text: "Qual país é conhecido como a terra do sol nascente?", options: ["China", "Coreia do Sul", "Japão", "Tailândia"], correct: 2 },
  { text: "Quantos estados tem o Brasil?", options: ["24", "25", "26", "27"], correct: 2 },
  { text: "Qual é a cor da caixa preta dos aviões?", options: ["Preta", "Laranja", "Vermelha", "Amarela"], correct: 1 },
  { text: "O que é um 'bit' em informática?", options: ["Um programa", "Uma peça do hardware", "Dígito binário", "Um vírus"], correct: 2 },
  { text: "Quem descobriu o Brasil?", options: ["Pedro Álvares Cabral", "Cristóvão Colombo", "Vasco da Gama", "Fernão de Magalhães"], correct: 0 },
  { text: "Qual é o maior oceano do mundo?", options: ["Atlântico", "Índico", "Pacífico", "Ártico"], correct: 2 },
  { text: "Qual é o animal mais rápido do mundo?", options: ["Guepardo", "Leão", "Águia", "Falcão-peregrino"], correct: 3 },
  { text: "Quantos continentes existem?", options: ["5", "6", "7", "8"], correct: 1 },
  { text: "Qual é a moeda do Japão?", options: ["Dólar", "Euro", "Iene", "Won"], correct: 2 },
  { text: "Quem é o rei do pop?", options: ["Elvis Presley", "Michael Jackson", "Prince", "Freddie Mercury"], correct: 1 },
  { text: "Qual é o símbolo químico da água?", options: ["H2O", "CO2", "O2", "NaCl"], correct: 0 },
  { text: "Em que ano começou a Segunda Guerra Mundial?", options: ["1914", "1939", "1945", "1918"], correct: 1 },
  { text: "Qual é o menor país do mundo?", options: ["Mônaco", "Vaticano", "Malta", "San Marino"], correct: 1 },
  { text: "Quem pintou a 'A Última Ceia'?", options: ["Michelangelo", "Leonardo da Vinci", "Rafael", "Donatello"], correct: 1 },
  { text: "Qual é o maior país do mundo em área?", options: ["China", "EUA", "Rússia", "Canadá"], correct: 2 },
  { text: "Quem foi o primeiro presidente do Brasil?", options: ["Getúlio Vargas", "Deodoro da Fonseca", "Dom Pedro II", "Juscelino Kubitschek"], correct: 1 },
  { text: "Quantos jogadores tem um time de futebol em campo?", options: ["10", "11", "12", "9"], correct: 1 },
  { text: "Qual a fórmula química do sal de cozinha?", options: ["H2O", "NaCl", "CO2", "O2"], correct: 1 },
  { text: "Quem escreveu 'O Pequeno Príncipe'?", options: ["Antoine de Saint-Exupéry", "J.K. Rowling", "Machado de Assis", "Monteiro Lobato"], correct: 0 },
  { text: "Qual é a montanha mais alta do mundo?", options: ["K2", "Everest", "Kilimanjaro", "Aconcágua"], correct: 1 },
  { text: "Em que continente fica o Egito?", options: ["Ásia", "Europa", "África", "América"], correct: 2 },
  { text: "Qual é a velocidade da luz?", options: ["300.000 km/s", "150.000 km/s", "1.000 km/s", "Som do trovão"], correct: 0 },
  { text: "Quem é o autor da teoria da relatividade?", options: ["Isaac Newton", "Albert Einstein", "Galileu Galilei", "Nikola Tesla"], correct: 1 },
  { text: "Qual é o metal líquido à temperatura ambiente?", options: ["Ferro", "Mercúrio", "Ouro", "Prata"], correct: 1 },
  { text: "Quantos anos tem um século?", options: ["10", "50", "100", "1000"], correct: 2 },
  { text: "Qual é a capital da Austrália?", options: ["Sydney", "Melbourne", "Canberra", "Brisbane"], correct: 2 },
  { text: "Quem compôs a 9ª Sinfonia?", options: ["Mozart", "Bach", "Beethoven", "Chopin"], correct: 2 },
  { text: "Qual é o idioma mais falado do mundo?", options: ["Inglês", "Mandarim", "Espanhol", "Hindi"], correct: 1 }
];

const TRUTH_DARE = [
  "Verdade: Qual foi a coisa mais embaraçosa que você já fez?",
  "Desafio: Imite uma galinha por 10 segundos.",
  "Verdade: Qual é o seu maior medo?",
  "Desafio: Conte uma piada ruim.",
  "Verdade: Quem foi seu primeiro amor?",
  "Desafio: Faça 10 polichinelos agora.",
  "Verdade: Se você pudesse ser invisível por um dia, o que faria?",
  "Desafio: Deixe alguém do grupo pentear seu cabelo de um jeito maluco.",
  "Verdade: Qual foi a última mentira que você contou?",
  "Desafio: Fale com sotaque estrangeiro pelas próximas 3 rodadas.",
  "Verdade: O que você mudaria no seu corpo se pudesse?",
  "Desafio: Dance 'Macarena' sem música.",
  "Verdade: Você já se apaixonou por alguém do trabalho/escola?",
  "Desafio: Tente lamber seu próprio cotovelo.",
  "Verdade: Qual é o seu 'guilty pleasure' (prazer culposo) musical?",
  "Desafio: Poste uma foto engraçada sua no story agora (ou mostre pro grupo)."
];

const NEVER_HAVE_I_EVER = [
  "Eu nunca: Viajei para fora do país.",
  "Eu nunca: Quebrei um osso.",
  "Eu nunca: Mentiu para faltar ao trabalho/escola.",
  "Eu nunca: Comi comida que caiu no chão.",
  "Eu nunca: Fiquei acordado por 24 horas seguidas.",
  "Eu nunca: Usei o Tinder ou app de namoro.",
  "Eu nunca: Beijei alguém e me arrependi imediatamente.",
  "Eu nunca: Fui expulso da sala de aula.",
  "Eu nunca: Cantei no chuveiro achando que ninguém estava ouvindo.",
  "Eu nunca: Mandei mensagem para o(a) ex bêbado(a).",
  "Eu nunca: Roubei algo de um hotel (shampoo, toalha...).",
  "Eu nunca: Fingi estar doente para não sair.",
  "Eu nunca: Pesquisei meu próprio nome no Google.",
  "Eu nunca: Saí de casa sem roupa íntima."
];

// Estado da Aplicação
let users = {}; // socketId -> { id, name, avatar, localId, currentScore }
let rooms = {}; // localId -> [userIds]
let games = {}; // localId -> { active: boolean, type: string, currentQuestion: any }

// Rotas API
app.get('/api/locais', async (req, res) => {
  const { lat, lng, search, type, keyword } = req.query;

  // Se não houver coordenadas nem busca, retorna lista vazia
  if (!lat && !lng && !search) {
      return res.json([]);
  }

  try {
      let searchLat = lat;
      let searchLng = lng;

      // Se veio um termo de busca (ex: "Leblon"), converte para Lat/Lng primeiro
      if (search && (!lat || !lng)) {
          const geoRes = await axios.get(`https://nominatim.openstreetmap.org/search`, {
              params: {
                  q: search,
                  format: 'json',
                  limit: 1
              },
              headers: { 'User-Agent': 'SocialSpot/1.0' }
          });
          
          if (geoRes.data && geoRes.data.length > 0) {
              searchLat = geoRes.data[0].lat;
              searchLng = geoRes.data[0].lon;
          } else {
              return res.json([]); // Nada encontrado
          }
      }

      // Construção dinâmica da query Overpass
      const radius = 3000; // Aumentei um pouco o raio para 3km
      
      let typeFilter = '';
      if (type === 'bar') typeFilter = '["amenity"~"bar|pub|biergarten"]';
      else if (type === 'restaurant') typeFilter = '["amenity"~"restaurant|fast_food|food_court|bistro"]';
      else if (type === 'nightclub') typeFilter = '["amenity"~"nightclub|social_club"]';
      else if (type === 'cafe') typeFilter = '["amenity"~"cafe|ice_cream"]';
      else if (type === 'gym') typeFilter = '["leisure"="fitness_centre"]';
      else if (type === 'park') typeFilter = '["leisure"="park"]';
      else if (type === 'shopping') typeFilter = '["shop"~"mall|department_store"]';
      else {
          // Default: busca tudo se não tiver tipo específico
          // Mas vamos construir queries separadas para amenity e leisure se for "todos"
      }

      let nameFilter = '';
      if (keyword && keyword.trim() !== '') {
          // Filtro por nome (case insensitive)
          nameFilter = `["name"~"${keyword}",i]`;
      }

      let queries = [];

      if (typeFilter) {
          // Se tem tipo específico, é mais simples
          queries.push(`node${typeFilter}${nameFilter}(around:${radius},${searchLat},${searchLng});`);
          queries.push(`way${typeFilter}${nameFilter}(around:${radius},${searchLat},${searchLng});`);
      } else {
          // Se não tem tipo, busca os grupos padrão
          // Grupo 1: Amenities (Bar, Restaurante, etc)
          queries.push(`node["amenity"~"bar|pub|restaurant|nightclub|cafe"]${nameFilter}(around:${radius},${searchLat},${searchLng});`);
          queries.push(`way["amenity"~"bar|pub|restaurant|nightclub|cafe"]${nameFilter}(around:${radius},${searchLat},${searchLng});`);
          
          // Grupo 2: Leisure (Academia, Parque)
          queries.push(`node["leisure"~"fitness_centre|park"]${nameFilter}(around:${radius},${searchLat},${searchLng});`);
          queries.push(`way["leisure"~"fitness_centre|park"]${nameFilter}(around:${radius},${searchLat},${searchLng});`);

          // Grupo 3: Shopping
          queries.push(`node["shop"="mall"]${nameFilter}(around:${radius},${searchLat},${searchLng});`);
          queries.push(`way["shop"="mall"]${nameFilter}(around:${radius},${searchLat},${searchLng});`);
      }

      const query = `
        [out:json][timeout:25];
        (
          ${queries.join('\n')}
        );
        out center 30;
      `;
      
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const placesRes = await axios.get(overpassUrl, { timeout: 25000 });
      
      const realPlaces = placesRes.data.elements.map(el => {
          const tags = el.tags || {};
          
          let placeType = 'Local';
          if (tags.amenity === 'nightclub') placeType = 'Boate';
          else if (tags.amenity === 'pub' || tags.amenity === 'bar') placeType = 'Bar';
          else if (tags.amenity === 'restaurant') placeType = 'Restaurante';
          else if (tags.amenity === 'cafe') placeType = 'Café';
          else if (tags.leisure === 'fitness_centre') placeType = 'Academia';
          else if (tags.leisure === 'park') placeType = 'Parque';
          else if (tags.shop === 'mall') placeType = 'Shopping Center';
          else if (tags.amenity) placeType = tags.amenity; // Fallback

          let description = 'Um ótimo lugar para socializar.';
          if (tags.cuisine) description = `Culinária: ${tags.cuisine}`;
          else if (placeType === 'Academia') description = 'Bora treinar!';
          else if (placeType === 'Parque') description = 'Natureza e ar livre.';
          else if (placeType === 'Café') description = 'Café quentinho e conversa boa.';
          else if (placeType === 'Shopping Center') description = 'Compras, lazer e alimentação.';
          else if (tags.description) description = tags.description;

          return {
              id: String(el.id),
              name: tags.name || "Local sem nome",
              type: placeType,
              description: description
          };
      }).filter(p => p.name !== "Local sem nome");

      res.json(realPlaces);

  } catch (error) {
      console.error("Erro ao buscar locais reais (usando fallback):", error.message);
      // Fallback: Filtra os locais mockados também se possível
      let filteredMocks = LOCAIS;
      if (type && type !== 'all') {
           // Mapeamento simplificado para mocks
           const typeMap = { 'bar': 'Bar', 'restaurant': 'Restaurante', 'nightclub': 'Boate', 'shopping': 'Shopping' };
           if (typeMap[type]) {
               filteredMocks = filteredMocks.filter(l => l.type === typeMap[type]);
           }
      }
      if (keyword) {
          filteredMocks = filteredMocks.filter(l => l.name.toLowerCase().includes(keyword.toLowerCase()));
      }
      res.json(filteredMocks);
  }
});

// Socket.io
io.on('connection', (socket) => {
  console.log('Novo cliente conectado! ID:', socket.id);

  // Log de qualquer evento recebido (Debug)
  socket.onAny((eventName, ...args) => {
    console.log(`[DEBUG] Evento recebido: ${eventName}`, args);
  });

  // Login (Entrar no App)
  socket.on('join_app', (userData) => {
    console.log(`Recebido pedido de login de: ${userData.name} (${socket.id})`);
    users[socket.id] = {
      ...userData,
      socketId: socket.id,
      localId: null,
      score: 0
    };
    socket.emit('app_joined', users[socket.id]);
  });

  // Check-in em um local
  socket.on('check_in', (localId) => {
    const user = users[socket.id];
    if (!user) return;

    // Sair do local anterior se houver
    if (user.localId) {
      socket.leave(user.localId);
      // Remover da lista da sala anterior (opcional para otimização)
    }

    user.localId = localId;
    socket.join(localId);
    
    // Notificar todos na sala que alguém entrou
    io.to(localId).emit('user_entered', user);
    
    // Enviar lista de usuários no local para quem entrou
    const usersInRoom = Object.values(users).filter(u => u.localId === localId);
    socket.emit('room_users', usersInRoom);
    
    console.log(`${user.name} fez check-in em ${localId}`);
  });

  // Enviar convite/interação
  socket.on('send_interaction', ({ toSocketId, type }) => {
    const fromUser = users[socket.id];
    io.to(toSocketId).emit('receive_interaction', {
      from: fromUser,
      type
    });
  });

  // Sistema de Convites (Novo)
  socket.on('send_invite', ({ toSocketId, type }) => {
    const fromUser = users[socket.id];
    io.to(toSocketId).emit('receive_invite', {
      from: fromUser,
      type // 'game' | 'chat'
    });
  });

  socket.on('answer_invite', ({ toSocketId, accepted, type }) => {
    const fromUser = users[socket.id]; // Quem respondeu (o convidado)
    io.to(toSocketId).emit('invite_answered', {
      from: fromUser,
      accepted,
      type
    });
  });

  // Chat Privado
  socket.on('private_message', ({ toSocketId, message }) => {
    const fromUser = users[socket.id];
    io.to(toSocketId).emit('receive_private_message', {
      fromId: fromUser.id,
      message,
      timestamp: new Date().toISOString()
    });
  });

  // Iniciar Jogo
  socket.on('start_game', ({ localId, gameType }) => {
    let gameContent;
    
    if (gameType === 'quiz') {
      const randomQ = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
      gameContent = { type: 'quiz', ...randomQ };
      // Salvar resposta correta no estado do jogo da sala (simulacao)
      games[localId] = { active: true, type: 'quiz', correct: randomQ.correct };
    } else if (gameType === 'truth_dare') {
      const randomTD = TRUTH_DARE[Math.floor(Math.random() * TRUTH_DARE.length)];
      gameContent = { type: 'truth_dare', text: randomTD };
      games[localId] = { active: true, type: 'truth_dare' };
    } else if (gameType === 'never_have_i_ever') {
      const randomNhie = NEVER_HAVE_I_EVER[Math.floor(Math.random() * NEVER_HAVE_I_EVER.length)];
      gameContent = { type: 'never_have_i_ever', text: randomNhie };
      games[localId] = { active: true, type: 'never_have_i_ever' };
    }

    io.to(localId).emit('game_started', gameContent);
  });
  
  // Responder Quiz
  socket.on('answer_quiz', ({ localId, answerIndex }) => {
    const game = games[localId];
    if (!game || game.type !== 'quiz') return;

    const isCorrect = answerIndex === game.correct;
    if (isCorrect) {
       users[socket.id].score += 10;
       socket.emit('score_update', users[socket.id].score);
    }
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user && user.localId) {
      io.to(user.localId).emit('user_left', user.id);
    }
    delete users[socket.id];
    console.log('Usuário desconectado:', socket.id);
  });
});

// Catch-all para servir o frontend em qualquer rota não-API
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
