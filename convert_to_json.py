import json
from datetime import datetime, timezone
import pandas as pd
from pathlib import Path

# Caminho relativo ao próprio repositório (portável / funciona em CI).
DATA_DIR = Path(__file__).resolve().parent / "data"

def process_data():
    insumos = pd.read_parquet(DATA_DIR / "insumos.parquet")
    receitas = pd.read_parquet(DATA_DIR / "receitas.parquet")
    linhas = pd.read_parquet(DATA_DIR / "linhas.parquet")

    # Calcular custo da receita
    # Linhas de receita (Quantidade) * Insumos (Custo Unitário)
    # Supondo que Unidade seja ml, precisamos garantir que o custo está por ml.
    # Se o custo unitário no Notion for por ml/g/uni, a conta é direta.
    
    # Renomear custo para ficar claro
    insumos = insumos.rename(columns={'Custo': 'CustoUnitario', 'ID': 'InsumoID'})
    
    linhas_com_custo = linhas.merge(insumos[['InsumoID', 'CustoUnitario']], left_on='Ingrediente', right_on='InsumoID')
    linhas_com_custo['CustoLinha'] = linhas_com_custo['Quantidade'] * linhas_com_custo['CustoUnitario']
    
    custo_por_receita = linhas_com_custo.groupby('Receita')['CustoLinha'].sum().reset_index()
    
    # Merge com receitas
    receitas_finais = receitas.merge(custo_por_receita, left_on='ID', right_on='Receita', how='left')
    receitas_finais['CustoReal'] = receitas_finais['CustoLinha'].fillna(0)
    
    # Renomear para o frontend
    receitas_finais = receitas_finais.rename(columns={'Preco': 'PrecoVenda'})
    
    receitas_finais.to_json(DATA_DIR / "receitas.json", orient="records", indent=2)

    # Timestamp da sincronização (exibido no rodapé do app via #sync-info)
    (DATA_DIR / "meta.json").write_text(
        json.dumps({"gerado_em": datetime.now(timezone.utc).isoformat()}, indent=2)
    )
    print("Dados processados e salvos em receitas.json")

    # Aviso: receitas sem ficha técnica (custo R$0) — precisam de Linhas de Receita no Notion
    sem_ficha = receitas_finais[receitas_finais["CustoReal"] <= 0]["Nome"].tolist()
    if sem_ficha:
        print("AVISO — sem ficha técnica (custo R$0):", ", ".join(sem_ficha))

if __name__ == "__main__":
    process_data()
