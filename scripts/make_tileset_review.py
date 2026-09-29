"""Build a review catalog from the saved Aseprite source, keeping 16px parts."""
from pathlib import Path
import json
import struct
import zlib
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src/aseprite/open_world_tileset.aseprite'
PNG = ROOT / 'assets/sprites/tilesets/open_world_tileset.review.png'
JSON = ROOT / 'assets/sprites/tilesets/open_world_tileset.review.metadata.json'


def export_source():
    data = SOURCE.read_bytes()
    frames, width, height, depth = struct.unpack_from('<HHHH', data, 6)
    if frames != 1 or depth != 32:
        raise ValueError('Esta revisão espera um frame RGBA de 32 bits.')
    position, layers, cels = 144, [], []
    count = struct.unpack_from('<I', data, 140)[0] or struct.unpack_from('<H', data, 134)[0]
    for _ in range(count):
        length, kind = struct.unpack_from('<IH', data, position)
        chunk = data[position + 6:position + length]
        if kind == 0x2004:
            flags, layer_type = struct.unpack_from('<HH', chunk)
            blend = struct.unpack_from('<H', chunk, 10)[0]
            layers.append((flags, layer_type, blend, chunk[12]))
        elif kind == 0x2005:
            layer, x, y, opacity, cel_type = struct.unpack_from('<HhhBH', chunk)
            if cel_type not in (0, 2):
                raise ValueError('Cel de tipo não suportado nesta exportação.')
            w, h = struct.unpack_from('<HH', chunk, 16)
            pixels = zlib.decompress(chunk[20:]) if cel_type == 2 else chunk[20:]
            cels.append((layer, x, y, opacity, Image.frombytes('RGBA', (w, h), pixels)))
        position += length
    output = Image.new('RGBA', (width, height))
    for layer, x, y, opacity, image in sorted(cels, key=lambda cel: cel[0]):
        flags, kind, blend, layer_opacity = layers[layer]
        if not flags & 1:
            continue
        if kind != 0 or blend != 0:
            raise ValueError('A exportação espera camadas normais sem modos de mistura.')
        alpha = opacity * layer_opacity / 65025
        if alpha < 1:
            image.putalpha(image.getchannel('A').point(lambda value: round(value * alpha)))
        output.alpha_composite(image, (x, y))
    output.save(PNG)
    return output


def build_catalog(image):
    catalog = json.loads((ROOT / 'assets/sprites/tilesets/open_world_tileset.metadata.json').read_text(encoding='utf-8'))
    # Rebuild generated families once even after this catalog has been integrated into the game.
    generated = {'rampa', 'antena', 'respiro', 'varal', 'bloco_telhado', 'caixa_dagua', 'acesso_caixa'}
    catalog['tiles'] = [part for part in catalog['tiles'] if part.get('assembly', {}).get('family') not in generated]
    catalog['assemblies'] = [recipe for recipe in catalog['assemblies'] if recipe['id'] not in generated]
    catalog.update(catalog='open-world-16-review-v4', reviewStatus='pending',
                   sourceProject='src/aseprite/open_world_tileset.aseprite')
    catalog['image'] = {'path': 'assets/sprites/tilesets/' + PNG.name, 'width': image.width, 'height': image.height}
    previous = Image.open(ROOT / 'assets/sprites/tilesets/open_world_tileset.png').convert('RGBA')
    for tile in catalog['tiles']:
        r = tile['source']
        box = (r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])
        if image.crop(box).tobytes() != previous.crop(box).tobytes():
            tile['reviewChange'] = 'updated'
    tiles, recipes = catalog['tiles'], catalog['assemblies']
    by_position = {(tile['source']['x'], tile['source']['y']): tile['id'] for tile in tiles if tile['role'] != 'character'}
    examples = []

    def tile(id, label, x, y, family, notes, layer=4, repeat='none', role='decoration'):
        if (x, y) in by_position:
            return by_position[(x, y)]
        tiles.append({'id': id, 'label': label, 'source': {'x': x, 'y': y, 'w': 16, 'h': 16},
                      'role': role, 'layer': layer, 'repeat': repeat, 'collision': {'type': 'none'},
                      'notes': notes, 'reviewChange': 'new',
                      'assembly': {'family': family, 'part': id, 'requiredNeighbors': []}})
        by_position[(x, y)] = id
        return id

    def pattern(id, label, rows, notes):
        h, w = len(rows), len(rows[0])
        recipes.append({'id': id, 'label': label, 'type': 'pattern', 'minWidth': w, 'minHeight': h,
                        'defaultWidth': w, 'defaultHeight': h, 'rows': rows, 'notes': notes, 'reviewChange': 'new'})
        examples.append({'assemblyId': id, 'width': w, 'height': h})

    ramp = []
    for row in range(4):
        cells = []
        for col in range(8):
            x, y = 80 + col * 16, row * 16
            if not image.crop((x, y, x + 16, y + 16)).getbbox():
                cells.append(None)
                continue
            cells.append(tile(f'rampa_c{col + 1}_f{row + 1}', f'Trecho inclinado · coluna {col + 1}, faixa {row + 1}',
                              x, y, 'rampa', 'Parte 16×16 de uma rampa transitável. Encaixa no miolo do telhado/concreto. Espelhar a montagem inteira para inverter o sentido, preservando a ordem dos tiles.',
                              layer=1, role='terrain'))
        ramp.append(cells)
    pattern('rampa', 'Rampa de telhado / concreto', ramp,
            'Rampa transitável de 26 tiles, encaixada entre miolos de telhado/concreto com desnível de 48 pixels. Espelhar a montagem inteira na horizontal para subir ou descer; nunca inverter somente os sprites mantendo a ordem dos tiles. Não esticar o desenho.')
    alpha = image.getchannel('A')
    profile = [next(y for y in range(64) if alpha.getpixel((80 + x, y))) for x in range(128)]
    recipes[-1]['surface'] = {'type': 'heightfield', 'heights': profile, 'rise': 48,
                             'flip': 'horizontal', 'attachment': 'roof-concrete-middle'}
    recipes[-1]['interiorJoin'] = {'replacements': {
        'rampa_c1_f1': 'piso_loop_telhado', 'rampa_c1_f2': 'concreto_loop_cima',
        'rampa_c1_f3': 'concreto_loop_meio', 'rampa_c1_f4': 'concreto_loop_meio'},
        'notes': 'Substituir o acabamento externo da primeira coluna por miolos nas junções internas. O espelhamento leva esta coluna para a direita.'}
    for part in tiles:
        if part.get('assembly', {}).get('family') != 'rampa':
            continue
        r = part['source']
        heights = [next((y for y in range(16) if alpha.getpixel((r['x'] + x, r['y'] + y))), 16) for x in range(16)]
        part['collision'] = {'type': 'slope' if any(heights) else 'solid',
                             'rect': {'x': 0, 'y': 0, 'w': 16, 'h': 16}}
        if any(heights):
            part['collision']['heights'] = heights
    examples[-1]['label'] = 'Rampa · descida'
    examples.append({'assemblyId': 'rampa', 'width': 8, 'height': 4,
                     'flipX': True, 'label': 'Rampa · subida (espelhada)'})

    antenna = [[tile(f'antena_c{col + 1}_cima', f'Antena · topo {col + 1}', 80 + col * 16, 64, 'antena',
                     'Braços e haste superior da antena, decoração sem colisão.') for col in range(3)],
               [None, tile('antena_base', 'Antena · base / haste', 96, 80, 'antena',
                           'Base da antena. Apoia no telhado; preservar o alinhamento com a haste superior.'), None]]
    pattern('antena', 'Antena de televisão', antenna, 'Quatro peças 16×16. Braços no topo e haste ao centro, com a base no telhado.')
    vent = tile('respiro_telhado', 'Respiro / caninho do telhado', 80, 96, 'respiro',
                'Peça independente de 16×16. Função de obstáculo de fumaça em revisão com o autor.')
    pattern('respiro', 'Respiro do telhado', [[vent]], 'Caninho metálico de uma peça 16×16.')

    clothes = [[tile(f'varal_{row}_{col}', f'Varal · {"cima" if row == 0 else "baixo"} {col + 1}',
                     96 + col * 16, 96 + row * 16, 'varal',
                     'Parte do varal com postes, fio e roupas. Conservar os fragmentos de roupas entre tiles. Sem colisão.',
                     repeat='x' if col in (1, 2) else 'none') for col in range(4)] for row in range(2)]
    pattern('varal', 'Varal com roupas', clothes, 'Oito partes de 16×16. Repetir os módulos centrais entre os postes para ampliar, revisando os encaixes das roupas.')
    # O atlas inclui o pé do poste e a ponta do toldo no mesmo tile.
    cloth_edge = clothes[1][3]
    next(t for t in tiles if t['id'] == cloth_edge)['notes'] += ' Este tile contém também a ponta esquerda do bloco/toldo vizinho; revisar a separação na arte.'
    tarp = [cloth_edge] + [tile(f'bloco_telhado_{col}', f'Bloco / cobertura · parte {col + 1}',
                               144 + col * 16, 112, 'bloco_telhado',
                               'Parte 16×16 do bloco ao lado do varal. Função em revisão; as pontas apoiam no telhado.',
                               repeat='x' if col in (1, 2) else 'none') for col in range(1, 4)]
    pattern('bloco_telhado', 'Bloco ao lado do varal', [tarp], 'Quatro tiles formam o bloco/cobertura. A ponta esquerda compartilha um tile com o poste do varal; confirmar antes de separar os objetos.')

    tank_rows = [[tile(f'caixa_dagua_{row}_{col}', f'Caixa d’água · {("tampa", "corpo", "pés")[row]} {col + 1}',
                      80 + col * 16, 128 + row * 16, 'caixa_dagua',
                      'Parte da caixa d’água; tampa e pés fecham o objeto, corpo repete verticalmente.',
                      repeat='y' if row == 1 else 'none') for col in range(2)] for row in range(3)]
    recipes.append({'id': 'caixa_dagua', 'label': 'Caixa d’água expansível', 'type': 'stack',
                    'minWidth': 2, 'minHeight': 3, 'defaultWidth': 2, 'defaultHeight': 3,
                    'top': tank_rows[0], 'middle': tank_rows[1], 'bottom': tank_rows[2],
                    'notes': 'Duas colunas. Tampa e pés mantidos; repita as duas partes do corpo para aumentar a altura.', 'reviewChange': 'new'})
    examples.extend([{'assemblyId': 'caixa_dagua', 'width': 2, 'height': 3},
                     {'assemblyId': 'caixa_dagua', 'width': 2, 'height': 5, 'label': 'Caixa d’água · corpo expandido'}])
    combo = []
    for row in range(6):
        cells = []
        for col in range(4):
            x, y = 112 + col * 16, 128 + row * 16
            if not image.crop((x, y, x + 16, y + 16)).getbbox():
                cells.append(None)
                continue
            role = 'door' if row >= 4 and col in (1, 2) else 'decoration'
            cells.append(tile(f'acesso_caixa_{row}_{col}', f'Entrada com caixa · faixa {row + 1}, parte {col + 1}',
                              x, y, 'acesso_caixa',
                              'Parte 16×16 da nova entrada com caixa d’água. A base da entrada apoia no telhado, à frente da mureta. Os pés da caixa e a cobertura compartilham a faixa central.', role=role))
        combo.append(cells)
    pattern('acesso_caixa', 'Entrada com caixa d’água', combo, '18 peças formam a caixa menor e a entrada, incluindo a ponta acima da tampa. Apoiar a base diretamente no telhado. Os pés e a cobertura foram desenhados juntos: conservar esta montagem.')
    catalog['reviewExamples'] = examples
    catalog['reviewNotes'] = [
        'Revisão extraída do Aseprite salvo; o PNG e a metadata usados pelo jogo continuam sendo a versão aprovada anterior.',
        'Todas as peças novas são recortes 16×16. Montagens grandes juntam as partes, sem esticar o atlas.',
        'A caixa d’água permite repetir o corpo verticalmente; há exemplos de duas alturas.',
        'O tile da ponta direita inferior do varal contém também a ponta do bloco vizinho. Separar estes pixels na arte se os objetos precisarem ser usados isoladamente.',
        'Os pés da caixa menor e o topo da nova entrada compartilham tiles. A montagem preserva a composição original.',
        'A função do obstáculo de fumaça e suas forças de knockback serão registradas conforme a confirmação do autor.',
        'A rampa é piso transitável: encaixa no meio do telhado/concreto, com colisão seguindo a borda pixel a pixel. O espelhamento troca a ordem das peças e a direção da inclinação.',
    ]
    return catalog


if __name__ == '__main__':
    catalog = build_catalog(export_source())
    JSON.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"Revisão: {len(catalog['tiles'])} tiles, {len(catalog['assemblies'])} montagens.")
