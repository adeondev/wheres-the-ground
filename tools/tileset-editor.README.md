# Tileset Lab

Abra `tileset-editor.html` no navegador ou, com o servidor do projeto rodando, acesse `/tools/tileset-editor.html`.

## Uso

1. Clique no PNG para selecionar um tile 16×16. A grade de 16 pixels é o padrão do catálogo. O personagem é a única referência com um recorte maior.
2. Preencha identificador, nome, função e observações. Salve a peça.
3. Escolha a colisão: nenhuma, sólido ou plataforma atravessável por baixo. A área de colisão usa pixels relativos ao recorte.
4. Na prévia, escolha uma peça e a ferramenta **Colocar peça**. Para montar objetos inteiros, escolha uma **Montagem**, ajuste a largura/altura em tiles, clique em **Montar objeto** e depois na cena. O canto superior esquerdo fica no ponto clicado. Use **Selecionar / mover** para arrastar tiles individuais, ou ajuste X/Y no formulário. A ordem de desenho é definida na peça: valores maiores aparecem por cima.
5. **Exportar metadata** abre o JSON completo, com opções para baixar ou copiar. Salve como `assets/sprites/tilesets/open_world_tileset.metadata.json` e entregue esse arquivo junto do PNG.

**Importar JSON** continua um trabalho salvo. O rascunho também é salvo no navegador, mas o JSON é a cópia para guardar e compartilhar. Desfazer recupera alterações de peças e da cena. Para exportar a cena em PNG ao abrir diretamente por arquivo, pode ser necessário selecionar o tileset em **Abrir PNG** primeiro.

## Base inicial

O catálogo tem 40 tiles de cenário 16×16, mais o personagem de referência 16×28. Cada parte permanece alinhada à grade original, inclusive suas margens transparentes. A cena tem 240 × 176 pixels e 123 instâncias. O PNG original permanece intacto.

As definições do telhado, dos cantos superiores de concreto e da janela superior esquerda seguem as coordenadas e colisões fornecidas pelo autor. O restante foi completado com nomes, funções, colisões, repetições e regras de encaixe. As famílias são: prédio, janela, ventilação, cano, acesso/porta, mureta e corrimão.

Há sete receitas: prédio expansível, janela completa, mureta, corrimão, acesso, ventilação e cano. Prédio aumenta em largura e altura; mureta/corrimão aumentam em largura; cano aumenta em altura. Janelas repetem como blocos 2×2. A estrutura da porta e a ventilação preservam seus padrões de peças, porque este PNG não tem miolos separados que permitam expandi-las sem duplicar partes do objeto.

**Verificar encaixes** aponta pontas sem concreto correspondente, janelas incompletas, partes da porta faltando e ventilação desconectada. Essa verificação ajuda na revisão; não altera a cena automaticamente. As montagens respeitam as regras. Ao editar uma peça, suas regras são mantidas no JSON.

Prédio e janelas são sólidos conforme as definições do autor. Acesso, mureta, corrimão e ventilação foram interpretados como decoração ao fundo, sem colisão. Essa decisão e o destino ainda indefinido da porta estão anotados em `reviewNotes` no JSON para revisão.

O exemplo também está em `assets/sprites/tilesets/open_world_tileset.metadata.json`. O HTML inclui a mesma base para funcionar sem carregar JSON por `fetch` ao abrir por duplo clique. Para usar um arquivo JSON atualizado, importe-o no editor. O rascunho deste catálogo usa uma nova chave de armazenamento; o rascunho anterior do navegador é preservado. **Restaurar exemplo** restaura catálogo e cena completos, com suporte a Desfazer.

## Formato (versão 1)

- `image`: caminho relativo à raiz do projeto e dimensões do PNG.
- `grid.size`: tamanho do encaixe em pixels.
- `tiles[]`: identificador, nome, recorte `source` (`x`, `y`, `w`, `h`), função `role`, ordem `layer`, direção de repetição `repeat`, colisão `collision` e observações `notes`.
- `collision.type`: `none`, `solid` ou `one-way`. Nos dois últimos casos, `rect` descreve a área local de colisão, limitada ao recorte.
- `scene`: tamanho, cor de fundo e lista `placements` com identificador da instância, `tileId`, posição inteira `x`/`y` e espelhamento `flipX`.
- `tiles[].assembly`: família, parte e `requiredNeighbors`. Cada regra contém deslocamento relativo em pixels (`dx`/`dy`), identificadores aceitos em `tileIds` e explicação em `reason`.
- `assemblies[]`: receitas compostas de identificadores de tiles. Tipos: `building`, `horizontal`, `vertical` e `pattern`. Dimensões são contagens de tiles, não escalas do sprite.
- `reviewNotes`: decisões de interpretação que o autor pode revisar.

As posições e os recortes usam pixels originais, sem zoom. A repetição indica quais direções a peça admite; a cena exportada já contém cada instância posicionada. A função de porta e as observações descrevem a intenção para a futura integração no jogo. O editor mostra colisões, mas não executa física nem eventos de gameplay. O personagem extraído do tileset é apenas uma referência de tamanho.

## Atualizar a base

`node scripts/make_tileset_metadata.mjs` regenera o JSON e o conteúdo embutido no HTML a partir das definições do script e de `tools/tileset-assemblies.js`. Esse comando sobrescreve a metadata de exemplo: preserve um JSON editado manualmente antes de regenerar.
