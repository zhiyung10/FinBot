import json
import boto3
from flask import Flask, request, jsonify, Response

app = Flask(__name__)
bedrock = boto3.client("bedrock-runtime", region_name="ap-southeast-1")
MODEL_ID = "anthropic.claude-3-5-haiku-20241022-v1:0"

SYSTEM_PROMPT = """You are a professional financial analyst. Based on the user's income, expenses, and assets, generate a well-organized financial dashboard containing the following sections:

1. Total Income
2. Total Expenses
3. Total Assets
4. Current Balance (Income minus Expenses)
5. Estimated Savings Rate as a percentage
6. Monthly Spending Progress shown as a text-based progress bar
7. Financial Health Score from 0 to 100
8. Overall Financial Status

Use tables and emoji icons to organize the information clearly and make it visually appealing. After the dashboard, provide a short financial summary of 3 to 5 sentences explaining the user's current financial condition in plain language."""


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

        prompt = f"Based on the user's income: {income}, expenses: {expenses}, and assets: {assets}, generate a well-organized financial dashboard."

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
