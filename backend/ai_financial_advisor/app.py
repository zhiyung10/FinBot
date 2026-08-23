import json
import boto3
from flask import Flask, request, jsonify, Response

app = Flask(__name__)
bedrock = boto3.client("bedrock-runtime", region_name="ap-southeast-1")
MODEL_ID = "ap-southeast-1.anthropic.claude-haiku-4-5-20251001-v1:0-20260217-v1:0"

SYSTEM_PROMPT = """You are an expert Certified Financial Planner and scenario analyst. The user has provided their current financial profile and wants to evaluate a financial scenario.

Perform a thorough what-if analysis by following these steps:

1. Current Financial Snapshot — Briefly summarize the user's current monthly cash flow (Total Income, Total Expenses, Net Balance, and Disposable Income after essential expenses).

2. Scenario Feasibility Assessment — Analyze whether the proposed scenario is financially realistic given the user's current situation. State clearly: Feasible, Feasible with Caution, or Not Recommended, and explain why.

3. Cash Flow Impact — Calculate and display the projected change to monthly cash flow if the scenario is executed. Show a Before and After comparison using a simple table.

4. Savings and Goals Impact — Estimate how the scenario affects the user's ability to reach their savings goals. If applicable, show the revised projected completion date.

5. Debt Repayment Analysis (if applicable) — If the scenario involves any form of debt or loan:
- Calculate Minimum Repayment, Recommended Repayment, and Aggressive Repayment strategies
- Estimate the repayment duration for each strategy
- Recommend the most suitable strategy based on the user's disposable income
- Warn if any strategy leaves insufficient budget for essential expenses

6. Financial Risk Highlights — Identify at least 2 specific financial risks associated with proceeding with this scenario.

7. Safer Alternative Recommendation — If the scenario poses significant risk, suggest a modified or alternative approach that achieves a similar goal with lower financial impact.

8. Final Verdict and Action Plan — Provide a clear recommendation with 3 to 5 specific, actionable steps the user should take if they decide to proceed.

Always use clear headings, tables where applicable, and plain language. Never guarantee financial outcomes. Encourage responsible financial planning throughout your response."""


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

        prompt = f"""The user has provided their current financial profile:
- Income: {income}
- Expenses: {expenses}
- Assets: {assets}
- Budget Plan: {budget_plan}
- Savings Goal: {savings_goal}
- Subscriptions: {subscriptions}

The user wants to evaluate the following financial scenario:
{question}"""

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4000,
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
