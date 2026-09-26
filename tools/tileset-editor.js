(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const base = JSON.parse($('default-metadata').textContent);
  const storageKey = 'wtg-tileset-lab-v1';
  let metadata = clone(base);
  try { const saved = localStorage.getItem(storageKey); if (saved) metadata = validate(JSON.parse(saved)); } catch { /* JSON continua sendo a cópia principal. */ }
  const image = new Image();
  const atlas = $('atlas'), scene = $('scene');
  const a = atlas.getContext('2d'), s = scene.getContext('2d');
  const tileForm = $('tile-form'), instanceForm = $('instance-form');
  let selectedTile = null, selectedInstance = null, selection = { x: 0, y: 48, w: 80, h: 16 };
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
  function changed(message) { persist(); draw(); renderList(); refreshInstance(); if (message) status(message); }
  function bounds(rect) { return Number.isInteger(rect.x) && Number.isInteger(rect.y) && Number.isInteger(rect.w) && Number.isInteger(rect.h) && rect.x >= 0 && rect.y >= 0 && rect.w > 0 && rect.h > 0; }
  function validate(data) {
    if (data.version !== 1 || !data.image || typeof data.image.path !== 'string' || !Array.isArray(data.tiles) || !data.scene || !Array.isArray(data.scene.placements)) throw Error('Formato de metadata inválido. Use um JSON exportado por este editor.');
    if (!Number.isInteger(data.image.width) || !Number.isInteger(data.image.height) || data.image.width < 1 || data.image.height < 1) throw Error('Dimensões do PNG inválidas.');
    if (!Number.isInteger(data.scene.width) || !Number.isInteger(data.scene.height) || data.scene.width < 16 || data.scene.height < 16 || data.scene.width > 2048 || data.scene.height > 2048 || !/^#[\da-f]{6}$/i.test(data.scene.background)) throw Error('Configuração da cena inválida.');
    if (!data.grid || ![1,8,16,32].includes(data.grid.size)) throw Error('Grade inválida.');
    const ids = new Set();
    for (const tile of data.tiles) {
      if (typeof tile.id !== 'string' || !/^[\w-]+$/.test(tile.id) || ids.has(tile.id) || typeof tile.label !== 'string' || !bounds(tile.source) || tile.source.x + tile.source.w > data.image.width || tile.source.y + tile.source.h > data.image.height || !Number.isInteger(tile.layer)) throw Error('Peça inválida ou identificador duplicado.');
      if (!['platform','terrain','decoration','door','character'].includes(tile.role) || !['none','x','y','both'].includes(tile.repeat) || !tile.collision || !['none','solid','one-way'].includes(tile.collision.type)) throw Error('Função ou colisão inválida.');
      const r = tile.collision.rect;
      if (tile.collision.type !== 'none' && (!r || !bounds(r) || r.x + r.w > tile.source.w || r.y + r.h > tile.source.h)) throw Error('Área de colisão fora do recorte.');
      ids.add(tile.id);
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
    const r=tile.collision.rect??{x:0,y:0,w:tile.source.w,h:tile.source.h};for(const [key,name] of [['x','cx'],['y','cy'],['w','cw'],['h','ch']])field(tileForm,name).value=r[key];
    $('selection-label').textContent='Editando peça';$('save-tile').textContent='Atualizar peça';renderList();drawAtlas();
    const zoom=Number($('atlas-zoom').value),scroll=$('atlas-scroll');scroll.scrollLeft=Math.max(0,(tile.source.x+tile.source.w/2)*zoom-scroll.clientWidth/2);scroll.scrollTop=Math.max(0,(tile.source.y+tile.source.h/2)*zoom-scroll.clientHeight/2);
  }
  function newTile(){selectedTile=null;tileForm.reset();fillSelection();field(tileForm,'cx').value=0;field(tileForm,'cy').value=0;field(tileForm,'cw').value=selection.w;field(tileForm,'ch').value=selection.h;$('selection-label').textContent='Novo recorte';$('save-tile').textContent='Salvar peça';renderList();drawAtlas();}
  function refreshInstance(){
    const item=currentInstance();instanceForm.querySelectorAll('input,button').forEach(element=>element.disabled=!item);
    $('instance-title').textContent=item?`${tileFor(item).label} · ${item.id}`:'Selecione uma peça na prévia para ajustar sua posição.';
    field(instanceForm,'x').value=item?.x??'';field(instanceForm,'y').value=item?.y??'';field(instanceForm,'flipX').checked=item?.flipX??false;
    for(const key of ['width','height','background'])field($('scene-form'),key).value=metadata.scene[key];
  }
  function point(event,canvas){const r=canvas.getBoundingClientRect();const divisor=canvas===atlas?Number($('atlas-zoom').value):1;return{x:Math.floor((event.clientX-r.left)*canvas.width/r.width/divisor),y:Math.floor((event.clientY-r.top)*canvas.height/r.height/divisor)};}
  function aligned(n){return Math.round(n/snap())*snap();}
  function atlasPoint(event){const p=point(event,atlas);return{x:Math.min(image.width-1,Math.max(0,p.x)),y:Math.min(image.height-1,Math.max(0,p.y))};}
  atlas.onpointerdown=event=>{if(!image.naturalWidth||event.button!==0)return;const p=atlasPoint(event);atlasDrag={x:Math.floor(p.x/snap())*snap(),y:Math.floor(p.y/snap())*snap()};atlas.setPointerCapture(event.pointerId);selection={...atlasDrag,w:1,h:1};newTile();};
  atlas.onpointermove=event=>{if(!atlasDrag)return;const p=atlasPoint(event);const left=Math.min(atlasDrag.x,Math.floor(p.x/snap())*snap()),top=Math.min(atlasDrag.y,Math.floor(p.y/snap())*snap());selection={x:left,y:top,w:Math.min(image.width,Math.ceil((Math.max(atlasDrag.x,p.x)+1)/snap())*snap())-left,h:Math.min(image.height,Math.ceil((Math.max(atlasDrag.y,p.y)+1)/snap())*snap())-top};fillSelection();field(tileForm,'cw').value=selection.w;field(tileForm,'ch').value=selection.h;drawAtlas();};
  atlas.onpointerup=atlas.onpointercancel=()=>{atlasDrag=null;};
  for(const name of ['x','y','w','h'])field(tileForm,name).oninput=()=>{const r=Object.fromEntries(['x','y','w','h'].map(key=>[key,number(tileForm,key)]));if(bounds(r)){selection=r;drawAtlas();}};
  tileForm.onsubmit=event=>{
    event.preventDefault();const id=field(tileForm,'id').value.trim();const source=Object.fromEntries(['x','y','w','h'].map(key=>[key,number(tileForm,key)]));
    const type=field(tileForm,'collision').value;const collision={type};if(type!=='none')collision.rect={x:number(tileForm,'cx'),y:number(tileForm,'cy'),w:number(tileForm,'cw'),h:number(tileForm,'ch')};
    const tile={id,label:field(tileForm,'label').value.trim(),source,role:field(tileForm,'role').value,layer:number(tileForm,'layer'),repeat:field(tileForm,'repeat').value,collision,notes:field(tileForm,'notes').value.trim()};
    const next=clone(metadata),index=next.tiles.findIndex(tile=>tile.id===selectedTile);
    if(index>=0){next.tiles[index]=tile;for(const item of next.scene.placements)if(item.tileId===selectedTile)item.tileId=id;}else next.tiles.push(tile);
    try{validate(next);}catch(error){status(error.message);return;}checkpoint();metadata=next;selectedTile=id;selectTile(id);changed('Peça salva. Use “Colocar peça” para testar na cena.');
  };
  $('new-tile').onclick=newTile;
  $('delete-tile').onclick=()=>{if(!currentTile())return;checkpoint();metadata.tiles=metadata.tiles.filter(tile=>tile.id!==selectedTile);metadata.scene.placements=metadata.scene.placements.filter(item=>item.tileId!==selectedTile);selectedInstance=null;newTile();changed('Peça e suas instâncias removidas. Desfazer recupera tudo.');};
  function hit(p){return sortedPlacements().reverse().find(item=>{const r=tileFor(item).source;return p.x>=item.x&&p.x<item.x+r.w&&p.y>=item.y&&p.y<item.y+r.h;});}
  function placementId(){let i=1;while(metadata.scene.placements.some(item=>item.id===`p${i}`))i++;return `p${i}`;}
  scene.onpointerdown=event=>{
    if(!image.naturalWidth||event.button!==0)return;const p=point(event,scene),mode=$('mode').value;
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
  $('example').onclick=()=>{checkpoint();metadata.scene=clone(base.scene);for(const tile of base.tiles)if(!metadata.tiles.some(other=>other.id===tile.id))metadata.tiles.push(clone(tile));selectedInstance=null;changed('Cena de exemplo restaurada.');};
  $('clear-scene').onclick=()=>{checkpoint();metadata.scene.placements=[];selectedInstance=null;changed('Cena limpa. Use Desfazer para recuperar.');};
  function download(blob,filename){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('export').onclick=()=>{try{validate(metadata);}catch(error){status(error.message);return;}$('json-output').value=JSON.stringify(metadata,null,2)+'\n';$('export-status').textContent='';$('export-dialog').showModal();status('Metadata pronta para baixar ou copiar.');};
  $('download-json').onclick=()=>{download(new Blob([$('json-output').value],{type:'application/json'}),'open_world_tileset.metadata.json');$('export-status').textContent='Download solicitado. Se o navegador não baixar, use Copiar JSON.';};
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
  $('snap').value=metadata.grid.size;$('undo').disabled=true;selectTile(metadata.tiles[0]?.id);refreshInstance();loadImage('../'+metadata.image.path);
})();
