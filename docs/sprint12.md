Leia tambem o roadmap-loansystem.md para melhor entendimento e contexto.

Ideias de Melhorias Front‑End para a Sprint 12 (Refatoração & UI‑UX Mobile‑First)
Objetivo: transformar o LoanSystem em um aplicativo premium, rápido e intuitivo, alinhado ao roadmap (mobile‑first, experiência premium similar a Nubank/Inter).

1️⃣ Integração de Contas Pagas nas Movimentações Financeiras
O que ?	Como ?	Benefício UX
Registro automático de uma movimentação ao marcar a conta como paga.	- Extender o hook useContas para, após pagarConta, disparar CaixaPessoalRequests.criarMovimentacao (tipo saida).
- Atualizar o feed da Central de Movimentações em tempo real (WebSocket ou polling curto).	Usuário vê imediatamente o impacto no saldo, reforçando confiança e clareza.
Visual “Paid” nos cards de conta.	- Acrescentar um selo/ícone CheckCircle com animação de fade‑in ao lado da descrição.
- Mostrar o valor movimentado em verde e a data de pagamento.	Feedback visual instantâneo; evita dúvidas sobre status.
Filtro “Movimentos de Contas Pagas” no Calendário e Resumo de Caixa.	- Nova query param ?tipo=conta-paga.
- Botão de filtro rápido (chip) no cabeçalho do calendário.	Permite ao usuário analisar rapidamente como o pagamento de contas afeta o fluxo de caixa.
2️⃣ Opção de Upload de Foto de Perfil
O que ?	Como ?	Benefício UX
Avatar clicável no canto superior direito da barra de navegação (ou na página Perfil).	- Utilizar o componente Avatar do PrimeReact/Material‑UI com onClick → abre modal de upload.
- Modal com Dropzone (arrastar / soltar) + botão “Escolher arquivo”.
- Validar tamanho (< 2 MB) e formatos (JPG/PNG).
- Enviar para endpoint PUT /usuarios/:id/avatar.
- Atualizar o token JWT (se usar Gravatar) ou retornar URL da imagem e armazenar no localStorage.	Personaliza a experiência; aumenta engajamento e sensação de identidade.
Preview instantâneo antes de salvar.	- Renderizar a foto selecionada dentro do modal usando URL.createObjectURL.
- Botões “Confirmar”/“Cancelar” com animações suaves.	Reduz erros (foto errada) e garante controle ao usuário.
Fallback elegante: avatar padrão com as iniciais do nome quando não houver foto.	- Componentes reutilizáveis para gerar iniciais dinamicamente.	Mantém consistência visual.
3️⃣ Atualização do Perfil do Usuário (remover ID)
O que ?	Como ?	Benefício UX
Ocultar/Eliminar campo id_usuario da UI de perfil.	- Remover a linha do JSX que exibe ID.
- Atualizar o DTO UsuarioDTO (frontend) para não expor id.
- Certificar‑se de que o backend ainda usa o ID extraído do JWT, mas nunca enviá‑lo ao cliente.	Evita informação desnecessária/confusa.
Reorganizar campos: nome, email, telefone, foto, preferências (tema, notificações).	- Usar um formulário de perfil em cards com rótulos claros e espaçamento generoso.
- Aplicar micro‑animações nos focus/blur (border‑highlight, sombra).	Layout limpo, fácil de escanear, reforça o conceito “premium”.
Ações rápidas: “Alterar senha”, “Configurar 2FA”, “Logout”.	- Botões de ícone ao lado de cada ação, alinhados à direita.
- Tooltip pequeno ao passar o mouse/tocar.	Facilita a administração da conta com poucos cliques.
4️⃣ Aprimoramentos de UX/UI Gerais (Sprint 12)
Ideia	Implementação	Impacto
Micro‑animações em botões de ação (pagar conta, salvar foto) – scale‑95 ao toque, bounce no sucesso.	Utilizar framer‑motion ou CSS @keyframes.	Torna a interação mais fluida e “viva”.
Dark Mode aprimorado: cores de contraste otimizadas, ícones invertidos quando necessário.	Variáveis CSS (--bg, --fg, --accent) definidas em :root[data-theme="dark"].	Usuário pode usar o app em ambientes com pouca luz.
Skeleton Loading nos cards de contas, movimentações e perfil enquanto os dados chegam.	Componentes Skeleton do UI library (ex.: PrimeReact) com animação de pulso.	Diminui a percepção de latência.
Swipe Actions nas listas de contas e empréstimos (mobile).	- Swipe‑right → marcar como paga/recebida.
- Swipe‑left → arquivar ou deletar.
- Feedback visual (barra de cor, ícone).	Reduz número de cliques; experiência similar a apps bancários.
Acessibilidade: contraste ≥ 4.5:1, labels ARIA nos ícones, navegação por teclado/touch‑screen.	Auditar com Lighthouse, aplicar correções de cor e atributos.	Torna o app inclusivo e melhora o SEO.
Cache inteligente usando React Query ou SWR para pré‑carregar dados do perfil, contas e movimentos.	Configurar staleTime curto para dados que mudam frequentemente (saldo) e longo para dados estáticos (perfil).	Respostas quase instantâneas, menos chamadas ao back‑end.
Feedback visual ao criar/editar foto de perfil: toast “Foto atualizada com sucesso” com ícone ThumbsUp.	Reusar o hook useToast.	Confirmação clara e agradável.
5️⃣ Checklist rápido (para a equipe)
 Hook useContas → emitir movimentação ao pagar conta.
 Endpoint PUT /usuarios/:id/avatar → salvar imagem, atualizar URL.
 Componente ProfileAvatar reutilizável (avatar + upload modal).
 Remover id_usuario dos DTOs/Views de perfil.
 Adicionar skeletons nos principais cards.
 Implementar swipe nas listas de contas e empréstimos.
 Ajustar estilos para dark mode e micro‑animações.
 Testes de acessibilidade (Lighthouse, axe).
Próximos passos sugeridos
Prototipar a tela de foto de perfil (usando Figma ou código rápido) e validar com testes de usabilidade.
Criar a API de upload e garantir que o JWT seja usado para identificar o usuário (sem expor o ID).
Atualizar hooks e componentes de contas para registrar a movimentação automaticamente.
Revisar todos os componentes de lista para incluir swipe actions e animações.
Realizar um sprint demo focado nas novas interações visuais (avatar, toast, swipe) e coletar feedback.
Essas ideias mantêm a direção do roadmap (mobile‑first, premium) e entregam funcionalidades de alto valor percebido para o usuário final. 🚀