import json
import boto3
from flask import Flask, request, jsonify, Response

app = Flask(__name__)
bedrock = boto3.client("bedrock-runtime", region_name="ap-southeast-1")
MODEL_ID = "arn:aws:bedrock:ap-southeast-1:169588426492:inference-profile/global.anthropic.claude-haiku-4-5-20251001-v1:0"

SYSTEM_PROMPT = """You are an expert Certified Financial Planner and scenario analyst.

Keep your response concise and actionable. Do not repeat the user's raw data back to them.

Perform a focused what-if analysis:

1. Feasibility — State clearly: Feasible / Feasible with Caution / Not Recommended (one sentence why)
2. Cash Flow Impact — Before vs After in a simple table
3. Risk Highlights — 2 specific risks (bullet points)
4. Recommendation — 3 actionable steps if proceeding

If debt/loan scenario, include a small table with Conservative/Recommended/Aggressive repayment options showing monthly amount and estimated duration.

Use markdown tables with | for structured data. Keep total response under 400 words. Be direct and practical."""


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
        subscriptions = data.get("subscriptions", "")
        question = data.get("question", "")
        calculated_summary = data.get("calculated_summary", "")

        prompt = f"""{calculated_summary}

Income breakdown:
{income}

Expenses breakdown:
{expenses}

Assets:
{assets}

Budget plan:
{budget_plan}

Savings goal:
{savings_goal}

Subscriptions:
{subscriptions}

User's financial scenario question:
{question}"""

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
