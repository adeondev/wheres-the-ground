# Where's the Ground?

> Jogo de plataforma 2D e história interativa desenvolvido para o **2º Campeonato de Robótica e Programação Educacional (CROPE — NRE Umuarama)**.

---

## 🎮 Jogue Online
Acesse diretamente no seu navegador (computador ou celular):  
👉 **[https://adeondev.github.io/wheres-the-ground/](https://adeondev.github.io/wheres-the-ground/)**

---

## 🛠️ Tecnologias Utilizadas
Em total conformidade com as regras do regulamento do CROPE (Linguagens permitidas: HTML, CSS e JavaScript):
- **HTML5:** Estrutura semântica, suporte a Canvas e áudio/vídeo.
- **CSS3:** Layout responsivo, animações, interface de toque e efeitos visuais (CRT).
- **JavaScript (ES Modules puro):** Motor do jogo, física customizada, máquina de estados, diálogos interativos, efeitos de câmera e Web Audio API.

---

## 🕹️ Controles

### Computador (Teclado)
- **A / D** ou **Setas**: Mover para a esquerda / direita
- **Espaço**: Pular (segure no ar para acionar o *Booster* vertical)
- **Shift**: Dash para a frente
- **Shift + Espaço**: Mega-boost
- **J**: Disparar rajada de ar
- **T**: Interagir / Falar com personagens (diálogos)
- **C**: Alternar filtro de tela CRT retrô
- **H**: Exibir introdução / cinematic

### Dispositivos Móveis (Celular / Tablet)
- O jogo inclui botões virtuais na tela:
  - **Setas**: Movimentação horizontal
  - **Pular / Booster**: Salto e voo
  - **Dash**: Arranco horizontal
  - **Rajada**: Disparo de propulsão
  - **Falar**: Interação com diálogos e NPCs

---

## 💻 Como Rodar Localmente

Como o projeto é construído exclusivamente com tecnologias web (HTML, CSS e JavaScript), você pode executá-lo em qualquer servidor web estático:

### Opção 1: Usando Node / npx (Recomendado)
```bash
npx serve .
```
Depois, abra `http://localhost:3000` no seu navegador.

### Opção 2: VS Code
Abra a pasta do projeto no VS Code e utilize a extensão **Live Server** clicando em "Go Live" no canto inferior direito.

---

## 📜 Autoria, Direitos Autorais e Licenças

Em cumprimento aos requisitos de conformidade e boas práticas éticas do regulamento:

1. **Código-Fonte:**
   - Código original e autoral desenvolvido em JavaScript modular, HTML5 e CSS3, com suíte de testes automatizados (`scripts/*.mjs`).
2. **Sprites e Arte Gráfica:**
   - Personagens (*Gabriel*, *Milênio*, *Policial*), animações, interface de usuário e tilesets de telhado/cidade em Pixel Art: **Produção autoral original**.
   - Fotografias históricas de foguetes (cena introdutória): Imagens de domínio público da NASA e licenças livres (Creative Commons) via Wikimedia Commons (missões Apollo Saturn V, Space Shuttle, Falcon 9, Soyuz, Mercury-Atlas, Titan II, SLS Artemis, Ariane 5, Atlas V).
3. **Áudio, Efeitos Sonoros e Trilha:**
   - **Efeitos sonoros físicos e de interface** (passos, impactos, saltos, booster, rajada e cliques): Biblioteca **Soundsnap** (licença para uso de efeitos sonoros em produções e jogos).
   - **Áudio de lançamento / ignição aeroespacial:** Registro histórico da **Ignição do Ônibus Espacial (Space Shuttle Ignition)** disponibilizado publicamente pela **NASA** (YouTube / Arquivos Oficiais de Mídia da NASA em domínio público).
   - **Músicas de ambientação:** Trilha sonora temática livre de direitos autorais para fins educacionais.

---

## 🏫 Informações do Evento
- **Evento:** 2º Campeonato de Robótica e Programação Educacional (CROPE)
- **Organização:** Núcleo Regional de Educação de Umuarama (NRE Umuarama)
- **Local:** CECM Monteiro Lobato – Umuarama / PR
- **Formato:** Jogo / História Interativa
