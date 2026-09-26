// Uma fala curta por página. Os nós podem encadear cenas e escolhas.
export const dialogueScenes = {
  intro: {
    lines: [
      { speaker: 'GABRIEL', portrait: 'gabriel', text: 'O foguete [shake]acordou...[/shake] [rgb]E agora?[/rgb]' },
    ],
    choices: [
      { label: 'TESTAR', next: 'testar', onSelect: state => { state.testou = true; } },
      { label: 'COMO USAR?', next: 'ajuda' },
      { label: 'SAIR' },
    ],
  },
  testar: {
    lines: [
      { speaker: 'GABRIEL', portrait: 'gabriel', text: '[fall]UOOH![/fall] Eu voei!' },
    ],
  },
  ajuda: {
    lines: [
      { speaker: 'RÁDIO', portrait: 'signal', text: 'Espaço sobe. Shift avança.' },
    ],
  },
};
