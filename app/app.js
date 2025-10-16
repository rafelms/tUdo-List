document.addEventListener('DOMContentLoaded', () => {
  // Função para mostrar a tela desejada e esconder as outras
  const navigateTo = (targetScreenId) => {
    const screens = document.querySelectorAll('.screen');

    // Remove a classe 'active' de todas as telas
    screens.forEach(screen => {
      screen.classList.remove('active');
    });

    // Adiciona a classe 'active' à tela alvo
    const targetScreen = document.getElementById(targetScreenId);
    if (targetScreen) {
      targetScreen.classList.add('active');
    }

    // Se navegou para a tela de tarefa, atualiza progresso
    if (targetScreenId === 'tarefa-screen') {
      updateTaskProgress();
    }
  };

  // Função principal para lidar com cliques de navegação
  const handleNavigationClick = (event) => {
    const targetElement = event.target.closest('[data-target]');

    if (targetElement) {
      const targetScreenId = targetElement.getAttribute('data-target');
      navigateTo(targetScreenId);
      updateNavBar(targetScreenId);
    }
  };

  // Função para atualizar o estado da barra de navegação inferior
  const updateNavBar = (activeScreenId) => {
    const navLinks = document.querySelectorAll('.nav-bar a');
    navLinks.forEach(link => {
      link.classList.remove('active-nav');
      if (link.getAttribute('data-target') === activeScreenId) {
        link.classList.add('active-nav');
      }
    });
  };

  // --- progressão da tarefa (com animação suave) ---
  const getTaskCheckboxes = () => {
    return Array.from(document.querySelectorAll('#tarefa-screen ul li input[type="checkbox"]'));
  };

  // variável para controlar a animação em andamento (tarefa)
  let progressAnimFrame = null;

  const animateProgress = (el, textEl, from, to, duration = 400) => {
    if (progressAnimFrame) {
      cancelAnimationFrame(progressAnimFrame);
      progressAnimFrame = null;
    }
    const start = performance.now();
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

    const step = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      const current = Math.round(from + (to - from) * eased);

      el.value = current;
      if (textEl) textEl.textContent = `Progresso de ${current}%`;

      if (t < 1) {
        progressAnimFrame = requestAnimationFrame(step);
      } else {
        progressAnimFrame = null;
        el.value = to;
        if (textEl) textEl.textContent = `Progresso de ${to}%`;
      }
    };

    progressAnimFrame = requestAnimationFrame(step);
  };

  const updateTaskProgress = () => {
    const checkboxes = getTaskCheckboxes();
    const progressEl = document.querySelector('#tarefa-screen .progress-bar-container progress');
    const progressText = document.querySelector('#tarefa-screen .progress-bar-container .progress-text');

    if (!progressEl || !progressText || checkboxes.length === 0) return;

    const checkedCount = checkboxes.filter(cb => cb.checked).length;
    const percent = Math.round((checkedCount / checkboxes.length) * 100);

    const currentVal = Number(progressEl.value) || 0;
    if (currentVal === percent) {
      progressText.textContent = `Progresso de ${percent}%`;
      return;
    }
    animateProgress(progressEl, progressText, currentVal, percent, 450);
  };

  const onCheckboxChange = () => {
    updateTaskProgress();
  };

  const attachCheckboxListeners = () => {
    const checkboxes = getTaskCheckboxes();
    checkboxes.forEach(cb => {
      cb.removeEventListener('change', onCheckboxChange);
      cb.addEventListener('change', onCheckboxChange);
    });
  };
  // --- Fim: progressão da tarefa ---

  // --- Barra de progresso por card (Minhas Tarefas) ---
  // cria/assegura UI de progress bar dentro de cada card a partir do texto .card-progress
  const parsePercentFromText = (node) => {
    if (!node) return 0;
    const txt = (node.textContent || node.innerText || '').trim();
    const m = txt.match(/(\d{1,3})\s*%/);
    return m ? parseInt(m[1], 10) : 0;
  };

  const ensureCardProgressUI = () => {
    const cards = Array.from(document.querySelectorAll('#tarefas-screen .card'));
    cards.forEach(card => {
      const status = card.querySelector('.card-status');
      if (!status) return;
      // se já tiver progress, skip
      if (status.querySelector('progress')) return;

      const percentNode = status.querySelector('.card-progress');
      const percent = parsePercentFromText(percentNode);

      // cria elemento visual de progresso
      const progress = document.createElement('progress');
      progress.max = 100;
      progress.value = 0;
      progress.style.width = '100%';
      progress.style.height = '8px';
      progress.style.borderRadius = '6px';
      progress.style.overflow = 'hidden';
      progress.className = 'card-progress-bar';

      // Inserir antes do alert-icon
      const alertIcon = status.querySelector('.alert-icon');
      if (alertIcon) {
        status.insertBefore(progress, alertIcon);
      } else {
        status.appendChild(progress);
      }

      // anima do 0 ao valor inicial
      animateCardProgress(card, 0, percent, 600);
    });
  };

  // animação por card (mapa de frames por elemento)
  const cardAnimMap = new WeakMap();
  const animateCardProgress = (cardEl, from, to, duration = 400) => {
    const progress = cardEl.querySelector('.card-progress-bar');
    const percentNode = cardEl.querySelector('.card-progress');
    if (!progress || !percentNode) return;

    // cancela animação anterior
    const prev = cardAnimMap.get(cardEl);
    if (prev) cancelAnimationFrame(prev.frameId);

    const start = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3);

    const step = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const cur = Math.round(from + (to - from) * ease(t));
      progress.value = cur;
      percentNode.textContent = `${cur}% concluído`;

      if (t < 1) {
        const frameId = requestAnimationFrame(step);
        cardAnimMap.set(cardEl, { frameId });
      } else {
        progress.value = to;
        percentNode.textContent = `${to}% concluído`;
        cardAnimMap.delete(cardEl);
      }
    };

    const frameId = requestAnimationFrame(step);
    cardAnimMap.set(cardEl, { frameId });
  };

  const updateCardFromPercent = (cardEl, percent) => {
    const percentNode = cardEl.querySelector('.card-progress');
    if (percentNode) percentNode.textContent = `${percent}% concluído`;
    const progress = cardEl.querySelector('.card-progress-bar');
    const current = Number(progress?.value) || 0;
    if (current === percent) return;
    animateCardProgress(cardEl, current, percent, 500);
  };
  // --- Fim: barra por card ---

  // Estado: card atualmente aberto (elemento DOM)
  let currentCard = null;

  // Adiciona o listener de clique ao contêiner principal para delegação
  const appContainer = document.querySelector('.app-conteiner');
  if (appContainer) appContainer.addEventListener('click', handleNavigationClick);

  // Adiciona um listener de clique a todos os cards em Minhas Tarefas
  document.querySelectorAll('#tarefas-screen .card').forEach(card => {
    card.addEventListener('click', () => {
      // define card atual
      currentCard = card;

      // prepara barra por card caso ainda não exista
      ensureCardProgressUI();

      // sincroniza a tela de tarefa com o percent do card
      const percentNode = card.querySelector('.card-progress');
      const percent = parsePercentFromText(percentNode);

      // atualiza checkboxes de tarefa para refletir percent (aproximação)
      const checkboxes = getTaskCheckboxes();
      if (checkboxes.length) {
        const toChecked = Math.round((percent / 100) * checkboxes.length);
        checkboxes.forEach((cb, idx) => cb.checked = idx < toChecked);
      }

      // atualiza progresso da tela de tarefa imediatamente (sem animação conflictiva)
      const progressEl = document.querySelector('#tarefa-screen .progress-bar-container progress');
      const progressText = document.querySelector('#tarefa-screen .progress-bar-container .progress-text');
      if (progressEl && progressText) {
        progressEl.value = percent;
        progressText.textContent = `Progresso de ${percent}%`;
      }

      // conecta listeners e abre a tela
      attachCheckboxListeners();
      navigateTo('tarefa-screen');
      updateNavBar('tarefas-screen');
    });
  });

  // Configuração inicial: barras nos cards e listeners nas checkboxes
  ensureCardProgressUI();
  attachCheckboxListeners();
  updateTaskProgress();

  // Adiciona comportamento ao botão "Concluir" na tela de tarefa:
  const completeBtn = document.querySelector('#tarefa-screen .complete-btn');
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      // calcula percent atual da tarefa
      const progressEl = document.querySelector('#tarefa-screen .progress-bar-container progress');
      const percent = Math.round(Number(progressEl?.value) || 0);

      // se houver um card atual, atualiza o card com o novo percent e anima sua barra
      if (currentCard) {
        updateCardFromPercent(currentCard, percent);
      }

      // volta para "Minhas Tarefas" e atualiza a nav bar
      navigateTo('tarefas-screen');
      updateNavBar('tarefas-screen');
    });
  }

  // Inicia a aplicação na tela de Login (por padrão)
  // A tela 'login-screen' já é definida como ativa no CSS/HTML para o início.
});