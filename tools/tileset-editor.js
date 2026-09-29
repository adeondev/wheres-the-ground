(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const base = JSON.parse($('default-metadata').textContent);
  const storageKey = base.reviewStatus === 'pending' ? 'wtg-tileset-lab-review-16-v4' : 'wtg-tileset-lab-16-v2';
  let metadata = clone(base);
  try { const saved = localStorage.getItem(storageKey); if (saved) metadata = validate(JSON.parse(saved)); } catch { /* JSON continua sendo a cópia principal. */ }
  const image = new Image();
  const atlas = $('atlas'), scene = $('scene');
  const a = atlas.getContext('2d'), s = scene.getContext('2d');
  const tileForm = $('tile-form'), instanceForm = $('instance-form');
  let selectedTile = null, selectedInstance = null, selection = { x: 0, y: 48, w: 16, h: 16 };
  let previousAssembly = null;
  let atlasDrag = null, sceneDrag = null, imageUrl = null;
  const history = [];
  const field = (form, name) => form.elements.namedItem(name);
  const number = (form, name) => Number(field(form, name).value);
  const snap = () => Number($('snap').value);
  const status = message => { $('status').textContent = message; };
  const currentTile = () => metadata.tiles.find(tile => tile.id === selectedTile);
  const currentInstance = () => metadata.scene.placements.find(item => item.id === selectedInstance);
  const tileFor = item => metadata.tiles.find(tile => tile.id === item.tileId);
  const sortedPlacements = () => [...metadata.scene.placements].sort((a, b) => tileFor(a).layer - tileFor(b).layer);
  function persist() { try { localStorage.setItem(storageKey, JSON.stringify(metadata)); } catch { status('Não foi possível salvar o rascunho no navegador. Exporte o JSON.'); } }
  function checkpoint() { history.push(clone(metadata)); if (history.length > 50) history.shift(); $('undo').disabled = false; }
  function changed(message) { persist(); draw(); renderList(); refreshInstance(); renderAssemblies(); $('rule-status').textContent=''; if (message) status(message); }
  function bounds(rect) { return Number.isInteger(rect.x) && Number.isInteger(rect.y) && Number.isInteger(rect.w) && Number.isInteger(rect.h) && rect.x >= 0 && rect.y >= 0 && rect.w > 0 && rect.h > 0; }
  function validate(data) {
    if (data.version !== 1 || !data.image || typeof data.image.path !== 'string' || !Array.isArray(data.tiles) || !data.scene || !Array.isArray(data.scene.placements)) throw Error('Formato de metadata inválido. Use um JSON exportado por este editor.');
    if (!Number.isInteger(data.image.width) || !Number.isInteger(data.image.height) || data.image.width < 1 || data.image.height < 1) throw Error('Dimensões do PNG inválidas.');
    if (!Number.isInteger(data.scene.width) || !Number.isInteger(data.scene.height) || data.scene.width < 16 || data.scene.height < 16 || data.scene.width > 2048 || data.scene.height > 2048 || !/^#[\da-f]{6}$/i.test(data.scene.background)) throw Error('Configuração da cena inválida.');
    if (!data.grid || ![1,8,16,32].includes(data.grid.size)) throw Error('Grade inválida.');
    const ids = new Set();
    for (const tile of data.tiles) {
      if (typeof tile.id !== 'string' || !/^[\w-]+$/.test(tile.id) || ids.has(tile.id) || typeof tile.label !== 'string' || !bounds(tile.source) || tile.source.x + tile.source.w > data.image.width || tile.source.y + tile.source.h > data.image.height || !Number.isInteger(tile.layer)) throw Error('Peça inválida ou identificador duplicado.');
      if (!['platform','terrain','decoration','door','character'].includes(tile.role) || !['none','x','y','both'].includes(tile.repeat) || !tile.collision || !['none','solid','one-way','slope'].includes(tile.collision.type)) throw Error('Função ou colisão inválida.');
      const r = tile.collision.rect;
      if (tile.collision.type !== 'none' && (!r || !bounds(r) || r.x + r.w > tile.source.w || r.y + r.h > tile.source.h)) throw Error('Área de colisão fora do recorte.');
      if (tile.collision.type === 'slope' && (!Array.isArray(tile.collision.heights) || tile.collision.heights.length !== tile.source.w || tile.collision.heights.some(y => !Number.isInteger(y) || y < 0 || y > tile.source.h))) throw Error('Perfil da rampa inválido.');
      ids.add(tile.id);
    }
    for(const tile of data.tiles){
      if(data.catalog?.startsWith('open-world-16')&&tile.role!=='character'&&(tile.source.w!==16||tile.source.h!==16||tile.source.x%16||tile.source.y%16))throw Error('Neste catálogo, cada peça de cenário precisa ser um tile 16×16 alinhado à grade. Monte objetos maiores juntando as peças.');
      for(const rule of tile.assembly?.requiredNeighbors??[])if(!Number.isInteger(rule.dx)||!Number.isInteger(rule.dy)||!Array.isArray(rule.tileIds)||!rule.tileIds.length||rule.tileIds.some(id=>!ids.has(id)))throw Error('Regra de encaixe aponta para uma peça inexistente.');
    }
    if(data.assemblies&&!Array.isArray(data.assemblies))throw Error('Lista de montagens inválida.');
    const recipeIds=new Set();
    for(const recipe of data.assemblies??[]){
      if(typeof recipe.id!=='string'||recipeIds.has(recipe.id)||!Number.isInteger(recipe.minWidth)||!Number.isInteger(recipe.minHeight))throw Error('Montagem inválida ou repetida.');
      const parts=window.TilesetAssemblies.build(recipe,recipe.minWidth,recipe.minHeight);
      if(parts.some(item=>!ids.has(item.tileId)))throw Error('Montagem aponta para uma peça inexistente.');
      recipeIds.add(recipe.id);
    }
    const instances = new Set();
    for (const item of data.scene.placements) {
      if (typeof item.id !== 'string' || instances.has(item.id) || !ids.has(item.tileId) || !Number.isInteger(item.x) || !Number.isInteger(item.y) || typeof item.flipX !== 'boolean') throw Error('Peça da cena inválida.');
      instances.add(item.id);
    }
    return data;
  }
  function drawGrid(ctx, width, height, step) {
    ctx.save(); ctx.strokeStyle = '#b8a0ff40'; ctx.lineWidth = 0.25;
    ctx.beginPath(); for (let x=0;x<=width;x+=step) {ctx.moveTo(x,0);ctx.lineTo(x,height);} for(let y=0;y<=height;y+=step){ctx.moveTo(0,y);ctx.lineTo(width,y);} ctx.stroke(); ctx.restore();
  }
  function drawAtlas() {
    if (!image.naturalWidth) return;
    const zoom = Number($('atlas-zoom').value);
    atlas.width = image.width * zoom; atlas.height = image.height * zoom;
    a.scale(zoom, zoom); a.imageSmoothingEnabled = false; a.drawImage(image,0,0);
    if ($('atlas-grid').checked) drawGrid(a,image.width,image.height,Math.max(8,snap()));
    for (const tile of metadata.tiles) {const r=tile.source; a.strokeStyle=tile.id===selectedTile?'#ffc281':'#b8a0ff80';a.lineWidth=1/zoom;a.strokeRect(r.x,r.y,r.w,r.h);}
    if(selection){a.fillStyle='#ffc28125';a.fillRect(selection.x,selection.y,selection.w,selection.h);a.strokeStyle='#ffc281';a.lineWidth=1/zoom;a.strokeRect(selection.x,selection.y,selection.w,selection.h);}
  }
  function drawPiece(ctx, tile, item) {
    const r=tile.source;ctx.save();ctx.translate(item.x+(item.flipX?r.w:0),item.y);if(item.flipX)ctx.scale(-1,1);ctx.drawImage(image,r.x,r.y,r.w,r.h,0,0,r.w,r.h);ctx.restore();
  }
  function drawScene(overlays = true) {
    scene.width=metadata.scene.width;scene.height=metadata.scene.height;s.imageSmoothingEnabled=false;
    if(!$('checker').checked){s.fillStyle=metadata.scene.background;s.fillRect(0,0,scene.width,scene.height);}
    if(image.naturalWidth) for(const item of sortedPlacements())drawPiece(s,tileFor(item),item);
    if(overlays && $('scene-grid').checked)drawGrid(s,scene.width,scene.height,Math.max(8,snap()));
    if(overlays && $('collisions').checked)for(const item of sortedPlacements()){
      const tile=tileFor(item);if(tile.collision.type==='none')continue;const r=tile.collision.rect;
      if(tile.collision.type==='slope'){
        s.fillStyle='#ffc28170';
        tile.collision.heights.forEach((top,col)=>s.fillRect(item.x+(item.flipX?tile.source.w-1-col:col),item.y+top,1,tile.source.h-top));
        continue;
      }
      const x=item.x+(item.flipX?tile.source.w-r.x-r.w:r.x);s.fillStyle=tile.collision.type==='one-way'?'#ffc28140':'#83ffaf35';s.strokeStyle=tile.collision.type==='one-way'?'#ffc281':'#83ffaf';s.lineWidth=.5;s.fillRect(x,item.y+r.y,r.w,r.h);s.strokeRect(x,item.y+r.y,r.w,r.h);
    }
    const item=currentInstance();if(overlays&&item){const r=tileFor(item).source;s.strokeStyle='#ffc281';s.lineWidth=.5;s.strokeRect(item.x,item.y,r.w,r.h);}
    $('scene-status').textContent=`${scene.width} × ${scene.height} px · ${$('mode').selectedOptions[0].textContent}`;
    $('placement-count').textContent=`${metadata.scene.placements.length} peças`;
  }
  function draw(){drawAtlas();drawScene();}
  function renderList(){
    $('tile-list').replaceChildren();$('tile-count').textContent=metadata.tiles.length;
    $('scene-tile').replaceChildren();
    if(!selectedTile){const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Selecione uma peça';placeholder.disabled=true;placeholder.selected=true;$('scene-tile').append(placeholder);}
    for(const tile of metadata.tiles){
      const option=document.createElement('option');option.value=tile.id;option.textContent=tile.label;option.selected=tile.id===selectedTile;$('scene-tile').append(option);
      const button=document.createElement('button');button.type='button';button.className='tile-row'+(tile.id===selectedTile?' active':'');
      const thumb=document.createElement('canvas');thumb.width=40;thumb.height=40;const ctx=thumb.getContext('2d');ctx.imageSmoothingEnabled=false;
      const r=tile.source,scale=Math.min(36/r.w,36/r.h);if(image.naturalWidth)ctx.drawImage(image,r.x,r.y,r.w,r.h,Math.round((40-r.w*scale)/2),Math.round((40-r.h*scale)/2),Math.round(r.w*scale),Math.round(r.h*scale));
      const text=document.createElement('span'),title=document.createElement('strong'),detail=document.createElement('small');title.textContent=tile.label;detail.textContent=`${tile.id} · ${r.w}×${r.h} · ${tile.collision.type}`;text.append(title,detail);button.append(thumb,text);button.onclick=()=>selectTile(tile.id);$('tile-list').append(button);
    }
    $('delete-tile').disabled=!currentTile();
  }
  function fillSelection(){for(const name of ['x','y','w','h'])field(tileForm,name).value=selection[name];}
  function selectTile(id){
    selectedTile=id;const tile=currentTile();if(!tile)return;selection={...tile.source};fillSelection();
    for(const name of ['id','label','role','layer','repeat','notes'])field(tileForm,name).value=tile[name]??'';
    field(tileForm,'collision').value=tile.collision.type;
    const rules=tile.assembly?.requiredNeighbors??[];$('tile-rules').replaceChildren();
    for(const rule of rules){const line=document.createElement('p');line.textContent=rule.reason+' Peças: '+rule.tileIds.map(id=>metadata.tiles.find(other=>other.id===id)?.label??id).join(' / ');$('tile-rules').append(line);}
    if(!rules.length)$('tile-rules').textContent='Sem encaixes obrigatórios cadastrados.';
    const r=tile.collision.rect??{x:0,y:0,w:tile.source.w,h:tile.source.h};for(const [key,name] of [['x','cx'],['y','cy'],['w','cw'],['h','ch']])field(tileForm,name).value=r[key];
    $('selection-label').textContent='Editando peça';$('save-tile').textContent='Atualizar peça';renderList();drawAtlas();
    const zoom=Number($('atlas-zoom').value),scroll=$('atlas-scroll');scroll.scrollLeft=Math.max(0,(tile.source.x+tile.source.w/2)*zoom-scroll.clientWidth/2);scroll.scrollTop=Math.max(0,(tile.source.y+tile.source.h/2)*zoom-scroll.clientHeight/2);
  }
  function newTile(){selectedTile=null;tileForm.reset();fillSelection();field(tileForm,'cx').value=0;field(tileForm,'cy').value=0;field(tileForm,'cw').value=selection.w;field(tileForm,'ch').value=selection.h;$('selection-label').textContent='Novo recorte';$('save-tile').textContent='Salvar peça';$('tile-rules').textContent='Sem encaixes obrigatórios cadastrados.';renderList();drawAtlas();}
  function refreshInstance(){
    const item=currentInstance();instanceForm.querySelectorAll('input,button').forEach(element=>element.disabled=!item);
    $('instance-title').textContent=item?`${tileFor(item).label} · ${item.id}`:'Selecione uma peça na prévia para ajustar sua posição.';
    field(instanceForm,'x').value=item?.x??'';field(instanceForm,'y').value=item?.y??'';field(instanceForm,'flipX').checked=item?.flipX??false;
    for(const key of ['width','height','background'])field($('scene-form'),key).value=metadata.scene[key];
  }
  function point(event,canvas){const r=canvas.getBoundingClientRect();const divisor=canvas===atlas?Number($('atlas-zoom').value):1;return{x:Math.floor((event.clientX-r.left)*canvas.width/r.width/divisor),y:Math.floor((event.clientY-r.top)*canvas.height/r.height/divisor)};}
  function aligned(n){return Math.round(n/snap())*snap();}
  function atlasPoint(event){const p=point(event,atlas);return{x:Math.min(image.width-1,Math.max(0,p.x)),y:Math.min(image.height-1,Math.max(0,p.y))};}
  atlas.onpointerdown=event=>{if(!image.naturalWidth||event.button!==0)return;const p=atlasPoint(event);atlasDrag={x:Math.floor(p.x/snap())*snap(),y:Math.floor(p.y/snap())*snap()};atlas.setPointerCapture(event.pointerId);selection={...atlasDrag,w:Math.min(snap(),image.width-atlasDrag.x),h:Math.min(snap(),image.height-atlasDrag.y)};newTile();};
  atlas.onpointermove=event=>{if(!atlasDrag)return;const p=atlasPoint(event);const left=Math.min(atlasDrag.x,Math.floor(p.x/snap())*snap()),top=Math.min(atlasDrag.y,Math.floor(p.y/snap())*snap());selection={x:left,y:top,w:Math.min(image.width,Math.ceil((Math.max(atlasDrag.x,p.x)+1)/snap())*snap())-left,h:Math.min(image.height,Math.ceil((Math.max(atlasDrag.y,p.y)+1)/snap())*snap())-top};fillSelection();field(tileForm,'cw').value=selection.w;field(tileForm,'ch').value=selection.h;drawAtlas();};
  atlas.onpointerup=atlas.onpointercancel=()=>{atlasDrag=null;};
  for(const name of ['x','y','w','h'])field(tileForm,name).oninput=()=>{const r=Object.fromEntries(['x','y','w','h'].map(key=>[key,number(tileForm,key)]));if(bounds(r)){selection=r;drawAtlas();}};
  tileForm.onsubmit=event=>{
    event.preventDefault();const id=field(tileForm,'id').value.trim();const source=Object.fromEntries(['x','y','w','h'].map(key=>[key,number(tileForm,key)]));
    const type=field(tileForm,'collision').value;const collision={type};if(type!=='none')collision.rect={x:number(tileForm,'cx'),y:number(tileForm,'cy'),w:number(tileForm,'cw'),h:number(tileForm,'ch')};
    if(type==='slope'){
      const existing=currentTile();
      if(!existing?.collision.heights || ['x','y','w','h'].some(key=>existing.source[key]!==source[key])){status('O perfil de rampa pertence ao recorte mapeado. Preserve esse recorte para editar a peça.');return;}
      collision.heights=clone(existing.collision.heights);
    }
    const tile={...clone(currentTile()??{}),id,label:field(tileForm,'label').value.trim(),source,role:field(tileForm,'role').value,layer:number(tileForm,'layer'),repeat:field(tileForm,'repeat').value,collision,notes:field(tileForm,'notes').value.trim()};
    const next=clone(metadata),index=next.tiles.findIndex(tile=>tile.id===selectedTile);
    if(index>=0){next.tiles[index]=tile;for(const item of next.scene.placements)if(item.tileId===selectedTile)item.tileId=id;}else next.tiles.push(tile);
    if(index>=0&&selectedTile!==id){
      const replace=value=>typeof value==='string'?(value===selectedTile?id:value):Array.isArray(value)?value.map(replace):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,replace(item)])):value;
      next.assemblies=replace(next.assemblies??[]);for(const part of next.tiles)if(part.assembly)part.assembly=replace(part.assembly);
    }
    try{validate(next);}catch(error){status(error.message);return;}checkpoint();metadata=next;selectedTile=id;selectTile(id);changed('Peça salva. Use “Colocar peça” para testar na cena.');
  };
  $('new-tile').onclick=newTile;
  $('delete-tile').onclick=()=>{if(!currentTile())return;checkpoint();metadata.tiles=metadata.tiles.filter(tile=>tile.id!==selectedTile);metadata.scene.placements=metadata.scene.placements.filter(item=>item.tileId!==selectedTile);metadata.assemblies=(metadata.assemblies??[]).filter(recipe=>!JSON.stringify(recipe).includes('"'+selectedTile+'"'));for(const tile of metadata.tiles)if(tile.assembly)tile.assembly.requiredNeighbors=tile.assembly.requiredNeighbors.map(rule=>({...rule,tileIds:rule.tileIds.filter(id=>id!==selectedTile)})).filter(rule=>rule.tileIds.length);selectedInstance=null;newTile();changed('Peça, instâncias e montagens dependentes removidas. Desfazer recupera tudo.');};
  function hit(p){return sortedPlacements().reverse().find(item=>{const r=tileFor(item).source;return p.x>=item.x&&p.x<item.x+r.w&&p.y>=item.y&&p.y<item.y+r.h;});}
  function placementId(){let i=1;while(metadata.scene.placements.some(item=>item.id===`p${i}`))i++;return `p${i}`;}
  scene.onpointerdown=event=>{
    if(!image.naturalWidth||event.button!==0)return;const p=point(event,scene),mode=$('mode').value;
    if(mode==='assembly'){
      const recipe=(metadata.assemblies??[]).find(item=>item.id===$('assembly').value);if(!recipe){status('Selecione uma montagem.');return;}
      let parts;try{parts=window.TilesetAssemblies.build(recipe,Number($('assembly-width').value),Number($('assembly-height').value),Math.round(p.x/16)*16,Math.round(p.y/16)*16,16,$('assembly-flip').checked);}catch(error){status(error.message);return;}
      checkpoint();for(const part of parts)metadata.scene.placements.push({id:placementId(),...part});selectedInstance=null;changed(`${recipe.label}: ${parts.length} tiles colocados, sem esticar sprites.`);return;
    }
    if(mode==='paint'){
      if(!currentTile()){status('Salve ou selecione uma peça antes de colocá-la.');return;}checkpoint();const item={id:placementId(),tileId:selectedTile,x:aligned(p.x),y:aligned(p.y),flipX:false};metadata.scene.placements.push(item);selectedInstance=item.id;changed('Peça colocada.');return;
    }
    const item=hit(p);selectedInstance=item?.id??null;
    if(mode==='erase'&&item){checkpoint();metadata.scene.placements=metadata.scene.placements.filter(other=>other.id!==item.id);selectedInstance=null;changed('Peça removida da cena.');return;}
    if(item){selectTile(item.tileId);sceneDrag={id:item.id,dx:p.x-item.x,dy:p.y-item.y,recorded:false};scene.setPointerCapture(event.pointerId);}refreshInstance();drawScene();
  };
  scene.onpointermove=event=>{if(!sceneDrag)return;const p=point(event,scene),item=currentInstance();if(!item)return;const x=aligned(p.x-sceneDrag.dx),y=aligned(p.y-sceneDrag.dy);if(x===item.x&&y===item.y)return;if(!sceneDrag.recorded){checkpoint();sceneDrag.recorded=true;}item.x=x;item.y=y;drawScene();refreshInstance();};
  scene.onpointerup=scene.onpointercancel=()=>{if(sceneDrag){sceneDrag=null;persist();}};
  instanceForm.onsubmit=event=>{event.preventDefault();const item=currentInstance();if(!item)return;const x=number(instanceForm,'x'),y=number(instanceForm,'y');if(!Number.isInteger(x)||!Number.isInteger(y)){status('Use posições em pixels inteiros.');return;}checkpoint();item.x=x;item.y=y;item.flipX=field(instanceForm,'flipX').checked;changed('Posição atualizada.');};
  $('delete-instance').onclick=()=>{if(!currentInstance())return;checkpoint();metadata.scene.placements=metadata.scene.placements.filter(item=>item.id!==selectedInstance);selectedInstance=null;changed('Peça removida da cena.');};
  $('scene-form').onsubmit=event=>{event.preventDefault();const next=clone(metadata);for(const key of ['width','height'])next.scene[key]=number($('scene-form'),key);next.scene.background=field($('scene-form'),'background').value;try{validate(next);}catch(error){status(error.message);return;}checkpoint();metadata=next;changed('Tamanho da cena atualizado.');};
  $('undo').onclick=()=>{if(!history.length)return;metadata=history.pop();$('undo').disabled=!history.length;selectedInstance=null;selectedTile=null;newTile();changed('Última alteração desfeita.');};
  $('example').onclick=()=>{checkpoint();metadata=clone(base);selectedInstance=null;selectedTile=null;$('snap').value=16;selectTile(metadata.tiles[0].id);loadImage('../'+metadata.image.path);changed('Catálogo modular e cena de exemplo restaurados. Desfazer recupera sua edição.');};
  $('clear-scene').onclick=()=>{checkpoint();metadata.scene.placements=[];selectedInstance=null;changed('Cena limpa. Use Desfazer para recuperar.');};
  function download(blob,filename){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('export').onclick=()=>{try{validate(metadata);}catch(error){status(error.message);return;}$('json-output').value=JSON.stringify(metadata,null,2)+'\n';$('export-status').textContent='';$('export-dialog').showModal();status('Metadata pronta para baixar ou copiar.');};
  $('download-json').onclick=()=>{download(new Blob([$('json-output').value],{type:'application/json'}),metadata.reviewStatus==='pending'?'open_world_tileset.review.metadata.json':'open_world_tileset.metadata.json');$('export-status').textContent='Download solicitado. Se o navegador não baixar, use Copiar JSON.';};
  $('copy-json').onclick=async()=>{try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText($('json-output').value);else{$('json-output').select();if(!document.execCommand('copy'))throw Error('Copie manualmente');}$('export-status').textContent='JSON copiado.';}catch{$('json-output').select();$('export-status').textContent='Texto selecionado. Pressione Ctrl+C para copiar.';}};
  $('png-export').onclick=()=>{drawScene(false);try{scene.toBlob(blob=>{if(blob)download(blob,'open_world_scene.png');drawScene();});}catch{drawScene();status('Para exportar PNG abrindo por duplo clique, selecione o arquivo em “Abrir PNG” primeiro.');}};
  function useMetadata(data){checkpoint();metadata=data;selectedTile=null;selectedInstance=null;$('snap').value=metadata.grid.size;newTile();loadImage('../'+metadata.image.path);changed('Metadata importada.');}
  $('json-file').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{useMetadata(validate(JSON.parse(await file.text())));}catch(error){status(error.message);}event.target.value='';};
  function loadImage(src){image.onload=()=>{metadata.image.width=image.width;metadata.image.height=image.height;$('image-size').textContent=`${image.width} × ${image.height}`;draw();renderList();status('Pronto. Selecione as peças ou ajuste a cena de exemplo.');};image.onerror=()=>status('PNG não encontrado. Clique em Abrir PNG para selecionar o tileset.');image.src=src;}
  $('image-file').onchange=event=>{const file=event.target.files[0];if(!file)return;if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl=URL.createObjectURL(file);metadata.image.path='assets/sprites/tilesets/'+file.name;loadImage(imageUrl);event.target.value='';};
  $('atlas-zoom').onchange=drawAtlas;$('atlas-grid').onchange=drawAtlas;
  $('scene-tile').onchange=()=>selectTile($('scene-tile').value);
  $('snap').onchange=()=>{checkpoint();metadata.grid.size=snap();persist();draw();};
  for(const id of ['checker','collisions','scene-grid','mode'])$(id).onchange=drawScene;
  function renderAssemblies(){const value=$('assembly').value;$('assembly').replaceChildren();for(const recipe of metadata.assemblies??[]){const option=document.createElement('option');option.value=recipe.id;option.textContent=recipe.label;option.selected=recipe.id===value;$('assembly').append(option);}updateAssembly();}
  function updateAssembly(){const recipe=(metadata.assemblies??[]).find(item=>item.id===$('assembly').value);for(const id of ['assembly-width','assembly-height','assembly-mode'])$(id).disabled=!recipe;$('assembly-flip').disabled=recipe?.surface?.flip!=='horizontal';if($('assembly-flip').disabled)$('assembly-flip').checked=false;if(!recipe){$('assembly-description').textContent='Este JSON não tem receitas de montagem.';previousAssembly=null;return;}
    const w=$('assembly-width'),h=$('assembly-height');w.min=recipe.minWidth;h.min=recipe.minHeight;w.disabled=['pattern','vertical','stack'].includes(recipe.type);h.disabled=recipe.type==='pattern'||recipe.type==='horizontal';
    if(previousAssembly!==recipe.id){w.value=recipe.defaultWidth??recipe.minWidth;h.value=recipe.defaultHeight??recipe.minHeight;previousAssembly=recipe.id;}
    $('assembly-description').textContent=recipe.notes+' Clique em “Montar objeto” e depois na cena para posicionar.';
  }
  $('assembly').onchange=()=>{updateAssembly();};$('assembly-mode').onclick=()=>{$('mode').value='assembly';drawScene();status('Clique na cena para montar o objeto na grade 16×16.');};
  $('check-rules').onclick=()=>{const errors=window.TilesetAssemblies.check(metadata);$('rule-status').textContent=errors.length?`${errors.length} encaixes precisam de atenção. `+errors.slice(0,3).map(error=>error.instanceId+': '+error.message).join(' '):'Encaixes OK: pontas, janelas, porta e ventilação estão com suas peças correspondentes.';};
  $('snap').value=metadata.grid.size;$('undo').disabled=true;selectTile(metadata.tiles[0]?.id);refreshInstance();renderAssemblies();loadImage('../'+metadata.image.path);
})();
