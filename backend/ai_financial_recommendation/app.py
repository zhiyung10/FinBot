import json
import boto3
from flask import Flask, request, jsonify, Response

app = Flask(__name__)
bedrock = boto3.client("bedrock-runtime", region_name="ap-southeast-1")
MODEL_ID = "arn:aws:bedrock:ap-southeast-1:169588426492:inference-profile/global.anthropic.claude-haiku-4-5-20251001-v1:0"

SYSTEM_PROMPT = """You are an experienced Certified Financial Planner. Analyze the user's financial profile concisely.

Keep your response short and scannable. Do not repeat the user's input data. Focus on actionable insights.

Provide recommendations in these sections (keep each section to 2-3 bullet points max):

1. Income Improvement — 2 realistic suggestions
2. Expense Optimization — Top 2-3 areas to cut
3. Savings Strategy — Monthly target with brief reasoning
4. Emergency Fund — Sufficient or not, one sentence
5. Investment Suggestions — 1 High Risk, 1 Medium Risk, 1 Low Risk option (names only with brief note)

Finally:
- Overall Financial Score: X/100 (one sentence why)
- Top 3 Recommendations (ranked)

Use markdown tables with | for any structured data. Keep total response under 500 words."""


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

        prompt = f"Analyze the user's complete financial profile based on their income: {income}, expenses: {expenses}, assets: {assets}, and budget plan: {budget_plan}."

        response = bedrock.converse(
            modelId=MODEL_ID,
            system=[{"text": SYSTEM_PROMPT}],
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 3000, "temperature": 0.7}
        )

        full_text = response["output"]["message"]["content"][0]["text"]
        return jsonify({"response": full_text}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
