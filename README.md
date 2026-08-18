# 🚀 TelaViewer

**TelaViewer** é uma aplicação web leve e de altíssimo desempenho para **compartilhamento de tela em tempo real (1080p 60 FPS)** e **Chat de Voz estilo Discord**, projetada para conexões diretas ponto a ponto (**P2P via WebRTC**) em redes virtuais como **Radmin VPN, Hamachi, Tailscale, ZeroTier** e **Rede Local (LAN)**.

---

## 💡 Por que o TelaViewer?

Em momentos de instabilidade, bloqueios ou limitações de plataformas centralizadas como o Discord (como limite de 720p 30 FPS sem Nitro), o **TelaViewer** surge como uma alternativa descentralizada, gratuita, sem anúncios e de código aberto:

- **100% P2P (Sem servidores de terceiros espionando ou intermediando o vídeo):** A transmissão vai direto do seu computador para o do seu amigo.
- **Sem limites de tempo ou qualidade:** Transmita em 1080p a 60 FPS com áudio do jogo sem custos.
- **Amigo não precisa instalar nada:** O anfitrião inicia o app e o amigo apenas abre o link no navegador (Chrome, Edge, Brave, Opera, Firefox).
- **Funciona em qualquer rede virtual:** Totalmente compatível com **Radmin VPN, LogMeIn Hamachi, Tailscale, ZeroTier** e redes Wi-Fi/Ethernet locais.

---

## ✨ Principais Recursos

- 🖥️ **Compartilhamento de Tela Flexível:** Escolha entre transmitir monitores inteiros, janelas de programas/jogos específicos ou guias do navegador.
- 🎮 **Áudio do Jogo / Sistema:** Suporte completo à transmissão do áudio de jogos, filmes e vídeos.
- 🎙️ **Chat de Voz Integrado:**
  - Detecção automática de voz (VAD) ou modo *Push-to-Talk* (tecla `V`).
  - Anel verde (*Speaking Ring*) que indica visualmente quem está falando no momento.
  - Medidor de decibéis em tempo real (**VU meter**).
  - Cancelamento de eco e supressão de ruído nativos.
- 🎧 **Seleção Dinâmica de Dispositivos:** Escolha exatamente qual microfone usar e por qual fone/alto-falante escutar, com botão de teste sonoro integrado.
- 🔊 **Controle Individual de Volume:** Aumente a voz do seu amigo em até 200% (*Boost*) de forma independente do volume do jogo.
- 🔴 **Gravador de Vídeo & Screenshot:** Grave sessões da transmissão e tire fotos da tela com 1 clique.
- 💬 **Chat de Texto Integrado:** Mensagens instantâneas diretamente pela interface.
- 📊 **Monitor de Estatísticas WebRTC:** Visualize Ping (latência em ms), FPS, resolução e taxa de bits em tempo real.
- 🔒 **HTTPS & WebSockets Seguros:** Permite liberação automática de microfones e captura de tela sem restrições dos navegadores.

---

## 🌐 Redes Suportadas

O TelaViewer detecta automaticamente as interfaces de rede ativas na sua máquina:
- **Radmin VPN**
- **LogMeIn Hamachi**
- **Tailscale**
- **ZeroTier**
- **Rede Local (Wi-Fi / Ethernet LAN)**

---

## ⚡ Como Iniciar e Usar

### Pré-requisitos
- [Node.js](https://nodejs.org) (v18 ou superior instalado).
- Estar na mesma rede virtual (Radmin VPN, Hamachi, Tailscale, etc.) ou na mesma rede local que seu amigo.

### 1. Iniciar o Servidor (Host)
No Windows, basta dar um **duplo clique** no arquivo:
```cmd
iniciar.bat
```
*(Ou execute via terminal com `npm install` e `npm start`)*.

O navegador abrirá automaticamente em `https://localhost:3000`.

### 2. Conectar seu Amigo
1. No topo da tela, clique em **"Copiar Link do Amigo"** (o link gerado contém o seu IP na rede VPN/LAN, ex: `https://26.x.x.x:3000` ou `https://25.x.x.x:3000`).
2. Envie o link para seu amigo abrir em qualquer navegador moderno (Chrome, Edge, Brave, Opera, Firefox).
3. Ao abrir pela primeira vez, clique em **"Avançado" ➔ "Continuar"** para aceitar o certificado local seguro.
4. Pronto! Vocês já estarão no chat de voz e prontos para compartilhar a tela em 60 FPS.

---

## ⌨️ Atalhos de Teclado Rápidos

| Tecla | Ação |
| :---: | :--- |
| **`M`** | Muta / Desmuta o seu microfone |
| **`D`** | Ensurdecer (*Deafen*) - Silencia tudo e muta seu microfone |
| **`V`** | Push-to-Talk (quando ativado nas configurações de voz) |
| **`F`** | Alternar Modo Tela Cheia |

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** HTML5, CSS3 Moderno (Glassmorphism), Vanilla JavaScript, WebRTC API, Web Audio API.
- **Backend:** Node.js, Express, WebSockets (`ws`), `selfsigned` (SSL nativo).

---

## 📄 Licença

Distribuído sob a licença MIT. Sinta-se livre para usar, contribuir e modificar!
