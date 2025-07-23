import os
import json
import psycopg2
from datetime import datetime, timezone
from collections import defaultdict
from database_connection import getconn
from llm import ask_llm
from dateutil import relativedelta
from flask import Flask, request
import base64


app = Flask(__name__)

@app.route("/", methods=["POST"])
def run_summarizer():
    try:
        envelope = request.get_json()
        if not envelope or 'message' not in envelope:
            return "Bad Request: expected Pub/Sub message", 400

        pubsub_message = envelope['message']
        data = base64.b64decode(pubsub_message.get('data', '')).decode('utf-8')
        print("Received Pub/Sub message:", data)

        # 👇 your original function code called here
        history_summarizer({}, {})  # You can modify to accept `data` if needed
        return "Success", 200

    except Exception as e:
        print("Error processing message:", str(e))
        return f"Error: {str(e)}", 500

def history_summarizer(event, context):
    conn = getconn()
    cur = conn.cursor()

    # 1. Get last run timestamp
    cur.execute("SELECT last_run_at FROM summarizer_metadata WHERE id = 1")
    last_run_at = cur.fetchone()[0] or datetime(1970, 1, 1)

    # 2. Fetch new rows
    cur.execute("""
        SELECT uid, question, intent, response, timestamp
        FROM chat_history
        WHERE timestamp > %s
          AND intent IS NOT NULL
          AND intent != ''
          AND uid IS NOT NULL
        ORDER BY timestamp ASC
    """, (last_run_at,))
    rows = cur.fetchall()

    # 3. Group new messages by (uid, intent)
    history_by_uid_intent = defaultdict(list)
    for uid, question, intent, response, ts in rows:
        iso_time = ts.astimezone(timezone.utc).isoformat()
        line = f"{iso_time}, user asked: {question} | agent replied: {response}"
        history_by_uid_intent[(uid, intent)].append(line)

    updates = []

    # 4. For each (uid, intent), combine old + new and ask LLM to generate updated summary list
    for (uid, intent), new_lines in history_by_uid_intent.items():
        # Fetch most recent summary list
        cur.execute("""
            SELECT summary FROM intent_history_summary
            WHERE uid = %s AND intent = %s
            ORDER BY updated_at DESC
            LIMIT 1
        """, (uid, intent))
        row = cur.fetchone()
        old_summary_list = []
        if row:
            try:
                old_summary_list = json.loads(row[0])
                if not isinstance(old_summary_list, list):
                    old_summary_list = []
            except Exception:
                old_summary_list = []

        # Prepare LLM prompt
        messages = [
            {
                "role": "system",
                "content": (
                    "You are an assistant helping track parent conversations about their child. "
                    "Each entry in the summary should be a 1–2 sentence summary of a recent conversation, "
                    "prefixed with the date/time it occurred (ISO format). "
                    "Combine the old summary list and new conversations into a new summary list, keeping it chronological "
                    "and under 2000 tokens total. Remove redundant entries if necessary."
                )
            },
            {
                "role": "user",
                "content": json.dumps({
                    "old_summary_list": old_summary_list,
                    "new_conversations": new_lines
                }, indent=2)
            }
        ]

        try:
            updated_summary_list_str = ask_llm(messages).strip()
            updated_summary_list = json.loads(updated_summary_list_str)
            if not isinstance(updated_summary_list, list):
                raise ValueError("LLM output was not a list")
        except Exception as e:
            updated_summary_list = [f"Error updating summary: {str(e)}"]

        updates.append((uid, intent, json.dumps(updated_summary_list)))

    # 5. Save new combined list as a new row (append-only)
    for uid, intent, summary_json in updates:
        cur.execute("""
            INSERT INTO intent_history_summary (uid, intent, summary, updated_at)
            VALUES (%s, %s, %s, now())
        """, (uid, intent, summary_json))

    # 6. Update last_run
    cur.execute("UPDATE summarizer_metadata SET last_run_at = now() WHERE id = 1")
    conn.commit()
    cur.close()
    conn.close()
    print("Updated summary lists saved with LLM-managed merge.")

# Time formatting
def humanize_time(dt: datetime) -> str:
    now = datetime.now(timezone.utc)
    diff = relativedelta.relativedelta(now, dt)
    if diff.days > 0:
        return f"{diff.days} day(s) ago"
    elif diff.hours > 0:
        return f"{diff.hours} hour(s) ago"
    elif diff.minutes > 0:
        return f"{diff.minutes} minute(s) ago"
    return "just now"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)