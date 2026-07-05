// app.js - Lógica da calculadora Live Bartenders

let cardapio = [];

async function carregarDados() {
    try {
        const response = await fetch('data/receitas.json');
        cardapio = await response.json();
        renderizarCardapio();
    } catch (e) { console.error("Erro ao carregar:", e); }
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

// Atualizar o HTML para incluir botão de enviar
// Adicione o botão no index.html ou aqui via manipulação
// document.getElementById('orcamento').innerHTML += '<button onclick="enviarWhatsApp()">Enviar para WhatsApp</button>';

['convidados', 'consumoMedio', 'duracao', 'localizacao'].forEach(id => {
    document.getElementById(id).addEventListener('input', calcular);
});

carregarDados();
