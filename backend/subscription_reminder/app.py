import json
import boto3
from flask import Flask, request, Response, stream_with_context

app = Flask(__name__)
bedrock = boto3.client("bedrock-runtime", region_name="ap-southeast-1")
MODEL_ID = "ap-southeast-1.anthropic.claude-haiku-4-5-20251001-v1:0-20260217-v1:0"

SYSTEM_PROMPT = """You are a subscription management assistant. Based on the user's subscriptions, carefully analyze all subscriptions and generate the following:

1. Upcoming Payment Reminders — List all subscriptions with simulated renewal dates (assume today is the 1st of the current month). Display reminders in priority order from most urgent to least urgent. For example: Netflix renews in 3 days, Spotify payment is due tomorrow.
2. Monthly Subscription Total — Sum of all monthly subscription costs.
3. Annual Subscription Total — Projected total cost over 12 months.
4. Subscriptions That May No Longer Be Worth Paying — Based on typical value for money, flag any subscriptions that seem redundant, underused, or overpriced relative to their category.
5. Possible Cheaper Alternatives — For each expensive or flagged subscription, suggest at least one cheaper or free alternative with a brief explanation.

Present all reminders clearly with priority ordering and use tables where appropriate to improve readability."""


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
    subscriptions = data.get("subscriptions", "")

    prompt = f"Based on the user's subscriptions: {subscriptions}, carefully analyze all subscriptions and generate payment reminders, cost analysis, and alternatives."

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
