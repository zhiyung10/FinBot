import json
import boto3
from flask import Flask, request, jsonify, Response

app = Flask(__name__)
bedrock = boto3.client("bedrock-runtime", region_name="ap-southeast-1")
MODEL_ID = "arn:aws:bedrock:ap-southeast-1:169588426492:inference-profile/global.anthropic.claude-haiku-4-5-20251001-v1:0"

SYSTEM_PROMPT = """You are a financial insight assistant. Analyze the user's financial data and return ONLY a valid JSON object with no additional text, no markdown, no code fences.

Return exactly this JSON structure:
{
  "healthScore": <number 0-100>,
  "healthStatus": "<Excellent|Good|Fair|Poor|Critical>",
  "summary": "<1-3 sentence summary of their financial situation>",
  "priorityInsight": {
    "type": "<positive|warning|critical>",
    "title": "<short title>",
    "message": "<1-2 sentence explanation>"
  },
  "recommendations": [
    {
      "title": "<short action title>",
      "description": "<1 sentence recommendation>"
    }
  ]
}

Rules:
- Return ONLY the JSON object, nothing else
- No markdown, no code fences, no extra text
- Maximum 3 recommendations
- Keep summary under 3 sentences
- healthScore based on: savings rate, expense ratio, asset coverage
- Do NOT repeat all income/expense categories
- Do NOT generate tables or progress bars
- Focus on actionable insight, not data repetition"""


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
        calculated_summary = data.get("calculated_summary", "")

        prompt = f"{calculated_summary}\n\nIncome breakdown:\n{income}\n\nExpenses breakdown:\n{expenses}\n\nAssets:\n{assets}\n\nAnalyze and return structured JSON insight."

        response = bedrock.converse(
            modelId=MODEL_ID,
            system=[{"text": SYSTEM_PROMPT}],
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 1024, "temperature": 0.3}
        )

        full_text = response["output"]["message"]["content"][0]["text"]

        # Try to parse and validate JSON
        try:
            # Strip any markdown code fences if AI adds them
            cleaned = full_text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                cleaned = cleaned.strip()

            insight = json.loads(cleaned)

            # Validate required fields
            if "healthScore" not in insight:
                insight["healthScore"] = 50
            if "healthStatus" not in insight:
                insight["healthStatus"] = "Fair"
            if "summary" not in insight:
                insight["summary"] = "Financial data received."
            if "recommendations" not in insight:
                insight["recommendations"] = []
            # Limit to 3 recommendations
            insight["recommendations"] = insight["recommendations"][:3]

            return jsonify({"insight": insight}), 200

        except (json.JSONDecodeError, KeyError, TypeError):
            # Fallback: return raw text wrapped in a basic structure
            return jsonify({
                "insight": {
                    "healthScore": 50,
                    "healthStatus": "Fair",
                    "summary": full_text[:200] if full_text else "Unable to generate insight.",
                    "priorityInsight": {"type": "warning", "title": "Analysis pending", "message": "FinBot is processing your data."},
                    "recommendations": []
                }
            }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
