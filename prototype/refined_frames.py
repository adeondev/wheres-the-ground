import os
import numpy as np
from PIL import Image

PALETTE = {
    ' ': (0, 0, 0, 0),             # Transparent
    '#': (34, 18, 22, 255),        # Outline (near black / dark warm brown)
    'H': (48, 30, 34, 255),        # Dark hair base
    'h': (68, 44, 48, 255),        # Hair mid
    'L': (88, 58, 62, 255),        # Hair light / highlight
    's': (251, 170, 95, 255),      # Face skin base
    'S': (226, 132, 64, 255),      # Face skin shadow
    'e': (20, 12, 14, 255),        # Eye pupil
    'W': (255, 255, 255, 255),    # White (chest logo, cuffs, sneaker toe/sole, eye shine)
    'w': (225, 228, 235, 255),    # Off-white / light gray sole
    'P': (138, 37, 205, 255),      # Purple hoodie
    'D': (96, 22, 146, 255),       # Dark purple shadow
    'l': (208, 148, 220, 255),     # Light purple highlight
    'p': (44, 34, 40, 255),        # Pants dark
    'g': (72, 62, 68, 255),        # Pants highlight / crease
    'Y': (255, 214, 38, 255),      # Yellow thruster flame / backpack core
    'O': (254, 138, 34, 255),      # Orange thruster flame
    'R': (244, 86, 26, 255),       # Red-orange thruster flame tip/sparks
    'v': (202, 182, 236, 255),     # Jump thruster purple particle
    'V': (226, 212, 248, 255),     # Jump thruster light streak
    'd': (208, 208, 214, 255),     # Land dust puff
    'k': (170, 170, 178, 255),     # Land dust shadow
}

FRAMES = {}

# 1. IDLE (48x32)
# Baseline on row 31 (bottom sole #)
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

# 2. RUN 1 (48x32)
# Planted foot baseline on row 31
FRAMES['run_1'] = [
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
    '                       ########                 ',
    '                                                '
]

# 3. RUN 2 (48x32)
# Planted foot baseline on row 31
FRAMES['run_2'] = [
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
    '                        ########                ',
    '                                                '
]

# 4. JUMP (48x32)
# Airborne pose, boots hovering at y=23-26, purple thruster particle streaks down to y=30
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

# 5. BOOST (48x32)
# Rocket boost horizontal flight with backpack flame and boot flame
FRAMES['boost'] = [
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                           ##  ##               ',
    '                       ######hh######           ',
    '                     ##hhhhHHhhhhhhhL##         ',
    '                   ##hhhhHHhhh######L#          ',
    '                     ##hhhhHH##sss##h#          ',
    '                 ####hhhhhh##sssss####          ',
    '        RR       ##hhhhhh##ssWeSss####          ',
    '      RROOYY####   ######h##ssssss##            ',
    '     ROOYYYODDDs###hhhh###ssssssss##            ',
    '    ROOYYYODDDPP####hh##ssssssss##              ',
    '   RROOYYOODDPPPP######ssssssss#                ',
    '     ROOOODDPPPPP##ss##ssssss##                 ',
    'RR    RRODDPPPPPPWsssSsssss##                   ',
    'RROO   ##DPPPPPPW#sssss####                     ',
    ' ROOYY###DPPPPPPPPP####                         ',
    'ROOYYYYPPp#DPPPPPPPPP#                          ',
    ' ROOYYYOPPPW#DDPPPPPPP#                         ',
    '  ROOYYYOPPPW#ppppppp#                          ',
    '   RROYYYWWW#ppppppp#             R             ',
    '     ROO#### #ppppp#             RR             ',
    '      RR      #####             sRY             ',
    '                                sRYO            ',
    '                                 RRR            ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                '
]

# 6. FLY (48x32)
# Aerodynamic streamlined flight with distinct flame pattern
FRAMES['fly'] = [
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                            ##  ##              ',
    '                        ######hh######          ',
    '                      ##hhhhHHhhhhhhhL##        ',
    '                    ##hhhhHHhhh######L#         ',
    '                      ##hhhhHH##sss##h#         ',
    '                  ####hhhhhh##sssss####         ',
    '      RRR         ##hhhhhh##ssWeSss####         ',
    '    RROOYY####      ######h##ssssss##           ',
    '   ROOYYYYODDDs####hhhh###ssssssss##            ',
    '  ROOYYYYODDDPP#####hh##ssssssss##              ',
    ' RROOYYYYODDPPPP#######ssssssss#                ',
    '   RROOOODDPPPPP##sss##ssssss##                 ',
    'RR   RROODDPPPPPPWsssSsssss##                   ',
    'RROOYY ##DPPPPPPW#sssss####                     ',
    ' RROOYYYY##DPPPPPPPPP####                       ',
    'ROOYYYYOPPp#DPPPPPPPPP#                         ',
    ' ROOYYYYOPPPW#DDPPPPPPP#                        ',
    '  ROOYYYOPPPW#ppppppp#                          ',
    '   RROOYYWWW#ppppppp#                           ',
    '     RROO###  #ppppp#                           ',
    '       RR      #####                            ',
    '                                                ',
    '                                                ',
    '                                     l          ',
    '                                    lw          ',
    '                                 ww llw         ',
    '                                                ',
    '                                                '
]

# 7. LAND (48x32)
# Three-point crouch landing pose, hand & both boots planted on row 31, dust puffs
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

def render_frame(lines):
    assert len(lines) == 32, f"Expected 32 lines, got {len(lines)}"
    arr = np.zeros((32, 48, 4), dtype=np.uint8)
    for y, line in enumerate(lines):
        assert len(line) == 48, f"Row {y} has length {len(line)}, expected 48"
        for x, char in enumerate(line):
            arr[y, x] = PALETTE[char]
    return Image.fromarray(arr, 'RGBA')

os.makedirs('prototype/renders_v2', exist_ok=True)
for name, lines in FRAMES.items():
    img = render_frame(lines)
    img.save(f'prototype/renders_v2/{name}.png')
    img.resize((480, 320), Image.Resampling.NEAREST).save(f'prototype/renders_v2/{name}_10x.png')

print("Refined frames v2 rendered successfully")
