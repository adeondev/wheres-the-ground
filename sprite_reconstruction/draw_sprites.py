"""
=============================================================================
RECONSTRUÇÃO DA SPRITE SHEET: PROTAGONISTA 2D PLATFORMER HERO
Resolução real de Pixel Art: 336 x 32 (7 células de 48 x 32)
=============================================================================
Este script constrói e exporta a sprite sheet completa e os frames individuais
como pixel art nativo (sem interpolação, sem antialiasing, transparência limpa).

Você pode editar pixels diretamente nas strings ASCII de cada frame abaixo,
ou utilizar as funções utilitárias set_pixel() / draw_rect().
"""

import os
import numpy as np
from PIL import Image

# -----------------------------------------------------------------------------
# PALETA OFICIAL EXTRAÍDA DIRETAMENTE DA REFERÊNCIA
# -----------------------------------------------------------------------------
PALETTE = {
    ' ': (0, 0, 0, 0),             # Transparente
    '#': (34, 18, 22, 255),        # Contorno escuro (marrom-quase-preto)
    'H': (48, 30, 34, 255),        # Cabelo escuro (base)
    'h': (68, 44, 48, 255),        # Cabelo tom médio
    'L': (88, 58, 62, 255),        # Cabelo highlight escuro
    's': (251, 170, 95, 255),      # Pele base (tom alaranjado/claro)
    'S': (226, 132, 64, 255),      # Pele sombra / orelha
    'e': (20, 12, 14, 255),        # Olho preto / pupila
    'W': (255, 255, 255, 255),    # Branco puro (símbolo no peito, punhos, sola do tênis, brilho do olho)
    'w': (225, 228, 235, 255),    # Branco suave / cinza claro (sola sombreada)
    'P': (138, 37, 205, 255),      # Roxo principal do moletom
    'D': (96, 22, 146, 255),       # Roxo escuro / sombra das dobras
    'l': (208, 148, 220, 255),     # Roxo claro / highlight do ombro
    'p': (44, 34, 40, 255),        # Calça preta/cinza escura
    'g': (72, 62, 68, 255),        # Calça cinza claro / vinco do joelho
    'Y': (255, 214, 38, 255),      # Amarelo (núcleo das chamas e propulsor da mochila)
    'O': (254, 138, 34, 255),      # Laranja (corpo das chamas e detalhe dos tênis)
    'R': (244, 86, 26, 255),       # Vermelho-laranja (extremidades e faíscas das chamas)
    'v': (202, 182, 236, 255),     # Roxo claro (partículas dos propulsores do salto)
    'V': (226, 212, 248, 255),     # Lavanda (linhas de energia do salto)
    'd': (208, 208, 214, 255),     # Cinza claro (poeira da aterrissagem)
    'k': (170, 170, 178, 255),     # Cinza médio (sombra da poeira da aterrissagem)
}

# -----------------------------------------------------------------------------
# DEFINIÇÃO DOS 7 FRAMES EM MATRIZES ASCII 48x32
# Cada linha representa exatamente 1 pixel vertical; cada caractere 1 pixel horizontal.
# Linha 31 corresponde à baseline do chão (IDLE, RUN 1, RUN 2, LAND).
# -----------------------------------------------------------------------------

FRAMES = {}

# 1. IDLE (48x32) - Postura neutra, parado virado para a direita, pés na baseline (linha 31)
FRAMES['idle'] = [
    '                                                ',
    '                     ##  ##                     ',
    '                 ######hh######                 ',
    '               ##hhhhHHhhhhhhhL##               ',
    '               ##hhhhHHhhh######L#              ',
    '                 ##hhhhHH##sss##h#              ',
    '             ####hhhhhh##sssss####              ',
    '             ##hhhhhh##ssWeSss####              ',
    '               ######h##ssssss##                ',
    '               ##hhhh###ssssssss##              ',
    '                ####hh##ssssssss##              ',
    '                  ######ssssssss#               ',
    '                  ##ss##ssssss##                ',
    '                ####ssSsssss##                  ',
    '              ##YODDssss####                    ',
    '             #YOODDPPPPl#                       ',
    '             #YOODPPPPPP##                      ',
    '            ##llDPPPPPPW##                      ',
    '            #lllDPPPPPW###                      ',
    '            #lllDPPPPPPPPP#                     ',
    '            #WllDPPPPPPPPP#                     ',
    '            #ss#DDPPPPPPP##                     ',
    '             ##ss##ppppp#                       ',
    '               ##pggpppp#                       ',
    '               #ppggggpp#                       ',
    '               #pppp#ppp#                       ',
    '               #pppp#ppp#                       ',
    '              ##pppp#pppp#                      ',
    '              #PPPp##PPPp#                      ',
    '             #OPPPW#OPPPW#                      ',
    '             #YWWW##YWWWW#                      ',
    '             ###### ######                      '
]

# 2. RUN 1 (48x32) - Início do ciclo de corrida, passada aberta, pé dianteiro cravado na baseline (linha 31)
FRAMES['run_1'] = [
    '                                                ',
    '                                                ',
    '                       ##  ##                   ',
    '                   ######hh######               ',
    '                 ##hhhhHHhhhhhhhL##             ',
    '                 ##hhhhHHhhh######L#            ',
    '                   ##hhhhHH##sss##h#            ',
    '               ####hhhhhh##sssss####            ',
    '               ##hhhhhh##ssWeSss####            ',
    '                 ######h##ssssss##              ',
    '                ##hhhh###ssssssss##             ',
    '                 ####hh##ssssssss##             ',
    '                   ######ssssssss#              ',
    '                 ##ss##ssssss##                 ',
    '               ####ssSsssss##  ##               ',
    '             ##YODDssss####   #ss#              ',
    '            #YOODDPPPPl#      #Ws#              ',
    '          ##ss#DPPPPPPW##    #lll#              ',
    '          #Wss#DPPPPPW###    #lll#              ',
    '           ##llDPPPPPPPPP#  #PPP#               ',
    '             #llDPPPPPPPPP###PPP#               ',
    '              ##DDPPPPPPP######                 ',
    '             ##ppppp#ppppp#                     ',
    '            #pppppp##pgggpp#                    ',
    '           #PPPppp# #ppgggpp#                   ',
    '          #OPPPW##   #ppppppp#                  ',
    '          #YWWW#     #ppppppp#                  ',
    '          ######      ##pppppp#                 ',
    '                        #PPPPpp#                ',
    '                       #OPPPWW##                ',
    '                       #YWWWWW#                 ',
    '                       ########                 '
]

# 3. RUN 2 (48x32) - Segundo extremo da corrida, braços e pernas complementares, pé cravado na baseline (linha 31)
FRAMES['run_2'] = [
    '                                                ',
    '                                                ',
    '                        ##  ##                  ',
    '                    ######hh######              ',
    '                  ##hhhhHHhhhhhhhL##            ',
    '                  ##hhhhHHhhh######L#           ',
    '                    ##hhhhHH##sss##h#           ',
    '                ####hhhhhh##sssss####           ',
    '                ##hhhhhh##ssWeSss####           ',
    '                  ######h##ssssss##             ',
    '                 ##hhhh###ssssssss##            ',
    '                  ####hh##ssssssss##            ',
    '                    ######ssssssss#             ',
    '                  ##ss##ssssss##                ',
    '                ####ssSsssss##                  ',
    '              ##YODDssss####   ##               ',
    '             #YOODDPPPPl#     #ss#              ',
    '            ##llDPPPPPPW##    #Ws#              ',
    '           #ss#lDPPPPPW###   #lll#              ',
    '           #Wss#DPPPPPPPPP#  #lll#              ',
    '            ##llDPPPPPPPPP####PPP#              ',
    '              ##DDPPPPPPP######                 ',
    '              #pppppp#ppppp#                    ',
    '             #pppppp##pgggpp#                   ',
    '            #PPPppp# #ppgggpp#                  ',
    '           #OPPPW##   #ppppppp#                 ',
    '           #YWWW#     #ppppppp#                 ',
    '           ######      ##pppppp#                ',
    '                         #PPPPpp#               ',
    '                        #OPPPWW##               ',
    '                        #YWWWWW#                ',
    '                        ########                '
]

# 4. JUMP (48x32) - Salto no ar, punho erguido, joelhos dobrados, propulsão roxa descendo das botas
FRAMES['jump'] = [
    '                   ##  ##                       ',
    '               ######hh######                   ',
    '             ##hhhhHHhhhhhhhL##                 ',
    '             ##hhhhHHhhh######L#                ',
    '               ##hhhhHH##sss##h#                ',
    '           ####hhhhhh##sssss####   ##           ',
    '           ##hhhhhh##ssWeSss####  #ss#          ',
    '             ######h##ssssss##    #Ws#          ',
    '             ##hhhh###ssssssss## #lll#          ',
    '              ####hh##ssssssss####lll#          ',
    '                ######ssssssss# #PPP#           ',
    '                ##ss##ssssss## #PPP#            ',
    '              ####ssSsssss##  #PPP#             ',
    '            ##YODDssss####   #PPP#              ',
    '           #YOODDPPPPl#     #PPP#               ',
    '          #YOODPPPPPP##    #PPP#                ',
    '         ##llDPPPPPPW##   #PPP#                 ',
    '         #ss#DPPPPPW###  #PPP#                  ',
    '         #Wss#DPPPPPPPP##PPP#                   ',
    '          ##llDPPPPPPPPP####                    ',
    '            ##DDPPPPPPP#                        ',
    '             #ppppp#ppppp#                      ',
    '            #pgggpp##pgggpp#                    ',
    '           #PPPp##  #PPPp##                     ',
    '          #OPPPW#  #OPPPW#                      ',
    '          #YWWW#   #YWWW#                       ',
    '          ######   ######                       ',
    '           vv vv    vv vv                       ',
    '            V  v     V  v                       ',
    '            v        v                          ',
    '                                                ',
    '                                                '
]

# 5. BOOST (48x32) - Voo com propulsão horizontal intensa (chamas nos pés e nas costas)
FRAMES['boost'] = [
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                             ##  ##             ',
    '                         ######hh######         ',
    '                       ##hhhhHHhhhhhhhL##       ',
    '                     ##hhhhHHhhh######L#        ',
    '                       ##hhhhHH##sss##h#        ',
    '                   ####hhhhhh##sssss####        ',
    '          RR       ##hhhhhh##ssWeSss####        ',
    '        RROOYY####   ######h##ssssss##          ',
    '       ROOYYYODDDs###hhhh###ssssssss##          ',
    '      ROOYYYODDDPP####hh##ssssssss##            ',
    '     RROOYYOODDPPPP######ssssssss#              ',
    '       ROOOODDPPPPP##ss##ssssss##               ',
    '  RR    RRODDPPPPPPWsssSsssss##                 ',
    '  RROO   ##DPPPPPPW#sssss####                   ',
    '   ROOYY###DPPPPPPPPP####                       ',
    '  ROOYYYYPPp#DPPPPPPPPP#                        ',
    '   ROOYYYOPPPW#DDPPPPPPP#                       ',
    '    ROOYYYOPPPW#ppppppp#                        ',
    '     RROYYYWWW#ppppppp#             R           ',
    '       ROO#### #ppppp#             RR           ',
    '        RR      #####             sRY           ',
    '                                  sRYO          ',
    '                                   RRR          ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                '
]

# 6. FLY (48x32) - Voo aerodinâmico controlado, chamas alongadas e variação das partículas
FRAMES['fly'] = [
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                              ##  ##            ',
    '                          ######hh######        ',
    '                        ##hhhhHHhhhhhhhL##      ',
    '                      ##hhhhHHhhh######L#       ',
    '                        ##hhhhHH##sss##h#       ',
    '                    ####hhhhhh##sssss####       ',
    '        RRR         ##hhhhhh##ssWeSss####       ',
    '      RROOYY####      ######h##ssssss##         ',
    '     ROOYYYYODDDs####hhhh###ssssssss##          ',
    '    ROOYYYYODDDPP#####hh##ssssssss##            ',
    '   RROOYYYYODDPPPP#######ssssssss#              ',
    '     RROOOODDPPPPP##sss##ssssss##               ',
    '  RR   RROODDPPPPPPWsssSsssss##                 ',
    '  RROOYY ##DPPPPPPW#sssss####                   ',
    '   RROOYYYY##DPPPPPPPPP####                     ',
    '  ROOYYYYOPPp#DPPPPPPPPP#                       ',
    '   ROOYYYYOPPPW#DDPPPPPPP#                      ',
    '    ROOYYYOPPPW#ppppppp#                        ',
    '     RROOYYWWW#ppppppp#                         ',
    '       RROO###  #ppppp#                         ',
    '         RR      #####                          ',
    '                                                ',
    '                                                ',
    '                                       l        ',
    '                                      lw        ',
    '                                   ww llw       ',
    '                                                ',
    '                                                '
]

# 7. LAND (48x32) - Aterrissagem agachada (three-point landing), mão e pés no chão (linha 31), poeira
FRAMES['land'] = [
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                        ##  ##                  ',
    '                    ######hh######              ',
    '                  ##hhhhHHhhhhhhhL##            ',
    '                  ##hhhhHHhhh######L#           ',
    '                    ##hhhhHH##sss##h#           ',
    '                ####hhhhhh##sssss####           ',
    '                ##hhhhhh##ssWeSss####           ',
    '                  ######h##ssssss##             ',
    '                  ##hhhh###ssssssss##           ',
    '                 ##ss##hh##ssssssss##           ',
    '               ##YODDssss######ssssssss#        ',
    '              #YOODDPPPPl##ss##ssssss##         ',
    '             #YOODDPPPPPPssSsssss##             ',
    '            ##llDPPPPPPW##ssss####              ',
    '            #lllDPPPPPW###                      ',
    '           #pppp#DPPPPPPPPP#                    ',
    '    d     #pppppp#DDPPPPPPP#       d            ',
    '   dkd   #ppppppp##ppppp#   #ss#  dkd           ',
    '  dkdkd  #PPPPpp# #pgggpp#  #Ws# ddkd           ',
    '   dkd  #OPPPW##   #ppppp# #lll#  dkd           ',
    '    d   #YWWW#     ####### #PPP#   d            ',
    '        ######     ######  #####                '
]


# -----------------------------------------------------------------------------
# FUNÇÕES UTILITÁRIAS DE DESENHO E EDIÇÃO MANUAL
# -----------------------------------------------------------------------------

def get_pixel(frame_name, x, y):
    """Retorna o caractere do pixel em (x, y) no frame especificado."""
    return FRAMES[frame_name][y][x]

def set_pixel(frame_name, x, y, char):
    """Altera o pixel em (x, y) no frame especificado para o caractere char."""
    assert 0 <= x < 48, f"X fora dos limites: {x}"
    assert 0 <= y < 32, f"Y fora dos limites: {y}"
    assert char in PALETTE, f"Caractere não existe na paleta: {char}"
    row = list(FRAMES[frame_name][y])
    row[x] = char
    FRAMES[frame_name][y] = ''.join(row)

def draw_rect(frame_name, x0, y0, width, height, char):
    """Preenche um retângulo de coordenadas inteiras com o caractere char."""
    for y in range(y0, y0 + height):
        for x in range(x0, x0 + width):
            set_pixel(frame_name, x, y, char)

def render_frame_image(lines):
    """Converte a matriz ASCII (32 linhas de 48 caracteres) em uma PIL.Image RGBA de 48x32."""
    assert len(lines) == 32, f"O frame precisa ter exatamente 32 linhas, recebido: {len(lines)}"
    arr = np.zeros((32, 48, 4), dtype=np.uint8)
    for y, line in enumerate(lines):
        assert len(line) == 48, f"A linha {y} precisa ter exatamente 48 colunas, recebido: {len(line)}"
        for x, char in enumerate(line):
            arr[y, x] = PALETTE[char]
    return Image.fromarray(arr, mode='RGBA')

def export_all():
    """Gera e salva todos os arquivos requeridos com validações rigorosas."""
    out_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(out_dir, exist_ok=True)
    
    frame_order = ['idle', 'run_1', 'run_2', 'jump', 'boost', 'fly', 'land']
    frame_images = {}
    
    # 1. Exporta cada frame individualmente (48x32)
    for name in frame_order:
        img = render_frame_image(FRAMES[name])
        assert img.size == (48, 32), f"Erro de tamanho no frame {name}: {img.size} != (48, 32)"
        
        # Validação de coordenadas inteiras e transparência estrita (alpha 0 ou 255)
        arr = np.array(img)
        unique_alphas = np.unique(arr[:, :, 3])
        for a in unique_alphas:
            assert a in (0, 255), f"Frame {name} contém alfa semitransparente: {a}"
            
        frame_images[name] = img
        target_path = os.path.join(out_dir, f"{name}.png")
        img.save(target_path, "PNG")
        print(f"Salvo frame individual: {name}.png ({img.size[0]}x{img.size[1]})")

    # 2. Constrói a Sprite Sheet completa (336x32)
    sprite_sheet = Image.new('RGBA', (336, 32), (0, 0, 0, 0))
    for i, name in enumerate(frame_order):
        cell_x = i * 48
        sprite_sheet.paste(frame_images[name], (cell_x, 0))
        
    sheet_path = os.path.join(out_dir, "sprite_sheet.png")
    sprite_sheet.save(sheet_path, "PNG")
    print(f"\nSalva sprite sheet nativa: sprite_sheet.png ({sprite_sheet.size[0]}x{sprite_sheet.size[1]})")
    
    # Validação rigorosa da sprite sheet final
    assert sprite_sheet.size == (336, 32), f"Tamanho incorreto da sprite sheet: {sprite_sheet.size}"
    sheet_arr = np.array(sprite_sheet)
    for a in np.unique(sheet_arr[:, :, 3]):
        assert a in (0, 255), f"Sprite sheet contém alfa semitransparente: {a}"

    # 3. Exporta preview 10x (3360x320) com Nearest Neighbor
    preview_10x = sprite_sheet.resize((3360, 320), Image.Resampling.NEAREST)
    preview_path = os.path.join(out_dir, "sprite_sheet_preview_10x.png")
    preview_10x.save(preview_path, "PNG")
    print(f"Salva visualização 10x: sprite_sheet_preview_10x.png ({preview_10x.size[0]}x{preview_10x.size[1]})")
    
    # 4. Exporta palette.txt
    palette_path = os.path.join(out_dir, "palette.txt")
    with open(palette_path, "w", encoding="utf-8") as f:
        f.write("=====================================================================\n")
        f.write("PALETA OFICIAL - RECONSTRUÇÃO DO PROTAGONISTA 2D PLATFORMER HERO\n")
        f.write("=====================================================================\n\n")
        f.write(f"{'CHAR':<7} {'NOME':<30} {'HEX':<10} {'RGBA':<24} {'DESCRIÇÃO'}\n")
        f.write("-" * 105 + "\n")
        
        descriptions = {
            ' ': "Fundo transparente",
            '#': "Contorno quase preto / marrom escuro",
            'H': "Cabelo escuro (tom base)",
            'h': "Cabelo tom médio",
            'L': "Cabelo highlight escuro",
            's': "Pele base (tom quente claro)",
            'S': "Pele sombra (queixo, orelha)",
            'e': "Pupila preta dos olhos",
            'W': "Branco puro (emblema, punhos, sola, brilho ocular)",
            'w': "Branco suave / cinza claro (sombra da sola)",
            'P': "Roxo principal do moletom",
            'D': "Roxo escuro (sombra das dobras do moletom)",
            'l': "Roxo claro (highlight do ombro/capuz)",
            'p': "Calça preta / grafite escura",
            'g': "Calça cinza claro / vinco do joelho",
            'Y': "Amarelo (núcleo da chama e propulsor da mochila)",
            'O': "Laranja (chama propulsora e detalhe do tênis)",
            'R': "Vermelho-laranja (extremidades da chama e faíscas)",
            'v': "Roxo claro (partículas de propulsão do salto)",
            'V': "Lavanda suave (linhas de traço do salto)",
            'd': "Cinza poeira clara (aterrissagem)",
            'k': "Cinza poeira sombra (aterrissagem)",
        }
        
        for char, rgba in PALETTE.items():
            r, g, b, a = rgba
            hex_code = f"#{r:02X}{g:02X}{b:02X}" if a > 0 else "TRANSPARENT"
            desc = descriptions.get(char, "")
            char_display = f"'{char}'" if char != ' ' else "'SPACE'"
            f.write(f"{char_display:<7} {desc.split('(')[0].strip():<30} {hex_code:<10} {str(rgba):<24} {desc}\n")
            
    print(f"Salvo arquivo de paleta: palette.txt")
    print("\nTODAS AS VALIDAÇÕES FORAM CONCLUÍDAS COM SUCESSO!")

if __name__ == "__main__":
    export_all()
