import json
import boto3
from flask import Flask, request, jsonify, Response

app = Flask(__name__)
bedrock = boto3.client("bedrock-runtime", region_name="ap-southeast-1")
MODEL_ID = "anthropic.claude-3-5-haiku-20241022-v1:0"

SYSTEM_PROMPT = """You are a budget tracking assistant. Based on the user's expenses and budget plan, analyze spending against the selected budget limits.

Generate smart notifications such as:
- You have used X% of your monthly budget.
- You have exceeded today's spending limit.
- Only RMxxx remains this month.

Calculate and display clearly:
- Current Spending percentage
- Remaining Budget amount
- Days Remaining in the current month (assume a standard 30-day month)
- Expected Overspending Risk level: Low, Medium, or High

Provide at least 3 practical, specific recommendations to help the user stay within their budget limits. Use tables and text-based visual indicators where helpful."""


@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "POST,OPTIONS"
    return response


@app.route("/", methods=["POST", "OPTIONS"])
def handler():
    if request.method == "OPTIONS":
        return Response("", status=200)

    try:
        data = request.get_json(force=True)
        expenses = data.get("expenses", "")
        budget_plan = data.get("budget_plan", "")

        prompt = f"Based on the user's expenses: {expenses} and budget plan: {budget_plan}, analyze spending against the selected budget limits."

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2048,
            "temperature": 0.7,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}]
        })

        response = bedrock.invoke_model(
            modelId=MODEL_ID, body=body, contentType="application/json"
        )

        result = json.loads(response["body"].read())
        full_text = "".join(block["text"] for block in result["content"] if block["type"] == "text")

        return jsonify({"response": full_text}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
