import json
import boto3
from flask import Flask, request, jsonify, Response

app = Flask(__name__)
bedrock = boto3.client("bedrock-runtime", region_name="ap-southeast-1")
MODEL_ID = "arn:aws:bedrock:ap-southeast-1:169588426492:inference-profile/global.anthropic.claude-haiku-4-5-20251001-v1:0"

SYSTEM_PROMPT = """You are a professional financial analyst. Generate a concise financial health report.

Do not repeat the user's raw input data. Focus on analysis and insights.

Structure (keep each section brief — 2-4 sentences max):

1. Financial Health Score — X/100 with brief breakdown
2. Cash Flow Summary — Income, Expenses, Net (one table row)
3. Budget Performance — On track or not, one sentence
4. Savings Progress — If goal provided, progress percentage and ETA
5. Top 3 Risks — Brief bullet points
6. Top 3 Strengths — Brief bullet points
7. Next Month: 3 Action Steps — Specific and actionable

Use markdown tables with | for structured data. Keep total response under 500 words."""


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
        income = data.get("income", "")
        expenses = data.get("expenses", "")
        assets = data.get("assets", "")
        budget_plan = data.get("budget_plan", "")
        savings_goal = data.get("savings_goal", "")
        calculated_summary = data.get("calculated_summary", "")

        prompt = f"{calculated_summary}\n\nIncome:\n{income}\n\nExpenses:\n{expenses}\n\nAssets:\n{assets}\n\nBudget:\n{budget_plan}\n\nSavings goal:\n{savings_goal}\n\nGenerate financial health report."

        response = bedrock.converse(
            modelId=MODEL_ID,
            system=[{"text": SYSTEM_PROMPT}],
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 4000, "temperature": 0.7}
        )

        full_text = response["output"]["message"]["content"][0]["text"]
        return jsonify({"response": full_text}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
