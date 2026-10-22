# Planejamento de Arquitetura: Áudio, Cinemáticas e Sub-Eventos

Este documento detalha as especificações e o plano de implementação dos novos sistemas de áudio por bioma, som por área com blending, cinemáticas de câmera com zoom e retorno, e ativação por sub-eventos e marcadores de área.

---

## 1. 🎵 Áudio por Bioma (BGM Contínuo e Sem Cortes)

### Objetivo
Permitir que cada bioma tenha sua própria trilha sonora ou som ambiente de fundo (BGM), garantindo que no mapa vertical o som não se reinicie quando o jogador cruzar entre fatias do mesmo bioma.

### Estrutura de Dados
- **`BiomeTileConfig`**:
  - `bgmAudioUrl?: string` (Base64 ou URL do arquivo de áudio).
  - `bgmVolume?: number` (0.0 a 1.0, padrão 0.7).
- **`SubBiomeConfig`** (Fases Extended):
  - `bgmAudioUrl?: string`
  - `bgmVolume?: number`

### Regras de Execução no Emulador
1. **Vertical (Anti-Corte)**:
   - Ao se movimentar, o emulador detecta o bioma atual da posição `Y` do jogador.
   - O emulador armazena `activeBiomeAudioUrl`.
   - Se a fatia atual pertence ao **mesmo bioma** ou possui o **mesmo `bgmAudioUrl`**, a reprodução continua fluida, sem interrupção nem reinício do áudio.
   - Quando cruzar para um bioma com áudio diferente: **cross-fade suave** (fade-out de 1.5s do áudio atual e fade-in de 1.5s do novo).
2. **Extended (Sub-Biomas)**:
   - Ao carregar ou entrar numa fase do Extended, toca diretamente a faixa configurada para aquela fase.

---

## 2. 🔊 Evento de Som por Área (Zonas Acústicas com Blending)

### Objetivo
Criar zonas de som espacial que tocam quando o jogador se aproxima de elementos específicos no cenário (ex: cachoeira perto de rio, fogueira em acampamento, vento no topo de montanha).

### Parâmetros do Evento
- **Forma da Área**:
  - `circle`: raio em pixels (`audioRadius`).
  - `rect`: largura e altura (`audioWidth`, `audioHeight`).
- **Blending de Volume por Distância**:
  - Volume dinâmico calculado com base na distância entre o jogador e o centro da zona:
    - Fora do raio/área: volume 0%.
    - Na borda de transição: fade-in suave.
    - No interior / centro: volume 100% (definido por `maxVolume`).
- **Modos de Reprodução**:
  - `mix` (Complementar): Toca junto com o som de fundo do bioma.
  - `solo` (Destaque): Atenua ou pausa o BGM do bioma enquanto o jogador estiver dentro da área, dando foco total ao som local.

---

## 3. 🎬 Cinemática de Câmera (Pan, Zoom e Retorno ao Player)

### Objetivo
Permitir que eventos (pisar num gatilho, falar com um NPC, derrotar um inimigo) movimentem a câmera temporariamente para focar um ponto de interesse e depois retornem suavemente para o jogador.

### Parâmetros da Cinemática
- **Alvo da Câmera (`cameraTarget`)**:
  - `marker`: ID de um marcador existente no mapa (ex: o Boss, a Torre, o Baú).
  - `coordinate`: Coordenadas manuais `(targetX, targetY)`.
- **Zoom Cinemático (`targetZoom`)**:
  - Ex: `1.5x` (aproximação para detalhe), `2.0x` (close dramático), `0.75x` (visão panorâmica ampla).
- **Tempo de Transição de Ida (`panInDuration`)**:
  - Duração em segundos do deslocamento da câmera até o alvo (curva `ease-in-out`, ex: 1.2s).
- **Tempo de Espera no Alvo (`holdDuration`)**:
  - Duração em segundos que a câmera fica travada no foco mostrando o evento (ex: 3.0s).
- **Tempo de Retorno (`panOutDuration`)**:
  - Duração do retorno suave da câmera para o herói (ex: 1.0s).
- **Trava de Controle (`freezePlayer`)**:
  - Se ativado, o joystick/teclado é pausado durante a cinemática para evitar que o jogador ande às cegas.

---

## 4. ⚡ Marcador de Área & Sistema de Sub-Eventos (Encadeamento)

### A. Marcador tipo `area` (Zona de Detecção Visual)
- **Tipo de Marcador**: `type: 'area'`.
- **Visualização no Canvas**: Retângulo ou círculo tracejado semi-transparente, redimensionável e arrastável.
- **Função**: Serve como disparador de presença física. Quando o herói entra na área, o marcador ativa os eventos vinculados ou despacha pulso para a cadeia de sub-eventos.

### B. Sub-Eventos Encadeados (Hierarquia Pai-Filho)
Dois estados de ativação:
1. **Automático pós-evento Pai (`parentEventId` + `delaySeconds`)**:
   - O evento pai é acionado (ex: Início de Tempestade).
   - O sub-evento é agendado automaticamente para rodar logo após o pai terminar ou após um atraso (`delaySeconds`).
   - Permite encadear sequências como:
     - *Evento Pai*: Chuva começa (10s)
     - ↳ *Sub-Evento 1*: Trovão toca (+2s)
     - ↳ *Sub-Evento 2*: Câmera foca no Portão do Castelo abrindo (+1s)
     - ↳ *Sub-Evento 3*: Diálogo de alerta com o guarda
2. **Ativação por Marcador de Área (`triggerAreaMarkerId`)**:
   - Um evento (ou grupo de sub-eventos) escuta o sinal de um marcador do tipo `area`. Ao pisar na área, toda a sequência configurada é disparada.

### C. Integração na Galeria de Eventos (`EventGalleryStudio.tsx`)
- Visualização em árvore hierárquica conectada por linhas tracejadas com tags de delay (`+X.Xs`) e tipos de evento.
- Botão "Adicionar Sub-Evento" direto no cartão de qualquer evento pai.
