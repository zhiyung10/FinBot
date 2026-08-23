import json
import boto3
from flask import Flask, request, jsonify, Response

app = Flask(__name__)
bedrock = boto3.client("bedrock-runtime", region_name="ap-southeast-1")
MODEL_ID = "anthropic.claude-3-5-haiku-20241022-v1:0"

SYSTEM_PROMPT = """You are a professional financial analyst. Based on the user's income, expenses, assets, budget plan, and savings goal, generate a comprehensive professional financial health report.

Structure the report with the following clearly labeled sections:

1. Financial Health Score — Score from 0 to 100 with a detailed breakdown of how the score was calculated.
2. Income Analysis — Breakdown and commentary on income sources.
3. Expense Analysis — Breakdown of expenses, categorized where possible, with commentary on spending patterns.
4. Asset Analysis — Summary of current assets and overall net worth estimate.
5. Budget Performance — How well the user is adhering to their budget plan.
6. Savings Performance — Progress toward the stated savings goal including projected completion date.
7. Cash Flow Statement — Simple monthly cash flow: Total Income minus Total Expenses equals Net Cash Flow.
8. Potential Financial Risks — Identify at least 3 financial risks based on the user's profile.
9. Financial Strengths — Highlight at least 3 positive aspects of the user's financial situation.
10. Areas for Improvement — Identify at least 3 specific areas that need attention.
11. Next Month Action Plan — Provide exactly 5 specific, actionable steps the user should take next month.

Present everything in a structured, professional report format with clear headings and organized sections."""


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

        prompt = f"Based on the user's income: {income}, expenses: {expenses}, assets: {assets}, budget plan: {budget_plan}, and savings goal: {savings_goal}, generate a comprehensive professional financial health report."

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
