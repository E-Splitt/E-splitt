import pandas as pd
import json
import numpy as np

file_path = 'Oct 19 - Nov 21.xlsx'
output_path = 'initialData.json'

try:
    # Read the excel file
    df = pd.read_excel(file_path)
    
    expenses = []
    
    # Iterate through rows
    for i, row in df.iterrows():
        # Access by position
        # 1: Date, 2: Description, 3: Amount, 4: Who Paid, 5: Hamza, 6: Zumair, 7: Faisal
        
        date_val = row.iloc[1]
        desc_val = row.iloc[2]
        
        # Skip invalid rows
        if pd.isna(date_val) and pd.isna(desc_val):
            continue
            
        if str(date_val) == 'Total' or str(desc_val) == 'Total':
            break
            
        # Helper to safely get float and handle NaN
        def get_float(val):
            try:
                f = float(val)
                if np.isnan(f):
                    return 0.0
                return f
            except:
                return 0.0

        amount_val = get_float(row.iloc[3])
        
        # Skip rows with 0 amount if they are likely headers (or check if date is 'Date')
        if str(date_val) == 'Date':
            continue
            
        # Skip rows that look like totals or garbage
        if str(desc_val) == 'TOTAL' or str(desc_val) == 'Per Person':
            continue

        expense = {
            "id": i,
            "date": str(date_val) if not pd.isna(date_val) else "",
            "description": str(desc_val) if not pd.isna(desc_val) else "",
            "amount": amount_val,
            "paidBy": str(row.iloc[4]).strip() if not pd.isna(row.iloc[4]) else "Unknown",
            "shares": {
                "Hamza": get_float(row.iloc[5]),
                "Zumair": get_float(row.iloc[6]),
                "Faisal": get_float(row.iloc[7])
            }
        }
        expenses.append(expense)
        
    with open(output_path, 'w') as f:
        json.dump(expenses, f, indent=2)
        
    print(f"Successfully converted {len(expenses)} expenses to {output_path}")
    
except Exception as e:
    print(f"Error converting excel file: {e}")
