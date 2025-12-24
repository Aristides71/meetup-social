import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

// Tipos
type User = {
  id: string;
  socketId: string;
  name: string;
  localId: string | null;
  score: number;
  avatar?: string;
};

type Local = {
  id: string;
  name: string;
  type: string;
  description: string;
};

type Invite = {
  from: User;
  type: 'game' | 'chat';
};

type ChatMessage = {
  fromId: string;
  message: string;
  timestamp: string;
};

// Configuração do Socket
// Em produção (build), usa a mesma origem do site. Em dev, usa o IP local.
const SOCKET_URL = import.meta.env.PROD ? window.location.origin : 'http://localhost:3001';

const socket: Socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'], // Fallback para polling se websocket falhar
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  timeout: 10000,
});

// Helper para gerar avatar localmente (SVG Data URI)
const generateAvatar = (name: string) => {
  const colors = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#818cf8', '#a78bfa', '#f472b6'];
  const index = name.length % colors.length;
  const bgColor = colors[index];
  const initial = name.charAt(0).toUpperCase();
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="${bgColor}" />
      <text x="50" y="55" font-family="Arial, sans-serif" font-weight="bold" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle">${initial}</text>
    </svg>
  `;
  
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
 };

function App() {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'locais' | 'room'>('login');
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [locais, setLocais] = useState<Local[]>([]);
  const [currentLocal, setCurrentLocal] = useState<Local | null>(null);
  const [usersInRoom, setUsersInRoom] = useState<User[]>([]);
  
  // Game State
  const [gameActive, setGameActive] = useState(false);
  const [gameQuestion, setGameQuestion] = useState<any>(null);
  const [showGameSelector, setShowGameSelector] = useState(false);
  
  // Invites State
  const [incomingInvite, setIncomingInvite] = useState<Invite | null>(null);
  
  // Chat State
  const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');

  const [notification, setNotification] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  
  // Location State
  const [searchLocation, setSearchLocation] = useState('');
  const [isLoadingLocais, setIsLoadingLocais] = useState(false);

  useEffect(() => {
    // Listeners de Conexão
    socket.on('connect', () => {
        console.log("Socket conectado:", socket.id);
        setIsConnected(true);
        showNotification("Conectado ao servidor!");
    });

    socket.on('connect_error', (err) => {
      console.error("Erro de conexão Socket:", err);
      showNotification("Erro de conexão. Tentando reconectar...");
      setIsConnected(false);
    });

    socket.on('disconnect', () => {
      console.log("Socket desconectado");
      setIsConnected(false);
      showNotification("Desconectado do servidor.");
    });

    // Listeners do Socket
    socket.on('app_joined', (user: User) => {
      setCurrentUser(user);
      setCurrentScreen('locais');
      // Não busca automaticamente, espera usuário escolher
      // fetchLocais(); 
    });

    socket.on('room_users', (users: User[]) => {
      setUsersInRoom(users);
    });

    socket.on('user_entered', (user: User) => {
      setUsersInRoom(prev => {
        if (prev.find(u => u.id === user.id)) return prev;
        return [...prev, user];
      });
      showNotification(`${user.name} entrou!`);
    });

    socket.on('user_left', (userId: string) => {
      setUsersInRoom(prev => prev.filter(u => u.id !== userId));
    });

    socket.on('receive_interaction', (data: any) => {
      showNotification(`${data.from.name} enviou um ${data.type}!`);
    });

    socket.on('game_started', (question: any) => {
      setGameActive(true);
      setGameQuestion(question);
      setShowGameSelector(false); // Esconde seletor se estiver aberto
    });

    socket.on('score_update', (newScore: number) => {
        setCurrentUser(prev => prev ? {...prev, score: newScore} : null);
        showNotification(`Você ganhou pontos! Score: ${newScore}`);
        setGameActive(false);
    });

    // Novos Listeners de Convite/Chat
    socket.on('receive_invite', (invite: Invite) => {
      setIncomingInvite(invite);
    });

    socket.on('invite_answered', (data: { from: User, accepted: boolean, type: string }) => {
       if (data.accepted) {
           showNotification(`${data.from.name} aceitou seu convite!`);
           if (data.type === 'chat') {
               setActiveChatUser(data.from);
               setChatMessages([]);
           } else if (data.type === 'game') {
               // Inicia jogo (lógica existente)
               setShowGameSelector(true);
           }
       } else {
           showNotification(`${data.from.name} recusou o convite.`);
       }
    });

    socket.on('receive_private_message', (msg: ChatMessage) => {
        setChatMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('app_joined');
      socket.off('room_users');
      socket.off('user_entered');
      socket.off('user_left');
      socket.off('receive_interaction');
      socket.off('game_started');
      socket.off('score_update');
      socket.off('receive_invite');
      socket.off('invite_answered');
      socket.off('receive_private_message');
    };
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchLocais = async (lat?: number, lng?: number, query?: string) => {
    setIsLoadingLocais(true);
    showNotification("Buscando locais, aguarde um momento...");
    try {
      // Em produção usa URL relativa (/api/locais), em dev usa IP fixo
      const baseUrl = import.meta.env.PROD ? '' : 'http://10.226.51.224:3001';
      let url = `${baseUrl}/api/locais`;
      const params = new URLSearchParams();
      
      if (lat && lng) {
          params.append('lat', lat.toString());
          params.append('lng', lng.toString());
      } else if (query) {
          params.append('search', query);
      }
      
      if (params.toString()) {
          url += `?${params.toString()}`;
      }

      const res = await fetch(url, {
        headers: {
            "Bypass-Tunnel-Reminder": "true"
        }
      });
      const data = await res.json();
      setLocais(data);
    } catch (error) {
      console.error("Erro ao buscar locais", error);
      showNotification("Erro ao buscar locais.");
    } finally {
      setIsLoadingLocais(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
        showNotification("Geolocalização não suportada.");
        return;
    }
    
    showNotification("Obtendo sua localização...");
    navigator.geolocation.getCurrentPosition(
        (position) => {
            fetchLocais(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
            console.error(error);
            showNotification("Erro ao obter localização. Tente digitar.");
        }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogin = () => {
    console.log("Botão Entrar clicado!");
    
    if (!userName.trim()) {
      console.log("Nome vazio.");
      showNotification("Por favor, digite seu nome para entrar!");
      return;
    }
    
    console.log("Tentando login com:", userName);
    const avatarUrl = userAvatar || generateAvatar(userName);
    
    const userData = {
      id: Math.random().toString(36).substr(2, 9),
      name: userName,
      avatar: avatarUrl
    };
    
    console.log("Emitindo evento join_app...", userData);
    
    // Forçar envio mesmo se desconectado (o socket gerencia o buffer)
    socket.emit('join_app', userData);

    // Feedback visual imediato para debug
    if (socket.connected) {
        showNotification("Enviando dados...");
    } else {
        showNotification("Tentando conectar e enviar...");
        socket.connect();
    }
  };

  const handleCheckIn = (local: Local) => {
    setCurrentLocal(local);
    socket.emit('check_in', local.id);
    setCurrentScreen('room');
  };

  // const handleInteraction = (targetSocketId: string, type: string) => {
  //   socket.emit('send_interaction', { toSocketId: targetSocketId, type });
  //   showNotification(`Você enviou um ${type}`);
  // };

  const sendInvite = (targetUser: User, type: 'game' | 'chat') => {
      socket.emit('send_invite', { toSocketId: targetUser.socketId, type });
      showNotification(`Convite de ${type === 'game' ? 'jogo' : 'conversa'} enviado!`);
  };

  const answerInvite = (accepted: boolean) => {
      if (!incomingInvite) return;
      socket.emit('answer_invite', { 
          toSocketId: incomingInvite.from.socketId, 
          accepted, 
          type: incomingInvite.type 
      });
      
      if (accepted && incomingInvite.type === 'chat') {
          setActiveChatUser(incomingInvite.from);
          setChatMessages([]);
      }
      setIncomingInvite(null);
  };

  const sendChatMessage = () => {
      if (!currentMessage.trim() || !activeChatUser) return;
      
      const msgData = {
          fromId: currentUser?.id || '',
          message: currentMessage,
          timestamp: new Date().toISOString()
      };
      
      // Envia via socket
      socket.emit('private_message', { toSocketId: activeChatUser.socketId, message: currentMessage });
      
      // Adiciona localmente
      setChatMessages(prev => [...prev, msgData]);
      setCurrentMessage('');
  };

  const handleStartGame = (gameType: string) => {
    if (currentLocal) {
      socket.emit('start_game', { localId: currentLocal.id, gameType });
    }
  };

  const handleLogout = () => {
    if (confirm("Tem certeza que deseja sair?")) {
        socket.disconnect();
        socket.connect();
        setCurrentUser(null);
        setCurrentScreen('login');
        setLocais([]);
        setSearchLocation('');
        showNotification("Você saiu do app.");
    }
  };

  const handleAnswer = (index: number) => {
    if (currentLocal) {
      socket.emit('answer_quiz', { localId: currentLocal.id, answerIndex: index });
      setGameActive(false); 
    }
  };

  const renderGameContent = () => {
      if (!gameQuestion) return null;

      if (gameQuestion.type === 'quiz') {
          return (
            <div>
                <p className="text-lg font-medium mb-4">{gameQuestion.text}</p>
                <div className="grid grid-cols-2 gap-2">
                    {gameQuestion.options.map((opt: string, idx: number) => (
                        <button key={idx} onClick={() => handleAnswer(idx)} className="bg-white/20 hover:bg-white/30 p-2 rounded text-sm text-left transition">
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
          );
      } else if (gameQuestion.type === 'truth_dare') {
          return (
              <div className="text-center py-4">
                  <h4 className="text-2xl font-bold mb-4">{gameQuestion.text}</h4>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => setGameActive(false)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-full font-bold">
                        Parar
                    </button>
                    <button onClick={() => handleStartGame('truth_dare')} className="bg-white text-purple-600 px-6 py-2 rounded-full font-bold">
                        Próximo ↻
                    </button>
                  </div>
              </div>
          );
      } else if (gameQuestion.type === 'never_have_i_ever') {
        return (
            <div className="text-center py-4">
                <h4 className="text-2xl font-bold mb-4">{gameQuestion.text}</h4>
                <p className="text-sm opacity-80 mb-4">Se você já fez, beba um gole! 🍻</p>
                <div className="flex gap-2 justify-center">
                    <button onClick={() => setGameActive(false)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-full font-bold">
                        Parar
                    </button>
                    <button onClick={() => handleStartGame('never_have_i_ever')} className="bg-white text-purple-600 px-6 py-2 rounded-full font-bold">
                        Próximo ↻
                    </button>
                </div>
            </div>
        );
      }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 pb-20">
      {/* Header */}
      <header className="bg-white text-gray-800 p-3 shadow-md sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="MeetUP Logo" className="h-10" />
          </div>
          {currentUser && (
            <div className="flex items-center gap-2">
               <span className="text-sm bg-pink-100 text-pink-700 px-2 py-1 rounded-full font-bold">★ {currentUser.score}</span>
               <img src={currentUser.avatar} className="w-8 h-8 rounded-full bg-gray-100 object-cover border border-gray-200" alt="avatar" />
            </div>
          )}
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg z-50 animate-bounce text-sm whitespace-nowrap">
          {notification}
        </div>
      )}

      {/* Invite Modal */}
      {incomingInvite && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full text-center">
                  <img src={incomingInvite.from.avatar} className="w-20 h-20 rounded-full mx-auto mb-4 object-cover" />
                  <h3 className="text-xl font-bold mb-2">{incomingInvite.from.name}</h3>
                  <p className="text-gray-600 mb-6">
                      Te convidou para {incomingInvite.type === 'game' ? 'jogar agora!' : 'conversar no chat.'}
                  </p>
                  <div className="flex gap-4 justify-center">
                      <button onClick={() => answerInvite(false)} className="px-6 py-2 bg-gray-200 rounded-lg text-gray-700 font-semibold">Recusar</button>
                      <button onClick={() => answerInvite(true)} className="px-6 py-2 bg-pink-600 rounded-lg text-white font-semibold">Aceitar</button>
                  </div>
              </div>
          </div>
      )}

      {/* Game Selector Modal */}
      {showGameSelector && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full text-center">
                  <h3 className="text-xl font-bold mb-4">Escolha o Jogo 🎮</h3>
                  <div className="flex flex-col gap-3">
                      <button onClick={() => handleStartGame('quiz')} className="p-4 bg-purple-100 text-purple-700 rounded-xl font-bold hover:bg-purple-200 transition">
                          🧠 Quiz Trivia
                      </button>
                      <button onClick={() => handleStartGame('truth_dare')} className="p-4 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition">
                          😈 Verdade ou Desafio
                      </button>
                      <button onClick={() => handleStartGame('never_have_i_ever')} className="p-4 bg-orange-100 text-orange-700 rounded-xl font-bold hover:bg-orange-200 transition">
                          🍺 Eu Nunca...
                      </button>
                      <button onClick={() => setShowGameSelector(false)} className="mt-2 text-gray-500 text-sm underline">Cancelar</button>
                  </div>
              </div>
          </div>
      )}

      {/* Chat Modal */}
      {activeChatUser && (
          <div className="fixed inset-0 bg-white z-40 flex flex-col md:max-w-md md:mx-auto md:h-[600px] md:top-20 md:rounded-xl md:shadow-2xl">
              <div className="bg-pink-600 text-white p-4 flex justify-between items-center shadow-md">
                  <div className="flex items-center gap-3">
                      <img src={activeChatUser.avatar} className="w-10 h-10 rounded-full bg-white object-cover" />
                      <div>
                          <h3 className="font-bold">{activeChatUser.name}</h3>
                          <p className="text-xs opacity-80">Chat Privado</p>
                      </div>
                  </div>
                  <button onClick={() => setActiveChatUser(null)} className="text-white text-xl">&times;</button>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
                  {chatMessages.map((msg, idx) => {
                      const isMe = msg.fromId === currentUser?.id;
                      return (
                          <div key={idx} className={`max-w-[80%] p-3 rounded-xl text-sm ${isMe ? 'bg-pink-100 self-end text-pink-900' : 'bg-white self-start text-gray-800 shadow-sm'}`}>
                              {msg.message}
                          </div>
                      )
                  })}
              </div>

              <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 border border-gray-300 rounded-full px-4 py-2 outline-none focus:border-pink-500"
                    placeholder="Digite sua mensagem..."
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                  />
                  <button onClick={sendChatMessage} className="bg-pink-600 text-white w-10 h-10 rounded-full flex items-center justify-center">
                      ➤
                  </button>
              </div>
          </div>
      )}

      <main className="max-w-md mx-auto p-4">
        {/* TELA DE LOGIN */}
        {currentScreen === 'login' && (
          <div className="flex flex-col items-center justify-center mt-10 gap-6">
            <div className="text-center flex flex-col items-center">
                <img src="/logo.svg" alt="MeetUp" className="h-24 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Bem-vindo!</h2>
                <p className="text-gray-600">Encontre pessoas e divirta-se nos seus locais favoritos.</p>
            </div>
            
            <div className="w-full bg-white p-6 rounded-xl shadow-sm">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-24 h-24 rounded-full bg-gray-100 mb-3 overflow-hidden border-2 border-pink-200 relative">
                        {userAvatar ? (
                            <img src={userAvatar} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">📷</div>
                        )}
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    <p className="text-xs text-gray-500">Toque para adicionar foto</p>
                </div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Como você quer ser chamado?</label>
                <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                placeholder="Seu nome ou apelido"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <button
                onClick={handleLogin}
                className="w-full mt-4 bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 transition"
                >
                Entrar
                </button>
                <div className="mt-2 text-center text-xs">
                    Status: {isConnected ? <span className="text-green-600 font-bold">Conectado ✅</span> : <span className="text-red-600 font-bold">Desconectado ❌</span>}
                </div>
            </div>
          </div>
        )}

        {/* LISTA DE LOCAIS */}
        {currentScreen === 'locais' && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-700">Encontre Locais</h2>
                <button onClick={handleLogout} className="text-sm text-red-500 font-bold hover:underline bg-red-50 px-3 py-1 rounded-lg border border-red-100">
                    Sair
                </button>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col gap-3">
                <button onClick={handleUseMyLocation} className="bg-blue-100 text-blue-700 font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-200 transition">
                    📍 Usar minha localização
                </button>
                
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Ou digite cidade/bairro..." 
                        className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-pink-500"
                        value={searchLocation}
                        onChange={(e) => setSearchLocation(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchLocais(undefined, undefined, searchLocation)}
                    />
                    <button onClick={() => fetchLocais(undefined, undefined, searchLocation)} className="absolute right-2 top-2 bg-pink-600 text-white w-8 h-8 rounded-lg flex items-center justify-center">
                        🔍
                    </button>
                </div>
            </div>

            {isLoadingLocais && (
                <div className="flex flex-col items-center justify-center py-8 text-center animate-pulse">
                    <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-700 font-bold text-lg">Buscando locais próximos...</p>
                    <p className="text-gray-500 text-sm">Carregando bares, restaurantes, parques e mais.</p>
                </div>
            )}

            {!isLoadingLocais && locais.length === 0 && <p className="text-center text-gray-400">Nenhum local encontrado. Tente buscar!</p>}

            {locais.map(local => (
              <div key={local.id} onClick={() => handleCheckIn(local)} className="bg-white p-4 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition flex items-center gap-4">
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-2xl">
                    {local.type === 'Boate' ? '💃' : 
                     local.type === 'Restaurante' ? '🍽️' : 
                     local.type === 'Supermercado' ? '🛒' :
                     local.type === 'Shopping' ? '🛍️' : 
                     local.type === 'Academia' ? '🏋️' :
                     local.type === 'Parque' ? '🌳' :
                     local.type === 'Café' ? '☕' :
                     '🍺'}
                </div>
                <div>
                    <h3 className="font-bold text-lg">{local.name}</h3>
                    <p className="text-sm text-gray-500">{local.type} • {local.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SALA / LOCAL */}
        {currentScreen === 'room' && currentLocal && (
          <div className="flex flex-col gap-6">
             <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-pink-500 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">{currentLocal.name}</h2>
                    <p className="text-sm text-gray-500">Você fez check-in aqui.</p>
                </div>
                <button onClick={() => setCurrentScreen('locais')} className="text-xs text-gray-500 underline">Sair</button>
             </div>

             {/* Game Area */}
             <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-xl text-white shadow-lg transition-all duration-300">
                <h3 className="font-bold text-lg mb-2 flex items-center justify-between">
                    <span>🎮 Área de Jogos</span>
                    {gameActive && <span className="text-xs bg-white/20 px-2 py-1 rounded">Em andamento</span>}
                </h3>
                
                {gameActive && gameQuestion ? (
                    renderGameContent()
                ) : (
                    <div className="flex justify-between items-center">
                        <p className="text-sm opacity-90">Inicie uma atividade para interagir!</p>
                        <button onClick={() => setShowGameSelector(true)} className="bg-white text-purple-600 px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-gray-100 transition transform hover:scale-105">
                            Escolher Jogo
                        </button>
                    </div>
                )}
             </div>

             {/* People List */}
             <div>
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center justify-between">
                    Pessoas no local
                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">{usersInRoom.length}</span>
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                    {usersInRoom.map(user => (
                        <div key={user.id} className={`bg-white p-3 rounded-xl shadow-sm flex items-center gap-3 relative ${user.id === currentUser?.id ? 'border-2 border-pink-200' : ''}`}>
                             <img src={user.avatar} className="w-14 h-14 rounded-full bg-gray-50 object-cover" alt={user.name} />
                             
                             <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-gray-800">{user.name} {user.id === currentUser?.id && '(Eu)'}</h4>
                                    <span className="text-xs font-bold text-pink-600">★ {user.score}</span>
                                </div>
                                
                                {user.id !== currentUser?.id && (
                                     <div className="flex gap-2 mt-2">
                                         <button onClick={() => sendInvite(user, 'chat')} className="flex-1 bg-blue-50 text-blue-600 text-xs py-1.5 rounded hover:bg-blue-100 font-medium border border-blue-100">
                                             💬 Chat
                                         </button>
                                         <button onClick={() => sendInvite(user, 'game')} className="flex-1 bg-purple-50 text-purple-600 text-xs py-1.5 rounded hover:bg-purple-100 font-medium border border-purple-100">
                                             🎮 Jogar
                                         </button>
                                     </div>
                                )}
                             </div>
                        </div>
                    ))}
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
