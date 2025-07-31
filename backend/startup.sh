#!/bin/bash
# Azure App Service startup script for Python Flask app

# Install dependencies if needed
if [ ! -d "venv" ]; then
    python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Run the Flask application
python app.py
