// app.js - Lógica da calculadora Live Bartenders

// =============================================================
//  CONFIG — ajuste aqui os números do seu negócio (sem mexer na lógica)
// =============================================================
const CONFIG = {
    // Preço final ao cliente = custo total x MARKUP.
    //   2.0 => margem de 50%  |  2.5 => margem de 60%  |  3.0 => margem de ~67%
    MARKUP: 2.0,

    // Mão de obra
    TAXA_HORA_BARTENDER: 60,     // R$/hora por bartender
    MIN_POR_DRINK: 3.5,         // tempo médio de preparo de 1 drink (min)
    HORAS_EVENTO_BASE: 4,       // acima disto entra hora extra
    MULT_HORA_EXTRA: 1.5,       // multiplicador da hora extra

    // Frete por bairro (Imperatriz - MA) — ajuste conforme seus fretes reais
    FRETE_POR_BAIRRO: {
        "Centro": 50,
        "Bacuri": 70,
        "Jucara": 80,
        "Santa Rita": 90,
        "Vila Nova": 100,
        "Parque Anhanguera": 110,
        "Nova Imperatriz": 120,
        "Maranhao Novo": 130,
    },
    FRETE_PADRAO: 0, // usado se o bairro não estiver na tabela acima

    // WhatsApp: número que RECEBE o orçamento (DDI+DDD+número, só dígitos).
    // Deixe "" para abrir o WhatsApp e escolher o contato na hora.
    WHATSAPP_NUMERO: "5562981483511",
};

let cardapio = [];
let selecao = [];   // guarda IDs das receitas selecionadas
let chart = null;   // instância do Chart.js

async function carregarDados() {
    const container = document.getElementById('lista-cardapio');
    try {
        // caminho relativo robusto (funciona em GitHub Pages e local)
        const base = window.location.pathname.replace(/index\.html$/, '');
        const response = await fetch(base + 'data/receitas.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        cardapio = await response.json();
        renderizarCardapio();
        popularConvidados();
        carregarPresets();
        atualizarSyncInfo(base);
        atualizarContadorHistorico();
        calcular();
    } catch (e) {
        console.error("Erro ao carregar cardápio:", e);
        if (container) {
            container.innerHTML =
                '<p style="color:#d9534f">⚠ Não foi possível carregar o cardápio (data/receitas.json): ' +
                escapeHtml(e.message) + '. Rode a sincronização do Notion e recarregue a página.</p>';
        }
    }
}

async function atualizarSyncInfo(base) {
    const el = document.getElementById('sync-info');
    if (!el) return;
    let txt = `${cardapio.length} drinks carregados`;
    try {
        const r = await fetch(base + 'data/meta.json');
        if (r.ok) {
            const meta = await r.json();
            if (meta.gerado_em) {
                const d = new Date(meta.gerado_em);
                txt += ` · atualizado em ${d.toLocaleString('pt-BR')}`;
            }
        }
    } catch (_) { /* meta.json é opcional */ }
    el.innerText = txt;
}

function popularConvidados() {
    const select = document.getElementById('convidados');
    let html = '<option value="0">Selecione...</option>';
    for (let i = 25; i <= 200; i += 25) html += `<option value="${i}">${i}</option>`;
    for (let i = 250; i <= 1000; i += 50) html += `<option value="${i}">${i}</option>`;
    select.innerHTML = html;
}

// escapa texto para evitar quebra de HTML / XSS ao injetar nomes vindos do Notion
function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fichaIncompleta(receita) {
    return !receita.CustoReal || receita.CustoReal <= 0;
}

function renderizarCardapio() {
    const container = document.getElementById('lista-cardapio');
    container.innerHTML = '';
    if (!cardapio || cardapio.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhum drink disponível.</p>';
        return;
    }
    cardapio.forEach((r) => {
        const isSelected = selecao.includes(r.ID);
        const alerta = fichaIncompleta(r)
            ? '<span class="tag" title="Sem ficha técnica no Notion — custo tratado como R$0">⚠ ficha incompleta</span>'
            : '';
        const preco = r.PrecoVenda ? `<span class="price">${formatBRL(r.PrecoVenda)}</span>` : '';
        container.innerHTML += `
            <div class="menu-item${isSelected ? ' selected' : ''}">
                <span class="name">${escapeHtml(r.Nome)} ${preco} ${alerta}</span>
                <button class="icon-btn${isSelected ? ' remove' : ''}" onclick="toggleCardapio('${r.ID}')"
                        aria-label="${isSelected ? 'Remover' : 'Adicionar'} ${escapeHtml(r.Nome)}">
                    ${isSelected ? '−' : '+'}
                </button>
            </div>
        `;
    });
}

function toggleCardapio(id) {
    if (selecao.includes(id)) {
        selecao = selecao.filter(x => x !== id);
    } else {
        selecao.push(id);
    }
    renderizarCardapio();
    renderizarSelecao();
    calcular();
}

function renderizarSelecao() {
    const lista = document.getElementById('lista-selecionada');
    const selecionados = cardapio.filter(r => selecao.includes(r.ID));
    if (selecionados.length === 0) {
        lista.innerHTML = '<li class="empty-state">Nenhum drink selecionado ainda.</li>';
        return;
    }
    lista.innerHTML = selecionados
        .map(r => `<li>${escapeHtml(r.Nome)}${fichaIncompleta(r) ? ' <span class="tag">⚠</span>' : ''}</li>`)
        .join('');
}

function formatBRL(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Retorna o detalhamento completo do orçamento (usado pela UI e pelo WhatsApp)
function calcularOrcamento() {
    const convidados = Math.max(0, parseInt(document.getElementById('convidados').value) || 0);
    const consumoMedio = Math.max(0, parseInt(document.getElementById('consumoMedio').value) || 0);
    const duracao = Math.max(0, parseInt(document.getElementById('duracao').value) || 0);
    const local = document.getElementById('localizacao').value;
    const cliente = (document.getElementById('clienteNome')?.value || '').trim();

    const totalDrinks = convidados * consumoMedio;
    const selecionados = cardapio.filter(r => selecao.includes(r.ID));

    // Insumos: o total de drinks é DISTRIBUÍDO igualmente entre os tipos escolhidos.
    // Custo = totalDrinks * custo médio por drink do cardápio selecionado.
    let custoInsumos = 0;
    if (selecionados.length > 0 && totalDrinks > 0) {
        const custoMedioPorDrink =
            selecionados.reduce((s, r) => s + (r.CustoReal || 0), 0) / selecionados.length;
        custoInsumos = custoMedioPorDrink * totalDrinks;
    }

    // Mão de obra por produtividade
    const tempoTotalNecessario = totalDrinks * CONFIG.MIN_POR_DRINK; // minutos
    const duracaoMin = Math.max(1, duracao) * 60;
    const bartenders = totalDrinks > 0 ? Math.ceil(tempoTotalNecessario / duracaoMin) : 0;

    let custoMaoObra = bartenders * CONFIG.TAXA_HORA_BARTENDER * duracao;
    if (duracao > CONFIG.HORAS_EVENTO_BASE) {
        const extras = duracao - CONFIG.HORAS_EVENTO_BASE;
        custoMaoObra += bartenders * (CONFIG.TAXA_HORA_BARTENDER * CONFIG.MULT_HORA_EXTRA) * extras;
    }

    // Frete por bairro
    const frete = local ? (CONFIG.FRETE_POR_BAIRRO[local] ?? CONFIG.FRETE_PADRAO) : 0;

    const custoTotal = custoInsumos + custoMaoObra + frete;
    const precoCliente = custoTotal * CONFIG.MARKUP;
    const margem = precoCliente - custoTotal;

    const semFicha = selecionados.filter(fichaIncompleta).map(r => r.Nome);

    return {
        convidados, consumoMedio, duracao, local, cliente, totalDrinks, bartenders,
        custoInsumos, custoMaoObra, frete, custoTotal, precoCliente, margem,
        selecionados, semFicha,
    };
}

function calcular() {
    const o = calcularOrcamento();

    document.getElementById('total').innerText = formatBRL(o.precoCliente);

    const chipD = document.getElementById('chip-drinks');
    const chipB = document.getElementById('chip-bartenders');
    if (chipD) chipD.innerText = `${o.totalDrinks} drinks`;
    if (chipB) chipB.innerText = `${o.bartenders} bartender${o.bartenders === 1 ? '' : 's'}`;

    const line = (label, val, cls = '') =>
        `<div class="line ${cls}"><span>${label}</span><span>${formatBRL(val)}</span></div>`;
    const elDet = document.getElementById('detalhamento');
    if (elDet) {
        elDet.innerHTML =
            line('Insumos', o.custoInsumos) +
            line('Mão de obra', o.custoMaoObra) +
            line(`Frete${o.local ? ' (' + escapeHtml(o.local) + ')' : ''}`, o.frete) +
            line('Custo total', o.custoTotal, 'divider strong') +
            line(`Margem (${CONFIG.MARKUP}x)`, o.margem, 'margin');
    }

    const aviso = document.getElementById('aviso-ficha');
    if (aviso) {
        if (o.semFicha.length) {
            aviso.hidden = false;
            aviso.innerHTML =
                `⚠ Sem ficha técnica (custo R$0): ${o.semFicha.map(escapeHtml).join(', ')}. ` +
                `O custo real está subestimado.`;
        } else {
            aviso.hidden = true;
        }
    }

    renderChart(o);
    return o;
}

function renderChart(o) {
    const canvas = document.getElementById('myChart');
    if (!canvas || typeof Chart === 'undefined') return; // Chart.js pode estar bloqueado (offline)
    const data = {
        labels: ['Insumos', 'Mão de obra', 'Frete', 'Margem'],
        datasets: [{
            data: [o.custoInsumos, o.custoMaoObra, o.frete, o.margem],
            backgroundColor: ['#4e79a7', '#59a14f', '#9c755f', '#d4af37'],
            borderWidth: 0,
        }],
    };
    if (chart) {
        chart.data = data;
        chart.update();
    } else {
        chart = new Chart(canvas, {
            type: 'doughnut',
            data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#c9c9cf', padding: 12, boxWidth: 12, font: { size: 11 } },
                    },
                },
            },
        });
    }
}

// ---------- Presets (localStorage) ----------
const PRESETS_KEY = 'lb_presets';

function lerPresets() {
    try { return JSON.parse(localStorage.getItem(PRESETS_KEY)) || {}; }
    catch (_) { return {}; }
}

function salvarPreset() {
    const nome = prompt('Nome do preset (ex: Casamento 100 pessoas):');
    if (!nome) return;
    const presets = lerPresets();
    presets[nome] = {
        convidados: document.getElementById('convidados').value,
        consumoMedio: document.getElementById('consumoMedio').value,
        duracao: document.getElementById('duracao').value,
        localizacao: document.getElementById('localizacao').value,
        selecao: [...selecao],
    };
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    carregarPresets();
    alert('Preset salvo!');
}

function carregarPresets() {
    const select = document.getElementById('presets');
    if (!select) return;
    const presets = lerPresets();
    const nomes = Object.keys(presets);
    select.innerHTML = '<option value="">Carregar preset...</option>' +
        nomes.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
}

function aplicarPreset(nome) {
    if (!nome) return;
    const p = lerPresets()[nome];
    if (!p) return;
    document.getElementById('convidados').value = p.convidados;
    document.getElementById('consumoMedio').value = p.consumoMedio;
    document.getElementById('duracao').value = p.duracao;
    document.getElementById('localizacao').value = p.localizacao;
    selecao = Array.isArray(p.selecao) ? [...p.selecao] : [];
    renderizarCardapio();
    renderizarSelecao();
    calcular();
}

// ---------- Histórico / Galeria de orçamentos ----------
const HISTORICO_KEY = 'lb_historico';

function lerHistorico() {
    try { return JSON.parse(localStorage.getItem(HISTORICO_KEY)) || []; }
    catch (_) { return []; }
}

function gravarHistorico(lista) {
    localStorage.setItem(HISTORICO_KEY, JSON.stringify(lista));
    atualizarContadorHistorico(lista);
}

function atualizarContadorHistorico(lista) {
    const el = document.getElementById('historico-count');
    if (!el) return;
    const n = (lista || lerHistorico()).length;
    el.innerText = n > 0 ? `(${n})` : '';
}

// Salva um snapshot do orçamento atual no histórico (não é editável depois — é uma "foto" do momento).
function salvarNoHistorico(status) {
    const o = calcularOrcamento();
    const historico = lerHistorico();
    historico.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        criadoEm: new Date().toISOString(),
        cliente: (document.getElementById('clienteNome').value || '').trim(),
        status: status || 'rascunho',
        convidados: o.convidados,
        consumoMedio: o.consumoMedio,
        duracao: o.duracao,
        localizacao: o.local,
        selecao: [...selecao],
        totais: {
            custoInsumos: o.custoInsumos,
            custoMaoObra: o.custoMaoObra,
            frete: o.frete,
            custoTotal: o.custoTotal,
            precoCliente: o.precoCliente,
            margem: o.margem,
        },
        drinksNomes: o.selecionados.map(r => r.Nome),
    });
    gravarHistorico(historico);
    if (document.getElementById('view-historico') && !document.getElementById('view-historico').hidden) {
        renderizarGaleria();
    }
}

function mostrarView(view) {
    const calc = document.getElementById('view-calculadora');
    const hist = document.getElementById('view-historico');
    const tabCalc = document.getElementById('tab-calculadora');
    const tabHist = document.getElementById('tab-historico');
    const isHist = view === 'historico';
    calc.hidden = isHist;
    hist.hidden = !isHist;
    tabCalc.classList.toggle('active', !isHist);
    tabHist.classList.toggle('active', isHist);
    if (isHist) renderizarGaleria();
}

function statusLabel(status) {
    return { rascunho: 'Rascunho', enviado: 'Enviado', fechado: 'Fechado' }[status] || status;
}

function renderizarGaleria() {
    const container = document.getElementById('galeria-lista');
    if (!container) return;
    const historico = lerHistorico();
    atualizarContadorHistorico(historico);

    if (historico.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhum orçamento salvo ainda. Envie um orçamento pelo WhatsApp para ele aparecer aqui.</p>';
        return;
    }

    container.innerHTML = historico.map(h => {
        const data = new Date(h.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        const titulo = h.cliente ? escapeHtml(h.cliente) : `${h.convidados} convidados`;
        const drinks = h.drinksNomes.length ? h.drinksNomes.map(escapeHtml).join(', ') : 'sem drinks selecionados';
        return `
            <div class="quote-item">
                <div class="quote-item-head">
                    <div>
                        <div class="quote-item-title">${titulo}</div>
                        <div class="quote-item-date">${data}</div>
                    </div>
                    <div class="quote-item-total">${formatBRL(h.totais.precoCliente)}</div>
                </div>
                <div class="quote-item-chips">
                    <span class="chip">${h.convidados} convidados</span>
                    <span class="chip">${h.duracao}h</span>
                    ${h.localizacao ? `<span class="chip">${escapeHtml(h.localizacao)}</span>` : ''}
                </div>
                <div class="quote-item-drinks">${drinks}</div>
                <select class="status-select status-${h.status}" onchange="mudarStatusHistorico('${h.id}', this.value)">
                    <option value="rascunho" ${h.status === 'rascunho' ? 'selected' : ''}>Rascunho</option>
                    <option value="enviado" ${h.status === 'enviado' ? 'selected' : ''}>Enviado</option>
                    <option value="fechado" ${h.status === 'fechado' ? 'selected' : ''}>Fechado</option>
                </select>
                <div class="quote-item-actions">
                    <button class="btn btn-ghost" onclick="reabrirOrcamento('${h.id}')">Reabrir</button>
                    <button class="btn btn-danger" onclick="excluirOrcamento('${h.id}')">Excluir</button>
                </div>
            </div>
        `;
    }).join('');
}

function mudarStatusHistorico(id, novoStatus) {
    const historico = lerHistorico();
    const item = historico.find(h => h.id === id);
    if (item) item.status = novoStatus;
    gravarHistorico(historico);
    renderizarGaleria();
}

function excluirOrcamento(id) {
    if (!confirm('Excluir este orçamento do histórico?')) return;
    const historico = lerHistorico().filter(h => h.id !== id);
    gravarHistorico(historico);
    renderizarGaleria();
}

function reabrirOrcamento(id) {
    const item = lerHistorico().find(h => h.id === id);
    if (!item) return;
    document.getElementById('clienteNome').value = item.cliente || '';
    document.getElementById('convidados').value = item.convidados;
    document.getElementById('consumoMedio').value = item.consumoMedio;
    document.getElementById('duracao').value = item.duracao;
    document.getElementById('localizacao').value = item.localizacao || '';
    selecao = Array.isArray(item.selecao) ? [...item.selecao] : [];
    renderizarCardapio();
    renderizarSelecao();
    calcular();
    mostrarView('calculadora');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- WhatsApp ----------
function montarMensagem(o) {
    const linhas = [
        '*Orçamento Live Bartenders*',
        '',
        o.cliente ? `Cliente/evento: ${o.cliente}` : null,
        `Convidados: ${o.convidados}`,
        `Consumo médio: ${o.consumoMedio} drinks/pessoa`,
        `Duração: ${o.duracao}h`,
        o.local ? `Local: ${o.local}` : null,
        '',
        o.selecionados.length ? `Cardápio: ${o.selecionados.map(r => r.Nome).join(', ')}` : 'Cardápio: (nenhum selecionado)',
        '',
        `Insumos: ${formatBRL(o.custoInsumos)}`,
        `Mão de obra (${o.bartenders} bartender(s)): ${formatBRL(o.custoMaoObra)}`,
        `Frete: ${formatBRL(o.frete)}`,
        '',
        `*Total: ${formatBRL(o.precoCliente)}*`,
    ];
    return linhas.filter(l => l !== null).join('\n');
}

// Abre o WhatsApp com o orçamento já escrito (celular e WhatsApp Web),
// sem bridge local e sem servidor.
function enviarWhatsApp() {
    const o = calcularOrcamento();
    const texto = encodeURIComponent(montarMensagem(o));
    const num = CONFIG.WHATSAPP_NUMERO || '';
    window.open(`https://wa.me/${num}?text=${texto}`, '_blank');
    salvarNoHistorico('enviado');
}

['convidados', 'consumoMedio', 'duracao', 'localizacao'].forEach(id => {
    document.getElementById(id).addEventListener('input', calcular);
});

carregarDados();
