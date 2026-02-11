import os

# Files we want to read
EXTENSIONS = {'.py', '.js', '.jsx', '.css', '.html', '.json', '.env'}
# Folders to ignore
IGNORE_DIRS = {'node_modules', 'venv', '.git', '__pycache__', 'build', 'dist'}
# Files to ignore
IGNORE_FILES = {'package-lock.json', 'combine_code.py'}

def combine_files(output_file='FULL_CODEBASE.txt'):
    with open(output_file, 'w', encoding='utf-8') as outfile:
        # Walk through the current directory
        for root, dirs, files in os.walk("."):
            # Remove ignored directories from the search
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                if file in IGNORE_FILES:
                    continue
                    
                # Check extension
                _, ext = os.path.splitext(file)
                if ext in EXTENSIONS:
                    file_path = os.path.join(root, file)
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            content = infile.read()
                            
                            # Write file header to the output
                            outfile.write(f"\n{'='*50}\n")
                            outfile.write(f"FILE: {file_path}\n")
                            outfile.write(f"{'='*50}\n\n")
                            outfile.write(content)
                            outfile.write("\n")
                            print(f"Added: {file_path}")
                    except Exception as e:
                        print(f"Skipping {file_path} (Error: {e})")

    print(f"\n✅ Success! All code saved to: {output_file}")

if __name__ == "__main__":
    combine_files()