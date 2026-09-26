# Tileset Lab

Abra `tileset-editor.html` no navegador ou, com o servidor do projeto rodando, acesse `/tools/tileset-editor.html`.

## Uso

1. Arraste no PNG para selecionar um recorte. A grade pode ser livre (1 px), 8, 16 ou 32 px.
2. Preencha identificador, nome, função e observações. Salve a peça.
3. Escolha a colisão: nenhuma, sólido ou plataforma atravessável por baixo. A área de colisão usa pixels relativos ao recorte.
4. Na prévia, escolha uma peça e a ferramenta **Colocar peça**. Use **Selecionar / mover** para arrastar, ou ajuste X/Y no formulário. A ordem de desenho é definida na peça: valores maiores aparecem por cima.
5. **Exportar metadata** abre o JSON completo, com opções para baixar ou copiar. Salve como `assets/sprites/tilesets/open_world_tileset.metadata.json` e entregue esse arquivo junto do PNG.

**Importar JSON** continua um trabalho salvo. O rascunho também é salvo no navegador, mas o JSON é a cópia para guardar e compartilhar. Desfazer recupera alterações de peças e da cena. Para exportar a cena em PNG ao abrir diretamente por arquivo, pode ser necessário selecionar o tileset em **Abrir PNG** primeiro.

## Base inicial

O editor abre com uma interpretação da referência: telhado contínuo com acabamentos separados, fachada repetida, estrutura da porta, mureta, ventilação e personagem de referência. A cena tem 240 × 168 pixels. O PNG original permanece intacto.

O exemplo também está em `assets/sprites/tilesets/open_world_tileset.metadata.json`. O HTML inclui a mesma base para funcionar sem carregar JSON por `fetch` ao abrir por duplo clique. Para usar um arquivo JSON atualizado, importe-o no editor.

## Formato (versão 1)

- `image`: caminho relativo à raiz do projeto e dimensões do PNG.
- `grid.size`: tamanho do encaixe em pixels.
- `tiles[]`: identificador, nome, recorte `source` (`x`, `y`, `w`, `h`), função `role`, ordem `layer`, direção de repetição `repeat`, colisão `collision` e observações `notes`.
- `collision.type`: `none`, `solid` ou `one-way`. Nos dois últimos casos, `rect` descreve a área local de colisão, limitada ao recorte.
- `scene`: tamanho, cor de fundo e lista `placements` com identificador da instância, `tileId`, posição inteira `x`/`y` e espelhamento `flipX`.

As posições e os recortes usam pixels originais, sem zoom. A repetição indica quais direções a peça admite; a cena exportada já contém cada instância posicionada. A função de porta e as observações descrevem a intenção para a futura integração no jogo. O editor mostra colisões, mas não executa física nem eventos de gameplay. O personagem extraído do tileset é apenas uma referência de tamanho.
