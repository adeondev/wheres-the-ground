# Where's the Ground?

Plataforma 2D em HTML, CSS e JavaScript puro. O canvas ocupa a janela inteira. A altura virtual do jogo fica em 240 pixels; o zoom dos sprites e do HUD acompanha a altura da tela. A textura do CRT mantém linhas de 3 pixels de tela em qualquer resolução. Os controles de toque também se ajustam à largura disponível. Em proporções de tela diferentes, a área visível na horizontal muda.

## Rodar

Na pasta do projeto, execute `python -m http.server 8000` e abra `http://localhost:8000`. Abrir `index.html` com duplo clique usa `file://` e bloqueia os módulos JavaScript e os arquivos JSON carregados via `fetch`.

## Publicar para testes

O jogo é estático e pode rodar no GitHub Pages quando esse recurso estiver habilitado para o repositório. Como o projeto agora é privado e o Pages foi despublicado, o workflow está disponível apenas para execução manual depois de reativar o Pages. Não compartilhe o link da página do arquivo `index.html` dentro do GitHub: ele só mostra o código.

## Controles

- **A/D** ou **←/→**: andar
- **Espaço**, **W** ou **↑**: toque para pular; segure para usar o boost para cima
- **Shift**: dash para a frente, na direção em que Gabriel olha; pode repetir no ar após o intervalo
- **J**: rajada para onde Gabriel olha
- **T**: abrir o diálogo de exemplo
- **C**: ligar/desligar o modo CRT (a preferência fica salva no navegador)
- A introdução começa ao abrir o jogo; **Espaço** ou **Enter** pulam direto para o jogo
- **H**: rever a introdução cinematográfica durante o jogo
- No diálogo: **Enter/Espaço** revela ou avança, **W/S** ou **setas** mudam a escolha, **1–9** escolhem direto e **Esc** fecha
- Em telas de toque, use os botões na tela

## Sistemas

Boost vertical e rajada gastam o mesmo combustível. Um toque dá um pulo direto; segurando por 0,08 s, o boost entra com uma arrancada forte para cima. Shift dá um impulso horizontal forte sem gastar combustível. Ele pode repetir o dash no chão ou no ar a cada 0,3 s, soltando e apertando Shift de novo. Depois da arrancada Gabriel conserva a velocidade e vai parando em um slide; apertar a direção contrária freia mais rápido. O sprite estica durante o dash, comprime suavemente ao virar e achata ao pousar, com uma compressão maior e um slide se ele chegou rápido. O mapa de teste agora tem um piso reto. O combustível recarrega no chão.

## Diálogos

As cenas ficam em `src/dialogueData.js`. Cada nó tem `lines` e pode ter `choices` ou `next`. Uma opção pode incluir `onSelect(state)` para guardar uma decisão; `when(state)` permite mostrar uma opção só quando uma condição for verdadeira. Nós também aceitam `onEnter(state)` e `onExit(state)`. O estado permanece enquanto a página estiver aberta. Para iniciar uma cena pelo jogo, chame `dialogue.start('id-do-no')` em `src/game.js`.

Cada linha aceita `speaker`, `portrait` (`gabriel` ou `signal`), `text` e tags dentro do texto: `[shake]`, `[rgb]`, `[fall]`, `[wave]`, `[color=#RRGGBB]`, `[speed=0.05]` e `[pause=0.3]`. Feche efeitos com `[/shake]`, `[/rgb]`, etc. As tags podem ser aninhadas. Enter/Espaço revela a linha inteira ou avança; tocar na caixa também funciona. As opções aparecem abaixo da fala depois de avançá-la. Ao abrir o diálogo, o jogo pausa. O diálogo de exemplo pode ser aberto com T ou pelo botão de toque.

A caixa, o cursor, o retrato do rádio e a fonte bitmap são PNGs em `assets/ui/dialogue/`. O retrato de Gabriel usa o spritesheet dele. Toda a interface de diálogo é desenhada no canvas do jogo, sem elementos HTML visuais. Para ajustar os sprites, edite `tools/make_dialogue_assets.py` e execute `python tools/make_dialogue_assets.py`.

## Scripts

- `src/config.js`: valores de movimento e combustível
- `src/animation.js`: deformação visual do Gabriel no dash, na virada e no pouso
- `src/palette.js`: cores do fogo retiradas do sprite de boost
- `src/cameraEffects.js`: tremida no dash e em quedas fortes; zoom curto ao iniciar o boost
- `src/audio.js`: reprodução dos efeitos sonoros físicos (pulo, aterrissagem, dash e loop de booster com fade-in/out)
- `src/intro.js`: introdução cinematográfica em máquina de escrever, blips de diálogo e revelação da logo com música aos 1:29
- `src/input.js`: teclado e toque
- `src/crt.js`: alterna e salva o modo CRT
- `src/player.js`: física, colisões, boost, dash e rajada
- `src/world.js`: piso reto e desenho do cenário
- `src/sprites.js`: carregamento do spritesheet do Gabriel via metadata
- `src/effects.js`: explosão pixelada e cópias do Gabriel no dash, faíscas e poeira ao pousar/deslizar
- `src/dialogueData.js`: cenas e escolhas
- `src/dialogue.js`: escrita letra por letra, efeitos e interface em sprites no canvas
- `src/game.js`: loop, câmera, projéteis, diálogos e HUD

Os PNGs e metadados de Gabriel estão em `assets/sprites/player/spr_gabriel/`: `metadata.json` para o idle, `metadata_run.json` para os 7 quadros do run em uma grade 4×2, `metadata_jump.json` para os 2 quadros do pulo, `metadata_boost.json` para os 2 quadros do impulso para cima e `metadata_dash.json` para os 3 quadros do dash. O pulo toca uma vez e segura o último quadro até pousar; o boost alterna seus quadros enquanto está ativo; a animação do dash dura 0,3 s sem mudar seus 0,15 s de impulso físico.
