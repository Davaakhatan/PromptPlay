import { useState, useCallback, useEffect } from 'react';
import { networkManager, type ConnectionState, type NetworkStats } from '../services/NetworkManager';
import { lobbySystem, type Room, type Player, type ChatMessage, type RoomListing } from '../services/LobbySystem';
import { matchmaking, type MatchState, type MatchCriteria, type MatchResult } from '../services/Matchmaking';
import { leaderboards, type ScoreEntry, type Leaderboard, type PlayerStats } from '../services/Leaderboards';

interface MultiplayerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNotification: (msg: string) => void;
}

type TabType = 'lobby' | 'matchmaking' | 'leaderboards' | 'network';

export const MultiplayerPanel: React.FC<MultiplayerPanelProps> = ({
  isOpen,
  onClose,
  onNotification,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('lobby');

  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);

  // Lobby state
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [roomList, setRoomList] = useState<RoomListing[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [playerName, setPlayerName] = useState('Player');
  const [roomName, setRoomName] = useState('My Room');
  const [isReady, setIsReady] = useState(false);

  // Matchmaking state
  const [matchState, setMatchState] = useState<MatchState>('idle');
  const [currentMatch, setCurrentMatch] = useState<MatchResult | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [acceptTimeRemaining, setAcceptTimeRemaining] = useState(0);

  // Leaderboard state
  const [selectedLeaderboard, setSelectedLeaderboard] = useState('global-highscore');
  const [leaderboardData, setLeaderboardData] = useState<Leaderboard | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);

  // Update network stats periodically
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setConnectionState(networkManager.getConnectionState());
      setNetworkStats(networkManager.getStats());

      if (matchmaking.isSearching()) {
        setSearchTime(matchmaking.getSearchTime());
      }
      if (matchmaking.getState() === 'found') {
        setAcceptTimeRemaining(matchmaking.getMatchAcceptTimeRemaining());
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Setup lobby event listeners
  useEffect(() => {
    const handleRoomUpdated = () => {
      setCurrentRoom(lobbySystem.getCurrentRoom());
      setPlayers(lobbySystem.getPlayers());
    };

    const handleChatMessage = (data: unknown) => {
      const { message } = data as { message: ChatMessage };
      setChatMessages(prev => [...prev, message]);
    };

    const handlePlayerJoined = (data: unknown) => {
      const { player } = data as { player: Player };
      onNotification(`${player.name} joined`);
      handleRoomUpdated();
    };

    const handlePlayerLeft = (data: unknown) => {
      const { player } = data as { player: Player };
      onNotification(`${player.name} left`);
      handleRoomUpdated();
    };

    lobbySystem.on('room-created', handleRoomUpdated);
    lobbySystem.on('room-joined', handleRoomUpdated);
    lobbySystem.on('room-updated', handleRoomUpdated);
    lobbySystem.on('player-joined', handlePlayerJoined);
    lobbySystem.on('player-left', handlePlayerLeft);
    lobbySystem.on('player-updated', handleRoomUpdated);
    lobbySystem.on('chat-message', handleChatMessage);

    return () => {
      lobbySystem.off('room-created', handleRoomUpdated);
      lobbySystem.off('room-joined', handleRoomUpdated);
      lobbySystem.off('room-updated', handleRoomUpdated);
      lobbySystem.off('player-joined', handlePlayerJoined);
      lobbySystem.off('player-left', handlePlayerLeft);
      lobbySystem.off('player-updated', handleRoomUpdated);
      lobbySystem.off('chat-message', handleChatMessage);
    };
  }, [onNotification]);

  // Setup matchmaking event listeners
  useEffect(() => {
    const handleMatchFound = (data: unknown) => {
      const { match } = data as { match: MatchResult };
      setCurrentMatch(match);
      setMatchState('found');
      onNotification('Match found!');
    };

    const handleMatchReady = () => {
      setMatchState('joining');
      onNotification('All players accepted! Joining match...');
    };

    const handleMatchCancelled = () => {
      setMatchState('idle');
      setCurrentMatch(null);
      onNotification('Match cancelled');
    };

    matchmaking.on('match-found', handleMatchFound);
    matchmaking.on('match-ready', handleMatchReady);
    matchmaking.on('match-cancelled', handleMatchCancelled);

    return () => {
      matchmaking.off('match-found', handleMatchFound);
      matchmaking.off('match-ready', handleMatchReady);
      matchmaking.off('match-cancelled', handleMatchCancelled);
    };
  }, [onNotification]);

  // Connect to server
  const handleConnect = useCallback(async () => {
    try {
      await networkManager.connect();
      onNotification('Connected to server');
    } catch {
      onNotification('Failed to connect');
    }
  }, [onNotification]);

  // Disconnect from server
  const handleDisconnect = useCallback(() => {
    networkManager.disconnect();
    onNotification('Disconnected from server');
  }, [onNotification]);

  // Create room
  const handleCreateRoom = useCallback(async () => {
    try {
      await lobbySystem.createRoom({
        name: roomName,
        maxPlayers: 8,
        visibility: 'public',
      });
      onNotification('Room created');
    } catch {
      onNotification('Failed to create room');
    }
  }, [roomName, onNotification]);

  // Join room
  const handleJoinRoom = useCallback(async (roomId: string) => {
    try {
      await lobbySystem.joinRoom(roomId, playerName);
      onNotification('Joined room');
    } catch {
      onNotification('Failed to join room');
    }
  }, [playerName, onNotification]);

  // Leave room
  const handleLeaveRoom = useCallback(() => {
    lobbySystem.leaveRoom();
    setCurrentRoom(null);
    setPlayers([]);
    setChatMessages([]);
    onNotification('Left room');
  }, [onNotification]);

  // Toggle ready
  const handleToggleReady = useCallback(() => {
    const newReady = !isReady;
    setIsReady(newReady);
    lobbySystem.setReady(newReady);
  }, [isReady]);

  // Start game
  const handleStartGame = useCallback(() => {
    if (lobbySystem.startGame()) {
      onNotification('Game starting...');
    }
  }, [onNotification]);

  // Send chat
  const handleSendChat = useCallback(() => {
    if (chatInput.trim()) {
      lobbySystem.sendChat(chatInput.trim());
      setChatInput('');
    }
  }, [chatInput]);

  // Refresh room list
  const handleRefreshRooms = useCallback(async () => {
    const rooms = await lobbySystem.getRoomList();
    setRoomList(rooms);
  }, []);

  // Join matchmaking
  const handleJoinMatchmaking = useCallback(async () => {
    const criteria: MatchCriteria = {
      gameMode: 'default',
      minPlayers: 2,
      maxPlayers: 8,
    };

    const ticket = await matchmaking.joinQueue(criteria, 'casual', playerName);
    if (ticket) {
      setMatchState('searching');
      onNotification('Searching for match...');
    }
  }, [playerName, onNotification]);

  // Leave matchmaking
  const handleLeaveMatchmaking = useCallback(async () => {
    await matchmaking.leaveQueue();
    setMatchState('idle');
    setSearchTime(0);
    onNotification('Left matchmaking queue');
  }, [onNotification]);

  // Accept match
  const handleAcceptMatch = useCallback(async () => {
    await matchmaking.acceptMatch();
  }, []);

  // Decline match
  const handleDeclineMatch = useCallback(async () => {
    await matchmaking.declineMatch();
    setMatchState('idle');
    setCurrentMatch(null);
  }, []);

  // Load leaderboard
  const handleLoadLeaderboard = useCallback(async () => {
    const data = await leaderboards.getLeaderboard(selectedLeaderboard);
    setLeaderboardData(data);
  }, [selectedLeaderboard]);

  // Load player stats
  const handleLoadStats = useCallback(async () => {
    const stats = await leaderboards.getPlayerStats();
    setPlayerStats(stats);
  }, []);

  // Format time
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string }[] = [
    { id: 'lobby', label: 'Lobby' },
    { id: 'matchmaking', label: 'Matchmaking' },
    { id: 'leaderboards', label: 'Leaderboards' },
    { id: 'network', label: 'Network' },
  ];

  const getConnectionColor = (): string => {
    switch (connectionState) {
      case 'connected': return '#22c55e';
      case 'connecting':
      case 'reconnecting': return '#eab308';
      case 'error': return '#ef4444';
      default: return '#888';
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: 40,
      right: 0,
      width: 420,
      height: 'calc(100vh - 40px)',
      backgroundColor: '#1e1e1e',
      borderLeft: '1px solid #333',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 'bold', color: '#fff' }}>Multiplayer</span>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: getConnectionColor(),
          }} />
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 18,
          }}
        >
          ×
        </button>
      </div>

      {/* Connection Bar */}
      <div style={{
        padding: '8px 16px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#252525',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#888', fontSize: 12 }}>Status:</span>
          <span style={{ color: getConnectionColor(), fontSize: 12, textTransform: 'capitalize' }}>
            {connectionState}
          </span>
        </div>
        {connectionState === 'connected' ? (
          <button
            onClick={handleDisconnect}
            style={{
              padding: '4px 12px',
              backgroundColor: '#ef4444',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={handleConnect}
            style={{
              padding: '4px 12px',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            Connect
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #333',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: activeTab === tab.id ? '#333' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === tab.id ? '#fff' : '#888',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* Lobby Tab */}
        {activeTab === 'lobby' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Player Name */}
            <div>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>PLAYER NAME</div>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                style={{
                  width: '100%',
                  padding: 8,
                  backgroundColor: '#333',
                  border: '1px solid #444',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 12,
                }}
              />
            </div>

            {currentRoom ? (
              <>
                {/* Current Room */}
                <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{currentRoom.config.name}</span>
                    <span style={{ color: '#888', fontSize: 11 }}>
                      {currentRoom.players.size}/{currentRoom.config.maxPlayers}
                    </span>
                  </div>

                  {/* Players */}
                  <div style={{ marginBottom: 12 }}>
                    {players.map(player => (
                      <div key={player.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 0',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: player.role === 'host' ? '#eab308' : '#fff', fontSize: 12 }}>
                            {player.name}
                          </span>
                          {player.role === 'host' && (
                            <span style={{ color: '#888', fontSize: 10 }}>HOST</span>
                          )}
                        </div>
                        <span style={{
                          color: player.status === 'ready' ? '#22c55e' : '#888',
                          fontSize: 11,
                        }}>
                          {player.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleToggleReady}
                      style={{
                        flex: 1,
                        padding: 8,
                        backgroundColor: isReady ? '#22c55e' : '#333',
                        border: 'none',
                        borderRadius: 4,
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      {isReady ? 'Ready!' : 'Ready Up'}
                    </button>
                    {lobbySystem.isHost() && (
                      <button
                        onClick={handleStartGame}
                        style={{
                          flex: 1,
                          padding: 8,
                          backgroundColor: '#3b82f6',
                          border: 'none',
                          borderRadius: 4,
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        Start Game
                      </button>
                    )}
                    <button
                      onClick={handleLeaveRoom}
                      style={{
                        padding: 8,
                        backgroundColor: '#ef4444',
                        border: 'none',
                        borderRadius: 4,
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      Leave
                    </button>
                  </div>
                </div>

                {/* Chat */}
                <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>CHAT</div>
                  <div style={{
                    height: 120,
                    overflow: 'auto',
                    marginBottom: 8,
                    padding: 8,
                    backgroundColor: '#1e1e1e',
                    borderRadius: 4,
                  }}>
                    {chatMessages.map(msg => (
                      <div key={msg.id} style={{ marginBottom: 4 }}>
                        <span style={{
                          color: msg.type === 'system' ? '#888' : '#3b82f6',
                          fontSize: 11,
                        }}>
                          {msg.senderName}:
                        </span>
                        <span style={{ color: '#fff', fontSize: 11, marginLeft: 4 }}>
                          {msg.content}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                      placeholder="Type a message..."
                      style={{
                        flex: 1,
                        padding: 8,
                        backgroundColor: '#333',
                        border: '1px solid #444',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: 11,
                      }}
                    />
                    <button
                      onClick={handleSendChat}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#3b82f6',
                        border: 'none',
                        borderRadius: 4,
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 11,
                      }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Create Room */}
                <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>CREATE ROOM</div>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Room name"
                    style={{
                      width: '100%',
                      padding: 8,
                      backgroundColor: '#333',
                      border: '1px solid #444',
                      borderRadius: 4,
                      color: '#fff',
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  />
                  <button
                    onClick={handleCreateRoom}
                    disabled={connectionState !== 'connected'}
                    style={{
                      width: '100%',
                      padding: 10,
                      backgroundColor: connectionState === 'connected' ? '#3b82f6' : '#555',
                      border: 'none',
                      borderRadius: 4,
                      color: '#fff',
                      cursor: connectionState === 'connected' ? 'pointer' : 'not-allowed',
                      fontSize: 12,
                    }}
                  >
                    Create Room
                  </button>
                </div>

                {/* Room List */}
                <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#888', fontSize: 11 }}>AVAILABLE ROOMS</span>
                    <button
                      onClick={handleRefreshRooms}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        fontSize: 11,
                      }}
                    >
                      Refresh
                    </button>
                  </div>
                  {roomList.length === 0 ? (
                    <div style={{ color: '#666', fontSize: 12, textAlign: 'center', padding: 20 }}>
                      No rooms available
                    </div>
                  ) : (
                    roomList.map(room => (
                      <div key={room.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 8,
                        backgroundColor: '#333',
                        borderRadius: 4,
                        marginBottom: 4,
                      }}>
                        <div>
                          <div style={{ color: '#fff', fontSize: 12 }}>{room.name}</div>
                          <div style={{ color: '#888', fontSize: 10 }}>
                            {room.playerCount}/{room.maxPlayers} • {room.hostName}
                          </div>
                        </div>
                        <button
                          onClick={() => handleJoinRoom(room.id)}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#3b82f6',
                            border: 'none',
                            borderRadius: 4,
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: 11,
                          }}
                        >
                          Join
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Matchmaking Tab */}
        {activeTab === 'matchmaking' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {matchState === 'idle' && (
              <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
                <div style={{ color: '#888', fontSize: 11, marginBottom: 12 }}>QUICK MATCH</div>
                <button
                  onClick={handleJoinMatchmaking}
                  disabled={connectionState !== 'connected'}
                  style={{
                    width: '100%',
                    padding: 16,
                    backgroundColor: connectionState === 'connected' ? '#22c55e' : '#555',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    cursor: connectionState === 'connected' ? 'pointer' : 'not-allowed',
                    fontSize: 14,
                    fontWeight: 'bold',
                  }}
                >
                  Find Match
                </button>
              </div>
            )}

            {matchState === 'searching' && (
              <div style={{ padding: 16, backgroundColor: '#252525', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ color: '#fff', fontSize: 16, marginBottom: 8 }}>Searching...</div>
                <div style={{ color: '#3b82f6', fontSize: 24, fontWeight: 'bold', marginBottom: 12 }}>
                  {formatTime(searchTime)}
                </div>
                <button
                  onClick={handleLeaveMatchmaking}
                  style={{
                    padding: '8px 24px',
                    backgroundColor: '#ef4444',
                    border: 'none',
                    borderRadius: 4,
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            {matchState === 'found' && currentMatch && (
              <div style={{ padding: 16, backgroundColor: '#252525', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ color: '#22c55e', fontSize: 16, marginBottom: 8 }}>Match Found!</div>
                <div style={{ color: '#fff', fontSize: 14, marginBottom: 4 }}>
                  {currentMatch.players.length} players
                </div>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
                  Accept in: {Math.ceil(acceptTimeRemaining / 1000)}s
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button
                    onClick={handleAcceptMatch}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: '#22c55e',
                      border: 'none',
                      borderRadius: 4,
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 'bold',
                    }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={handleDeclineMatch}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: '#ef4444',
                      border: 'none',
                      borderRadius: 4,
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

            {matchState === 'joining' && (
              <div style={{ padding: 16, backgroundColor: '#252525', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ color: '#3b82f6', fontSize: 16 }}>Joining match...</div>
              </div>
            )}

            {/* Ranking Info */}
            <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>YOUR RANK</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  backgroundColor: '#333',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#eab308',
                  fontSize: 20,
                }}>
                  🏆
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: 14 }}>Unranked</div>
                  <div style={{ color: '#888', fontSize: 11 }}>Play ranked matches to earn a rank</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboards Tab */}
        {activeTab === 'leaderboards' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Leaderboard Select */}
            <div>
              <select
                value={selectedLeaderboard}
                onChange={(e) => setSelectedLeaderboard(e.target.value)}
                style={{
                  width: '100%',
                  padding: 8,
                  backgroundColor: '#333',
                  border: '1px solid #444',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 12,
                }}
              >
                <option value="global-highscore">Global High Scores</option>
                <option value="weekly-highscore">Weekly High Scores</option>
                <option value="daily-highscore">Daily High Scores</option>
                <option value="fastest-completion">Fastest Completion</option>
              </select>
              <button
                onClick={handleLoadLeaderboard}
                style={{
                  width: '100%',
                  padding: 8,
                  marginTop: 8,
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: 4,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                Load Leaderboard
              </button>
            </div>

            {/* Leaderboard Entries */}
            <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>TOP SCORES</div>
              {!leaderboardData || leaderboardData.entries.length === 0 ? (
                <div style={{ color: '#666', fontSize: 12, textAlign: 'center', padding: 20 }}>
                  No entries yet
                </div>
              ) : (
                leaderboardData.entries.slice(0, 10).map((entry: ScoreEntry) => (
                  <div key={`${entry.playerId}-${entry.rank}`} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #333',
                  }}>
                    <div style={{
                      width: 32,
                      textAlign: 'center',
                      color: entry.rank <= 3 ? '#eab308' : '#888',
                      fontSize: 14,
                      fontWeight: 'bold',
                    }}>
                      {entry.rank}
                    </div>
                    <div style={{ flex: 1, color: '#fff', fontSize: 12 }}>
                      {entry.playerName}
                    </div>
                    <div style={{ color: '#3b82f6', fontSize: 12, fontWeight: 'bold' }}>
                      {entry.score.toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Player Stats */}
            <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#888', fontSize: 11 }}>YOUR STATS</span>
                <button
                  onClick={handleLoadStats}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  Refresh
                </button>
              </div>
              {playerStats ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ color: '#666', fontSize: 10 }}>Games Played</div>
                    <div style={{ color: '#fff', fontSize: 14 }}>{playerStats.gamesPlayed}</div>
                  </div>
                  <div>
                    <div style={{ color: '#666', fontSize: 10 }}>Win Rate</div>
                    <div style={{ color: '#fff', fontSize: 14 }}>
                      {playerStats.gamesPlayed > 0
                        ? `${Math.round((playerStats.wins / playerStats.gamesPlayed) * 100)}%`
                        : '0%'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#666', fontSize: 10 }}>Total Score</div>
                    <div style={{ color: '#fff', fontSize: 14 }}>{playerStats.totalScore.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: '#666', fontSize: 10 }}>Playtime</div>
                    <div style={{ color: '#fff', fontSize: 14 }}>
                      {Math.round(playerStats.playtime / 3600)}h
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#666', fontSize: 12, textAlign: 'center', padding: 12 }}>
                  Click Refresh to load stats
                </div>
              )}
            </div>
          </div>
        )}

        {/* Network Tab */}
        {activeTab === 'network' && networkStats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Connection Info */}
            <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>CONNECTION</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Status</div>
                  <div style={{ color: getConnectionColor(), fontSize: 14, textTransform: 'capitalize' }}>
                    {connectionState}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Latency</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>{networkStats.latency}ms</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Peers</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>{networkStats.peersConnected}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Uptime</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>{formatTime(networkStats.uptime)}</div>
                </div>
              </div>
            </div>

            {/* Traffic Stats */}
            <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>TRAFFIC</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Packets Sent</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>{networkStats.packetsSent}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Packets Received</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>{networkStats.packetsReceived}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Bytes Sent</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>
                    {(networkStats.bytesent / 1024).toFixed(1)} KB
                  </div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Bytes Received</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>
                    {(networkStats.bytesReceived / 1024).toFixed(1)} KB
                  </div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 10 }}>Packets Lost</div>
                  <div style={{ color: networkStats.packetsLost > 0 ? '#ef4444' : '#fff', fontSize: 14 }}>
                    {networkStats.packetsLost}
                  </div>
                </div>
              </div>
            </div>

            {/* Peers */}
            <div style={{ padding: 12, backgroundColor: '#252525', borderRadius: 8 }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>CONNECTED PEERS</div>
              {networkManager.getPeers().length === 0 ? (
                <div style={{ color: '#666', fontSize: 12, textAlign: 'center', padding: 12 }}>
                  No peers connected
                </div>
              ) : (
                networkManager.getPeers().map(peer => (
                  <div key={peer.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #333',
                  }}>
                    <div>
                      <div style={{ color: '#fff', fontSize: 12 }}>{peer.name}</div>
                      <div style={{ color: '#888', fontSize: 10 }}>{peer.id.slice(0, 12)}...</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        color: peer.state === 'connected' ? '#22c55e' : '#888',
                        fontSize: 11,
                        textTransform: 'capitalize',
                      }}>
                        {peer.state}
                      </div>
                      <div style={{ color: '#888', fontSize: 10 }}>{peer.latency}ms</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
