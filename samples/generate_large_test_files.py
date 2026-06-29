#!/usr/bin/env python3
"""
Generate large test files for file size limit testing.

Usage:
    python3 generate_large_test_files.py

Generates:
    - test_60mb_original.csv  (~63 MB, 550K rows) - triggers WARNING (>50MB)
    - test_60mb_modified.csv  (~63 MB, 550K rows) - triggers WARNING (>50MB)  
    - test_250mb_blocked.csv  (250 MB)            - triggers BLOCK (>200MB)

Expected behavior in FileDiff Pro:
    - 60MB files: Amber warning "Large files may take longer to process"
    - 250MB file: Red error "Exceeds the 200 MB limit", file NOT loaded
"""

import random
import os

def generate_files():
    print("Generating large test files...")
    
    departments = ['Engineering','Marketing','Finance','HR','Product','Sales','Operations','Legal','Support','Analytics']
    cities = ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego','Dallas','Austin']
    states = ['NY','CA','IL','TX','AZ','PA','TX','CA','TX','TX']
    statuses = ['active','active','active','active','active','inactive','on_leave']
    first_names = ['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda','David','Elizabeth','William','Sarah','Thomas','Jessica','Charles','Karen','Daniel','Nancy','Matthew','Lisa']
    last_names = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin']
    
    headers = 'id,first_name,last_name,email,department,salary,hire_date,city,state,zip_code,phone,status\n'
    row_count = 550000
    
    # Generate original file
    print(f"  Generating test_60mb_original.csv ({row_count} rows)...")
    with open('test_60mb_original.csv', 'w') as f:
        f.write(headers)
        for i in range(1, row_count + 1):
            fn = random.choice(first_names)
            ln = random.choice(last_names)
            dept = random.choice(departments)
            city_idx = random.randint(0, len(cities)-1)
            row = f"{i},{fn},{ln},{fn.lower()}.{ln.lower()}{i}@company.com,{dept},{random.randint(45000,180000)},20{random.randint(15,24):02d}-{random.randint(1,12):02d}-{random.randint(1,28):02d},{cities[city_idx]},{states[city_idx]},{random.randint(10000,99999)},{random.randint(200,999)}-{random.randint(100,999)}-{random.randint(1000,9999)},{random.choice(statuses)}\n"
            f.write(row)
    
    size = os.path.getsize('test_60mb_original.csv') / (1024*1024)
    print(f"    Created: {size:.1f} MB")
    
    # Generate modified file (5% changes, some adds/removes)
    print(f"  Generating test_60mb_modified.csv...")
    modified = 0
    removed = 0
    
    with open('test_60mb_original.csv', 'r') as fin, open('test_60mb_modified.csv', 'w') as fout:
        header_line = fin.readline()
        fout.write(header_line)
        
        for line in fin:
            r = random.random()
            if r < 0.003:
                removed += 1
                continue
            if r < 0.053:
                parts = line.strip().split(',')
                parts[5] = str(int(parts[5]) + random.randint(-10000, 15000))
                if random.random() < 0.3:
                    parts[4] = random.choice(departments)
                if random.random() < 0.2:
                    parts[11] = random.choice(statuses)
                fout.write(','.join(parts) + '\n')
                modified += 1
            else:
                fout.write(line)
        
        # Add new rows
        added = 2000
        for i in range(row_count + 1, row_count + added + 1):
            fn = random.choice(first_names)
            ln = random.choice(last_names)
            dept = random.choice(departments)
            city_idx = random.randint(0, len(cities)-1)
            row = f"{i},{fn},{ln},{fn.lower()}.{ln.lower()}{i}@company.com,{dept},{random.randint(45000,180000)},20{random.randint(15,24):02d}-{random.randint(1,12):02d}-{random.randint(1,28):02d},{cities[city_idx]},{states[city_idx]},{random.randint(10000,99999)},{random.randint(200,999)}-{random.randint(100,999)}-{random.randint(1000,9999)},{random.choice(statuses)}\n"
            fout.write(row)
    
    size = os.path.getsize('test_60mb_modified.csv') / (1024*1024)
    print(f"    Created: {size:.1f} MB (modified: {modified}, removed: {removed}, added: {added})")
    
    # Generate blocked file (250MB of dummy data)
    print("  Generating test_250mb_blocked.csv (250 MB - should be BLOCKED)...")
    with open('test_250mb_blocked.csv', 'wb') as f:
        f.write(b'id,data\n')
        chunk = b'1,' + b'x' * 1000 + b'\n'
        target = 250 * 1024 * 1024
        written = 7  # header
        while written < target:
            f.write(chunk)
            written += len(chunk)
    
    size = os.path.getsize('test_250mb_blocked.csv') / (1024*1024)
    print(f"    Created: {size:.1f} MB")
    
    print("\nDone! Test with:")
    print("  - test_60mb_original.csv + test_60mb_modified.csv -> WARNING (amber)")
    print("  - test_250mb_blocked.csv -> BLOCKED (red error)")

if __name__ == '__main__':
    generate_files()
