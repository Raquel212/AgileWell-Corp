// --- GEMINI API ---
        const API_KEY = ""; 
        
        async function callGemini(prompt) {
            try {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                    }
                );
                if (!response.ok) throw new Error('API falhou');
                const data = await response.json();
                return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
            } catch (error) {
                console.error("Erro Gemini:", error);
                return null;
            }
        }

        // --- DADOS MOCKADOS E FATORES COMPLETOS (16 Fatores) ---
        const MOCK_TEAMS_DATA = {
            'Squad Alpha': { 
                riskLevel: 'high', 
                factors: { 
                    cansaco_mental: 4.5, cansaco_dores: 3, ansiedade: 4, estresse: 4.2, pressao: 4,
                    confianca: 2.5, colaboracao: 3, comunicacao: 2.5, disponibilidade: 3,
                    produtividade: 2.1, entregas: 3, prazos: 1.8, conhecimento: 4,
                    satisfacao: 2.5, motivacao: 3, visao: 3 
                }, 
                history: [ { date: 'Sem 1', estresse: 3.0, produtividade: 3.5 }, { date: 'Sem 2', estresse: 3.5, produtividade: 3.0 }, { date: 'Sem 3', estresse: 4.2, produtividade: 2.1 } ] 
            },
            'Squad Beta': { 
                riskLevel: 'low', 
                factors: { 
                    cansaco_mental: 2, cansaco_dores: 1, ansiedade: 2, estresse: 2.1, pressao: 2,
                    confianca: 4.8, colaboracao: 4.5, comunicacao: 4.5, disponibilidade: 4,
                    produtividade: 4.5, entregas: 4.5, prazos: 4.0, conhecimento: 4,
                    satisfacao: 4.5, motivacao: 4.5, visao: 4.5 
                }, 
                history: [ { date: 'Sem 1', estresse: 2.5, produtividade: 4.0 }, { date: 'Sem 2', estresse: 2.2, produtividade: 4.2 }, { date: 'Sem 3', estresse: 2.1, produtividade: 4.5 } ] 
            },
            'Squad Gamma': { 
                riskLevel: 'medium', 
                factors: { 
                    cansaco_mental: 3.5, cansaco_dores: 2.5, ansiedade: 3, estresse: 3.0, pressao: 3,
                    confianca: 3.5, colaboracao: 3.5, comunicacao: 3.5, disponibilidade: 3,
                    produtividade: 3.2, entregas: 3.5, prazos: 3.0, conhecimento: 3.5,
                    satisfacao: 3.5, motivacao: 3.5, visao: 3.5 
                }, 
                history: [ { date: 'Sem 1', estresse: 2.8, produtividade: 3.5 }, { date: 'Sem 2', estresse: 2.9, produtividade: 3.4 }, { date: 'Sem 3', estresse: 3.0, produtividade: 3.2 } ] 
            }
        };

        const CATEGORIES = {
            wellbeing: { label: 'Saúde & Bem-Estar', icon: 'ph-heartbeat', color: 'text-rose-500', fields: [ { key: 'cansaco_mental', label: 'Cansaço Mental' }, { key: 'cansaco_dores', label: 'Cansaço e Dores' }, { key: 'ansiedade', label: 'Ansiedade' }, { key: 'estresse', label: 'Estresse' }, { key: 'pressao', label: 'Pressão Psicológica' } ]},
            team: { label: 'Dinâmica da Equipa', icon: 'ph-users', color: 'text-blue-500', fields: [ { key: 'confianca', label: 'Confiança' }, { key: 'colaboracao', label: 'Colaboração' }, { key: 'comunicacao', label: 'Comunicação' }, { key: 'disponibilidade', label: 'Disponibilidade' } ]},
            work: { label: 'Trabalho & Entregas', icon: 'ph-briefcase', color: 'text-emerald-500', fields: [ { key: 'produtividade', label: 'Produtividade' }, { key: 'entregas', label: 'Entregas' }, { key: 'prazos', label: 'Conforto com Prazos' }, { key: 'conhecimento', label: 'Conhecimento' } ]},
            general: { label: 'Visão & Sentimento', icon: 'ph-target', color: 'text-indigo-500', fields: [ { key: 'satisfacao', label: 'Satisfação Geral' }, { key: 'motivacao', label: 'Motivação' }, { key: 'visao', label: 'Visão / Clareza' } ]}
        };

        // --- ESTADO ---
        let currentRole = 'manager';
        let activeUser = null;
        let activeManagerTeam = 'Squad Alpha';
        let chartInstance = null;
        let aiManagerSolutions = null;

        const USERS = [
            {
                email: "gestor@agilewell.com",
                password: "123456",
                name: "Ana Gestora",
                role: "manager"
            },
            {
                email: "dev@agilewell.com",
                password: "123456",
                name: "Carlos Dev",
                role: "dev"
            }
        ];
        
        let devFormData = {};
        Object.values(CATEGORIES).forEach(cat => cat.fields.forEach(f => devFormData[f.key] = 3));

        // --- SISTEMA E NAVEGAÇÃO ---
        function toggleTheme() {
            const html = document.documentElement;
            html.classList.toggle('dark');
            const isDark = html.classList.contains('dark');
            document.getElementById('themeIcon').className = isDark ? 'ph-fill ph-sun text-lg text-amber-400' : 'ph ph-moon text-lg text-slate-600';
            if(chartInstance) renderChart();
        }

        function checkSystemTheme() {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
                document.getElementById('themeIcon').className = 'ph-fill ph-sun text-lg text-amber-400';
            }
        }

        function navigate(view) {
            // Esconde todas as sections base
            const views = ['view-home', 'view-login', 'view-manager', 'view-dev', 'view-guide'];
            views.forEach(v => {
                const el = document.getElementById(v);
                if(el) el.classList.add('hidden-section');
            });
            
            // Mostra a selecionada
            const target = document.getElementById(`view-${view}`);
            if(target) target.classList.remove('hidden-section');
            
            window.scrollTo(0,0);
        }

        function setLoginRole(role) {
            currentRole = role;
            const btnManager = document.getElementById('btnRoleManager');
            const btnDev = document.getElementById('btnRoleDev');
            
            const activeClasses = 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-white'.split(' ');
            const inactiveClasses = 'text-slate-500 dark:text-slate-400'.split(' ');

            if (role === 'manager') {
                btnManager.classList.add(...activeClasses); btnManager.classList.remove(...inactiveClasses);
                btnDev.classList.add(...inactiveClasses); btnDev.classList.remove(...activeClasses);
            } else {
                btnDev.classList.add(...activeClasses); btnDev.classList.remove(...inactiveClasses);
                btnManager.classList.add(...inactiveClasses); btnManager.classList.remove(...activeClasses);
            }
        }
        function handleLogin() {
            const email = document.getElementById('loginEmail').value;
            const password = document.querySelector('#view-login input[type="password"]').value;

            const user = USERS.find(u => u.email === email && u.password === password);

            if (!user) {
                alert("Email ou senha inválidos!");
                return;
            }

            activeUser = user;
            currentRole = user.role;

            const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2);

            document.getElementById('loginHeaderBtn').classList.add('hidden');

            const actions = document.getElementById('loggedInActions');
            actions.classList.remove('hidden');
            actions.classList.add('flex');

            const nav = document.getElementById('topNavigation');
            nav.classList.remove('hidden');
            nav.classList.add('flex');

            document.getElementById('userNameHeader').innerText = user.name;
            document.getElementById('userRoleHeader').innerText =
                user.role === 'manager' ? 'Gestão Estratégica' : 'Colaborador';

            document.getElementById('userAvatar').innerText = initials;
            document.getElementById('dropdownName').innerText = user.name;
            document.getElementById('dropdownEmail').innerText = user.email;

            if (user.role === 'manager') {
                initManagerDashboard();
                navigate('manager');
            } else {
                initDevDashboard();
                navigate('dev');
            }
        }

        function logout() {
            activeUser = null;

            // 🔒 Limpa campos de login
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.querySelector('#view-login input[type="password"]');

            if (emailInput) emailInput.value = "";
            if (passwordInput) passwordInput.value = "";

            // reset role para padrão
            currentRole = 'manager';
            setLoginRole('manager');

            document.getElementById('loginHeaderBtn').classList.remove('hidden');

            const actions = document.getElementById('loggedInActions');
            actions.classList.add('hidden');
            actions.classList.remove('flex');

            const nav = document.getElementById('topNavigation');
            nav.classList.add('hidden');
            nav.classList.remove('flex');

            document.getElementById('profileDropdown').classList.add('hidden');
            document.getElementById('notifDropdown').classList.add('hidden');

            navigate('login');
        }

        function toggleNotif() {
            document.getElementById('notifDropdown').classList.toggle('hidden');
            document.getElementById('profileDropdown').classList.add('hidden');
        }

        function toggleProfile() {
            document.getElementById('profileDropdown').classList.toggle('hidden');
            document.getElementById('notifDropdown').classList.add('hidden');
        }

        // Fecha dropdowns se clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#notifDropdown') && !e.target.closest('#notifBtn')) {
                document.getElementById('notifDropdown')?.classList.add('hidden');
            }
            if (!e.target.closest('#profileDropdown') && !e.target.closest('#profileBtn')) {
                document.getElementById('profileDropdown')?.classList.add('hidden');
            }
        });

        // --- GESTOR ---
        function initManagerDashboard() {
            renderTeamSelector();
            selectTeam('Squad Alpha');
        }

        function renderTeamSelector() {
            const container = document.getElementById('teamSelector');
            if(!container) return;
            container.innerHTML = '';
            Object.keys(MOCK_TEAMS_DATA).forEach(team => {
                const isHighRisk = MOCK_TEAMS_DATA[team].riskLevel === 'high';
                const isActive = team === activeManagerTeam;
                const btn = document.createElement('button');
                btn.className = `w-full p-3 rounded-lg flex justify-between items-center transition-all ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`;
                btn.onclick = () => selectTeam(team);
                btn.innerHTML = `<span class="font-medium">${team}</span> ${isHighRisk ? `<i class="ph-fill ph-warning-circle ${isActive ? 'text-white' : 'text-rose-500'}"></i>` : ''}`;
                container.appendChild(btn);
            });
        }

        function selectTeam(team) {
            activeManagerTeam = team;
            aiManagerSolutions = null; 
            document.getElementById('chartTitle').innerHTML = `<i class="ph ph-chart-line-up text-indigo-500"></i> Diagnóstico: ${team}`;
            renderTeamSelector(); 
            renderChart();
            renderCriticalFactors();
            renderManagerSolutions();
        }

        function renderChart() {
            const canvas = document.getElementById('teamChart');
            if(!canvas) return;
            const ctx = canvas.getContext('2d');
            const data = MOCK_TEAMS_DATA[activeManagerTeam].history;
            const isDark = document.documentElement.classList.contains('dark');
            const textColor = isDark ? '#cbd5e1' : '#475569';
            const gridColor = isDark ? '#334155' : '#e2e8f0';

            if (chartInstance) chartInstance.destroy();

            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(d => d.date),
                    datasets: [
                        { label: 'Nível de Estresse', data: data.map(d => d.estresse), borderColor: '#f43f5e', backgroundColor: '#f43f5e', tension: 0.4, borderWidth: 3 },
                        { label: 'Produtividade', data: data.map(d => d.produtividade), borderColor: '#10b981', backgroundColor: '#10b981', tension: 0.4, borderWidth: 3 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 5, grid: { color: gridColor }, ticks: { color: textColor } }, x: { grid: { display: false }, ticks: { color: textColor } } }, plugins: { legend: { labels: { color: textColor } } } }
            });
        }

        function renderCriticalFactors() {
            const container = document.getElementById('criticalFactorsContainer');
            if(!container) return;
            
            const factors = MOCK_TEAMS_DATA[activeManagerTeam].factors;
            
            // Fatores onde ALTO (5) é MAU
            const negativeFactors = ['cansaco_mental', 'cansaco_dores', 'ansiedade', 'estresse', 'pressao'];
            // Fatores onde BAIXO (1) é MAU
            const positiveFactors = ['confianca', 'colaboracao', 'comunicacao', 'disponibilidade', 'produtividade', 'entregas', 'prazos', 'conhecimento', 'satisfacao', 'motivacao', 'visao'];
            
            let scoredFactors = [];
            
            // Encontrar os rótulos originais
            const getLabel = (key) => {
                let label = key;
                Object.values(CATEGORIES).forEach(cat => {
                    cat.fields.forEach(f => { if(f.key === key) label = f.label; });
                });
                return label;
            };

            // Calcular a "gravidade" (0 a 5, onde 5 é muito grave)
            Object.keys(factors).forEach(key => {
                let severity = 0;
                let value = factors[key];
                if (negativeFactors.includes(key)) { severity = value; } 
                else if (positiveFactors.includes(key)) { severity = 5 - value + 1; } // Inverte (se prod=1, sev=5)
                
                scoredFactors.push({ key, label: getLabel(key), value: value, severity });
            });

            // Ordenar por gravidade descrescente e pegar os 3 piores
            scoredFactors.sort((a, b) => b.severity - a.severity);
            const top3 = scoredFactors.slice(0, 3);

            let html = '';
            top3.forEach(item => {
                let colorClass = item.severity >= 4 ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
                let icon = item.severity >= 4 ? 'ph-warning-circle' : 'ph-info';
                
                html += `
                    <div class="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-700 ${colorClass}">
                        <div class="flex items-center gap-2 font-medium text-sm">
                            <i class="ph-fill ${icon}"></i>
                            ${item.label}
                        </div>
                        <div class="font-bold">${item.value.toFixed(1)}/5</div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }

        function getStaticSolutions(teamData) {
            const solutions = [];
            const f = teamData.factors;
            
            // Regras baseadas
            if (f.pressao >= 4 || f.cansaco_mental >= 4) {
                solutions.push({ title: "Protocolo Anti-Burnout", action: "Rever WIP (Work In Progress) e limites da Sprint.", impact: "Redução da fadiga cognitiva e pressão.", priority: "Alta" });
            }
            if (f.prazos <= 2.5) {
                solutions.push({ title: "Gestão de Capacidade", action: "Ajustar prazos baseando-se no ritmo sustentável da equipa.", impact: "Aumento do conforto e qualidade das entregas.", priority: "Alta" });
            }
            if (f.confianca <= 3 || f.comunicacao <= 3) {
                solutions.push({ title: "Comunicação Estruturada", action: "Garantir rituais ágeis com propósito e segurança psicológica.", impact: "Melhoria na colaboração e clareza.", priority: "Média" });
            }
            
            if (solutions.length === 0) {
                solutions.push({ title: "Manutenção de Cultura", action: "Manter o planeamento adaptativo atual.", impact: "Estabilidade no fluxo de trabalho.", priority: "Baixa" });
            }
            return solutions.slice(0, 3); // Retorna no máximo 3
        }

        function renderManagerSolutions(isLoading = false) {
            const container = document.getElementById('managerSolutionsContainer');
            const btnsContainer = document.getElementById('aiButtonsContainer');
            if(!container) return;
            
            if (isLoading) {
                btnsContainer.innerHTML = `<button disabled class="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 text-slate-500 text-xs px-3 py-1.5 rounded-lg font-medium cursor-not-allowed"><i class="ph ph-spinner spin"></i> Analisando Fatores...</button>`;
                container.innerHTML = `<div class="col-span-3 text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700"><i class="ph ph-robot text-4xl text-indigo-300 mb-4 animate-bounce block mx-auto"></i><p class="text-indigo-500 font-medium">A consultar o Agile Coach Virtual...</p><p class="text-xs text-slate-500 mt-2">Cruzando os 16 fatores de risco com o PMBOK e Ágil.</p></div>`;
                return;
            }

            const isAI = aiManagerSolutions !== null;
            const solutions = aiManagerSolutions || getStaticSolutions(MOCK_TEAMS_DATA[activeManagerTeam]);

            if (isAI) {
                btnsContainer.innerHTML = `<button onclick="aiManagerSolutions = null; renderManagerSolutions();" class="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"><i class="ph ph-arrows-clockwise"></i> Repor Visão Standard</button>`;
            } else {
                 btnsContainer.innerHTML = `<button onclick="generateManagerInsights()" class="flex items-center gap-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:scale-[1.02] active:scale-95 text-white shadow-lg shadow-purple-500/20 text-sm px-4 py-2 rounded-lg font-medium transition-all"><i class="ph ph-sparkle"></i> Gerar Soluções </button>`;
            }

            container.innerHTML = solutions.map(sol => `
                <div class="col-span-1 bg-white dark:bg-slate-800 p-5 rounded-xl border-t-4 shadow-sm flex flex-col gap-3 transition-all hover:-translate-y-1 ${isAI ? 'border-t-purple-500' : 'border-t-indigo-500'} fade-in">
                    <div class="flex justify-between items-start">
                        <span class="px-2 py-1 text-[10px] font-bold rounded uppercase ${sol.priority === 'Alta' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30'}">Prioridade ${sol.priority}</span>
                    </div>
                    <h4 class="font-bold text-slate-900 dark:text-white text-lg flex items-start gap-2 leading-tight">
                        ${isAI ? '<i class="ph-fill ph-sparkle text-purple-500 shrink-0 mt-1"></i>' : ''} ${sol.title}
                    </h4>
                    <p class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed"><strong class="text-indigo-600 dark:text-indigo-400">Ação:</strong> ${sol.action}</p>
                    <p class="text-slate-500 dark:text-slate-400 text-xs mt-auto pt-3 border-t border-slate-100 dark:border-slate-700"><span class="font-semibold text-slate-700 dark:text-slate-200">Impacto:</span> ${sol.impact}</p>
                </div>
            `).join('');
        }

        async function generateManagerInsights() {
            renderManagerSolutions(true);
            const teamData = MOCK_TEAMS_DATA[activeManagerTeam];
            const prompt = `Atue como um Agile Coach e Especialista na integração PMBOK+Ágil. Analise os seguintes fatores de saúde de uma equipa de software: ${JSON.stringify(teamData.factors)}. Contexto: Escala 1 a 5. Gere 3 recomendações táticas urgentes para o gestor. RESPONDA APENAS UM JSON VÁLIDO: [{ "title": "Nome da Ação", "action": "O que fazer", "impact": "Resultado", "priority": "Alta/Média/Baixa" }]`;
            const result = await callGemini(prompt);
            
            if (result) {
                try {
                    const cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();
                    aiManagerSolutions = JSON.parse(cleanJson);
                } catch (e) {
                    aiManagerSolutions = getStaticSolutions(teamData); 
                }
            } else {
                aiManagerSolutions = getStaticSolutions(teamData);
            }
            renderManagerSolutions();
        }

        // --- DEVELOPER ---
        function initDevDashboard() {
            renderDevForm();
            document.getElementById('devAiContainer').innerHTML = `<button onclick="generateDevTip()" class="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors backdrop-blur-sm"><i class="ph ph-sparkle"></i> Pedir Conselho Empático à IA</button>`;
        }

        function renderDevForm() {
            const container = document.getElementById('devFormContainer');
            if(!container) return;
            let html = '';
            Object.entries(CATEGORIES).forEach(([key, section], index) => {
                const isOpen = index === 0;
                let fieldsHtml = section.fields.map(field => `
                    <div class="mb-6 last:mb-0">
                        <div class="flex justify-between items-center mb-2">
                            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">${field.label}</label>
                            <span id="badge-${field.key}" class="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 transition-colors">${devFormData[field.key]}/5</span>
                        </div>
                        <input type="range" min="1" max="5" value="${devFormData[field.key]}" oninput="updateDevForm('${field.key}', this.value)" class="w-full h-2 rounded-lg appearance-none cursor-pointer">
                    </div>
                `).join('');
                html += `
                    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                        <button onclick="toggleAccordion('acc-${key}')" class="w-full p-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                            <div class="flex items-center gap-3">
                                <div class="p-2 rounded-lg bg-white dark:bg-slate-900 shadow-sm ${section.color}"><i class="ph ${section.icon} text-xl"></i></div>
                                <span class="font-bold text-slate-700 dark:text-slate-200">${section.label}</span>
                            </div>
                            <i id="acc-icon-${key}" class="ph ${isOpen ? 'ph-caret-up' : 'ph-caret-down'} text-slate-400"></i>
                        </button>
                        <div id="acc-${key}" class="${isOpen ? '' : 'hidden'} p-6 border-t border-slate-100 dark:border-slate-700">${fieldsHtml}</div>
                    </div>`;
            });
            container.innerHTML = html;
            Object.keys(devFormData).forEach(key => updateBadgeStyle(key, devFormData[key]));
        }

        function toggleAccordion(id) {
            const el = document.getElementById(id);
            const icon = document.getElementById(id.replace('acc-', 'acc-icon-'));
            if (el.classList.contains('hidden')) {
                el.classList.remove('hidden');
                icon.classList.remove('ph-caret-down'); icon.classList.add('ph-caret-up');
            } else {
                el.classList.add('hidden');
                icon.classList.remove('ph-caret-up'); icon.classList.add('ph-caret-down');
            }
        }

        function updateDevForm(key, value) {
            devFormData[key] = parseInt(value);
            document.getElementById(`badge-${key}`).innerText = `${value}/5`;
            updateBadgeStyle(key, value);
        }

        function updateBadgeStyle(key, value) {
            const badge = document.getElementById(`badge-${key}`);
            if(!badge) return;
            badge.className = "text-xs font-bold px-2 py-1 rounded-full transition-colors ";
            if (value <= 2) badge.className += 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300';
            else if (value == 3) badge.className += 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
            else badge.className += 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300';
        }

        async function generateDevTip() {
            const container = document.getElementById('devAiContainer');
            container.innerHTML = `<button disabled class="flex items-center gap-2 bg-white/20 text-white text-xs font-bold py-2 px-3 rounded-lg backdrop-blur-sm cursor-not-allowed"><i class="ph ph-spinner spin"></i> A processar...</button>`;
            const prompt = `Um programador preencheu o check-in. Dados: Cansaço Mental: ${devFormData.cansaco_mental}, Estresse: ${devFormData.estresse}. Dê um conselho curto (2 frases), empático e focado na saúde mental em Português de Portugal.`;
            const tip = await callGemini(prompt);
            
            if(tip) {
                container.innerHTML = `<div class="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20 fade-in"><div class="flex items-start gap-2"><i class="ph-fill ph-robot shrink-0 mt-1"></i><p class="text-sm italic">"${tip.replace(/"/g, '')}"</p></div></div>`;
            } else {
                 container.innerHTML = `<button onclick="generateDevTip()" class="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-2 px-3 rounded-lg backdrop-blur-sm"><i class="ph ph-warning-circle"></i> Falha. Tentar novamente.</button>`;
            }
        }

        function submitDevForm() {
            const modal = document.getElementById('successModal');
            modal.classList.remove('hidden-section');
            setTimeout(() => {
                modal.classList.add('hidden-section');
                Object.keys(devFormData).forEach(k => devFormData[k] = 3);
                initDevDashboard();
                window.scrollTo(0, 0);
            }, 2000);
        }

        // --- PDF EXPORT ---
        function exportToPDF() {
            const element = document.getElementById('pdfContent');
            const opt = {
                margin:       10,
                filename:     'Guia_Pratico_PMBOK_Agil.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            const originalClass = element.className;
            element.className = "pdf-content text-black bg-white";
            
            html2pdf().set(opt).from(element).save().then(() => {
                element.className = originalClass;
            });
        }

        // --- INICIALIZAÇÃO ---
        window.onload = () => {
            checkSystemTheme();
            // Iniciar com o menu Home visível
            navigate('home');
        };