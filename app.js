// app.js - Lógica da calculadora Live Bartenders

let cardapio = [];

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
    
    // 0 a 200 de 25 em 25
    for (let i = 25; i <= 200; i += 25) {
        html += `<option value="${i}">${i}</option>`;
    }
    // 250 a 1000 de 50 em 50
    for (let i = 250; i <= 1000; i += 50) {
        html += `<option value="${i}">${i}</option>`;
    }
    select.innerHTML = html;
}

function renderizarCardapio() {
    const container = document.getElementById('calculadora');
    container.innerHTML = '<h2>Cardápio Disponível</h2>';
    cardapio.forEach(r => {
        container.innerHTML += `
            <div class="card">
                <h3>${r.Nome}</h3>
                <p>Preço Sugerido: R$ ${r.Preco.toFixed(2)}</p>
            </div>
        `;
    });
}

function calcular() {
    const convidados = parseInt(document.getElementById('convidados').value) || 0;
    const consumoMedio = parseInt(document.getElementById('consumoMedio').value) || 0;
    const duracao = parseInt(document.getElementById('duracao').value) || 4;
    const local = document.getElementById('localizacao').value;

    const totalDrinks = convidados * consumoMedio;
    const precoMedio = cardapio.reduce((sum, item) => sum + item.Preco, 0) / (cardapio.length || 1);
    const custoInsumos = totalDrinks * (precoMedio * 0.3);
    const tempoMedioPorDrink = 3.5;
    const tempoTotalNecessario = totalDrinks * tempoMedioPorDrink;
    const bartendersNecessarios = Math.ceil(tempoTotalNecessario / (duracao * 60));
    const taxaHoraBase = 50; 
    let custoMaoObra = bartendersNecessarios * taxaHoraBase * duracao;
    if (duracao > 4) custoMaoObra += bartendersNecessarios * (taxaHoraBase * 1.5) * (duracao - 4);
    const frete = local ? 150 : 0;
    const total = custoInsumos + custoMaoObra + frete;

    const resumo = `Total Estimado: R$ ${total.toFixed(2)} (Insumos: R$${custoInsumos.toFixed(0)} | Mão de Obra: R$${custoMaoObra.toFixed(0)})`;
    document.getElementById('total').innerText = resumo;
    return resumo;
}

async function enviarWhatsApp() {
    const resumo = calcular();
    const payload = {
        jid: "120363387729698011@g.us", // JID do grupo 'Anotações'
        message: `Novo Orçamento Live Bartenders:\n\n${resumo}`
    };

    try {
        const response = await fetch('http://localhost:8081/send_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) alert("Enviado para Anotações com sucesso!");
        else alert("Erro ao enviar para WhatsApp.");
    } catch (e) { alert("Erro de conexão com a bridge."); }
}

['convidados', 'consumoMedio', 'duracao', 'localizacao'].forEach(id => {
    document.getElementById(id).addEventListener('input', calcular);
});

carregarDados();
