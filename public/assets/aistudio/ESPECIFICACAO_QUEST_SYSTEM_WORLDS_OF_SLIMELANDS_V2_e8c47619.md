# WORLDS OF SLIMELANDS — ESPECIFICAÇÃO DE REESTRUTURAÇÃO DO QUEST SYSTEM

**Destinatário:** agente de desenvolvimento da engine  
**Natureza:** requisito funcional e técnico para evolução/refatoração do Quest Marker existente  
**Objetivo:** criar um motor único de eventos, condições e ações para missões simples, encadeadas, paralelas e ramificadas, operado por um editor visual simples.

## 1. Diretriz principal

Refinar o Quest Marker atual ou recriá-lo se sua arquitetura impedir os requisitos abaixo. Antes de substituir qualquer módulo, auditar o que já funciona, preservar compatibilidade com fases e projetos salvos e reutilizar as integrações existentes. Não criar mecanismos paralelos de inventário, combate, NPC, diálogo, comércio, coleta, crafting, spawn ou progressão.

**Eventos são a linguagem central da engine.** Conversar, alcançar nível, abrir loja, adquirir item, vender, trocar, derrotar, coletar, equipar, ler, explorar, fabricar, entregar e concluir quests devem ser tratados como eventos observáveis pelo motor. Um evento pode atualizar o estado de uma missão, satisfazer uma condição, disparar uma ação e liberar novos eventos. Nem todo evento precisa pertencer a uma quest: por exemplo, alcançar nível 2 pode abrir a loja do Viajante 1, que depois fica disponível para objetivos comerciais de outras missões.

**Separar conceitos:** evento = fato ocorrido; condição = teste de estado/precondição; ação = efeito executado; objetivo = requisito acompanhado; quest = grafo de objetivos e consequências; progressão global = coordenação entre quests, fases e campanhas.

## 2. Arquitetura: um motor e dois editores

### 2.1 Quest Engine central (runtime)
Responsabilidades: catálogo de eventos tipados, avaliador de condições, executor de ações, contadores, estados de objetivos e quests, roteamento de eventos, persistência por jogador/save, dependências, prevenção de duplicidade, validação e depuração.

### 2.2 Editor de Quest da Fase
Contextual à fase atual. Associa visualmente nós a instâncias reais no mapa: NPCs, lojas, itens, baús, inimigos, pontos de coleta, regiões, portais, mecanismos, estações de crafting e marcadores. Permite criar, testar e publicar quests locais ou trechos de quests globais sem programação manual.

### 2.3 Editor de Progressão Global
Coordena desbloqueio de quests, capítulos, regiões, reinos, lojas, sistemas e campanhas; determina cadeias de missões e transições entre fases. Deve referenciar quests por IDs estáveis, sem duplicar lógica local. Uma quest pode começar numa fase, continuar em outra e terminar numa terceira.

### 2.4 Contrato de dados
Cada recurso referenciado possui ID estável; nomes visíveis podem mudar sem quebrar a referência. Quests e nós possuem versão de esquema. Reaproveitar registries e IDs existentes; criar adaptadores quando necessário.

## 3. Comportamento do editor visual

Tela simples com: painel lateral de biblioteca de nós; canvas com fluxo e conexões; inspetor contextual à direita; barra superior com salvar, validar, simular, desfazer/refazer e localizar referências. Ao selecionar NPC/loja/objeto na fase, oferecer **Criar objetivo com este elemento** e preencher automaticamente o vínculo. Ao selecionar um nó, editar os detalhes por campos claros (sem exigir JSON ou código).

Nós mínimos: **Início / Gatilho, Evento observado, Condição, Objetivo, Ação, Sequência, AND, OR, N de M, Decisão IF/ELSE, Espera, Temporizador, Repetição limitada, Subquest, Conclusão, Falha, Cancelamento**. Permitir grupos recolhíveis, comentários, zoom, alinhamento automático, copiar/colar nós, modelos prontos e inspeção de erros. Conexões sinalizadas por sucesso, falha e alternativa. Visualizar uma linha do tempo dos passos concluídos.

Evitar que um canvas de nós seja obrigatório para casos simples: oferecer **Assistente de Quest** (lista ordenada de etapas com botão “Adicionar etapa”) e botão para converter ao **Modo Avançado — Grafo**. A representação é a mesma; os dois modos editam o mesmo modelo, sem gerar versões divergentes.

## 4. Taxonomia completa de eventos e objetivos

### 4.1 NPCs e diálogo
Conversar com NPC específico; iniciar/encerrar diálogo; selecionar resposta; receber/entregar mensagem; perguntar sobre um assunto; convencer/negociar; descobrir informação; desbloquear nova fala; falar com N NPCs distintos; conversar após evento; retornar ao mesmo NPC. Filtros por NPC, fase, linha/opção de diálogo e estado do personagem.

### 4.2 Inventário, entrega e utilização
Possuir X unidades; adquirir X unidades durante a quest; pegar item específico; coletar de fonte específica; equipar/desequipar; usar/consumir; combinar; ler livro, carta ou pergaminho (evento distinto de apenas possuir); colocar ou retirar de baú; transferir; entregar X unidades ao NPC; entregar item de qualidade/raridade/atributo específico. Quantidades inteiras configuráveis e limites seguros.

### 4.3 Comércio e economia — OBRIGATÓRIO
Desbloquear loja; visitar/abrir loja específica; visualizar categoria/oferta; **comprar** item X na loja Y; comprar N unidades; comprar qualquer item de classe/tag; **vender** item X ou N itens elegíveis à loja Y; **trocar/barter** item A por B com NPC/lojista; realizar N transações; gastar/ganhar valor de moeda; acumular saldo; comprar com determinada moeda; obter item somente via compra; revender item recém-adquirido; aplicar preço/desconto condicionado a quests. Eventos diferentes para `shop_unlocked`, `shop_opened`, `purchase_completed`, `sale_completed`, `trade_completed`, `currency_changed`; transação só conta quando confirmada e efetivada, nunca ao clicar em botão ou abrir checkout.

Configurar restrição de loja/lojista, SKU/item, grupo ou tag, quantidade, qualidade, moeda, valor mínimo/máximo, origem da aquisição, fase/região e janela de progresso. Impedir a contagem dupla de uma mesma transação ao reabrir a loja. Se uma missão exige comprar o item naquela loja, obtê-lo por drop não satisfaz o objetivo de compra.

### 4.4 Progressão e desbloqueios
Atingir nível 2 ou superior; alcançar experiência, atributo ou reputação; aprender habilidade; adquirir rank/classe; concluir/fracassar missão; desbloquear fase/região/bioma/loja/estação/serviço; possuir carta de classe/raridade; completar coleção; satisfazer uma flag do mundo. Eventos de nível disparam uma vez por cruzamento do limiar, com condição persistente `level >= N` para quem já cumpriu anteriormente.

### 4.5 Combate, duelo, captura e slimes
Derrotar N mobs de tipo/grupo; derrotar inimigo único/chefe; vencer/perder/participar de duelo; concluir batalha em região; sobreviver a ondas; vencer sob condição (sem morrer, com carta ou classe específica); obter drop; capturar slime; chocar ovo; usar carta; montar deck válido; vencer com um deck de determinada categoria. Diferenciar participação, vitória e derrota; nunca contar mortes de mobs fora dos filtros ou duplicadas pelo respawn.

### 4.6 Coleta, extração e crafting
Colher plantas, minerar rochas, obter Booblerock bruto por tipo/encantamento, refinar, processar, criar receita, fabricar N unidades, melhorar equipamento, usar bancada específica, cultivar/cuidar, cozinhar ou preparar elixir. Permitir exigir **origem comprovada** da matéria-prima e verificar consumo real na receita. Coleta e posse são condições diferentes.

### 4.7 Exploração, interação e mundo
Entrar/sair/permanecer em região; descobrir local; aproximar-se de marcador; acionar alavanca; abrir baú; pegar objeto; examinar pista; ativar portal; reparar estrutura; proteger NPC; escoltar personagem; alcançar destino; completar puzzle/minigame; disparar cutscene; mudar clima/hora/estado do mundo; ativar evento de spawn ou invasão.

### 4.8 Tempo, limites e especiais
Executar em prazo; aguardar tempo; completar sem morrer; realizar em ordem definida; restrição de horário; condição de inventário cheio; reputação; escolhas morais; variáveis personalizadas tipadas e eventos registrados por outros módulos. Eventos customizados exigem schema, emissor e validação: não aceitar nomes livres inconsistentes em runtime.

## 5. Gatilhos, condições, objetivos e ações — são coisas distintas

**Gatilhos:** início ao falar, ao entrar na área, ao alcançar nível, ao receber item, ao carregar fase, ao finalizar outra quest, ao comprar item etc.

**Condições:** `level >= 2`, quest anterior concluída, região descoberta, loja desbloqueada, reputação suficiente, inventário contém X, fase atual = Y, flag ativada, horário permitido. Condições podem usar AND, OR, NOT e comparadores (`>=`, `<=`, `=`, `!=`) e operar antes de mostrar oferta, durante etapa ou antes de entregar recompensa.

**Objetivos:** manter progresso próprio (0/10, 3/5, concluído, bloqueado). Possuir 5 ervas é verificação de estado; **coletar 5 novas ervas** é contador de eventos. Comprar é evento transacional; possuir não é sinônimo de comprar. Para quem já possui um item, expor escolha por objetivo: contar posse prévia, exigir obtenção após ativação ou exigir origem específica.

**Ações:** abrir/fechar loja; alterar inventário ou saldo pela API transacional existente; liberar NPC, conversa, receita, região ou fase; spawn/despawn de entidades; iniciar cutscene; mostrar alerta, marcador ou fala; iniciar quest; habilitar crafting; entregar recompensa; mudar estado do mundo. Ações destrutivas ou irreversíveis precisam de checagem/autorização e idempotência.

## 6. Operadores de fluxo

- **SEQUENCIAL:** etapa B só ativa após A.
- **AND / PARALELO:** todos os objetivos precisam ser concluídos, em qualquer ordem.
- **OR / ALTERNATIVO:** basta uma de múltiplas rotas, podendo cancelar as outras.
- **N DE M:** escolher qualquer quantidade mínima de objetivos de um conjunto.
- **IF / ELSE / SWITCH:** ramificar por resposta, reputação, inventário, resultado de duelo, tempo, etc.
- **OPCIONAL:** objetivos extras não bloqueiam conclusão, mas podem alterar recompensa.
- **ESPERA:** aguardar evento ou condição; com timeout opcional.
- **REPETIÇÃO:** executar até meta definida, sem ciclo infinito.
- **SUBQUEST:** acionar quest filha, aguardar resultado e continuar.
- **SUCESSO / FALHA / ABANDONO:** resultados separados, com consequências explícitas.

Condições aninháveis com UI legível (exemplo: `Nível >= 2 E (Quest A concluída OU reputação >= 10)`). Um grafo deve ser validado para detectar conexões soltas, referências quebradas, caminhos inalcançáveis, loops sem limite e ações redundantes.

## 7. Exemplo principal: desbloqueio de loja -> cadeia comercial -> entrega

**Quest: Negócios com o Viajante**

1. O jogador alcança **nível 2**. O evento `player_level_reached(2)` satisfaz o requisito persistente `level >= 2`.
2. Uma regra global, independente de quest, executa `unlock_shop(Viajante_1)`. O NPC/loja fica disponível ao jogador; o estado persiste ao trocar de fase.
3. Um NPC oferece a quest somente quando a loja está desbloqueada. Se não estiver, pode oferecer um diálogo alternativo explicando a condição.
4. Objetivo 1: falar com o Viajante 1.
5. Objetivo 2: **comprar 2 unidades do item A especificamente na loja Viajante 1**. Apenas compras confirmadas após a ativação contam.
6. Objetivo 3: **vender 1 minério Booblerock bruto ao Viajante 1**. Não confundir venda com consumo ou entrega.
7. Objetivo 4: **trocar 3 ervas pelo item B com o mesmo comerciante**. Verificar a transferência efetiva dos dois lados.
8. Objetivo 5: falar com o Alquimista, desbloqueando uma receita.
9. Objetivo 6: usar o item B e outro componente na bancada certa para fabricar o elixir.
10. Objetivo 7: **entregar o elixir ao Alquimista**; remover exatamente uma unidade apenas na confirmação da entrega.
11. Concluir a quest; conceder recompensa uma única vez; liberar nova fala, nova oferta comercial ou sequência de quests.

**Variante ramificada:** se reputação com o Viajante >= 10, pode trocar diretamente pelo item B; caso contrário, deve comprar A e vender Booblerock antes. As duas rotas convergem na fabricação. A UI deve representar esse fluxo de forma clara, sem duplicar toda a quest.

## 8. Outros modelos prontos essenciais

**Caçada por encomenda:** falar com NPC -> aceitar -> derrotar 10 mobs da espécie X na região Y -> voltar -> diálogo de entrega -> recompensa. Mortes anteriores à ativação não contam; kills fora de Y não contam.

**Busca e entrega:** conversar -> coletar 5 ervas + 3 Booblerocks em paralelo -> falar com segundo NPC -> voltar -> entregar itens -> concluir. A entrega consome os itens exigidos conforme a configuração.

**Comércio em cadeia:** alcançar nível -> liberar comerciante -> abrir loja -> comprar item específico -> visitar outro lojista -> vender item -> trocar moeda ou materiais -> entregar recompensa a NPC.

**Crafting complexo:** extrair minério bruto -> refinar 10 unidades -> combinar com 5 ervas -> criar 2 poções -> usar 1 em mecanismo -> entregar a outra a NPC.

**Exploração e narrativa:** ler carta (não basta pegá-la) -> descobrir região -> interagir com baú -> escolher resposta -> ramo de ajuda OU confronto -> novos estados da fase.

**Duelos/cartas:** conversar -> montar deck com classe específica -> vencer 3 duelos válidos -> obter carta de raridade configurada -> entregar/mostrar carta -> nova quest.

**Quest de defesa:** entrar na área -> ativar invasão -> proteger NPC por 120 segundos -> se sobreviver, recompensa; se NPC morrer, falhar e executar consequência configurada.

**Quest longa entre fases:** começar com NPC em cidade A -> concluir coleta na floresta B -> comprar componente na loja C -> usar bancada em reino D -> retornar à cidade A para entrega. O progresso não reseta na mudança de mapa.

## 9. Parâmetros comuns a qualquer objetivo

Cada objetivo deve permitir: `id`, tipo, descrição ao jogador, instrução para o editor, referência ao objeto alvo, filtros de item/NPC/loja/inimigo/região, quantidade alvo, progresso atual, modo de contagem (estado/eventos), momento inicial de contagem, condições de ativação, timeout opcional, política de falha, visibilidade, marcadores no HUD/mapa, ações ao iniciar/concluir/falhar, recompensa eventual e política de persistência.

Filtros devem selecionar **ID específico OU categoria/tag**, conforme o caso. Suportar locais múltiplos, exclusão de certos alvos, itens de variantes aleatórias e operadores de qualidade/raridade. Contadores de grande volume devem usar tipo numérico adequado, limites explícitos e apresentação abreviada na interface, sem overflow.

## 10. Integrações obrigatórias com sistemas existentes

- **NPC/Action NPC:** vincular instâncias, comportamento condicionado, falas e ações; não duplicar a IA do NPC.
- **Diálogos:** condições de linha, opções por estado, início/retomada de quest, entrega e encerramento.
- **Inventário/mochila:** escutar transações de aquisição, consumo, entrega, leitura e equipamentos; checar quantidade; não subtrair diretamente fora da API oficial.
- **Galeria de interativos:** vincular assets/itens, livros, cartas, cofres, baús e objetos a objetivos.
- **Lojas/economia:** eventos de abertura, desbloqueio, compra, venda e troca com contexto de comerciante, loja, itens, preços, moedas e recibo/ID da operação.
- **Combate/duelo/cartas:** resultado validado, identidade dos mobs, região, tipo de batalha, deck/carta e recompensa de drop.
- **Coleta e crafting:** origem, tipo/qualidade, estação, receita e commit da criação.
- **Marcadores/spawn/regiões:** eventos por colisão, proximidade, interação, derrota, entrada/saída de área, spawn/despawn.
- **Progressão e save:** nível, reputação, regiões, lojas, quests e flags por perfil de jogador.
- **Interface:** rastreador de quests, objetivos, setas/marcadores opcionais, pop-ups de notificação, livro de missões e debug.

## 11. Modelo de estados e persistência

Quest: `locked -> available -> active -> completed | failed | abandoned`, com políticas explícitas para repetíveis, reaceite e reset. Objetivo: `inactive -> active -> completed | failed | skipped`. Conservar timestamps, escolhas, contadores, referências, ações executadas e histórico de eventos mínimo suficiente para auditoria. Nenhum objetivo deve completar enquanto estiver inativo, salvo opção explícita de **progresso retroativo**.

Separar **definição da quest** do **estado do jogador**. Uma quest definida uma vez pode existir em muitos saves sem compartilhar progresso entre jogadores. Ao salvar/recarregar ou mudar de fase, não disparar novamente recompensas nem perder objetivos. Alterações editoriais precisam de estratégia de migração de versão.

## 12. Regras de confiabilidade

1. **Idempotência:** mesmo evento recebido duas vezes não pode contar transação duas vezes nem premiar em duplicidade.
2. **Fonte de verdade:** compras, vendas e trocas contam somente após confirmação pelo sistema comercial; derrotas apenas após confirmação do motor de combate.
3. **Eventos com contexto:** cada evento deve ter ID único, tipo, jogador, data/hora, fase/região, emissor, entidade, alvo, quantidade, metadados validados e ID de transação, quando aplicável.
4. **Consistência:** entregar 5 itens consome 5 exatamente uma vez; se a operação falhar, quest e inventário permanecem inalterados.
5. **Multijogador/futuro online:** não confiar apenas em evento de interface do cliente para recompensas ou moedas; preparar validação pela camada autoritativa disponível.
6. **Referências:** se NPC, item, loja ou região for excluído, exibir erro de validação e permitir religar referência.
7. **Desempenho:** roteamento de evento para objetivos relevantes, evitando avaliar todas as quests a cada frame. Mudanças no nível/inventário disparam verificação pontual.
8. **Escopo:** flags globais, de jogador, de fase e temporárias não devem se confundir.

## 13. Ferramentas de autoria e testes

- Templates: falar/caçar/voltar; buscar/entregar; comprar/vender/trocar; coletar/refinar/criar; exploração/puzzle; defesa; roteiro ramificado.
- Editor de expressões sem código: construtor `TODAS / ALGUMA / NENHUMA` + comparação de atributos e seleção de referência.
- Simulador: executar a quest sem alterar saves reais; botão “simular evento” para nível, item, vitória, compra, venda, troca, fala, crafting, etc.
- Debug: mostrar evento recebido, nó afetado, por que condição passou/falhou, progresso, transição e ações disparadas.
- Validador: tipos incompatíveis; loja ausente; item não negociável; NPC sem vínculo; contador impossível; ciclo sem saída; evento não observado; entrega de item nunca obtido; falhas sem saída; conflitos entre paralelismo e consumo.
- Fluxo de trabalho: pré-visualização de journal/HUD e permissões para ocultar objetivos secretos até ativação.

## 14. Critérios de aceitação — cenários que devem funcionar

**A. Desbloqueio fora de quest:** alcançar nível 2 abre Viajante 1, persiste ao mudar fase e não abre novamente na recarga.

**B. Compra específica:** possuir o item A por drop não conclui “compre A na loja Viajante 1”; compra confirmada na loja indicada conclui. Uma compra com quantidade 3 soma 3, se permitido.

**C. Venda e troca:** vender Booblerock contabiliza venda e não entrega; trocar 3 ervas por B exige confirmação bilateral e resulta no inventário correto.

**D. Cadeia composta:** falar -> comprar -> vender -> trocar -> falar com outro NPC -> fabricar -> entregar -> concluir. Não permitir pular etapas.

**E. Paralelismo:** coletar ervas e derrotar mobs em qualquer ordem; só libera próxima etapa quando os dois requisitos estiverem cumpridos.

**F. Ramificação:** resposta A libera rota comercial; resposta B libera rota de combate; ambas convergem; recompensas de rotas excluídas não disparam.

**G. Progressão entre fases:** aceitar em A, cumprir em B, finalizar em C e retomar o save sem perda de progresso.

**H. Recompensa única:** repetir evento, reabrir loja ou recarregar save não multiplica recompensas nem contadores.

**I. Inventário insuficiente:** entregar 5 quando possui 4 não consome parcialmente; informa pendência sem quebrar quest.

**J. Referência inválida:** excluir loja vinculada sinaliza erro antes da publicação e aponta exatamente o nó quebrado.

## 15. Plano de implementação recomendado ao agente

**Etapa 1 — auditoria:** mapear Quest Marker atual e APIs reais; documentar módulos reaproveitáveis, fluxos existentes e riscos de migração.

**Etapa 2 — motor:** definir contratos tipados de evento/condição/ação, IDs, roteador, estados, persistência e testes automáticos.

**Etapa 3 — adaptadores:** conectar inventário, NPC/diálogo, combate, comércio (inclusive venda e barter), crafting, regiões e progressão.

**Etapa 4 — editor local:** construtor simplificado de etapas + grafo avançado + seletor contextual de elementos da fase.

**Etapa 5 — progressão global:** dependências de quest, desbloqueio de loja/sistemas, transições entre fases e campanhas.

**Etapa 6 — qualidade:** simulação, depuração, validador, templates, migração de saves e testes de regressão.

Não considerar a tarefa concluída apenas porque o grafo pode ser desenhado. Ele precisa **executar eventos reais, persistir progresso e finalizar todas as cadeias exemplificadas**.

## 16. Resultado esperado

Uma ferramenta visual de quests poderosa, porém simples para quem cria fases: seleciono o NPC, adiciono “conversar”; seleciono a loja, adiciono “comprar X”; seleciono outro comerciante, adiciono “vender Y”; escolho uma troca; seleciono bancada e receita; adiciono entrega; conecto sequencialmente ou ramifico conforme necessário. Configuro condições de início e desbloqueios como “atingir nível 2 abre loja”, mesmo quando não fazem parte de uma quest. O Quest Engine cuida da execução, rastreamento, persistência, eventos e consequências sem exigir programação manual.

**Ordem final ao agente:** investigar o sistema existente, refatorar ou recriar somente o necessário, preservar o projeto e implementar a especificação acima com integração real, editor visual acessível, testes e validação funcional ponta a ponta.


---

## 17. ADENDO OBRIGATÓRIO — editor de quests independente e espelhamento na fase

**Decisão arquitetural:** o Editor de Quests é uma ferramenta independente, acessível fora do Editor de Fases, com biblioteca e gestão próprias. Dentro do Editor de Fases, em **Modo Fase**, deve existir um painel espelhado desse mesmo editor: mesma fonte de dados, mesmos IDs, mesmas regras e mesmos recursos, sem duplicar quests.

- **Editor de Quests isolado:** criar, duplicar, organizar por campanhas/capítulos/fases, importar/exportar, pesquisar, versionar, testar e conectar quests globais; editar condições, grafo, objetivos, recompensas e pré-requisitos mesmo sem fase aberta.
- **Espelhamento no Editor de Fases:** listar quests aplicáveis à fase, selecionar marcadores reais do mapa e vincular NPCs, lojas, regiões, pontos de coleta, objetos interativos e inimigos com seletor visual; destacar vínculos ausentes ou fora da fase.
- **Sincronização bidirecional:** alterações feitas em qualquer uma das duas interfaces atualizam a mesma definição da quest imediatamente; evitar cópias divergentes e edição concorrente silenciosa.
- **Responsabilidades:** o Quest Marker no mapa é gatilho/referência espacial opcional, não o banco de dados da missão; quests globais podem não ter marcador; o Editor de Progressão Global continua responsável pelas dependências entre quests, regiões, fases e capítulos.
- **Usabilidade:** modo simples em lista de etapas e modo avançado de nós ramificados, com criação por botão '+', arrastar/conectar, templates, validação de referências e simulador integrado.

## 18. ADENDO OBRIGATÓRIO — sistema de crescimento e níveis no Editor de Jogadores

Adicionar na aba **Editor de Jogadores / Personagens** a seção **Crescimento e Progressão**, integrada ao Quest Engine mas independente dele. Cada arquétipo/personagem configurável deverá ter:

- Nível inicial, nível máximo (por personagem ou perfil) e opção de herdar tabela global.
- XP atual, XP acumulado e XP requerido para próximo nível; persistência por jogador/personagem; nunca calcular apenas a partir do nível exibido.
- Curva de XP selecionável: **manual por nível**, progressão linear, percentual/geométrica, polinomial ou expressão configurável validada. O administrador poderá sobrescrever qualquer nível específico.
- Definição clara de XP **incremental** (quanto custa ir do nível atual ao seguinte) versus **acumulado** (total desde o início); exibir ambos na interface e no depurador.
- Percentuais de crescimento por atributo (ex.: HP, defesa, ataque, velocidade, energia, atributos mágicos) definidos individualmente por nível ou como curva; suportar bônus fixo e percentual, arredondamento previsível e teto configurável. Nunca presumir que XP e crescimento de atributo são a mesma coisa.
- Gatilhos do evento `player.level_reached` e `player.level_up` emitidos pela evolução real; objetivos podem exigir `level >= N` mesmo se a condição já foi alcançada antes da ativação da quest.
- Edição de recompensas por nível: pontos, habilidades, permissões, novas interações e desbloqueios, usando o mesmo registro de ações/eventos.
- Barra de XP e preview dos próximos níveis; painel com estatísticas antes/depois; exportação/importação de curvas e presets.

### 18.1 Exemplo de curva manual — valores de XP por transição

**Interpretação obrigatória:** "nível 1: 100 XP, nível 2: 300 XP, nível 3: 500 XP" significa, neste exemplo, XP necessário **para passar daquele nível ao seguinte**. Portanto, a transição 1→2 custa 100, 2→3 custa 300 e 3→4 custa 500. O sistema deve permitir escolher outra convenção ao importar tabelas.

| Nível atual | XP para próximo nível | XP acumulado para entrar no próximo nível |
|---|---:|---:|
| 1 | 100 | 100 |
| 2 | 300 | 400 |
| 3 | 500 | 900 |
| 4 | 700 | 1600 |
| 5 | 900 | 2500 |

Exemplo de fórmula opcional para essa progressão: `xp_next(level) = 100 + (level - 1) * 200`. Esta fórmula é **exemplo editável**, não regra fixa do jogo. Ao alcançar o nível máximo, o sistema deve bloquear level-up adicional e aplicar política explícita sobre XP excedente (descartar, reter ou converter), sem loops.

### 18.2 Exemplo de crescimento percentual de atributos

Com HP base 100 e taxa de +5% por nível, usando composição sobre o valor anterior: HP no nível 2 = 105; HP no nível 3 = 110,25 antes do arredondamento. O editor deve oferecer composição sobre nível anterior ou crescimento sobre valor-base, indicar qual foi escolhido e estabelecer regra de arredondamento. Permitir progressão diferente por atributo, por classe/personagem e exceções por nível.

### 18.3 Integração entre recompensas, XP e quests

A ação `grant_xp(amount, target)` deve passar sempre pelo serviço central de XP; um ganho grande poderá subir vários níveis de uma vez, emitindo corretamente cada evento de nível alcançado. Recompensas e combate usam o mesmo serviço. Evitar ganho duplo por replay de evento, conclusão repetida ou reload de save. Suportar XP do jogador e, se a engine já prevê, XP individual de slimes/personagens aliados como alvos distintos.

## 19. ADENDO OBRIGATÓRIO — aba Recompensas / Ganhos no Editor de Quests

Cada quest e, opcionalmente, cada etapa ou ramificação deverá possuir um painel dedicado **Recompensas / Ganhos**. Recompensas serão uma coleção de ações configuráveis e combináveis, não apenas um número de XP.

**Tipos obrigatórios de recompensa:**

1. XP: quantidade fixa, variável por fórmula validada ou proporcional a nível/dificuldade; alvo jogador/personagem/slime quando suportado.
2. Moedas e economia: moeda específica, valor, créditos/tokens existentes e ajuste seguro de saldo.
3. Itens de inventário: escolher ID da base de itens, quantidade, qualidade/raridade/variante, destino (bolsa/caixa postal/depósito quando suportado), política para mochila cheia.
4. Cartas: escolher carta específica, classe/raridade ou sorteio a partir de pool configurável, com quantidade e regra explícita de aleatoriedade.
5. Áreas e conteúdos: liberar região, fase, portal, dungeon, loja, NPC, receita, habilidade, serviço, missão ou capítulo.
6. Mudanças de mundo: ativar/desativar marcadores, alterar NPC/loja, desbloquear interações, iniciar diálogo/cutscene, criar spawn e alterar flags persistentes.
7. Reputação, afinidade, conquistas e outros atributos, apenas quando os respectivos sistemas existirem na engine; caso contrário, sinalizar módulo ainda não implementado.

**Configurações por recompensa:** momento de concessão (fim da etapa, fim da quest, escolha da rota ou primeira conclusão), condição AND/OR, obrigatória/opcional, visualização ao jogador (oculta, antecipada, revelada), quantidade, probabilidade quando aleatória, elegibilidade por personagem e política de repetição. Recompensas alternativas por escolha e bônus por objetivos opcionais.

**Entrega robusta:** uma conclusão deve produzir um `reward_bundle` atômico/idempotente com `questId`, `completionId`, `playerId` e lista de operações. Validar referências antes de executar, registrar o resultado e impedir concessão em duplicidade. Em sistemas sem transação única entre módulos, usar outbox/registro de operações e recuperação após falha. Se inventário estiver cheio, colocar pendente para resgate ou acionar a política configurada: nunca perder item silenciosamente.

**Painel de visualização:** linha-resumo '250 XP + 100 moedas + 1 Carta Rara + acesso à Mina' e opção de expandir para configurar cada prêmio. Exibir no simulador exatamente quando cada ganho dispara.

## 20. Fluxos combinados que o agente deve implementar e testar

**Cenário 1 — liberação comercial por nível:** jogador atinge nível 2 → evento global libera Loja do Viajante 1 → quest pede comprar Item A nessa loja → vender Item B para Comerciante C → trocar Item A por Chave D com NPC E → entregar Chave D ao NPC F → concluir → conceder 300 XP, moeda e acesso a uma região. A loja pode ser liberada antes da quest; objetivos comerciais só contam ações no momento configurado.

**Cenário 2 — criação e entrega:** falar com alquimista → coletar 10 ervas e minerar 3 Booblerocks em paralelo → refinar minério em bancada → fabricar poção pela receita correta → voltar ao alquimista → entregar a poção (consumo transacional do item) → receber 500 XP, carta e nova receita.

**Cenário 3 — caça escalonada:** falar com guarda → derrotar 8 mobs da espécie X na região Y → vencer duelo contra NPC Z → voltar ao guarda → receber recompensa fixa e bônus opcional por não morrer. Mortes fora de região não contam se o filtro estiver ativo.

**Cenário 4 — múltiplos níveis:** missão concede 1.000 XP, jogador passa do nível 1 ao 3 (pela curva exemplificada), mantém 600 XP de progresso no nível 3 se partir de zero: 100 + 300 gastos, 600 restantes; nenhum evento de level-up pode ser omitido ou duplicado. Se a política de XP for diferente, refletir no teste.

**Cenário 5 — ramificação e premiação:** NPC oferece ajudar comerciante OU enfrentar bandidos. Cada rota possui eventos, objetivos e prêmios exclusivos. Conclusão compartilhada concede XP básico uma vez, sem conceder itens da rota não escolhida.

**Cenário 6 — edição espelhada:** criar quest no editor isolado, vinculá-la na fase, editar recompensa pelo painel de fase, voltar ao editor isolado e conferir a mesma configuração persistida; mudanças em NPC ou loja excluídos geram alerta de referência quebrada.

## 21. Critérios adicionais de aceite e ordem de execução

- Evolução manual, linear e percentual gera tabelas previsíveis, com nível máximo respeitado.
- XP concedido por quests, combate e eventos converge num único serviço, com multiplicadores/limites explícitos.
- O Editor de Quests é utilizável independentemente de fase aberta e sua visualização no Modo Fase não cria cópias.
- Recompensas podem combinar XP, moeda, item, carta e desbloqueio em uma mesma conclusão.
- Quests comerciais exigem loja/NPC/objeto corretos e verificam momento do evento e pré-requisitos.
- Eventos de level-up, unlock e reward não são executados duas vezes após reload, retry ou eventos duplicados.
- O editor deve validar ciclos ilegais, IDs apagados, pools vazios, níveis inalcançáveis e recompensas inválidas antes de publicar.
- Saves antigos continuam carregando ou passam por migração documentada; não apagar dados atuais.

**Ordem ao agente:** auditar a implementação existente; conservar módulos estáveis; primeiro extrair Quest Engine, Event Bus, serviços de XP e recompensas; depois criar Editor de Quests isolado, espelhamento no Editor de Fases e aba Crescimento no Editor de Jogadores; por fim simular e testar todos os cenários de ponta a ponta. **A entrega só está completa quando a lógica funciona no jogo real, não apenas em protótipos ou mockups de interface.**
