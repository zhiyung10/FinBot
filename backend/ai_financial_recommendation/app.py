import json
import boto3
from flask import Flask, request, Response, stream_with_context

app = Flask(__name__)
bedrock = boto3.client("bedrock-runtime", region_name="ap-southeast-1")
MODEL_ID = "ap-southeast-1.anthropic.claude-haiku-4-5-20251001-v1:0-20260217-v1:0"

SYSTEM_PROMPT = """You are an experienced Certified Financial Planner. Analyze the user's complete financial profile based on their income, expenses, assets, and budget plan.

Provide personalized recommendations organized into these clearly labeled sections:

1. Income Improvement — Suggest realistic and actionable methods to increase income based on their current financial situation.
2. Expense Optimization — Identify unnecessary or excessive spending and recommend specific categories where money can be saved.
3. Savings Strategy — Suggest monthly savings targets based on their income and expenses, referencing the 50/30/20 rule or other relevant frameworks.
4. Emergency Fund — Determine whether the emergency fund is sufficient. A healthy emergency fund typically covers 3 to 6 months of expenses.
5. Investment Suggestions — Provide educational investment suggestions suitable for their financial profile, categorized as High Risk, Medium Risk, and Low Risk options.
6. Future Market Outlook — Provide a general market trend analysis for Stocks, ETF, Gold, Cryptocurrency, and Fixed Deposit. Do NOT guarantee future prices. For each, explain the Possible Trend, Risk Level, Opportunities, and Things to Watch.

Finally, generate:
- Overall Financial Score from 0 to 100 with a brief explanation
- Top 5 Personalized Recommendations ranked by priority"""


def generate(prompt):
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 3000,
        "temperature": 0.7,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}]
    })
    response = bedrock.invoke_model_with_response_stream(
        modelId=MODEL_ID, body=body, contentType="application/json"
    )
    for event in response["body"]:
        chunk = event.get("chunk")
        if chunk:
            data = json.loads(chunk["bytes"])
            if data["type"] == "content_block_delta":
                yield data["delta"].get("text", "")


@app.route("/", methods=["POST", "OPTIONS"])
def handler():
    if request.method == "OPTIONS":
        return Response("", status=200, headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "POST,OPTIONS"
        })

    data = request.get_json(force=True)
    income = data.get("income", "")
    expenses = data.get("expenses", "")
    assets = data.get("assets", "")
    budget_plan = data.get("budget_plan", "")

    prompt = f"Analyze the user's complete financial profile based on their income: {income}, expenses: {expenses}, assets: {assets}, and budget plan: {budget_plan}."

    return Response(
        stream_with_context(generate(prompt)),
        content_type="text/plain; charset=utf-8",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "POST,OPTIONS"
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
