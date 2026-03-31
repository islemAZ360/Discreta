import os
import json

def generate_cors():
    cors_config = [
        {
            "origin": ["*"],
            "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
            "responseHeader": ["Content-Type", "x-goog-resumable"],
            "maxAgeSeconds": 3600
        }
    ]
    
    with open('cors.json', 'w') as f:
        json.dump(cors_config, f, indent=2)
    
    print("\n[✔] File 'cors.json' has been created successfully!")
    print("\nTo fix the PDF upload issue, please follow one of these steps:")
    print("-" * 50)
    print("OPTION 1: (Easiest) Using Google Cloud Shell")
    print("1. Go to: https://console.cloud.google.com/home/dashboard")
    print("2. Click the 'Activate Cloud Shell' button (top right icon '>_')")
    print("3. In the shell window that opens, run this command:")
    print("   nano cors.json")
    print("4. Paste the content of the 'cors.json' file I created for you.")
    print("5. Save (Ctrl+O, Enter) and Exit (Ctrl+X).")
    print("6. Run this command:")
    print("   gsutil cors set cors.json gs://discrete-mathematics-97729.firebasestorage.app")
    print("-" * 50)
    print("OPTION 2: (If you have gcloud installed locally)")
    print("1. Open your terminal in this project folder.")
    print("2. Run:")
    print("   gsutil cors set cors.json gs://discrete-mathematics-97729.firebasestorage.app")
    print("-" * 50)
    print("\nNote: It may take a minute for the changes to take effect.")

if __name__ == "__main__":
    generate_cors()
