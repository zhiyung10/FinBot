import json
import boto3
from flask import Flask, request, Response, stream_with_context

app = Flask(__name__)
bedrock = boto3.client("bedrock-runtime", region_name="ap-southeast-1")
MODEL_ID = "ap-southeast-1.anthropic.claude-haiku-4-5-20251001-v1:0-20260217-v1:0"

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


def generate(prompt):
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 2048,
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
    expenses = data.get("expenses", "")
    budget_plan = data.get("budget_plan", "")

    prompt = f"Based on the user's expenses: {expenses} and budget plan: {budget_plan}, analyze spending against the selected budget limits."

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
