import json
import boto3
from flask import Flask, request, jsonify, Response

app = Flask(__name__)
bedrock = boto3.client("bedrock-runtime", region_name="ap-southeast-1")
MODEL_ID = "arn:aws:bedrock:ap-southeast-1:169588426492:inference-profile/global.anthropic.claude-haiku-4-5-20251001-v1:0"

SYSTEM_PROMPT = """You are a subscription management assistant. Analyze subscriptions concisely.

Do not repeat the user's full list back. Focus on insights.

Generate:
1. Payment Reminders — Top 3 most urgent (assume today is the 1st)
2. Cost Summary — Monthly total and annual total (one line each)
3. Worth Reviewing — Flag 1-2 that may not be worth keeping, with brief reason
4. Cheaper Alternatives — For each flagged item, suggest one alternative

Use markdown tables with | for the summary. Keep response under 300 words."""


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
        subscriptions = data.get("subscriptions", "")

        prompt = f"Based on the user's subscriptions: {subscriptions}, carefully analyze all subscriptions and generate payment reminders, cost analysis, and alternatives."

        response = bedrock.converse(
            modelId=MODEL_ID,
            system=[{"text": SYSTEM_PROMPT}],
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 2048, "temperature": 0.7}
        )

        full_text = response["output"]["message"]["content"][0]["text"]
        return jsonify({"response": full_text}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
