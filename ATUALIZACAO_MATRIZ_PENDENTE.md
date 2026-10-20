# ⚠️ ATUALIZAÇÃO DA MATRIZ DE CARTAS PENDENTE (CARD STUDIO V3)

> **Status:** ⏳ **PENDENTE DE INTEGRAÇÃO / PRÓXIMO AGENTE**  
> **Data de Recebimento:** 20/10/2026  
> **Origem dos Arquivos:** `C:\Users\FELIP\Downloads\hestridia-card-frame-studio (3)`  
> **Destino no Repositório:** `updates/hestridia-card-frame-studio-v3/`  
> **Repositório GitHub:** [feepollini/Slimeslands](https://github.com/feepollini/Slimeslands)

---

## 📌 Contexto para o Próximo Agente

O usuário disponibilizou uma nova versão atualizada do **Card Studio (Forja Matriz de Cartas)**. Os arquivos foram adicionados na íntegra à pasta:
```
updates/hestridia-card-frame-studio-v3/
```

Esta pasta contém o código-fonte atualizado, tipos, motor procedural expandido e o documento de especificação oficial:
📁 `updates/hestridia-card-frame-studio-v3/public/assets/aistudio/__WORLDS_OF_SLIMELANDS_23bdef1d.txt`

---

## 🔍 Resumo dos Arquivos e Alterações Detectadas

Abaixo está a comparação entre a versão ativa em `src/card_studio/src/` e a nova versão em `updates/hestridia-card-frame-studio-v3/src/`:

| Arquivo | Status | Novo Tamanho | Tamanho Ativo | Principais Mudanças |
| :--- | :---: | :---: | :---: | :--- |
| `utils/sampleArtworks.ts` | 🆕 **Novo Arquivo** | 1.0 KB | - | Novos presets de arte para slimes e cenários |
| `utils/proceduralEngine.ts` | ⚡ **Expandido** | 71.5 KB | 49.4 KB | Reestruturação completa do motor procedural, novo balanceamento e regras |
| `utils/exportCard.ts` | ⚡ **Expandido** | 14.5 KB | 2.9 KB | Novos formatos e rotinas de exportação de cartas |
| `utils/defaultCards.ts` | ⚡ **Expandido** | 7.5 KB | 2.8 KB | Novos templates e cartas padrão |
| `types/card.ts` | 📝 **Modificado** | 5.5 KB | 4.3 KB | Novos tipos de metadados e atributos da matriz |
| `types/slimelands.ts` | 📝 **Modificado** | 5.0 KB | 4.0 KB | Novas tipagens para classificações e ecossistema |
| `components/CardFrameSVG.tsx` | ⚠️ **Atenção** | 47.7 KB | 49.6 KB | **Ver Regra Crítica 1 abaixo** |
| `components/GalleryProductionDrawer.tsx` | 📝 **Modificado** | 78.7 KB | 94.1 KB | Nova interface da gaveta de produção |
| `components/ProceduralEcosystemModal.tsx` | 📝 **Modificado** | 60.3 KB | 62.9 KB | Ajustes no modal de geração procedural |
| `utils/matrixPersistence.ts` | 📝 **Modificado** | 2.9 KB | 2.7 KB | Esquema de persistência |
| `App.tsx` | 📝 **Modificado** | 69.2 KB | 72.8 KB | Fluxos principais de estado e classificação |

---

## 🚨 REGRAS CRÍTICAS OBRIGATÓRIAS PARA A INTEGRAÇÃO

Ao realizar a mesclagem destes arquivos para o `src/card_studio/`, o próximo agente **DEVE SEGUIR IMPRETERIVELMENTE** os seguintes pontos já estabelecidos e aprovados pelo usuário:

### 1. Manter suporte nativo ao 3D do Booster (`pureSvgText` em `CardFrameSVG.tsx`)
- **Problema resolvido anteriormente:** O Three.js no `BoosterPackViewer` renderiza a textura 3D via canvas `drawImage`. O navegador bloqueia `<foreignObject>` dentro de SVGs carregados em imagens canvas (gerando cartas pretas).
- **Regra:** O `CardFrameSVG.tsx` da versão ativa possui a prop opcional `pureSvgText?: boolean`. Quando `true`, ela renderiza o texto usando `<g>`, `<text>` e `<tspan>` SVG nativos em vez de `<foreignObject>`. Ao atualizar o `CardFrameSVG.tsx`, **essa prop e sua renderização nativa SVG devem ser preservadas**.
- **Atenção:** NUNCA recriar desenhos de cartas via canvas manual 2D. O `CardFrameSVG.tsx` vetorizado oficial é a única fonte da verdade visual.

### 2. Manter a Purga Absoluta da Biblioteca (`handleClearAllCardsAndAssets`)
- O botão `🗑️ Limpar Biblioteca` e a função `handleClearAllCardsAndAssets` em `App.tsx` disparam o evento global:
  ```ts
  window.dispatchEvent(new CustomEvent('matrix_library_cleared'));
  ```
- Este evento limpa em tempo real a aba Booster (`TabPacks.ts`), esvazia `fixedCards` e grupos em `store.json` via `/api/save-store` e remove todas as cartas órfãs para garantir que a purga seja absoluta.
- **Regra:** Garantir que o novo `App.tsx` mantenha essa rotina de limpeza e o disparo do evento.

### 3. Integração com o `boosterResolver.ts`
- O arquivo `src/ui/screens/forge_v2/utils/boosterResolver.ts` utiliza os dados da Matriz salvos no snapshot (`loadGameMatrixSnapshot()`).
- O próximo agente deve validar se as novas propriedades do `types/card.ts` e `types/slimelands.ts` continuam sendo lidas perfeitamente pelo `boosterResolver.ts`.

---

## 🛠️ Checklist Recomendado para o Próximo Agente

1. [ ] Ler a especificação em `updates/hestridia-card-frame-studio-v3/public/assets/aistudio/__WORLDS_OF_SLIMELANDS_23bdef1d.txt`.
2. [ ] Copiar os novos utilitários (`utils/sampleArtworks.ts`, `utils/proceduralEngine.ts`, `utils/exportCard.ts`, `utils/defaultCards.ts`).
3. [ ] Mesclar as novas tipagens em `types/card.ts` e `types/slimelands.ts`.
4. [ ] Atualizar `CardFrameSVG.tsx` portando as melhorias visuais do V3 e preservando `pureSvgText`.
5. [ ] Atualizar `GalleryProductionDrawer.tsx`, `ProceduralEcosystemModal.tsx` e `App.tsx`, preservando a purga absoluta e o disparo de eventos para o Booster.
6. [ ] Validar com `npm run build` / Vite se não há erros de tipagem ou compilação.
7. [ ] Testar a abertura de um booster 3D para certificar-se de que a textura 3D continua nítida e funcional.
