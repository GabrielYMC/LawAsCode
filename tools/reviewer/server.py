"""
法規校對工具 — Web Server
啟動後開啟瀏覽器，提供 Markdown 校對介面
"""

import os
import json
import webbrowser
from pathlib import Path
from flask import Flask, render_template, jsonify, request

from scanner import scan_directory, scan_file

app = Flask(__name__)

# 專案路徑
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
LAWS_DIR = PROJECT_ROOT / "laws" / "markdown"
REVIEW_STATUS_FILE = PROJECT_ROOT / "tools" / "reviewer" / "review_status.json"


def load_review_status() -> dict:
    if REVIEW_STATUS_FILE.exists():
        with open(REVIEW_STATUS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_review_status(status: dict):
    with open(REVIEW_STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(status, f, ensure_ascii=False, indent=2)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/scan")
def api_scan():
    """掃描所有檔案，回傳問題列表"""
    results = scan_directory(str(LAWS_DIR))
    status = load_review_status()

    # 合併校對狀態
    for filename, data in results.items():
        data["reviewed"] = status.get(filename, {}).get("reviewed", False)
        data["reviewed_at"] = status.get(filename, {}).get("reviewed_at", None)
        # 標記哪些 issue 已解決
        resolved = set(status.get(filename, {}).get("resolved_issues", []))
        for issue in data["issues"]:
            issue_key = f"{issue['line']}:{issue['issue_type']}"
            issue["resolved"] = issue_key in resolved

    return jsonify(results)


@app.route("/api/file/<filename>")
def api_read_file(filename):
    """讀取單一檔案內容"""
    filepath = LAWS_DIR / filename
    if not filepath.exists():
        return jsonify({"error": "File not found"}), 404
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    return jsonify({"filename": filename, "content": content})


@app.route("/api/file/<filename>", methods=["PUT"])
def api_save_file(filename):
    """儲存檔案內容"""
    filepath = LAWS_DIR / filename
    if not filepath.exists():
        return jsonify({"error": "File not found"}), 404

    data = request.get_json()
    content = data.get("content", "")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    # 重新掃描此檔案
    issues = scan_file(str(filepath))
    return jsonify({
        "success": True,
        "issue_count": len(issues),
        "issues": [i.to_dict() for i in issues],
    })


@app.route("/api/resolve", methods=["POST"])
def api_resolve_issue():
    """標記問題為已解決"""
    data = request.get_json()
    filename = data["filename"]
    issue_key = f"{data['line']}:{data['issue_type']}"

    status = load_review_status()
    if filename not in status:
        status[filename] = {"reviewed": False, "resolved_issues": []}
    if issue_key not in status[filename].get("resolved_issues", []):
        status[filename].setdefault("resolved_issues", []).append(issue_key)
    save_review_status(status)

    return jsonify({"success": True})


@app.route("/api/review/<filename>", methods=["POST"])
def api_mark_reviewed(filename):
    """標記檔案為校對完成"""
    from datetime import datetime

    status = load_review_status()
    status[filename] = {
        "reviewed": True,
        "reviewed_at": datetime.now().isoformat(),
        "resolved_issues": status.get(filename, {}).get("resolved_issues", []),
    }
    save_review_status(status)
    return jsonify({"success": True})


@app.route("/api/review/<filename>", methods=["DELETE"])
def api_unmark_reviewed(filename):
    """取消校對完成標記"""
    status = load_review_status()
    if filename in status:
        status[filename]["reviewed"] = False
        status[filename]["reviewed_at"] = None
    save_review_status(status)
    return jsonify({"success": True})


if __name__ == "__main__":
    port = 5588
    print(f"\n{'='*50}")
    print(f"  法規校對工具")
    print(f"  http://localhost:{port}")
    print(f"{'='*50}")
    print(f"  法規目錄: {LAWS_DIR}")
    print(f"{'='*50}\n")
    webbrowser.open(f"http://localhost:{port}")
    app.run(port=port, debug=True)
