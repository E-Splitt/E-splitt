import pandas as pd

file_path = 'Oct 19 - Nov 21.xlsx'

try:
    # Read the excel file without header
    df = pd.read_excel(file_path, header=None)
    
    print("Searching for potential header row...")
    for i, row in df.iterrows():
        # Convert row to string and check for keywords
        row_str = row.to_string()
        if 'Date' in str(row.values) or 'Description' in str(row.values):
            print(f"Found potential header at row {i}:")
            print(row.values)
            break
            
    print("\nFirst 5 rows with data (assuming header is found or just showing raw):")
    # Show rows that have at least 3 non-null values
    for i, row in df.iterrows():
        if row.count() > 3:
            print(f"Row {i}: {row.values}")
            if i > 15: break # Limit output
            
except Exception as e:
    print(f"Error reading excel file: {e}")
