#!/usr/bin/env python3
"""Screenshot HTML using headless Chrome"""
import subprocess
import time
import base64
from pathlib import Path

html_path = Path("/root/.openclaw/workspace/bank-compliance-final.html")
output_path = Path("/root/.openclaw/workspace/bank-compliance-final.png")

# Use headless Chrome to screenshot
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
        print(f"Screenshot saved: {output_path}")
        print(f"File size: {output_path.stat().st_size} bytes")
    else:
        print("Screenshot failed")
        print("stdout:", result.stdout)
        print("stderr:", result.stderr)
except Exception as e:
    print(f"Error: {e}")
