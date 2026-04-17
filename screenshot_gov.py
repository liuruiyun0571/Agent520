#!/usr/bin/env python3
"""Screenshot HTML using headless Chrome"""
import subprocess
from pathlib import Path

html_files = [
    ("gov-approval-prototype.html", "gov-approval-prototype.png"),
    ("auto-manufacturing-prototype.html", "auto-manufacturing-prototype.png"),
]

for html_name, png_name in html_files:
    html_path = Path(f"/root/.openclaw/workspace/{html_name}")
    output_path = Path(f"/root/.openclaw/workspace/{png_name}")
    
    chrome_cmd = [
        "/usr/bin/google-chrome",
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--window-size=1440,1080",
        f"--screenshot={output_path}",
        f"file://{html_path}"
    ]
    
    try:
        result = subprocess.run(chrome_cmd, capture_output=True, text=True, timeout=30)
        if output_path.exists():
            print(f"✓ {png_name} saved ({output_path.stat().st_size} bytes)")
        else:
            print(f"✗ {png_name} failed")
    except Exception as e:
        print(f"Error: {e}")
