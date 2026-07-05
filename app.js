// app.js - Lógica da calculadora Live Bartenders

let cardapio = [];
let selecao = [];
let chart;

async function carregarDados() {
    try {
        const [rRes, sRes] = await Promise.all([
            fetch('data/receitas.json'),
            fetch('data/sync_info.json')
        ]);
        cardapio = await rRes.json();
        const syncInfo = await sRes.json();
        document.getElementById('sync-info').innerText = `Dados sincronizados em: ${new Date(syncInfo.last_sync).toLocaleString()}`;
        
        renderizarCardapio();
        popularConvidados();
        inicializarGrafico();
        carregarPreset();
    } catch (e) { console.error("Erro ao carregar:", e); }
}

function popularConvidados() {
    const select = document.getElementById('convidados');
    let html = '<option value="0">Selecione...</option>';
    for (let i = 25; i <= 200; i += 25) html += `<option value="${i}">${i}</option>`;
    for (let i = 250; i <= 1000; i += 50) html += `<option value="${i}">${i}</option>`;
    select.innerHTML = html;
}

function renderizarCardapio() {
    const container = document.getElementById('lista-cardapio');
    container.innerHTML = '';
    cardapio.forEach((r, i) => {
        const isSelected = selecao.includes(r);
        container.innerHTML += `
            <div class="menu-item">
                <span>${r.Nome}</span>
                <button onclick="toggleCardapio(${i})" style="background-color: ${isSelected ? '#d9534f' : '#444'}">
                    ${isSelected ? 'Remover' : '+'}
                </button>
            </div>
        `;
    });
}

function toggleCardapio(index) {
    const item = cardapio[index];
    if (selecao.includes(item)) {
        selecao = selecao.filter(i => i !== item);
    } else {
        selecao.push(item);
    }
    renderizarCardapio();
    renderizarSelecao();
    calcular();
}

function renderizarSelecao() {
    const lista = document.getElementById('lista-selecionada');
    lista.innerHTML = selecao.map(i => `<li>${i.Nome}</li>`).join('');
}

function inicializarGrafico() {
    const ctx = document.getElementById('myChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Insumos', 'Mão de Obra', 'Frete'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#d4af37', '#444', '#333'] }] },
        options: { responsive: true, plugins: { legend: { labels: { color: 'white' } } } }
    });
}

function atualizarGrafico(insumos, maoObra, frete) {
    chart.data.datasets[0].data = [insumos, maoObra, frete];
    chart.update();
}

function calcular() {
    const convidados = Math.max(0, parseInt(document.getElementById('convidados').value) || 0);
    const consumoMedio = Math.max(0, parseInt(document.getElementById('consumoMedio').value) || 0);
    const duracao = Math.max(0, parseInt(document.getElementById('duracao').value) || 0);
    const local = document.getElementById('localizacao').value;

    const totalDrinks = convidados * consumoMedio;
    const custoInsumos = selecao.length > 0 ? selecao.reduce((sum, item) => sum + (item.CustoReal * consumoMedio * convidados), 0) : 0;
    const tempoMedioPorDrink = 3.5;
    const tempoTotalNecessario = totalDrinks * tempoMedioPorDrink;
    const duracaoMin = Math.max(1, duracao) * 60;
    const bartendersNecessarios = Math.ceil(tempoTotalNecessario / duracaoMin);
    
    const taxaHoraBase = 50; 
    let custoMaoObra = bartendersNecessarios * taxaHoraBase * duracao;
    if (duracao > 4) custoMaoObra += bartendersNecessarios * (taxaHoraBase * 1.5) * (duracao - 4);
    
    const frete = local ? 150 : 0;
    const total = Math.max(0, custoInsumos + custoMaoObra + frete);

    document.getElementById('total').innerText = `Total Estimado: R$ ${total.toFixed(2)}`;
    atualizarGrafico(custoInsumos, custoMaoObra, frete);
    return `Total Estimado: R$ ${total.toFixed(2)} (Insumos: R$${custoInsumos.toFixed(0)} | Mão de Obra: R$${custoMaoObra.toFixed(0)})`;
}

function salvarPreset() {
    const preset = {
        convidados: document.getElementById('convidados').value,
        consumoMedio: document.getElementById('consumoMedio').value,
        duracao: document.getElementById('duracao').value,
        local: document.getElementById('localizacao').value,
        selecao: selecao
    };
    localStorage.setItem('liveBartendersPreset', JSON.stringify(preset));
    alert("Preset salvo!");
}

function carregarPreset() {
    const saved = localStorage.getItem('liveBartendersPreset');
    if (saved) {
        const preset = JSON.parse(saved);
        document.getElementById('convidados').value = preset.convidados;
        document.getElementById('consumoMedio').value = preset.consumoMedio;
        document.getElementById('duracao').value = preset.duracao;
        document.getElementById('localizacao').value = preset.local;
        selecao = preset.selecao;
        renderizarCardapio();
        renderizarSelecao();
        calcular();
    }
}

async function enviarWhatsApp() {
    const resumo = calcular();
    const payload = { jid: "120363387729698011@g.us", message: `Orçamento Live Bartenders:\n\n${resumo}` };
    try {
        const response = await fetch('http://localhost:8081/send_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) alert("Enviado!");
        else alert("Erro ao enviar.");
    } catch (e) { alert("Erro de conexão."); }
}

['convidados', 'consumoMedio', 'duracao', 'localizacao'].forEach(id => {
    document.getElementById(id).addEventListener('input', calcular);
});

carregarDados();
