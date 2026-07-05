// app.js - Lógica da calculadora Live Bartenders

let cardapio = [];
let selecao = [];

async function carregarDados() {
    try {
        const response = await fetch('data/receitas.json');
        cardapio = await response.json();
        renderizarCardapio();
        popularConvidados();
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
        container.innerHTML += `
            <div class="menu-item">
                <span>${r.Nome} (R$ ${r.Preco.toFixed(2)})</span>
                <button onclick="toggleCardapio(${i})">+</button>
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
    renderizarSelecao();
    calcular();
}

function renderizarSelecao() {
    const lista = document.getElementById('lista-selecionada');
    lista.innerHTML = selecao.map(i => `<li>${i.Nome}</li>`).join('');
}

function calcular() {
    const convidados = parseInt(document.getElementById('convidados').value) || 0;
    const consumoMedio = parseInt(document.getElementById('consumoMedio').value) || 0;
    const duracao = parseInt(document.getElementById('duracao').value) || 4;
    const local = document.getElementById('localizacao').value;

    const totalDrinks = convidados * consumoMedio;
    const precoMedio = selecao.length > 0 ? selecao.reduce((sum, item) => sum + item.Preco, 0) / selecao.length : 0;
    const custoInsumos = totalDrinks * (precoMedio * 0.3);
    const tempoMedioPorDrink = 3.5;
    const tempoTotalNecessario = totalDrinks * tempoMedioPorDrink;
    const bartendersNecessarios = Math.ceil(tempoTotalNecessario / (duracao * 60));
    
    const taxaHoraBase = 50; 
    let custoMaoObra = bartendersNecessarios * taxaHoraBase * duracao;
    if (duracao > 4) custoMaoObra += bartendersNecessarios * (taxaHoraBase * 1.5) * (duracao - 4);
    
    const frete = local ? 150 : 0;
    const total = custoInsumos + custoMaoObra + frete;

    const resumo = `Total Estimado: R$ ${total.toFixed(2)}`;
    document.getElementById('total').innerText = resumo;
    return resumo;
}

async function enviarWhatsApp() {
    const resumo = document.getElementById('total').innerText;
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
