// Uma fala curta por página. Os nós podem encadear cenas e escolhas.
export const dialogueScenes = {
  milenio: {
    lines: [
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        text: 'Boa noite, professor.',
      },
      {
        speaker: 'Milênio', voice: 'milenio', portrait: 'milenio',
        text: 'Oi Gabriel, boa noite... Pensei que você nem viria hoje. Você nunca vem de sexta-feira.',
      },
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        expression: 'suspicious',
        text: 'Já são quase 19:20, professor. Por que ninguém da turma chegou ainda? A escola tá um silêncio estranho...',
      },
      {
        speaker: 'Milênio', voice: 'milenio', portrait: 'milenio',
        text: 'Então... sobre isso...[pause=0.2] Na verdade, eu não-', autoAdvance: 0.16,
      },
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        text: 'Se não vai ter aula hoje, vou pedir pra ir embora. Até mais, professor.',
      },
    ],
    onExit: state => {
      state.triggerLeavingCutscene = true;
    },
  },
  milenioEspera: {
    lines: [
      {
        speaker: 'Milênio', voice: 'milenio', portrait: 'milenio',
        text: 'Gabriel, espera! Não vai embora ainda... Eu sei o que aconteceu. Eu sei por que ninguém apareceu hoje.',
        onStart: state => {
          if (state.onMilenioCall) state.onMilenioCall();
        },
      },
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        expression: 'suspicious',
        text: 'Como assim? O que tá acontecendo, professor?',
      },
      {
        speaker: 'Milênio', voice: 'milenio', portrait: 'milenio',
        text: 'Não fala alto... Chega aqui perto da minha mesa. Vem cá.',
      },
    ],
    onExit: state => {
      state.milenioCalled = true;
    },
  },
  milenioGoverno: {
    lines: [
      {
        speaker: 'Milênio', voice: 'milenio', portrait: 'milenio',
        text: 'Tem uma coisa muito séria do governo acontecendo aqui perto... Eu não sei se deveria te envolver nisso, mas acredito em você. Vamos lá, não temos muito tempo...',
      },
    ],
    onExit: state => {
      state.triggerAgulhaCutscene = true;
    },
  },
  milenioVacina: {
    lines: [
      {
        speaker: 'Milênio', voice: 'milenio', portrait: 'milenio',
        text: 'Antes, qual é o seu objeto preferido? Eu preciso saber.',
      },
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        text: 'Uhhh... sei lá? Foguetes?',
      },
      {
        speaker: 'Milênio', voice: 'milenio', portrait: 'milenio',
        text: '...Certo. O que acontece é que, pessoas internas de dentro do governo estão desenvolvendo um aparato para um tipo de vacina em que, o objeto preferido dessa pessoa se torna sua fonte de poder.',
      },
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        expression: 'suspicious',
        text: 'Fonte de poder?',
      },
      {
        speaker: 'Milênio', voice: 'milenio', portrait: 'milenio',
        text: 'Exato. Estão procurando um receptáculo. Mas eu roubei uma das fórmulas.',
      },
      {
        speaker: 'Milênio', voice: 'milenio', portrait: 'milenio',
        text: '...Foguetes... me parecem algo muito bom pra ter poderes.',
      },
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        expression: 'excited',
        text: '...Tipo? Voar? Ter propulsores?',
      },
      {
        speaker: 'Milênio', voice: 'milenio', portrait: 'milenio',
        text: 'Exato! ... Mas, preciso que você por vontade própria aceite. Eu vou ser direto. Ainda está em fase de testes, e eu não sei o quão perigoso essa agulha pode ser. Se funcionar, parabéns. Você tem poderes.',
      },
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        expression: 'suspicious',
        text: 'E vocês não tem mais ninguém para testar?',
      },
      {
        speaker: 'Milênio', voice: 'milenio', portrait: 'milenio',
        text: 'Como? Ninguém sabe que eu tenho isso. Eu temo o que o governo pode fazer.',
      },
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        text: 'O governo não faria nada de mal.',
      },
      {
        speaker: 'Milênio', voice: 'milenio', portrait: 'milenio',
        text: 'É sempre bom ter o antí-vírus antes de pegar o vírus, não é? O que me diz? Vai querer testar?',
      },
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        expression: 'excited',
        text: '...Poderes de foguete, não é?',
      },
      {
        speaker: 'Milênio', voice: 'milenio', portrait: 'milenio',
        text: 'Com grandes poderes... vem gran-', autoAdvance: 0.16,
      },
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        expression: 'angry',
        text: 'Eu não sou o homem-aranha.',
      },
      {
        speaker: 'Milênio', voice: 'milenio', portrait: 'milenio',
        text: 'Mas poderia ser o homem de ferro.',
      },
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        expression: 'excited',
        text: '...Heheh. Tá, eu aceito.',
      },
      {
        speaker: 'Milênio', voice: 'milenio', portrait: 'milenio',
        text: 'Ótimo, vem cá...',
      },
    ],
    onExit: state => {
      state.triggerFadeOut = true;
    },
  },
  rooftopReady: {
    position: 'bottom',
    lines: [
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: 'Está pronto?' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', text: '...Acho que sim.' },
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: 'Boa sorte, Tony Stark.' },
    ],
  },
  rooftopWorks: {
    position: 'bottom',
    lines: [
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', expression: 'excited', text: 'Uau! Funciona!' },
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: 'Toma cuidado aí, garoto.' },
    ],
  },
  rooftopOutOfFuel: {
    position: 'bottom',
    lines: [{ speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', expression: 'suspicious', text: 'Ih...' }],
  },
  rooftopCloseCall: {
    position: 'bottom',
    lines: [
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: 'Tudo bem por aí!?' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', text: 'Sim... tô só testando essa belezinha...' },
    ],
  },
  rooftopReboundWorks: {
    position: 'bottom', lines: [
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', expression: 'excited', text: 'Nem preciso parar!' },
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: 'Isso! Aperta de novo assim que pousar. Agora tenta sozinho.' },
    ],
  },
  rooftopReserveIntro: {
    position: 'bottom', lines: [
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: 'Belo salto. Agora olha o medidor: o tanque principal não dura para sempre.' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', expression: 'suspicious', text: 'Tem alguma coisa de emergência aí, né?' },
    ],
  },
  rooftopReserveWorks: {
    position: 'bottom', lines: [
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', expression: 'excited', text: 'Ainda bem que tinha um restinho...' },
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: 'Não conta com isso toda vez! A reserva só volta quando você pousa.' },
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: 'Vamos testar com pouco combustível. Solta Espaço e aperta de novo quando estiver caindo.' },
    ],
  },
  rooftopReserveLearned: {
    position: 'bottom', lines: [
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: 'Viu? Uma reserva por voo. E no pouso ela volta.' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', text: 'Vou tentar não precisar tanto dela.' },
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: 'Esse próximo vão é maior. Ganha altura primeiro, depois segura Shift e Espaço juntos.' },
    ],
  },
  rooftopMegaWorks: {
    position: 'bottom', lines: [
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', expression: 'excited', text: 'Tá... isso aqui é outra coisa.' },
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: 'Agora cruza o próximo vão sozinho. Ganha altura antes de carregar o impulso.' },
    ],
  },
  rooftopMasteryIntro: {
    position: 'bottom', lines: [
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: 'Agora combina tudo. Aproveita os pousos, guarda combustível para as subidas e usa a reserva se precisar.' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', expression: 'excited', text: 'Deixa comigo.' },
    ],
  },
  rooftopPowersReady: {
    position: 'bottom', lines: [
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: 'Boa! O resto do percurso é seu. Só não esquece de pousar para recarregar.' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', expression: 'excited', text: 'Já tô pegando o jeito.' },
    ],
  },
  milenioRepeat: {
    lines: [
      {
        speaker: 'Milênio', voice: 'milenio', portrait: 'milenio',
        text: 'Vem cá...',
      },
    ],
  },
  despedida: {
    lines: [
      {
        speaker: 'Mãe', voice: 'mom', portrait: 'none',
        text: 'Filho, você vai sair de blusa nesse calor de novo? Todo dia você vai de blusa. Se não é blusa, é aquela camisa longa UV velha.',
      },
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        text: 'Claro, a primeira coisa que eu faço quando chego lá é ligar o ar-condicionado no 16. Se os outros forem sem blusa, passam frio.',
      },
      {
        speaker: 'Mãe', voice: 'mom', portrait: 'none',
        text: 'Não é motivo pra sair parecendo que vai pra antártida! E aliás, que horas você foi dormir ontem?',
      },
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        text: 'Acho que uma ou duas horas da manhã.',
      },
      {
        speaker: 'Mãe', voice: 'mom', portrait: 'none',
        text: 'Aposto que tava vendo vídeo daquele canal de foguetes de novo. Como era o nome mesmo...?',
      },
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        text: 'Space Orbit.',
      },
      {
        speaker: 'Mãe', voice: 'mom', portrait: 'none',
        text: 'Isso. Vê se não dorme na aula. E leva a garrafa d\'água e toma cuidado na volta. Vai com Deus filho, juízo. Te amo.',
      },
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        text: 'Amém, mãe. Também te amo. Fica com Deus também.',
      },
    ],
  },
  stationArrival: {
    lines: [{ speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
      text: 'Ótimo. A delegacia é logo aqui embaixo.' }],
  },
  stationGreeting: {
    position: 'top',
    lines: [
      { speaker: 'Policial', voice: 'policial', portrait: 'none', text: 'Fala, garoto.' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', text: 'Aquela fumaça nos telhados era minha. Eu vim me explicar.' },
      { speaker: 'Policial', voice: 'policial', portrait: 'none', text: 'Sua? Você estava colocando fogo nos prédios?' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', expression: 'suspicious', text: 'Não! Eu estava voando.' },
      { speaker: 'Policial', voice: 'policial', portrait: 'none', text: '...Começa de novo. Devagar.' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', text: 'Meu professor testou uma fórmula em mim. Ela me deu propulsores. Fui aprender a usar nos telhados.' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', text: 'Alguém viu a fumaça e mandaram um helicóptero atrás de mim.' },
      { speaker: 'Policial', voice: 'policial', portrait: 'none', text: 'Você entende por que essa história é difícil de acreditar?' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', text: 'Entendo. Eu também não acreditaria.' },
      { speaker: 'Policial', voice: 'policial', portrait: 'none', text: 'E esse professor? Por que não veio com você?' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', text: 'Foi ele que me mandou pra cá. Disse que tem gente do governo atrás da fórmula.' },
      { speaker: 'Policial', voice: 'policial', portrait: 'none', text: 'Isso ficou pior, não melhor. Você tem alguma prova?' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', expression: 'excited', text: 'Tenho. Só afasta esses papéis.' },
      { speaker: 'Policial', voice: 'policial', portrait: 'none', text: 'Se você incendiar minha mesa, a conversa acaba.' },
    ],
    onExit: state => { state.triggerStationProof = true; },
  },
  stationResolution: {
    position: 'top',
    lines: [
      { speaker: 'Policial', voice: 'policial', portrait: 'none', text: '...Tá. Você estava voando.' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', expression: 'excited', text: 'Eu avisei.' },
      { speaker: 'Policial', voice: 'policial', portrait: 'none', text: 'Eu precisava ver. Agora desliga isso antes que atravesse o teto.' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', text: 'Então pode mandar o helicóptero parar?' },
      { speaker: 'Policial', voice: 'policial', portrait: 'none', text: 'Posso avisar a central que você se apresentou e que não houve incêndio.' },
      { speaker: 'Policial', voice: 'policial', portrait: 'none', text: 'Mas antes preciso confirmar quem enviou aquela aeronave.' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', expression: 'suspicious', text: 'E se não foi a polícia?' },
      { speaker: 'Policial', voice: 'policial', portrait: 'none', text: 'Aí você fez muito bem em vir aqui.' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', text: 'Meu professor também pode confirmar tudo. Ele sabe de onde veio a fórmula.' },
      { speaker: 'Policial', voice: 'policial', portrait: 'none', text: 'Certo. Vou registrar seu depoimento e o que acabei de ver.' },
      { speaker: 'Policial', voice: 'policial', portrait: 'none', text: 'Depois ligo para o professor daqui. Você fica na delegacia enquanto eu falo com a central.' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', text: 'E a fórmula?' },
      { speaker: 'Policial', voice: 'policial', portrait: 'none', text: 'Ele não traz a fórmula até sabermos quem está procurando vocês. Primeiro descobrimos em quem confiar.' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', text: 'Parece um plano.' },
      { speaker: 'Policial', voice: 'policial', portrait: 'none', text: 'É o melhor que temos. Agora me dá o número dele... e nada de foguetes aqui dentro.' },
    ],
  },
  milenioPhone: {
    position: 'top',
    shakeStyle: 'subtle',
    lines: [
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: '[shake]Gabriel! Péssimas notícias![/shake]' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', expression: 'suspicious', text: 'O que? Por que!? O que aconteceu? Não me diz que-' },
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: '[shake]Eu não sei, parece que detectaram algum tipo de fumaça...[/shake]' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', text: 'São meus propulsores.' },
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: '[shake]Eu imaginei! Mas a polícia não sabe disso. Tem gente procurando você nos telhados![/shake]' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', expression: 'suspicious', text: 'Calma, professor. Eu só estava testando. Não quebrei nada... eu acho.' },
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: '[shake]Gabriel, escuta. Se aqueles holofotes te pegarem, fica parado até a luz sair de você.[/shake]' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', expression: 'suspicious', text: 'Holofotes!? Tudo isso por causa de um pouco de fumaça?' },
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: '[shake]O governo está atrás da fórmula. Eles não vão achar que é só fumaça.[/shake]' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', text: 'Tá. Entendi. Pra onde eu vou?' },
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: '[shake]Corre pra delegacia se explicar. Segue os prédios mais altos, depois da avenida.[/shake]' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', text: 'Pode deixar. E respira, professor. Eu te ligo quando chegar.' },
      { speaker: 'Milênio', voice: 'milenio', portrait: 'milenio', text: '[shake]Juízo, garoto. E não inventa de fazer gracinha no caminho![/shake]' },
      { speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel', expression: 'excited', text: 'Sem promessas pra essa última parte.' },
    ],
  },
  intro: {
    lines: [
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        text: 'Tem um zumbido abafado vindo do fundo da mochila... O propulsor miniatura tá [shake]vibrando sozinho[/shake]. O metal parece morno, quase como se tivesse um coração batendo ali dentro.',
      },
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        text: 'Ninguém na sala parece notar o barulho estranho. Se isso disparar sozinho aqui dentro, o estrago vai ser feio... O que eu faço agora?',
      },
    ],
    choices: [
      { label: 'Testar impulso com cuidado', next: 'testar', onSelect: state => { state.testou = true; } },
      { label: 'Checar sinal do rádio', next: 'ajuda' },
      { label: 'Guardar na mochila por enquanto' },
    ],
  },
  testar: {
    lines: [
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        expression: 'excited',
        text: '[fall]UOOH...![/fall] O chão simplesmente sumiu embaixo de mim por um segundo! O coração veio parar na boca... Mas a suspensão aguentou o peso perfeitamente.',
      },
      {
        speaker: 'Gabriel', voice: 'gabriel', portrait: 'gabriel',
        text: 'Isso é surreal... Quem construiu essa peça sabia exatamente o que tava fazendo.',
      },
    ],
  },
  ajuda: {
    lines: [
      {
        speaker: 'Rádio', portrait: 'signal',
        text: '*estática chiando na frequência 104.2* ...[shake]Atenção, piloto de testes[/shake]. Segure [color=#67e8c1]Espaço[/color] para propulsão vertical contínua. Pressione [color=#ffc281]Shift[/color] para arranque horizontal rápido. Monitore o medidor no canto superior.',
      },
    ],
  },
};
