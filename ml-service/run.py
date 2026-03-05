"""Entry point for the ML service."""
import os
import sys

# Ensure the ml-service directory is in the Python path
sys.path.insert(0, os.path.dirname(__file__))

if __name__ == "__main__":
    import uvicorn
    os.chdir(os.path.dirname(__file__))
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
