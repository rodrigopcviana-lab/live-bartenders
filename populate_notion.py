import os
import requests
from dotenv import load_dotenv
from pathlib import Path

# Configuração
ROOT = Path("/Users/rodrigocoelho62981483511/Desktop/Code 1")
load_dotenv(ROOT / ".env")
TOKEN = os.environ.get("NOTION_TOKEN")
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}

# IDs das Bases (obtidos na execução anterior)
DB_INSUMOS_ID = "39489fb1-716f-8182-8c00-c5b4501abcc5"
DB_RECEITAS_ID = "39489fb1-716f-81a0-9a1a-d15478bd8703"
DB_LINHAS_ID = "39489fb1-716f-814f-9f44-cbf99de72de1"

def add_page(db_id, properties):
    data = {"parent": {"database_id": db_id}, "properties": properties}
    response = requests.post("https://api.notion.com/v1/pages", headers=HEADERS, json=data)
    if response.status_code != 200:
        print(f"Erro ao adicionar página: {response.text}")
        return None
    return response.json()["id"]

# 1. Adicionar Insumos Básicos
insumos = {
    "Vodka": {"Nome": {"title": [{"text": {"content": "Vodka"}}]}, "Custo Unitário": {"number": 0.05}, "Unidade": {"select": {"name": "ml"}}, "Categoria": {"select": {"name": "destilado"}}},
    "Gin": {"Nome": {"title": [{"text": {"content": "Gin"}}]}, "Custo Unitário": {"number": 0.08}, "Unidade": {"select": {"name": "ml"}}, "Categoria": {"select": {"name": "destilado"}}},
    "Campari": {"Nome": {"title": [{"text": {"content": "Campari"}}]}, "Custo Unitário": {"number": 0.10}, "Unidade": {"select": {"name": "ml"}}, "Categoria": {"select": {"name": "destilado"}}},
    "Vermute Tinto": {"Nome": {"title": [{"text": {"content": "Vermute Tinto"}}]}, "Custo Unitário": {"number": 0.06}, "Unidade": {"select": {"name": "ml"}}, "Categoria": {"select": {"name": "destilado"}}},
    "Suco de Limão": {"Nome": {"title": [{"text": {"content": "Suco de Limão"}}]}, "Custo Unitário": {"number": 0.02}, "Unidade": {"select": {"name": "ml"}}, "Categoria": {"select": {"name": "fruta"}}},
    "Xarope de Açúcar": {"Nome": {"title": [{"text": {"content": "Xarope de Açúcar"}}]}, "Custo Unitário": {"number": 0.01}, "Unidade": {"select": {"name": "ml"}}, "Categoria": {"select": {"name": "xarope"}}},
    "Cerveja de Gengibre": {"Nome": {"title": [{"text": {"content": "Cerveja de Gengibre"}}]}, "Custo Unitário": {"number": 0.03}, "Unidade": {"select": {"name": "ml"}}, "Categoria": {"select": {"name": "xarope"}}},
}

insumo_ids = {}
for nome, props in insumos.items():
    insumo_ids[nome] = add_page(DB_INSUMOS_ID, props)

# 2. Adicionar Receita (Exemplo: Negroni)
negroni_id = add_page(DB_RECEITAS_ID, {
    "Nome": {"title": [{"text": {"content": "Negroni"}}]},
    "Preço Venda Sugerido": {"number": 35.00},
    "Margem (%)": {"number": 0.70}
})

# 3. Adicionar Linhas (Negroni)
linhas = [
    {"Receita": negroni_id, "Ingrediente": insumo_ids["Gin"], "Quantidade": 30},
    {"Receita": negroni_id, "Ingrediente": insumo_ids["Campari"], "Quantidade": 30},
    {"Receita": negroni_id, "Ingrediente": insumo_ids["Vermute Tinto"], "Quantidade": 30},
]

for linha in linhas:
    add_page(DB_LINHAS_ID, {
        "Nome": {"title": [{"text": {"content": "Linha"}}]},
        "Receita": {"relation": [{"id": linha["Receita"]}]},
        "Ingrediente": {"relation": [{"id": linha["Ingrediente"]}]},
        "Quantidade": {"number": linha["Quantidade"]}
    })

print("Dados básicos inseridos!")
