// Uma fala curta por página. Os nós podem encadear cenas e escolhas.
export const dialogueScenes = {
  despedida: {
    lines: [
      { speaker: 'Mãe', portrait: 'none', text: 'Tchau, filho. Boa aula.' },
      { speaker: 'Gabriel', portrait: 'gabriel', text: 'Tchau. Obrigado, mãe.' },
      { speaker: 'Mãe', portrait: 'none', text: 'Juízo.' },
    ],
  },
  intro: {
    lines: [
      { speaker: 'Gabriel', portrait: 'gabriel', text: 'O foguete [shake]acordou...[/shake] [rgb]E agora?[/rgb]' },
    ],
    choices: [
      { label: 'Testar', next: 'testar', onSelect: state => { state.testou = true; } },
      { label: 'Como usar?', next: 'ajuda' },
      { label: 'Sair' },
    ],
  },
  testar: {
    lines: [
      { speaker: 'Gabriel', portrait: 'gabriel', text: '[fall]UOOH![/fall] Eu voei!' },
    ],
  },
  ajuda: {
    lines: [
      { speaker: 'Rádio', portrait: 'signal', text: 'Espaço sobe. Shift avança.' },
    ],
  },
};
