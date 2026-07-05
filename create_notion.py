import os
import requests
import json
from dotenv import load_dotenv
from pathlib import Path

# Configuração
ROOT = Path("/Users/rodrigocoelho62981483511/Desktop/Code 1")
load_dotenv(ROOT / ".env")
TOKEN = os.environ.get("NOTION_TOKEN")
PAGE_ID = "39489fb1716f8099afdec2d7577fc86d"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}

def create_db(title, properties):
    data = {
        "parent": {"type": "page_id", "page_id": PAGE_ID},
        "title": [{"type": "text", "text": {"content": title}}],
        "properties": properties
    }
    response = requests.post("https://api.notion.com/v1/databases", headers=HEADERS, json=data)
    if response.status_code != 200:
        print(f"Erro ao criar {title}: {response.text}")
        return None
    db_id = response.json()["id"]
    print(f"Criado: {title} (ID: {db_id})")
    return db_id

# Definição das Bases
insumos_props = {
    "Nome": {"title": {}},
    "Custo Unitário": {"number": {"format": "real"}},
    "Unidade": {"select": {"options": [{"name": "ml"}, {"name": "g"}, {"name": "uni"}]}},
    "Categoria": {"select": {"options": [{"name": "destilado"}, {"name": "xarope"}, {"name": "fruta"}]}}
}

receitas_props = {
    "Nome": {"title": {}},
    "Preço Venda Sugerido": {"number": {"format": "real"}},
    "Margem (%)": {"number": {"format": "percent"}}
}

# Criar Bases
db_insumos_id = create_db("Insumos - Live Bartenders", insumos_props)
db_receitas_id = create_db("Receitas - Live Bartenders", receitas_props)

# Linhas de Receita precisa das relações, então precisamos dos IDs acima
if db_insumos_id and db_receitas_id:
    linhas_props = {
        "Nome": {"title": {}},
        "Receita": {"relation": {"database_id": db_receitas_id, "type": "single_property", "single_property": {}}},
        "Ingrediente": {"relation": {"database_id": db_insumos_id, "type": "single_property", "single_property": {}}},
        "Quantidade": {"number": {"format": "number"}}
    }
    create_db("Linhas de Receita - Live Bartenders", linhas_props)
