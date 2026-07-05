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

# IDs das Bases
DB_INSUMOS_ID = "39489fb1-716f-8182-8c00-c5b4501abcc5"
DB_RECEITAS_ID = "39489fb1-716f-81a0-9a1a-d15478bd8703"

def add_page(db_id, properties):
    data = {"parent": {"database_id": db_id}, "properties": properties}
    response = requests.post("https://api.notion.com/v1/pages", headers=HEADERS, json=data)
    if response.status_code != 200:
        print(f"Erro ao adicionar página: {response.text}")
        return None
    return response.json()["id"]

# Receitas para adicionar
receitas_novas = [
    {"Nome": "Moscow Mule", "Preço Venda Sugerido": 30.0, "Margem (%)": 0.65},
    {"Nome": "Gin Tonic", "Preço Venda Sugerido": 28.0, "Margem (%)": 0.75},
    {"Nome": "Fitzgerald", "Preço Venda Sugerido": 32.0, "Margem (%)": 0.60},
]

for rec in receitas_novas:
    add_page(DB_RECEITAS_ID, {
        "Nome": {"title": [{"text": {"content": rec["Nome"]}}]},
        "Preço Venda Sugerido": {"number": rec["Preço Venda Sugerido"]},
        "Margem (%)": {"number": rec["Margem (%)"]}
    })

print("Receitas adicionadas ao Notion!")
