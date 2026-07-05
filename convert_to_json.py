import pandas as pd
from pathlib import Path

DATA_DIR = Path("/Users/rodrigocoelho62981483511/Desktop/live-bartenders/data")

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
    print("Dados processados e salvos em receitas.json")

if __name__ == "__main__":
    process_data()
