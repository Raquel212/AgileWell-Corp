const API_KEY = "";

async function callGemini(prompt) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );
    if (!response.ok) throw new Error("API falhou");
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error("Erro Gemini:", error);
    return null;
  }
}

const USERS = [
  {
    email: "gestor@agilewell.com",
    password: "123456",
    name: "Ana Gestora",
    role: "manager",
  },
  {
    email: "dev@agilewell.com",
    password: "123456",
    name: "Carlos Dev",
    role: "dev",
  },
];

const MOCK_TEAMS_DATA = {
  "Squad Alpha": {
    riskLevel: "high",
    factors: {
      "Cansaço Mental": 4.5,
      Estresse: 4.2,
      "Pressão Psicológica": 4.0,
      Produtividade: 2.1,
      "Conforto com Prazos": 1.8,
      Confiança: 3.5,
    },
    history: [
      { date: "Sem 1", estresse: 3.0, produtividade: 3.5 },
      { date: "Sem 2", estresse: 3.5, produtividade: 3.0 },
      { date: "Sem 3", estresse: 4.2, produtividade: 2.1 },
    ],
  },
  "Squad Beta": {
    riskLevel: "low",
    factors: {
      "Cansaço Mental": 2.0,
      Estresse: 2.1,
      "Pressão Psicológica": 1.9,
      Produtividade: 4.5,
      "Conforto com Prazos": 4.0,
      Confiança: 4.8,
    },
    history: [
      { date: "Sem 1", estresse: 2.5, produtividade: 4.0 },
      { date: "Sem 2", estresse: 2.2, produtividade: 4.2 },
      { date: "Sem 3", estresse: 2.1, produtividade: 4.5 },
    ],
  },
  "Squad Gamma": {
    riskLevel: "medium",
    factors: {
      "Cansaço Mental": 3.2,
      Estresse: 3.0,
      "Pressão Psicológica": 3.1,
      Produtividade: 3.2,
      "Conforto com Prazos": 3.0,
      Confiança: 2.5,
    },
    history: [
      { date: "Sem 1", estresse: 2.8, produtividade: 3.5 },
      { date: "Sem 2", estresse: 2.9, produtividade: 3.4 },
      { date: "Sem 3", estresse: 3.0, produtividade: 3.2 },
    ],
  },
};

const CATEGORIES = {
  wellbeing: {
    label: "Saúde & Bem-Estar",
    icon: "ph-heartbeat",
    color: "text-rose-500",
    fields: [
      { key: "cansaco_mental", label: "Cansaço Mental" },
      { key: "cansaco_dores", label: "Cansaço e Dores" },
      { key: "ansiedade", label: "Ansiedade" },
      { key: "estresse", label: "Estresse" },
      { key: "pressao", label: "Pressão Psicológica" },
    ],
  },
  team: {
    label: "Dinâmica da Equipa",
    icon: "ph-users",
    color: "text-blue-500",
    fields: [
      { key: "confianca", label: "Confiança" },
      { key: "colaboracao", label: "Colaboração" },
      { key: "comunicacao", label: "Comunicação" },
      { key: "disponibilidade", label: "Disponibilidade" },
    ],
  },
  work: {
    label: "Trabalho & Entregas",
    icon: "ph-briefcase",
    color: "text-emerald-500",
    fields: [
      { key: "produtividade", label: "Produtividade" },
      { key: "entregas", label: "Entregas" },
      { key: "prazos", label: "Conforto com Prazos" },
      { key: "conhecimento", label: "Conhecimento" },
    ],
  },
  general: {
    label: "Visão & Sentimento",
    icon: "ph-target",
    color: "text-indigo-500",
    fields: [
      { key: "satisfacao", label: "Satisfação Geral" },
      { key: "motivacao", label: "Motivação" },
      { key: "visao", label: "Visão / Clareza" },
    ],
  },
};

let currentRole = "manager";
let isRegisteringOrg = false;
let activeManagerTeam = "Squad Alpha";
let chartInstance = null;
let aiManagerSolutions = null;

let devFormData = {};
Object.values(CATEGORIES).forEach((cat) =>
  cat.fields.forEach((f) => (devFormData[f.key] = 3)),
);

function toggleTheme() {
  document.documentElement.classList.toggle("dark");
  const isDark = document.documentElement.classList.contains("dark");
  document.getElementById("themeIcon").className = isDark
    ? "ph-fill ph-sun text-lg text-amber-400"
    : "ph ph-moon text-lg text-slate-600";
  const mobileIcon = document.getElementById("themeIconMobile");
  if (mobileIcon)
    mobileIcon.className = isDark
      ? "ph-fill ph-sun text-lg text-amber-400"
      : "ph ph-moon text-lg text-slate-600";
  if (chartInstance) renderChart();
}

function checkSystemTheme() {
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    document.documentElement.classList.add("dark");
    const iconClass = "ph-fill ph-sun text-lg text-amber-400";
    document.getElementById("themeIcon").className = iconClass;
    const mobileIcon = document.getElementById("themeIconMobile");
    if (mobileIcon) mobileIcon.className = iconClass;
  }
}

function navigate(view) {
  document
    .querySelectorAll('section[id^="view-"]')
    .forEach((el) => el.classList.add("hidden-section"));
  const target = document.getElementById(`view-${view}`);
  if (target) {
    target.classList.remove("hidden-section");
    window.scrollTo(0, 0);
  }
}

function setLoginRole(role) {
  currentRole = role;
  const btnManager = document.getElementById("btnRoleManager");
  const btnDev = document.getElementById("btnRoleDev");
  const activeClasses = [
    "bg-white",
    "dark:bg-slate-600",
    "shadow",
    "text-indigo-600",
    "dark:text-white",
  ];
  const inactiveClasses = ["text-slate-500", "dark:text-slate-400"];

  if (role === "manager") {
    btnManager.classList.add(...activeClasses);
    btnManager.classList.remove(...inactiveClasses);
    btnDev.classList.add(...inactiveClasses);
    btnDev.classList.remove(...activeClasses);
  } else {
    btnDev.classList.add(...activeClasses);
    btnDev.classList.remove(...inactiveClasses);
    btnManager.classList.add(...inactiveClasses);
    btnManager.classList.remove(...activeClasses);
  }
}

function toggleRegisterMode() {
  isRegisteringOrg = !isRegisteringOrg;
  const regFields = document.getElementById("registerFieldsContainer");
  const roleSelector = document.getElementById("roleSelectorContainer");
  const passwordField = document.getElementById("passwordFieldContainer");
  const regPasswordFields = document.getElementById("registerPasswordFields");
  const btnText = document.getElementById("loginBtnText");
  const toggleBtn = document.getElementById("toggleRegBtn");
  const authTitle = document.getElementById("authTitle");
  const authSubtitle = document.getElementById("authSubtitle");
  const authIcon = document.getElementById("authIconHeader");

  if (isRegisteringOrg) {
    regFields.classList.remove("hidden");
    roleSelector.classList.add("hidden");
    passwordField.classList.add("hidden");
    regPasswordFields.classList.remove("hidden");
    authTitle.innerText = "Cadastrar Organização";
    authSubtitle.innerText = "Registe a sua empresa como gestor principal";
    authIcon.className = "ph ph-buildings text-3xl";
    btnText.innerText = "Efetuar Registo e Ir para Login";
    toggleBtn.innerText = "Já tem conta? Clique aqui para entrar";
  } else {
    regFields.classList.add("hidden");
    roleSelector.classList.remove("hidden");
    passwordField.classList.remove("hidden");
    regPasswordFields.classList.add("hidden");
    authTitle.innerText = "Acesso Corporativo";
    authSubtitle.innerText =
      "Selecione o seu perfil de acesso ou registe a empresa";
    authIcon.className = "ph ph-buildings text-2xl";
    btnText.innerText = "Entrar no Sistema";
    toggleBtn.innerText = "É gestor e quer cadastrar a empresa? Clique aqui";
  }
}

function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (input.type === "password") {
    input.type = "text";
    icon.className = "ph ph-eye-slash text-lg";
  } else {
    input.type = "password";
    icon.className = "ph ph-eye text-lg";
  }
}

function handleAuthSubmit() {
  if (isRegisteringOrg) {
    const companyName = document.getElementById("regCompanyName").value.trim();
    const cnpj = document.getElementById("regCnpj").value.trim();
    const email = document.getElementById("loginEmail").value.trim();
    const pass = document.getElementById("regPassword").value;
    const confirmPass = document.getElementById("regConfirmPassword").value;

    if (!companyName || !cnpj || !email || !pass || !confirmPass) {
      alert(
        "Por favor, preencha todos os campos obrigatórios para o cadastro da empresa.",
      );
      return;
    }
    if (pass !== confirmPass) {
      alert("As senhas não coincidem. Verifique e tente novamente.");
      return;
    }

    const registeredOrgs = JSON.parse(
      localStorage.getItem("agilewell_registered_orgs") || "[]",
    );
    registeredOrgs.push({
      companyName,
      cnpj,
      email,
      pass,
      role: "manager",
    });
    localStorage.setItem(
      "agilewell_registered_orgs",
      JSON.stringify(registeredOrgs),
    );

    alert(
      "Empresa '" +
        companyName +
        "' cadastrada com sucesso! Redirecionando para o login.",
    );
    // Volta para o modo login (mostra o formulário de login) e garante a navegação
    if (isRegisteringOrg) toggleRegisterMode();
    navigate("login");
  } else {
    handleLogin();
  }
}

function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPassword").value;

  if (isRegisteringOrg) return;

  let matchedUser = USERS.find((u) => u.email === email && u.password === pass);

  if (!matchedUser) {
    const registeredOrgs = JSON.parse(
      localStorage.getItem("agilewell_registered_orgs") || "[]",
    );
    const foundOrg = registeredOrgs.find(
      (org) => org.email === email && org.pass === pass,
    );
    if (foundOrg) {
      matchedUser = {
        email: foundOrg.email,
        name: foundOrg.companyName || foundOrg.name || "Usuário",
        role: "manager",
      };
    }
  }

  if (!matchedUser) {
    if (!email) {
      matchedUser = USERS.find((u) => u.role === currentRole);
    } else {
      alert(
        "Credenciais inválidas. Verifique o e-mail e a senha, ou utilize 'gestor@agilewell.com' / 'dev@agilewell.com' com senha '123456'.",
      );
      return;
    }
  }

  currentRole = matchedUser.role;

  const headerBtn = document.getElementById("loginHeaderBtn");
  if (headerBtn) headerBtn.classList.add("hidden");

  const loggedActions = document.getElementById("loggedInActions");
  if (loggedActions) {
    loggedActions.classList.remove("hidden");
    loggedActions.classList.add("flex");
}

  const topNav = document.getElementById("topNavigation");
  if (topNav) {
    topNav.classList.remove("hidden");
    topNav.classList.add("flex");
  }

  // Atualiza o perfil no cabeçalho
  const displayName = matchedUser.name || "Utilizador";
  const userName = document.getElementById("userNameHeader");
  const userRole = document.getElementById("userRoleHeader");
  const userAvatar = document.getElementById("userAvatar");
  const dropdownName = document.getElementById("dropdownName");
  const dropdownEmail = document.getElementById("dropdownEmail");
  if (userName) userName.textContent = displayName;
  if (userRole)
    userRole.textContent = currentRole === "manager" ? "Gestor" : "Colaborador";
  if (userAvatar) {
    userAvatar.textContent = displayName
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  if (dropdownName) dropdownName.textContent = displayName;
  if (dropdownEmail) dropdownEmail.textContent = matchedUser.email || "";

  renderNotifications();

  navigate(currentRole === "manager" ? "manager" : "dev");
  if (currentRole === "manager") initManagerDashboard();
  else initDevDashboard();
}

function logout() {
  const headerBtn = document.getElementById("loginHeaderBtn");
  if (headerBtn) headerBtn.classList.remove("hidden");

  const loggedActions = document.getElementById("loggedInActions");
  if (loggedActions) loggedActions.classList.add("hidden");

  const topNav = document.getElementById("topNavigation");
  if (topNav) {
    topNav.classList.add("hidden");
    topNav.classList.remove("flex");
  }

  const notifDropdown = document.getElementById("notifDropdown");
  if (notifDropdown) notifDropdown.classList.add("hidden");
  const profileDropdown = document.getElementById("profileDropdown");
  if (profileDropdown) profileDropdown.classList.add("hidden");

  navigate("login");
}

/* ====================== NOTIFICAÇÕES E PERFIL ====================== */

function getNotifications() {
  try {
    return JSON.parse(
      localStorage.getItem("agilewell_notifications") || "[]"
    );
  } catch (e) {
    return [];
  }
}


function addNotification(title, message) {
  const list = getNotifications();

  list.unshift({
    title,
    message,
    time: Date.now()
  });

  localStorage.setItem(
    "agilewell_notifications",
    JSON.stringify(list.slice(0, 20))
  );

  renderNotifications();
}


function renderNotifications() {
  const list = document.getElementById("notifDropdown");

  if (!list) return;

  const scrollArea = list.querySelector(".max-h-80");

  if (!scrollArea) return;

  const notifs = getNotifications();

  /*
   * ==========================================================
   * NOTIFICAÇÕES DO GESTOR
   * ==========================================================
   */

  if (currentRole === "manager") {

    // Notificação dinâmica de risco alto dos squads
    getAllTeams().forEach((team) => {

      const data = getTeamData(team);

      if (data && data.riskLevel === "high") {

        const already = notifs.some(
          (n) => n.title === `Alerta Crítico: ${team}`
        );

        if (!already) {
          notifs.push({
            title: `Alerta Crítico: ${team}`,
            message:
              "A carga de trabalho excedeu o limite sustentável nesta sprint.",
            time: Date.now()
          });
        }
      }
    });


    // Título do dropdown
    const titleElement = list.querySelector("#notifTitle");

    if (titleElement) {
      titleElement.innerHTML = `
        <i class="ph-fill ph-bell text-indigo-500"></i>
        Alertas da equipe
      `;
    }
  }


  /*
   * ==========================================================
   * NOTIFICAÇÕES DO DEV / COLABORADOR
   * ==========================================================
   */

  if (currentRole === "dev") {

    // Se ainda não houver notificações para o colaborador,
    // adicionamos algumas notificações de exemplo.
    if (notifs.length === 0) {

      notifs.push(
        {
          title: "Nova orientação do gestor",
          message:
            "Ana Gestora enviou uma orientação para a Sprint 12.",
          time: Date.now()
        },
        {
          title: "Check-in de bem-estar",
          message:
            "O check-in semanal da equipe está disponível.",
          time: Date.now()
        },
        {
          title: "Novo feedback recebido",
          message:
            "Você recebeu um novo feedback sobre suas atividades.",
          time: Date.now()
        }
      );
    }


    // Título do dropdown
    const titleElement = list.querySelector("#notifTitle");

    if (titleElement) {
      titleElement.innerHTML = `
        <i class="ph-fill ph-bell text-indigo-500"></i>
        Minhas notificações
      `;
    }
  }


  /*
   * ==========================================================
   * SEM NOTIFICAÇÕES
   * ==========================================================
   */

  if (notifs.length === 0) {

    scrollArea.innerHTML = `
      <div class="p-4 text-sm text-slate-400 text-center">
        Nenhuma notificação.
      </div>
    `;

    return;
  }


  /*
   * ==========================================================
   * RENDERIZAÇÃO
   * ==========================================================
   */

  scrollArea.innerHTML = notifs
    .map((n) => {

      const isCritical = n.title.includes("Crítico");

      const isFeedback =
        n.title.includes("feedback") ||
        n.title.includes("Feedback");

      const isCheckin =
        n.title.includes("Check-in") ||
        n.title.includes("check-in");

      let dotColor = "bg-indigo-500";
      let background = "";

      if (isCritical) {
        dotColor = "bg-rose-500";
        background =
          "bg-rose-50/30 dark:bg-rose-900/10";
      } else if (isFeedback) {
        dotColor = "bg-amber-500";
      } else if (isCheckin) {
        dotColor = "bg-emerald-500";
      }

      return `
        <div
          class="p-4 border-b border-slate-50 dark:border-slate-700/50
                 hover:bg-slate-50 dark:hover:bg-slate-700/30
                 cursor-pointer flex gap-3 transition-colors ${background}"
        >

          <div
            class="mt-1 w-2.5 h-2.5 rounded-full ${dotColor} shrink-0"
          ></div>

          <div>

            <p
              class="text-sm font-semibold text-slate-800
                     dark:text-slate-200 leading-tight"
            >
              ${n.title}
            </p>

            <p
              class="text-xs text-slate-500
                     dark:text-slate-400 mt-1"
            >
              ${n.message}
            </p>

          </div>

        </div>
      `;
    })
    .join("");
}


function toggleNotif() {

  renderNotifications();

  const dropdown = document.getElementById("notifDropdown");
  const profileDropdown =
    document.getElementById("profileDropdown");

  if (!dropdown) return;

  const willShow =
    dropdown.classList.contains("hidden");

  dropdown.classList.toggle("hidden");

  if (profileDropdown && willShow) {
    profileDropdown.classList.add("hidden");
  }
}


function toggleProfile() {

  const dropdown =
    document.getElementById("profileDropdown");

  const notifDropdown =
    document.getElementById("notifDropdown");

  if (!dropdown) return;

  const willShow =
    dropdown.classList.contains("hidden");

  dropdown.classList.toggle("hidden");

  if (notifDropdown && willShow) {
    notifDropdown.classList.add("hidden");
  }
}


/* ====================== DADOS E UTILITÁRIOS DO GESTOR ====================== */

// Síntese do Guia Prático (PMBOK + Ágil) usada para enriquecer a análise da IA
const GUIDE_CONTEXT = [
  "Planeamento adaptativo com limites claros de escopo e recursos.",
  "Gestão de prazos orientada à capacidade real e ritmo sustentável da equipa.",
  "Rituais ágeis com propósito (daily, planning, review, retrospectiva).",
  "Comunicação estruturada, transparente e com limites de disponibilidade.",
  "Liderança técnica e empática, promovendo autonomia e segurança psicológica.",
  "Etapa 1: diagnóstico do contexto; Etapa 2: planeamento integrado;",
  "Etapa 3: execução e monitorização contínua; medir bem-estar e desempenho.",
  "Checklist: escopo claro, metas compatíveis com capacidade, rituais com propósito.",
].join("\n");

function getAllTeams() {
  const mock = Object.keys(MOCK_TEAMS_DATA);
  const registered = getRegisteredSquads().map((s) => s.name);
  return [...new Set([...mock, ...registered])];
}

function getRegisteredSquads() {
  try {
    return JSON.parse(localStorage.getItem("agilewell_squads") || "[]");
  } catch (e) {
    return [];
  }
}

function saveRegisteredSquads(squads) {
  localStorage.setItem("agilewell_squads", JSON.stringify(squads));
}

// Gera fatores de um dev de forma determinística (estável a cada sessão)
function generateDevFactors(seed) {
  const bases = [4.6, 3.9, 4.3, 2.0, 1.8, 3.4];
  const keys = [
    "Cansaço Mental",
    "Estresse",
    "Pressão Psicológica",
    "Produtividade",
    "Conforto com Prazos",
    "Confiança",
  ];
  const factors = {};
  keys.forEach((k, i) => {
    const delta = ((seed * 7 + i * 3) % 5) - 2; // -2 .. +2
    const val = Math.max(1, Math.min(5, +(bases[i] + delta / 2).toFixed(1)));
    factors[k] = val;
  });
  return factors;
}

// Desenvolvedores para os squads de demonstração (mock)
const MOCK_DEV_NAMES = {
  "Squad Alpha": [
    "Ana Souza",
    "Bruno Lima",
    "Carla Dias",
    "Diego Rocha",
    "Elisa Mota",
  ],
  "Squad Beta": ["Fábio Nunes", "Gabriela Reis", "Hugo Pires"],
  "Squad Gamma": ["Iara Melo", "João Alves", "Karina Buscel", "Luiz Farias"],
};

function getTeamDevelopers(teamName) {
  const squad = getRegisteredSquads().find((s) => s.name === teamName);
  if (squad) return squad.developers || [];
  const names = MOCK_DEV_NAMES[teamName] || ["Dev 1", "Dev 2", "Dev 3", "Dev 4"];
  return names.map((n, i) => ({
    name: n,
    email:
      n.toLowerCase().split(" ")[0] + "@agilewell.com",
    factors: generateDevFactors(i),
  }));
}

// Retorna os dados de uma equipa (mock ou squad cadastrado)
function getTeamData(teamName) {
  if (MOCK_TEAMS_DATA[teamName]) return MOCK_TEAMS_DATA[teamName];
  const squad = getRegisteredSquads().find((s) => s.name === teamName);
  if (!squad) return MOCK_TEAMS_DATA["Squad Alpha"];
  const devs = squad.developers || [];
  const keys = [
    "Cansaço Mental",
    "Estresse",
    "Pressão Psicológica",
    "Produtividade",
    "Conforto com Prazos",
    "Confiança",
  ];
  const factors = {};
  keys.forEach((k) => {
    const avg =
      devs.length > 0
        ? devs.reduce((acc, d) => acc + (d.factors[k] ?? 3), 0) / devs.length
        : 3;
    factors[k] = +avg.toFixed(1);
  });
  const rules =
    factors["Estresse"] +
    (5 - factors["Produtividade"]) +
    (5 - factors["Conforto com Prazos"]);
  let riskLevel = "low";
  if (rules >= 7.5) riskLevel = "high";
  else if (rules >= 4.5) riskLevel = "medium";
  const history = [
    { date: "Sem 1", estresse: +(factors["Estresse"] - 0.6).toFixed(1), produtividade: +(factors["Produtividade"] + 0.4).toFixed(1) },
    { date: "Sem 2", estresse: +(factors["Estresse"] - 0.2).toFixed(1), produtividade: +(factors["Produtividade"] + 0.1).toFixed(1) },
    { date: "Sem 3", estresse: +(factors["Estresse"]).toFixed(1), produtividade: +(factors["Produtividade"]).toFixed(1) },
  ];
  return { riskLevel, factors, history };
}

let selectedDev = null;

function initManagerDashboard() {
  renderSquadList();
  renderTeamSelector();
  selectTeam("Squad Alpha");
}

function renderTeamSelector() {
  const container = document.getElementById("teamSelector");
  if (!container) return;
  container.innerHTML = "";
  getAllTeams().forEach((team) => {
    const data = getTeamData(team);
    const isHighRisk = data && data.riskLevel === "high";
    const isActive = team === activeManagerTeam;
    const btn = document.createElement("button");
    btn.className = `w-full p-3 rounded-xl flex justify-between items-center transition-all ${isActive ? "bg-indigo-600 text-white shadow-md" : "bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"}`;
    btn.onclick = () => selectTeam(team);
    btn.innerHTML = `<span class="font-medium">${team}</span> ${isHighRisk ? `<i class="ph-fill ph-warning-circle ${isActive ? "text-white" : "text-rose-500"}"></i>` : ""}`;
    container.appendChild(btn);
  });
}

function selectTeam(team) {
  activeManagerTeam = team;
  selectedDev = null;
  aiManagerSolutions = null;
  const chartTitle = document.getElementById("chartTitle");
  if (chartTitle)
    chartTitle.innerHTML = `<i class="ph ph-chart-line-up text-indigo-500"></i> Diagnóstico: ${team}`;
  renderTeamSelector();
  renderChart();
  renderCriticalFactors();
  renderManagerSolutions();
  renderDevSelector();
  renderDevDetail();
}

function renderCriticalFactors() {
  const container = document.getElementById("criticalFactorsList");
  if (!container) return;
  const factors = getTeamData(activeManagerTeam).factors;
  const sorted = Object.entries(factors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  container.innerHTML = sorted
    .map(([name, val]) => {
      let badgeColor =
        val >= 4
          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
      return `
                    <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                        <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">${name}</span>
                        <span class="px-2.5 py-1 rounded-full text-xs font-bold ${badgeColor}">Nível ${val}/5</span>
                    </div>
                `;
    })
    .join("");
}

function renderChart() {
  const canvas = document.getElementById("teamChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const data = getTeamData(activeManagerTeam).history;
  const isDark = document.documentElement.classList.contains("dark");
  const textColor = isDark ? "#cbd5e1" : "#475569";
  const gridColor = isDark ? "#334155" : "#e2e8f0";

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map((d) => d.date),
      datasets: [
        {
          label: "Nível de Estresse",
          data: data.map((d) => d.estresse),
          borderColor: "#f43f5e",
          backgroundColor: "#f43f5e",
          tension: 0.4,
          borderWidth: 3,
        },
        {
          label: "Produtividade",
          data: data.map((d) => d.produtividade),
          borderColor: "#10b981",
          backgroundColor: "#10b981",
          tension: 0.4,
          borderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: 5,
          grid: { color: gridColor },
          ticks: { color: textColor },
        },
        x: { grid: { display: false }, ticks: { color: textColor } },
      },
      plugins: { legend: { labels: { color: textColor } } },
    },
  });
}

function getStaticSolutions(teamData) {
  const solutions = [];
  if (teamData.factors["Estresse"] > 3.5 || teamData.factors.estresse > 3.5) {
    solutions.push({
      title: "Protocolo Anti-Burnout",
      action: "Rever WIP (Work In Progress) e impor limites de horas extra.",
      impact: "Redução imediata de fadiga cognitiva.",
      priority: "Alta",
    });
  }
  if (solutions.length === 0) {
    solutions.push({
      title: "Manutenção de Cultura",
      action: "Manter rituais atuais.",
      impact: "Estabilidade.",
      priority: "Baixa",
    });
  }
  return solutions;
}

function renderManagerSolutions(isLoading = false) {
  const container = document.getElementById("managerSolutionsContainer");
  const btnsContainer = document.getElementById("aiButtonsContainer");
  if (!container || !btnsContainer) return;

  if (isLoading) {
    btnsContainer.innerHTML = `<button disabled class="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 text-slate-500 text-xs px-3 py-1.5 rounded-lg font-medium cursor-not-allowed"><i class="ph ph-spinner spin"></i> Analisando...</button>`;
    container.innerHTML = `<div class="h-48 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"><i class="ph ph-robot text-4xl text-indigo-300 mb-4 animate-bounce"></i><p class="text-indigo-500 font-medium">A consultar o Agile Coach Virtual...</p></div>`;
    return;
  }

  const isAI = aiManagerSolutions !== null;
  const solutions =
    aiManagerSolutions ||
    getStaticSolutions(getTeamData(activeManagerTeam));

  if (isAI) {
    btnsContainer.innerHTML = `<button onclick="aiManagerSolutions = null; renderManagerSolutions();" class="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"><i class="ph ph-arrows-clockwise"></i> Repor</button>`;
  } else {
    btnsContainer.innerHTML = `<button onclick="generateManagerInsights()" class="flex items-center gap-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:scale-[1.02] active:scale-95 text-white shadow-lg shadow-purple-500/20 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"><i class="ph ph-sparkle"></i> Gerar Análise Profunda</button>`;
  }

  container.innerHTML = solutions
    .map(
      (sol) => `
                <div class="bg-white dark:bg-slate-800 p-5 rounded-xl border-l-4 shadow-sm flex flex-col gap-2 transition-all hover:translate-x-1 ${isAI ? "border-l-purple-500 border border-purple-100 dark:border-purple-900" : "border-l-amber-500"} fade-in">
                    <div class="flex justify-between items-start">
                        <h4 class="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">${isAI ? '<i class="ph-fill ph-sparkle text-purple-500 text-sm"></i>' : ""} ${sol.title}</h4>
                        <span class="px-2 py-1 text-[10px] font-bold rounded uppercase ${isAI ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"}">Prioridade ${sol.priority}</span>
                    </div>
                    <p class="text-slate-600 dark:text-slate-300 text-sm"><strong class="text-indigo-600 dark:text-indigo-400">Ação:</strong> ${sol.action}</p>
                    <p class="text-slate-500 dark:text-slate-400 text-xs mt-1"><span class="font-semibold">Resultado Esperado:</span> ${sol.impact}</p>
                </div>
            `,
    )
    .join("");
}

async function generateManagerInsights() {
  renderManagerSolutions(true);
  const teamData = getTeamData(activeManagerTeam);
  const prompt = `Atue como um Agile Coach Sénior e Psicólogo Organizacional. Analise os seguintes dados da equipa "${activeManagerTeam}": ${JSON.stringify(teamData.factors)}. Contexto: Escala 1 a 5. Utilize como base o Guia Prático PMBOK + Ágil: ${GUIDE_CONTEXT}. Gere 4 recomendações táticas integrando o guia ao diagnóstico. RESPONDA APENAS UM JSON VÁLIDO: [{ "title": "...", "action": "...", "impact": "...", "priority": "Alta/Média/Baixa" }]`;
  const result = await callGemini(prompt);

  if (result) {
    try {
      const cleanJson = result
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      aiManagerSolutions = JSON.parse(cleanJson);
    } catch (e) {
      aiManagerSolutions = getStaticSolutions(teamData);
    }
  } else {
    aiManagerSolutions = getStaticSolutions(teamData);
  }
  renderManagerSolutions();
}

/* ====================== CADASTRO DE SQUADS ====================== */

function toggleSquadForm() {
  const card = document.getElementById("squadRegisterCard");
  if (!card) return;
  card.classList.toggle("hidden");
}

function clearSquadForm() {
  ["squadName", "squadEmail"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const size = document.getElementById("squadSize");
  if (size) size.value = "5";
}

function registerSquad() {
  const nameInput = document.getElementById("squadName");
  const sizeInput = document.getElementById("squadSize");
  const emailInput = document.getElementById("squadEmail");

  const name = (nameInput?.value || "").trim();
  const size = parseInt(sizeInput?.value, 10) || 0;
  const email = (emailInput?.value || "").trim();

  if (!name) {
    alert("Informe o nome do Squad.");
    return;
  }
  if (!email) {
    alert("Informe o e-mail corporativo do Squad para enviar os convites.");
    return;
  }
  if (size < 1 || size > 20) {
    alert("A quantidade na equipe deve estar entre 1 e 20.");
    return;
  }

  const squads = getRegisteredSquads();
  if (squads.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
    alert("Já existe um squad com esse nome.");
    return;
  }

  // Gera os desenvolvedores do squad e monta os convites por e-mail
  const domain = email.split("@")[1] || "empresa.com";
  const developers = [];
  const invites = [];
  for (let i = 0; i < size; i++) {
    const devEmail = `dev${i + 1}@${domain}`;
    developers.push({
      name: `Dev ${i + 1}`,
      email: devEmail,
      factors: generateDevFactors(i),
    });
    invites.push(devEmail);
  }

  squads.push({ name, size, email, developers, createdAt: Date.now() });
  saveRegisteredSquads(squads);

  // Regista a notificação local
  addNotification(
    "Squad " + name,
    `Squad criado com ${size} devs. Convites enviados para: ${invites.join(", ")}.`,
  );

  alert(
    `Squad "${name}" cadastrado com sucesso!\n\n` +
      `${size} convites foram "enviados" para os e-mails corporativos:\n` +
      invites.join("\n"),
  );

  clearSquadForm();
  toggleSquadForm();
  renderSquadList();
  renderTeamSelector();
  if (getAllTeams().includes(name)) selectTeam(name);
}

function renderSquadList() {
  const container = document.getElementById("squadList");
  if (!container) return;
  const squads = getRegisteredSquads();
  if (squads.length === 0) {
    container.innerHTML = `<p class="text-sm text-slate-400">Nenhum squad cadastrado ainda. Use o formulário acima.</p>`;
    return;
  }
  container.innerHTML = squads
    .map(
      (s) => `
      <div class="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
        <div class="flex items-center gap-3 min-w-0">
          <div class="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shrink-0">
            <i class="ph ph-users-three"></i>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-bold text-slate-800 dark:text-white truncate">${s.name}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 truncate">${s.size} devs · ${s.email}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button onclick="selectTeam('${s.name.replace(/'/g, "\\'")}')" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors">Analisar</button>
          <button onclick="removeSquad('${s.name.replace(/'/g, "\\'")}')" class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"><i class="ph ph-trash"></i></button>
        </div>
      </div>
    `,
    )
    .join("");
}

function removeSquad(name) {
  if (!confirm(`Remover o squad "${name}"?`)) return;
  const squads = getRegisteredSquads().filter((s) => s.name !== name);
  saveRegisteredSquads(squads);
  if (activeManagerTeam === name) {
    activeManagerTeam = "Squad Alpha";
    selectedDev = null;
  }
  renderSquadList();
  renderTeamSelector();
  selectTeam(activeManagerTeam);
}

/* ====================== ANÁLISE POR DESENVOLVEDOR ====================== */

function renderDevSelector() {
  const container = document.getElementById("devSelector");
  if (!container) return;
  const devs = getTeamDevelopers(activeManagerTeam);
  if (!devs.length) {
    container.innerHTML = `<p class="text-sm text-slate-400">Nenhum desenvolvedor nesta equipa.</p>`;
    return;
  }
  container.innerHTML = devs
    .map((d, i) => {
      const isActive = selectedDev === i;
      const avg = getDevHealth(d);
      let dot =
        avg >= 3.5
          ? "bg-emerald-500"
          : avg >= 2.5
            ? "bg-amber-500"
            : "bg-rose-500";
      return `
      <button onclick="selectDev(${i})" class="w-full flex items-center justify-between gap-3 p-3 rounded-xl transition-all ${isActive ? "bg-indigo-600 text-white shadow-md" : "bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"}">
        <div class="flex items-center gap-3 min-w-0">
          <span class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? "bg-white/20 text-white" : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"}">${d.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}</span>
          <div class="text-left min-w-0">
            <p class="text-sm font-bold truncate">${d.name}</p>
            <p class="text-[10px] truncate opacity-70">${d.email}</p>
          </div>
        </div>
        <span class="w-2.5 h-2.5 rounded-full ${dot} shrink-0 shadow-[0_0_6px_rgba(0,0,0,0.2)]"></span>
      </button>
    `;
    })
    .join("");
}

function getDevHealth(dev) {
  const keys = Object.keys(dev.factors || {});
  if (!keys.length) return 3;
  const pos = ["Produtividade", "Confiança", "Conforto com Prazos"];
  let sum = 0;
  keys.forEach((k) => {
    const val = dev.factors[k];
    sum += pos.includes(k) ? val : 6 - val; // fatores negativos invertidos
  });
  return +(sum / keys.length).toFixed(1);
}

function selectDev(index) {
  selectedDev = index;
  renderDevSelector();
  renderDevDetail();
}

function renderDevDetail() {
  const title = document.getElementById("devDetailTitle");
  const subtitle = document.getElementById("devDetailSubtitle");
  const body = document.getElementById("devDetailBody");
  const orientBtn = document.getElementById("orientDevBtn");
  if (!body) return;

  if (selectedDev === null) {
    if (title) title.textContent = "Análise Individual";
    if (subtitle)
      subtitle.textContent = "Selecione um desenvolvedor para ver o detalhe.";
    if (orientBtn) orientBtn.disabled = true;
    body.innerHTML = `<div class="h-40 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-400 text-sm">
      <i class="ph ph-user-circle text-4xl mr-2"></i> Escolha um desenvolvedor da lista
    </div>`;
    return;
  }

  const devs = getTeamDevelopers(activeManagerTeam);
  const dev = devs[selectedDev];
  if (!dev) return;
  if (orientBtn) orientBtn.disabled = false;

  const factors = dev.factors || {};
  const health = getDevHealth(dev);
  const status =
    health >= 3.5
      ? { label: "Saudável", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" }
      : health >= 2.5
        ? { label: "Atenção", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" }
        : { label: "Crítico", cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" };

  if (title) title.textContent = dev.name;
  if (subtitle)
    subtitle.textContent = `${dev.email} · Squad ${activeManagerTeam} · Saúde ${health}/5`;

  const factorRows = Object.entries(factors)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([k, v]) => `
      <div class="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
        <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">${k}</span>
        <div class="flex items-center gap-2 min-w-[120px]">
          <div class="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div class="h-full rounded-full ${v >= 4 ? "bg-rose-500" : v >= 3 ? "bg-amber-500" : "bg-emerald-500"}" style="width:${(v / 5) * 100}%"></div>
          </div>
          <span class="text-xs font-bold text-slate-600 dark:text-slate-300 w-8 text-right">${v}/5</span>
        </div>
      </div>
    `,
    )
    .join("");

  body.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="px-3 py-1 rounded-full text-xs font-bold ${status.cls}">${status.label}</span>
      <span class="text-xs text-slate-500 dark:text-slate-400">Saúde geral estimada: <strong>${health}/5</strong></span>
    </div>
    <div class="space-y-2 mt-4">${factorRows}</div>
  `;
}

/* ====================== ORIENTAÇÃO IA (EQUIPA E DEV) ====================== */

async function orientTeamAI() {
  const container = document.getElementById("devDetailBody");
  if (!container) return;
  container.innerHTML = `<div class="h-40 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
    <i class="ph ph-robot text-4xl text-indigo-300 mb-4 animate-bounce"></i><p class="text-indigo-500 font-medium">A gerar orientação para a equipa...</p>
  </div>`;
  const teamData = getTeamData(activeManagerTeam);
  const prompt = `Atue como um Agile Coach Sénior. Com base no Guia Prático PMBOK + Ágil: ${GUIDE_CONTEXT}, oriente a equipa "${activeManagerTeam}" cujos fatores são ${JSON.stringify(teamData.factors)}. Dê 3 orientações práticas de 1 frase cada, em Português, separadas por quebra de linha, começando cada uma com "- ".`;
  const text = await callGemini(prompt);
  const content = text
    ? `<div class="fade-in"><p class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Orientação para a equipa</p><p class="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">${text.replace(/</g, "&lt;")}</p></div>`
    : `<p class="text-sm text-slate-400">Não foi possível gerar a orientação agora. Tente novamente.</p>`;
  container.innerHTML = content;
}

async function orientDevAI() {
  const body = document.getElementById("devDetailBody");
  if (!body) return;
  if (selectedDev === null) return;
  const devs = getTeamDevelopers(activeManagerTeam);
  const dev = devs[selectedDev];
  if (!dev) return;

  body.innerHTML = `<div class="h-40 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
    <i class="ph ph-robot text-4xl text-purple-300 mb-4 animate-bounce"></i><p class="text-indigo-500 font-medium">A gerar orientação para ${dev.name}...</p>
  </div>`;
  const prompt = `Atue como um Agile Coach Sénior e Psicólogo Organizacional. Com base no Guia Prático PMBOK + Ágil: ${GUIDE_CONTEXT}, oriente o desenvolvedor "${dev.name}" cujos fatores são: Cansaço Mental ${dev.factors["Cansaço Mental"]}, Estresse ${dev.factors["Estresse"]}, Pressão Psicológica ${dev.factors["Pressão Psicológica"]}, Produtividade ${dev.factors["Produtividade"]}, Conforto com Prazos ${dev.factors["Conforto com Prazos"]}, Confiança ${dev.factors["Confiança"]}. Dê uma orientação empática e prática em 3 frases, em Português.`;
  const text = await callGemini(prompt);
  const content = text
    ? `<div class="fade-in"><p class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Orientação individual para ${dev.name}</p><p class="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">${text.replace(/</g, "&lt;")}</p></div>`
    : `<p class="text-sm text-slate-400">Não foi possível gerar a orientação agora. Tente novamente.</p>`;
  body.innerHTML = content;
}

function initDevDashboard() {
  renderDevForm();
}

function renderDevForm() {
  const container = document.getElementById("devFormContainer");
  if (!container) return;
  let html = "";
  Object.entries(CATEGORIES).forEach(([key, section], index) => {
    const isOpen = index === 0;
    let fieldsHtml = section.fields
      .map(
        (field) => `
                    <div class="mb-6 last:mb-0">
                        <div class="flex justify-between items-center mb-2">
                            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">${field.label}</label>
                            <span id="badge-${field.key}" class="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 transition-colors">${devFormData[field.key]}/5</span>
                        </div>
                        <input type="range" min="1" max="5" value="${devFormData[field.key]}" oninput="updateDevForm('${field.key}', this.value)" class="w-full h-2 rounded-lg appearance-none cursor-pointer">
                    </div>
                `,
      )
      .join("");
    html += `
                    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                        <button onclick="toggleAccordion('acc-${key}')" class="w-full p-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                            <div class="flex items-center gap-3">
                                <div class="p-2 rounded-lg bg-white dark:bg-slate-900 shadow-sm ${section.color}"><i class="ph ${section.icon} text-xl"></i></div>
                                <span class="font-bold text-slate-700 dark:text-slate-200">${section.label}</span>
                            </div>
                            <i id="acc-icon-${key}" class="ph ${isOpen ? "ph-caret-up" : "ph-caret-down"} text-slate-400"></i>
                        </button>
                        <div id="acc-${key}" class="${isOpen ? "" : "hidden"} p-6 border-t border-slate-100 dark:border-slate-700">${fieldsHtml}</div>
                    </div>`;
  });
  container.innerHTML = html;
  Object.keys(devFormData).forEach((key) =>
    updateBadgeStyle(key, devFormData[key]),
  );
}

function toggleAccordion(id) {
  const el = document.getElementById(id);
  const icon = document.getElementById(id.replace("acc-", "acc-icon-"));
  if (!el || !icon) return;
  if (el.classList.contains("hidden")) {
    el.classList.remove("hidden");
    icon.classList.remove("ph-caret-down");
    icon.classList.add("ph-caret-up");
  } else {
    el.classList.add("hidden");
    icon.classList.remove("ph-caret-up");
    icon.classList.add("ph-caret-down");
  }
}

function updateDevForm(key, value) {
  devFormData[key] = parseInt(value);
  const badge = document.getElementById(`badge-${key}`);
  if (badge) badge.innerText = `${value}/5`;
  updateBadgeStyle(key, value);
}

function updateBadgeStyle(key, value) {
  const badge = document.getElementById(`badge-${key}`);
  if (!badge) return;
  badge.className =
    "text-xs font-bold px-2 py-1 rounded-full transition-colors ";
  if (value <= 2)
    badge.className +=
      "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300";
  else if (value == 3)
    badge.className +=
      "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
  else
    badge.className +=
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
}

async function generateDevTip() {
  const container = document.getElementById("devAiContainer");
  if (!container) return;
  container.innerHTML = `<button disabled class="flex items-center gap-2 bg-white/20 text-white text-xs font-bold py-2 px-3 rounded-lg backdrop-blur-sm cursor-not-allowed"><i class="ph ph-spinner spin"></i> A receber dica...</button>`;
  const prompt = `Um programador acabou de preencher um check-in. Dados (1-5): Cansaço Mental: ${devFormData.cansaco_mental}, Estresse: ${devFormData.estresse}. Dê um conselho curto (2 frases), empático em Português de Portugal.`;
  const tip = await callGemini(prompt);

  if (tip) {
    container.innerHTML = `<div class="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20 fade-in"><div class="flex items-start gap-2"><i class="ph-fill ph-robot shrink-0 mt-1"></i><p class="text-sm italic">"${tip.replace(/"/g, "")}"</p></div></div>`;
  } else {
    container.innerHTML = `<button onclick="generateDevTip()" class="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-2 px-3 rounded-lg backdrop-blur-sm"><i class="ph ph-warning-circle"></i> Tentar novamente</button>`;
  }
}

function submitDevForm() {
  const modal = document.getElementById("successModal");
  if (modal) modal.classList.remove("hidden-section");
  setTimeout(() => {
    if (modal) modal.classList.add("hidden-section");
    Object.keys(devFormData).forEach((k) => (devFormData[k] = 3));
    initDevDashboard();
    window.scrollTo(0, 0);
  }, 2000);
}

function exportToPDF() {
  const element = document.getElementById("pdfContent");
  const opt = {
    margin: 10,
    filename: "Guia_Pratico_PMBOK_Agil.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };
  const originalClass = element.className;
  element.className = "pdf-content text-black bg-white";
  html2pdf()
    .set(opt)
    .from(element)
    .save()
    .then(() => {
      element.className = originalClass;
    });
}

// Botão "Exportar PDF" da tela do gestor: abre o guia (torna visível) e gera o PDF
function openGuideAndExport() {
  navigate("guide");
  setTimeout(() => {
    exportToPDF();
  }, 400);
}

function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);

  const icon = button.querySelector("i");

  if (input.type === "password") {
    input.type = "text";

    icon.className = "ph ph-eye-slash";
  } else {
    input.type = "password";

    icon.className = "ph ph-eye";
  }
}

window.onload = () => {
  checkSystemTheme();
  navigate("home");
};
