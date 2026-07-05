import pandas as pd
from pathlib import Path

DATA_DIR = Path("/Users/rodrigocoelho62981483511/Desktop/live-bartenders/data")

def parquet_to_json():
    for parquet_file in DATA_DIR.glob("*.parquet"):
        df = pd.read_parquet(parquet_file)
        json_file = parquet_file.with_suffix(".json")
        df.to_json(json_file, orient="records", indent=2)
        print(f"Convertido: {parquet_file.name} -> {json_file.name}")

if __name__ == "__main__":
    parquet_to_json()
