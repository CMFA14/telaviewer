const https = require('https');
const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');
const os = require('os');
const fs = require('fs');
const selfsigned = require('selfsigned');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Obter ou gerar certificado SSL para HTTPS (Necessário para o navegador permitir Microfone e Compartilhamento de Tela para o amigo)
async function getOrCreateSSLCert() {
  const certPath = path.join(__dirname, 'cert.pem');
  const keyPath = path.join(__dirname, 'key.pem');

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return {
      cert: fs.readFileSync(certPath, 'utf8'),
      key: fs.readFileSync(keyPath, 'utf8')
    };
  }

  console.log('[SSL] Gerando certificado HTTPS seguro para a rede local / Radmin VPN...');
  const attrs = [{ name: 'commonName', value: 'TelaViewer' }];
  const pems = await selfsigned.generate(attrs, { days: 365 });

  fs.writeFileSync(certPath, pems.cert);
  fs.writeFileSync(keyPath, pems.private);

  return {
    cert: pems.cert,
    key: pems.private
  };
}

// Função para obter todos os IPs da máquina (destacando Radmin VPN)
function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const isRadmin = iface.address.startsWith('26.') || name.toLowerCase().includes('radmin') || name.toLowerCase().includes('famato');
        addresses.push({
          interface: name,
          ip: iface.address,
          isRadmin: isRadmin,
          type: isRadmin ? 'Radmin VPN' : 'Rede Local (Wi-Fi/Ethernet)'
        });
      }
    }
  }

  addresses.sort((a, b) => (b.isRadmin ? 1 : 0) - (a.isRadmin ? 1 : 0));
  return addresses;
}

// Endpoint para o frontend consultar os IPs da rede
app.get('/api/network-info', (req, res) => {
  const ips = getNetworkInterfaces();
  res.json({
    port: PORT,
    protocol: 'https',
    interfaces: ips,
    primaryRadminIp: ips.find(i => i.isRadmin)?.ip || null
  });
});

async function startServer() {
  const sslOptions = await getOrCreateSSLCert();
  const server = https.createServer(sslOptions, app);
  const wss = new WebSocketServer({ server });

  // Gerenciador de salas e clientes conectados
  const clients = new Map(); // ws -> { id, username, room, sharing: boolean }

  function broadcastToRoom(room, message, senderWs = null) {
    const payload = JSON.stringify(message);
    for (const [ws, info] of clients.entries()) {
      if (info.room === room && ws !== senderWs && ws.readyState === ws.OPEN) {
        ws.send(payload);
      }
    }
  }

  function getRoomPeers(room) {
    const peers = [];
    for (const [ws, info] of clients.entries()) {
      if (info.room === room && ws.readyState === ws.OPEN) {
        peers.push({
          id: info.id,
          username: info.username,
          sharing: info.sharing
        });
      }
    }
    return peers;
  }

  const roomPinnedLinks = new Map(); // room -> { url, title, iconType, pinnedBy }

  wss.on('connection', (ws) => {
    const clientId = 'peer_' + Math.random().toString(36).substring(2, 9);
    clients.set(ws, {
      id: clientId,
      username: 'Usuário ' + clientId.substring(5),
      room: 'default',
      sharing: false
    });

    ws.send(JSON.stringify({
      type: 'welcome',
      id: clientId
    }));

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw);
        const clientInfo = clients.get(ws);
        if (!clientInfo) return;

        switch (data.type) {
          case 'join': {
            clientInfo.room = data.room || 'default';
            if (data.username) clientInfo.username = data.username;
            
            const peers = getRoomPeers(clientInfo.room).filter(p => p.id !== clientInfo.id);
            ws.send(JSON.stringify({
              type: 'peers-list',
              peers: peers
            }));

            // Enviar link fixado da sala (se houver)
            if (roomPinnedLinks.has(clientInfo.room)) {
              ws.send(JSON.stringify({
                type: 'pinned-link-update',
                pinnedLink: roomPinnedLinks.get(clientInfo.room)
              }));
            }

            broadcastToRoom(clientInfo.room, {
              type: 'peer-joined',
              peer: {
                id: clientInfo.id,
                username: clientInfo.username,
                sharing: clientInfo.sharing
              }
            }, ws);
            break;
          }

          case 'set-username': {
            clientInfo.username = data.username || clientInfo.username;
            broadcastToRoom(clientInfo.room, {
              type: 'peer-updated',
              peer: {
                id: clientInfo.id,
                username: clientInfo.username,
                sharing: clientInfo.sharing
              }
            });
            break;
          }

          case 'sharing-status': {
            clientInfo.sharing = !!data.sharing;
            broadcastToRoom(clientInfo.room, {
              type: 'sharing-status-changed',
              peerId: clientInfo.id,
              sharing: clientInfo.sharing
            }, ws);
            break;
          }

          case 'offer':
          case 'answer':
          case 'ice-candidate': {
            const targetId = data.target;
            for (const [targetWs, info] of clients.entries()) {
              if (info.id === targetId && targetWs.readyState === targetWs.OPEN) {
                targetWs.send(JSON.stringify({
                  ...data,
                  sender: clientInfo.id,
                  senderUsername: clientInfo.username
                }));
                break;
              }
            }
            break;
          }

          // Mensagens de Texto
          case 'chat-message': {
            broadcastToRoom(clientInfo.room, {
              type: 'chat-message',
              sender: clientInfo.id,
              username: clientInfo.username,
              text: data.text,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            break;
          }

          // Envio de Arquivos
          case 'chat-file': {
            broadcastToRoom(clientInfo.room, {
              type: 'chat-file',
              sender: clientInfo.id,
              username: clientInfo.username,
              fileName: data.fileName,
              fileSize: data.fileSize,
              fileType: data.fileType,
              fileData: data.fileData,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            break;
          }

          // Fixar Link na Sala (Spotify Jam, Twitch, etc.)
          case 'pin-link': {
            const pinData = {
              url: data.url,
              title: data.title || data.url,
              iconType: data.iconType || 'web',
              pinnedBy: clientInfo.username
            };
            roomPinnedLinks.set(clientInfo.room, pinData);
            broadcastToRoom(clientInfo.room, {
              type: 'pinned-link-update',
              pinnedLink: pinData
            });
            break;
          }

          // Desafixar Link
          case 'unpin-link': {
            roomPinnedLinks.delete(clientInfo.room);
            broadcastToRoom(clientInfo.room, {
              type: 'pinned-link-update',
              pinnedLink: null
            });
            break;
          }
        }
      } catch (err) {
        console.error('Erro ao processar mensagem:', err);
      }
    });

    ws.on('close', () => {
      const clientInfo = clients.get(ws);
      if (clientInfo) {
        broadcastToRoom(clientInfo.room, {
          type: 'peer-left',
          peerId: clientInfo.id
        });
        clients.delete(ws);
      }
    });
  });


  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[ERRO] A porta ${PORT} ja esta sendo usada por outro programa.`);
      console.error(`Feche o outro processo ou defina uma porta diferente (ex: PORT=3001).\n`);
    } else {
      console.error('\n[ERRO]', err.message);
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    const ips = getNetworkInterfaces();
    console.log('\n=============================================================');
    console.log('    🚀 TELAVIEWER HTTPS - P2P e Chat de Voz Ativo!          ');
    console.log('=============================================================');
    console.log(`\n👉 Acesso local (neste PC):`);
    console.log(`   https://localhost:${PORT}`);
    
    const radmin = ips.filter(i => i.isRadmin);
    if (radmin.length > 0) {
      console.log(`\n🔗 Links HTTPS para seu amigo no Radmin VPN:`);
      radmin.forEach(r => {
        console.log(`   https://${r.ip}:${PORT}  (${r.interface})`);
      });
    } else {
      console.log(`\nℹ️ Outros IPs de rede local encontrados:`);
      ips.forEach(r => {
        console.log(`   https://${r.ip}:${PORT}  (${r.interface})`);
      });
    }
    console.log('\n=============================================================\n');
  });
}

startServer().catch(err => {
  console.error('[ERRO FATAL]', err);
});
