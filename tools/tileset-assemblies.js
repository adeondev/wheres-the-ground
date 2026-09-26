// Receitas montam objetos usando exclusivamente suas peças originais, sem esticar sprites.
(() => {
  'use strict';
  function build(recipe, width, height, x = 0, y = 0, size = 16) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < recipe.minWidth || height < recipe.minHeight || width > 128 || height > 128) {
      throw Error(`Esta montagem precisa de pelo menos ${recipe.minWidth} × ${recipe.minHeight} tiles.`);
    }
    const cells = new Map();
    const put = (col, row, tileId, flipX = false) => cells.set(`${col},${row}`, { tileId, x: x + col * size, y: y + row * size, flipX });
    const variant = (list, index) => list[index % list.length];
    if (recipe.type === 'building') {
      for (let col = 0; col < width; col++) put(col, 0, col === 0 ? recipe.roof.left : col === width - 1 ? recipe.roof.right : variant(recipe.roof.middle, col - 1));
      for (let row = 1; row < height; row++) {
        const band = row === 1 ? recipe.wall.top : row === height - 1 ? recipe.wall.bottom : recipe.wall.middle;
        for (let col = 0; col < width; col++) put(col, row, col === 0 ? band.left : col === width - 1 ? band.right : variant(band.middle, col - 1));
      }
      // Janela é sempre um bloco 2×2 sob o miolo do telhado, nunca sob as pontas.
      for (let col = 2; col + 1 < width - 1; col += 4) {
        recipe.window.forEach((tiles, row) => tiles.forEach((tileId, offset) => put(col + offset, row + 1, tileId)));
      }
    } else if (recipe.type === 'horizontal') {
      if (height !== 1) throw Error('Esta faixa tem uma linha de altura.');
      for (let col = 0; col < width; col++) {
        const tileId = col === 0 ? recipe.left : col === width - 1 ? recipe.right : variant(recipe.middle, col - 1);
        put(col, 0, tileId, col === 0 && Boolean(recipe.flipLeft));
      }
    } else if (recipe.type === 'pattern') {
      if (width !== recipe.minWidth || height !== recipe.minHeight) throw Error('Este objeto preserva o tamanho do padrão: cada parte continua sendo um tile separado.');
      recipe.rows.forEach((row, y) => row.forEach((tileId, x) => { if (tileId) put(x, y, tileId); }));
    } else if (recipe.type === 'vertical') {
      if (width !== 1) throw Error('Este detalhe tem uma coluna de largura.');
      for (let row = 0; row < height; row++) put(0, row, variant(recipe.middle, row));
    } else throw Error('Tipo de montagem desconhecido.');
    return [...cells.values()];
  }

  function check(metadata) {
    const byId = new Map(metadata.tiles.map(tile => [tile.id, tile]));
    const at = new Map();
    for (const item of metadata.scene.placements) {
      const key = `${item.x},${item.y}`;
      if (!at.has(key)) at.set(key, []);
      at.get(key).push(item);
    }
    const errors = [];
    for (const item of metadata.scene.placements) {
      const tile = byId.get(item.tileId);
      for (const rule of tile?.assembly?.requiredNeighbors ?? []) {
        const key = `${item.x + rule.dx * (item.flipX ? -1 : 1)},${item.y + rule.dy}`;
        if (!(at.get(key) ?? []).some(other => rule.tileIds.includes(other.tileId))) {
          errors.push({ instanceId: item.id, tileId: item.tileId, message: `${tile.label}: ${rule.reason}` });
        }
      }
    }
    return errors;
  }
  window.TilesetAssemblies = { build, check };
})();
