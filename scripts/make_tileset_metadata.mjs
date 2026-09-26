// Atualiza o JSON e a base embutida no editor a partir do catálogo modular.
import { readFileSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const tiles = [];
function tile(id, label, x, y, role, layer, repeat, notes, family, part, solid = false) {
  const result = { id, label, source: { x, y, w: 16, h: 16 }, role, layer, repeat,
    collision: solid ? { type: 'solid', rect: { x: 0, y: 0, w: 16, h: 16 } } : { type: 'none' }, notes,
    assembly: { family, part, requiredNeighbors: [] } };
  tiles.push(result); return result;
}
const roofIds = ['piso_telhado_esquerda','piso_loop_telhado','piso_loop_telhado_variante_2','piso_loop_telhado_variante_3','piso_telhado_direita'];
for (let col=0;col<5;col++) {
  const part=col===0?'left':col===4?'right':'middle';
  tile(roofIds[col], col===0?'Final do piso do telhado · esquerda':col===4?'Final do piso do telhado · direita':`Piso do telhado · miolo ${col}`, col*16,48,'platform',2,part==='middle'?'x':'none',
    part==='middle'?'Miolo sólido repetível. Preenche a largura entre as duas pontas, sem esticar a imagem.':`Topo sólido da extremidade ${col===0?'esquerda':'direita'}. Gabriel anda por cima.`, 'predio',part,true);
}
const concreteIds = [
  ['concreto_esquerdo_cima','concreto_loop_cima','janela_esquerda_cima','janela_direita_cima','concreto_direito_cima'],
  ['concreto_esquerdo_meio','concreto_loop_meio','janela_esquerda_baixo','janela_direita_baixo','concreto_direito_meio'],
  ['concreto_esquerdo_baixo','concreto_loop_baixo','concreto_loop_baixo_variante_2','concreto_loop_baixo_variante_3','concreto_direito_baixo']
];
const rowNames=['cima','meio','baixo'];
for(let row=0;row<3;row++)for(let col=0;col<5;col++) {
  const isWindow=row<2&&(col===2||col===3), side=col===0?'esquerdo':col===4?'direito':'miolo';
  const label=isWindow?`Janela ${col===2?'esquerda':'direita'} · ${row===0?'cima':'baixo'}`:`Concreto ${side} · ${rowNames[row]}${col>1&&col<4?' · variante '+col:''}`;
  const repeat=isWindow?'none':col===0||col===4?(row===1?'y':'none'):(row===1?'both':'x');
  tile(concreteIds[row][col],label,col*16,64+row*16,'terrain',1,repeat,
    isWindow?'Parte sólida da fachada, pertencente à janela 2×2. Deve ficar junto de suas outras três partes, sob o miolo do telhado. Não é um vão atravessável.':
      col===0||col===4?`Borda ${side==='esquerdo'?'esquerda':'direita'} da fachada. ${row===0?'Vai colada abaixo da ponta correspondente do telhado.':row===1?'Repete verticalmente entre o canto superior e o inferior.':'Fecha a base do prédio; não usar como miolo.'}`:
      `Preenchimento da faixa ${rowNames[row]}. ${row===1?'Repete nos dois eixos para aumentar o prédio.':'Repete horizontalmente entre as bordas.'}`,
    isWindow?'janela':'predio',isWindow?`${row===0?'top':'bottom'}-${col===2?'left':'right'}`:`${rowNames[row]}-${side}`,true);
}
tile('ventilacao_esquerda','Ventilação · esquerda / hélice',0,112,'decoration',0,'none','Hélice do aparelho; sempre juntar à parte direita. Inicialmente decorativa e sem colisão.','ventilacao','left');
tile('ventilacao_direita','Ventilação · direita / grelha',16,112,'decoration',0,'none','Grelha e acabamento direito do aparelho. Sempre juntar à hélice. Não repetir a ponta para alongar o equipamento.','ventilacao','right');
tile('cano_pendente','Cano pendente',32,112,'decoration',0,'y','Detalhe vertical independente. Pode repetir para prolongar o cano. Sem colisão.','cano','middle');
const accessRows=[
 ['acesso_cobertura_esquerda','acesso_cobertura_meio_1','acesso_cobertura_meio_2','acesso_cobertura_direita'],
 ['acesso_parede_esquerda_cima','porta_esquerda_cima','porta_direita_cima','acesso_parede_direita_cima'],
 ['acesso_parede_esquerda_baixo','porta_esquerda_baixo','porta_direita_baixo','acesso_parede_direita_baixo']
];
for(let row=0;row<3;row++)for(let col=0;col<4;col++) {
  const door=row>0&&(col===1||col===2);
  const label=door?`Porta ${col===1?'esquerda':'direita'} · ${row===1?'cima':'baixo'}`:
    row===0?`Cobertura do acesso · ${['esquerda','miolo 1','miolo 2','direita'][col]}`:`Parede do acesso · ${col===0?'esquerda':'direita'} · ${row===1?'cima':'baixo'}`;
  tile(accessRows[row][col],label,col*16,128+row*16,door?'door':'decoration',3,'none',
    door?'Parte da entrada 2×2 apoiada diretamente no telhado, à frente da mureta. As quatro partes permanecem juntas e não bloqueiam o personagem. O destino da porta ainda deve ser definido no jogo.':
    row===0?'Cobertura do acesso. Preservar a margem transparente dentro do tile 16×16: ela alinha a cobertura às outras partes.':
    'Parte da parede da entrada, à frente da mureta; encaixa na linha correspondente da porta. A base da estrutura apoia diretamente no telhado. Sem colisão. O tileset atual fornece um padrão completo de 4×3 tiles.',
    door?'porta':'acesso',`${row}-${col}`);
}
tile('mureta_esquerda','Mureta · esquerda',0,176,'decoration',0,'none','Começo da mureta ao fundo. Deve ter miolos ou a ponta direita à direita. Sem colisão.','mureta','left');
tile('mureta_loop','Mureta · miolo',16,176,'decoration',0,'x','Miolo repetível da mureta. Amplia a largura sem repetir as extremidades. Sem colisão.','mureta','middle');
tile('mureta_direita','Mureta · direita',32,176,'decoration',0,'none','Final da mureta ao fundo. Deve ter miolos ou a ponta esquerda à esquerda. Sem colisão.','mureta','right');
tile('corrimao_loop','Corrimão · barras horizontais',48,176,'decoration',0,'x','Barras que conectam os pilares. Repetir horizontalmente entre as pontas. Não é piso e não bloqueia o personagem.','corrimao','middle');
tile('corrimao_pilar','Corrimão · pilar',64,176,'decoration',0,'none','Pilar / acabamento do corrimão. A montagem espelha a ponta esquerda e mantém a direita normal. Sem colisão.','corrimao','edge');
tiles.push({id:'personagem_referencia',label:'Personagem de referência',source:{x:7,y:4,w:16,h:28},role:'character',layer:30,repeat:'none',collision:{type:'none'},notes:'Referência de escala extraída do tileset. No jogo será substituído pelo Gabriel animado. Exceção à grade 16×16: não é peça de cenário.'});
const byId=new Map(tiles.map(tile=>[tile.id,tile]));
function requires(id,dx,dy,tileIds,reason){byId.get(id).assembly.requiredNeighbors.push({dx,dy,tileIds,reason});}
requires('piso_telhado_esquerda',0,16,['concreto_esquerdo_cima'],'a borda superior esquerda precisa do concreto esquerdo de cima logo abaixo.');
requires('piso_telhado_direita',0,16,['concreto_direito_cima'],'a borda superior direita precisa do concreto direito de cima logo abaixo.');
requires('concreto_esquerdo_cima',0,-16,['piso_telhado_esquerda'],'deve ficar colado sob a ponta esquerda do telhado.');
requires('concreto_direito_cima',0,-16,['piso_telhado_direita'],'deve ficar colado sob a ponta direita do telhado.');
const middleRoofs=roofIds.slice(1,4);
for(const id of ['concreto_loop_cima','janela_esquerda_cima','janela_direita_cima'])requires(id,0,-16,middleRoofs,'a faixa de cima precisa de um miolo do telhado acima, nunca de uma ponta.');
function joined(rows) {
  for(let row=0;row<rows.length;row++)for(let col=0;col<rows[row].length;col++){
    const id=rows[row][col];
    if(col>0)requires(id,-16,0,[rows[row][col-1]],'falta a parte correspondente imediatamente à esquerda.');
    if(col+1<rows[row].length)requires(id,16,0,[rows[row][col+1]],'falta a parte correspondente imediatamente à direita.');
    if(row>0)requires(id,0,-16,[rows[row-1][col]],'falta a parte correspondente imediatamente acima.');
    if(row+1<rows.length)requires(id,0,16,[rows[row+1][col]],'falta a parte correspondente imediatamente abaixo.');
  }
}
joined([['janela_esquerda_cima','janela_direita_cima'],['janela_esquerda_baixo','janela_direita_baixo']]);
joined([['ventilacao_esquerda','ventilacao_direita']]);
joined(accessRows);
for(const id of accessRows[2])requires(id,0,16,roofIds,'a base da entrada deve apoiar diretamente no telhado, à frente da mureta.');
requires('mureta_esquerda',16,0,['mureta_loop','mureta_direita'],'falta a continuação da mureta à direita.');
requires('mureta_direita',-16,0,['mureta_loop','mureta_esquerda'],'falta a continuação da mureta à esquerda.');
const assemblies=[
 {id:'predio',label:'Prédio / fachada com telhado',type:'building',minWidth:5,minHeight:4,defaultWidth:15,defaultHeight:6,
  notes:'Largura e altura em tiles. Mantém as pontas, preenche o miolo e monta janelas 2×2 sob o telhado. As janelas não se alongam: repete-se a janela completa. Toda a fachada é sólida, conforme a metadata original.',
  roof:{left:roofIds[0],middle:middleRoofs,right:roofIds[4]},
  wall:Object.fromEntries(['top','middle','bottom'].map((key,row)=>[key,{left:concreteIds[row][0],middle:row===2?concreteIds[row].slice(1,4):[concreteIds[row][1]],right:concreteIds[row][4]}])),
  window:[concreteIds[0].slice(2,4),concreteIds[1].slice(2,4)]},
 {id:'janela',label:'Janela completa 2×2',type:'pattern',minWidth:2,minHeight:2,defaultWidth:2,defaultHeight:2,rows:[concreteIds[0].slice(2,4),concreteIds[1].slice(2,4)],notes:'Quatro partes sempre juntas. Posicionar imediatamente abaixo de dois miolos do telhado, dentro da fachada. Para mais janelas, repetir o conjunto completo.'},
 {id:'mureta',label:'Mureta expansível',type:'horizontal',minWidth:2,minHeight:1,defaultWidth:8,defaultHeight:1,left:'mureta_esquerda',middle:['mureta_loop'],right:'mureta_direita',notes:'Uma ponta esquerda, quantos miolos precisar e uma ponta direita. Uma linha de altura.'},
 {id:'corrimao',label:'Corrimão expansível',type:'horizontal',minWidth:2,minHeight:1,defaultWidth:5,defaultHeight:1,left:'corrimao_pilar',middle:['corrimao_loop'],right:'corrimao_pilar',flipLeft:true,notes:'Pilares nas pontas e barras repetidas entre eles. Uma linha de altura.'},
 {id:'acesso',label:'Entrada no telhado / porta',type:'pattern',minWidth:4,minHeight:3,defaultWidth:4,defaultHeight:3,rows:accessRows,notes:'Doze peças 16×16 formam a entrada. Apoiar a base diretamente no telhado e desenhar à frente da mureta. A porta é 2×2. Sem miolo livre de parede neste PNG para expandir toda a estrutura sem duplicar a porta: manter este padrão.'},
 {id:'ventilacao',label:'Ventilação completa',type:'pattern',minWidth:2,minHeight:1,defaultWidth:2,defaultHeight:1,rows:[['ventilacao_esquerda','ventilacao_direita']],notes:'Duas partes 16×16. Hélice e grelha ficam juntas. Não há miolo independente para alongar este aparelho.'},
 {id:'cano',label:'Cano vertical',type:'vertical',minWidth:1,minHeight:1,defaultWidth:1,defaultHeight:2,middle:['cano_pendente'],notes:'Coluna de cano. Aumente a altura repetindo a peça 16×16.'}
];
const sandbox={window:{}};runInNewContext(readFileSync('tools/tileset-assemblies.js','utf8'),sandbox);
const {build,check}=sandbox.window.TilesetAssemblies;
const placements=[];
function place(id,width,height,x,y){for(const item of build(assemblies.find(recipe=>recipe.id===id),width,height,x,y))placements.push({id:'p'+(placements.length+1),...item});}
place('predio',15,6,0,80);
place('corrimao',9,1,96,64);
place('mureta',9,1,16,64);
place('acesso',4,3,16,32);
place('ventilacao',2,1,128,64);
placements.push({id:'p'+(placements.length+1),tileId:'personagem_referencia',x:192,y:52,flipX:false});
const metadata={version:1,catalog:'open-world-16-v2',image:{path:'assets/sprites/tilesets/open_world_tileset.png',width:488,height:244},grid:{size:16},tiles,assemblies,
  reviewNotes:['Prédio e janelas mantêm colisão sólida como nas definições fornecidas.','A entrada apoia diretamente no telhado e aparece à frente da mureta, conforme a orientação do autor. Continua sem colisão de movimento; revisar se alguma parte deve bloquear o jogador.','Mureta, corrimão e ventilação foram tratados como decoração ao fundo, sem colisão; revisar se algum deve bloquear o jogador.','O destino da porta ainda não foi especificado.','Somente o personagem de referência foge do recorte 16×16. As margens transparentes de cada tile foram preservadas.'],
  scene:{width:240,height:176,background:'#292738',placements}};
const errors=check(metadata);if(errors.length)throw Error(JSON.stringify(errors));
const json=JSON.stringify(metadata,null,2)+'\n';
writeFileSync('assets/sprites/tilesets/open_world_tileset.metadata.json',json);
const html=readFileSync('tools/tileset-editor.html','utf8').replace(/(<script id="default-metadata" type="application\/json">)[\s\S]*?(<\/script>)/,(_,open,close)=>open+'\n'+json+'  '+close);
writeFileSync('tools/tileset-editor.html',html);
console.log(`Catálogo: ${tiles.length} peças, ${assemblies.length} montagens e ${placements.length} instâncias. Encaixes verificados.`);
