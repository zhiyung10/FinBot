#!/bin/bash
pip install flask "boto3>=1.39.0" -q -t /tmp/deps 2>/dev/null
export PYTHONPATH=/tmp/deps:$PYTHONPATH
python app.py
