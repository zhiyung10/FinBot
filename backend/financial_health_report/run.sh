#!/bin/bash
pip install flask -q -t /tmp/deps 2>/dev/null
export PYTHONPATH=/tmp/deps:$PYTHONPATH
python app.py
