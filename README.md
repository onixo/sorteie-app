# Sorteie — Bull Analytics

Webapp mobile-first para sorteio equilibrado de times de vôlei. Desenvolvido por Richard para uso nos jogos do grupo, direto pelo celular na quadra.

**Produção:** https://sorteie-app.vercel.app

---

## O que faz

O organizador cola a lista do grupo (ex: do WhatsApp), define o gênero e nível de habilidade de cada jogador, configura quantos times e quantos jogadores por time quer, e o app sorteia automaticamente. O resultado pode ser compartilhado de volta no WhatsApp com um toque.

O algoritmo roda 1.000 combinações e escolhe a que deixa os times mais equilibrados — tanto em nível de habilidade quanto na distribuição de gênero.

---

## Funcionalidades

### Importar lista
Cola a lista numerada do WhatsApp diretamente no app. Um botão "Colar" lê a área de transferência do celular automaticamente. O app extrai os nomes, remove números, emojis e símbolos, e apresenta cada jogador para configuração.

### Configurar jogadores
Para cada jogador detectado, o organizador define:
- **Gênero:** Masculino, Feminino ou Outro
- **Nível:** 1 (Iniciante) · 2 (Intermediário) · 3 (Avançado) · 4 (Expert)

Jogadores podem ser removidos da lista antes de confirmar.

### Adicionar individualmente
Botão "+" abre um formulário para adicionar um jogador por vez, com os mesmos campos de gênero e nível.

### Sorteio equilibrado
Configuração de quantos times e quantos jogadores por time. O app mostra quantos jogadores serão titulares e quantos ficarão como reserva. O botão de sortear só ativa quando há jogadores suficientes.

### Resultado
Exibe os times com indicadores de equilíbrio de nível e gênero. Jogadores excedentes aparecem como reservas. Dois botões de ação:
- **WhatsApp** — abre o app com o resultado formatado pronto para enviar
- **Copiar** — copia o texto para a área de transferência

### Limpar lista
Ícone de lixeira no header limpa todos os jogadores de uma vez, com confirmação inline.

---

## Algoritmo de sorteio

O algoritmo roda 1.000 iterações de distribuição aleatória dos jogadores e escolhe a combinação com menor "score de desequilíbrio", calculado assim:

```
score = (variância de nível entre times × 3) + (desequilíbrio de gênero × 5)
```

O peso maior no gênero garante que, quando possível, os times tenham distribuição igualitária de homens e mulheres. O resultado indica se os times ficaram equilibrados em nível (diferença máxima de 3 pts entre times) e em gênero (diferença máxima de 1 jogador por gênero entre times).

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| UI | React 18 + TypeScript |
| Build | Vite 6 |
| Estilo | Tailwind CSS v4 |
| Ícones | Lucide React |
| Persistência | `localStorage` do navegador |
| Hospedagem | Vercel (gratuito) |

Não há backend nem banco de dados. Toda a lógica roda no browser. Os dados ficam salvos no `localStorage` do dispositivo — se limpar o cache ou abrir em outro celular, a lista começa do zero (comportamento intencional para o uso de uma sessão por jogo).

---

## Estrutura do projeto

```
sorteie-frontend/
├── public/
│   └── logo.png                  ← logotipo Bull Analytics
├── src/
│   ├── main.tsx                  ← entry point
│   ├── app/
│   │   ├── App.tsx               ← orquestrador de telas e estado global
│   │   ├── types.ts              ← interfaces TypeScript (Player, Time, ResultadoSorteio)
│   │   ├── services/
│   │   │   ├── api.ts            ← operações de localStorage (getPlayers, createPlayer, etc.)
│   │   │   └── sorteio.ts        ← algoritmo de balanceamento (1000 iterações)
│   │   └── components/
│   │       ├── PlayerList.tsx        ← tela principal com lista de jogadores
│   │       ├── AddPlayerSheet.tsx    ← bottom sheet para adicionar jogador
│   │       ├── ImportPlayersSheet.tsx← bottom sheet para importar lista colada
│   │       ├── SorteioConfig.tsx     ← tela de configuração do sorteio
│   │       ├── TeamResults.tsx       ← tela de resultado com compartilhamento
│   │       ├── HexBackground.tsx     ← fundo hexagonal decorativo
│   │       ├── ImageWithFallback.tsx ← img com fallback de erro
│   │       └── ui/               ← componentes shadcn/ui (accordion, button, etc.)
│   └── styles/
│       ├── index.css             ← importa os demais estilos
│       ├── theme.css             ← tokens de cor Bull Analytics
│       ├── fonts.css             ← DM Sans + DM Mono
│       └── globals.css
├── .gitignore
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Como rodar localmente

```bash
cd sorteie-frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Deploy

O deploy é automático via Vercel. Qualquer `git push` na branch `main` aciona um novo deploy em ~1 minuto.

```bash
git add -A
git commit -m "sua mensagem"
git push
```

---

## Backend (arquivado)

Uma versão anterior do projeto usava Node.js + Express + SQLite (via sql.js) como backend para persistência entre sessões. O código está preservado em `../_backend_archive/` caso seja necessário reativar no futuro (ex: múltiplos organizadores, histórico de sorteios, grupos separados por evento).

Para rodar o backend arquivado:
```bash
cd _backend_archive
npm install
node src/server.js
# → http://localhost:3000
```

---

*Desenvolvido com Claude (Anthropic) — Bull Analytics 2026*
