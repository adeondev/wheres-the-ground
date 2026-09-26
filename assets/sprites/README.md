# Sprites

Coloque os PNGs nas pastas abaixo, como uma árvore de recursos do GameMaker:

```text
sprites/
├── player/       personagem e animações
├── tilesets/     chão, plataformas e cenário em tiles
├── objects/      itens, portas, perigos e outros objetos
├── backgrounds/  fundos e camadas distantes
└── ui/           ícones e interface
```

Use uma pasta por sprite ou animação, com prefixo `spr_`. O Gabriel já segue esse formato:

```text
player/spr_gabriel/
├── spritesheet.png
├── metadata.json
├── spritesheet_run.png
├── metadata_run.json
├── spritesheet_jump.png
├── metadata_jump.json
├── spritesheet_boost.png
├── metadata_boost.json
├── spritesheet_dash.png
└── metadata_dash.json
```

O metadata informa tamanho dos frames, quantidade de frames e FPS. Mantenha os frames do sheet com o mesmo tamanho.

`src/sprites.js` carrega o Gabriel por esse caminho. As plataformas ainda usam desenhos provisórios no canvas.
