#!/bin/bash
pip install -r requirements.txt -q -t /tmp/deps 2>/dev/null
export PYTHONPATH=/tmp/deps:$PYTHONPATH
python app.py
