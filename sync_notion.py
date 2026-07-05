import os
import json
import pandas as pd
import requests
from pathlib import Path
from dotenv import load_dotenv

# Configuração
ROOT = Path("/Users/rodrigocoelho62981483511/Desktop/Code 1")
OUT_DIR = Path("/Users/rodrigocoelho62981483511/Desktop/live-bartenders/data")
OUT_DIR.mkdir(parents=True, exist_ok=True)

load_dotenv(ROOT / ".env")
TOKEN = os.environ.get("NOTION_TOKEN")
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}

# IDs das Bases
DB_MAP = {
    "insumos": "39489fb1-716f-8182-8c00-c5b4501abcc5",
    "receitas": "39489fb1-716f-81a0-9a1a-d15478bd8703",
    "linhas": "39489fb1-716f-814f-9f44-cbf99de72de1"
}

def get_db_data(db_id):
    url = f"https://api.notion.com/v1/databases/{db_id}/query"
    response = requests.post(url, headers=HEADERS, json={})
    return response.json().get("results", [])

def sync():
    # 1. Sync Insumos
    insumos = get_db_data(DB_MAP["insumos"])
    df_insumos = pd.DataFrame([
        {
            "ID": p["id"],
            "Nome": p["properties"]["Nome"]["title"][0]["text"]["content"],
            "Custo": p["properties"]["Custo Unitário"]["number"],
            "Unidade": p["properties"]["Unidade"]["select"]["name"],
        }
        for p in insumos
    ])
    df_insumos.to_parquet(OUT_DIR / "insumos.parquet")
    print("Insumos sincronizados.")

    # 2. Sync Receitas
    receitas = get_db_data(DB_MAP["receitas"])
    df_receitas = pd.DataFrame([
        {
            "ID": p["id"],
            "Nome": p["properties"]["Nome"]["title"][0]["text"]["content"],
            "Preco": p["properties"]["Preço Venda Sugerido"]["number"],
        }
        for p in receitas
    ])
    df_receitas.to_parquet(OUT_DIR / "receitas.parquet")
    print("Receitas sincronizadas.")

    # 3. Sync Linhas de Receita
    linhas = get_db_data(DB_MAP["linhas"])
    df_linhas = pd.DataFrame([
        {
            "ID": p["id"],
            "Receita": p["properties"]["Receita"]["relation"][0]["id"] if p["properties"]["Receita"]["relation"] else None,
            "Ingrediente": p["properties"]["Ingrediente"]["relation"][0]["id"] if p["properties"]["Ingrediente"]["relation"] else None,
            "Quantidade": p["properties"]["Quantidade"]["number"],
        }
        for p in linhas
    ])
    df_linhas.to_parquet(OUT_DIR / "linhas.parquet")
    print("Linhas de receita sincronizadas.")

if __name__ == "__main__":
    sync()
