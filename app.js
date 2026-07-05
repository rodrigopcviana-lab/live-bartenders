// app.js - Lógica da calculadora Live Bartenders

let cardapio = [];
let selecao = [];

async function carregarDados() {
    try {
        console.log("Iniciando fetch de data/receitas.json...");
        const response = await fetch('data/receitas.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        cardapio = await response.json();
        console.log("Cardápio carregado:", cardapio);
        
        renderizarCardapio();
        popularConvidados();
    } catch (e) { 
        console.error("Erro ao carregar cardápio:", e); 
        document.getElementById('lista-cardapio').innerHTML = '<p style="color:red">Erro ao carregar cardápio. Verifique o console.</p>';
    }
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
    if (!cardapio || cardapio.length === 0) {
        container.innerHTML = '<p>Nenhum drink disponível.</p>';
        return;
    }
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

function calcular() {
    const convidados = Math.max(0, parseInt(document.getElementById('convidados').value) || 0);
    const consumoMedio = Math.max(0, parseInt(document.getElementById('consumoMedio').value) || 0);
    const duracao = Math.max(0, parseInt(document.getElementById('duracao').value) || 0);
    const local = document.getElementById('localizacao').value;

    const totalDrinks = convidados * consumoMedio;
    const custoInsumosTotal = selecao.length > 0 ? (totalDrinks / selecao.length) * selecao.reduce((sum, item) => sum + (item.CustoReal || 0), 0) : 0;
    
    const tempoTotalNecessario = totalDrinks * 3.5; // CONFIG.tempoMedioPorDrink
    const duracaoMin = Math.max(1, duracao) * 60;
    const bartendersNecessarios = Math.ceil(tempoTotalNecessario / duracaoMin);
    
    let custoMaoObra = bartendersNecessarios * 60 * duracao; // CONFIG.taxaHoraBase
    if (duracao > 4) custoMaoObra += bartendersNecessarios * (60 * 1.5) * (duracao - 4);
    
    const fretes = { "Centro": 50, "Bacuri": 70, "Jucara": 80, "Santa Rita": 90, "Vila Nova": 100, "Parque Anhanguera": 110, "Nova Imperatriz": 120, "Maranhao Novo": 130 };
    const frete = fretes[local] || 0;
    
    const custoTotal = custoInsumosTotal + custoMaoObra + frete;
    const precoVenda = custoTotal * 2.0; // CONFIG.markup

    const resumo = `Total a Cobrar: R$ ${precoVenda.toFixed(2)} (Custo: R$${custoTotal.toFixed(0)})`;
    const detalhamento = `Detalhamento:\n- Insumos: R$${custoInsumosTotal.toFixed(0)}\n- Mão de Obra: R$${custoMaoObra.toFixed(0)}\n- Frete: R$${frete.toFixed(0)}`;
    
    document.getElementById('total').innerText = resumo;
    document.getElementById('detalhamento').innerText = detalhamento;
    
    return `${resumo}\n\n${detalhamento}`;
}

async function enviarWhatsApp() {
    const resumo = calcular();
    const url = `https://wa.me/5562981483511?text=${encodeURIComponent(resumo)}`;
    window.open(url, '_blank');
}

['convidados', 'consumoMedio', 'duracao', 'localizacao'].forEach(id => {
    document.getElementById(id).addEventListener('input', calcular);
});

carregarDados();
