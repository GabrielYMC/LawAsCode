"""
法規 Markdown 自動掃描器
掃描常見的 Word 轉換問題並標記待校對項目
"""

import re
import os
import json
from dataclasses import dataclass, asdict
from enum import Enum
from typing import Optional


class Severity(str, Enum):
    ERROR = "error"      # 確定有問題，需修正
    WARNING = "warning"  # 可能有問題，需人工確認


class IssueType(str, Enum):
    BROKEN_LINE = "broken_line"
    DUPLICATE_ARTICLE = "dup_article"
    ORPHAN_TEXT = "orphan_text"
    MISIDENTIFIED_LIST = "mis_list"
    MISSING_ARTICLE = "missing_art"
    SUSPICIOUS_BREAK = "suspicious_break"


ISSUE_DESCRIPTIONS = {
    IssueType.BROKEN_LINE: "Word 斷行殘留：句子在非結束符號處斷開",
    IssueType.DUPLICATE_ARTICLE: "重複條號：同一條號出現兩次",
    IssueType.ORPHAN_TEXT: "孤立文字：疑似上一條的延續文字被誤判為獨立條文",
    IssueType.MISIDENTIFIED_LIST: "誤判列舉：描述性文字被誤判為列舉款項",
    IssueType.MISSING_ARTICLE: "條號跳號：條號序列中有缺漏",
    IssueType.SUSPICIOUS_BREAK: "可疑斷行：段落中間出現空行，可能是 Word 換行殘留",
}


@dataclass
class Issue:
    line: int
    issue_type: IssueType
    severity: Severity
    description: str
    context: str  # 問題所在的文字片段
    suggestion: Optional[str] = None  # 建議修正

    def to_dict(self):
        d = asdict(self)
        d["issue_type"] = self.issue_type.value
        d["severity"] = self.severity.value
        return d


def scan_file(filepath: str) -> list[Issue]:
    """掃描單一 Markdown 檔案，回傳所有發現的問題"""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.split("\n")
    issues = []

    # === 1. 偵測 Word 斷行殘留 ===
    # 非標題行，不以句末符號結束，下一行是空行，再下一行是非標題文字
    sentence_enders = set("。；！？」）』】：")
    for i, line in enumerate(lines):
        stripped = line.rstrip()
        if not stripped:
            continue
        if stripped.startswith("#") or stripped.startswith("---"):
            continue
        if stripped.startswith("- ") or re.match(r"^\d+\.\s", stripped):
            continue

        # 檢查是否在非句末符號處結束，且下一行有內容
        if len(stripped) > 0 and stripped[-1] not in sentence_enders:
            # 向下找：跳過空行，看下一個有內容的行
            next_content_line = None
            next_content_idx = None
            for j in range(i + 1, min(i + 4, len(lines))):
                if lines[j].strip():
                    next_content_line = lines[j].strip()
                    next_content_idx = j
                    break

            if next_content_line and not next_content_line.startswith("#"):
                # 如果當前行以中文字或英文結尾，且下一行以中文字開頭 → 很可能是斷行
                if (re.search(r"[\u4e00-\u9fff a-zA-Z,，、]$", stripped) and
                        re.search(r"^[\u4e00-\u9fff（「『]", next_content_line)):
                    issues.append(Issue(
                        line=i + 1,
                        issue_type=IssueType.BROKEN_LINE,
                        severity=Severity.WARNING,
                        description=f"「{stripped[-6:]}」之後斷行，下一段以「{next_content_line[:6]}」開頭",
                        context=stripped,
                        suggestion=f"合併為：{stripped}{next_content_line}",
                    ))

    # === 2. 偵測重複條號 ===
    article_pattern = re.compile(r"^###\s+第(.+?)條")
    article_positions: dict[str, list[int]] = {}
    for i, line in enumerate(lines):
        m = article_pattern.match(line.strip())
        if m:
            art_num = m.group(1)
            article_positions.setdefault(art_num, []).append(i + 1)

    for art_num, positions in article_positions.items():
        if len(positions) > 1:
            for pos in positions[1:]:
                issues.append(Issue(
                    line=pos,
                    issue_type=IssueType.DUPLICATE_ARTICLE,
                    severity=Severity.ERROR,
                    description=f"第{art_num}條在第 {positions[0]} 行已出現過",
                    context=lines[pos - 1].strip(),
                ))

    # === 3. 偵測孤立文字（疑似被誤判為獨立條文的延續文字）===
    for i, line in enumerate(lines):
        m = article_pattern.match(line.strip())
        if not m:
            continue

        # 找這個條文的內容（標題下一行開始到下一個標題）
        content_lines = []
        for j in range(i + 1, len(lines)):
            if lines[j].strip().startswith("#"):
                break
            content_lines.append(lines[j].strip())

        content_text = "".join(content_lines).strip()
        # 如果內容非常短（< 15 字）且不以句號結尾，可能是孤立文字
        if 0 < len(content_text) < 15 and not content_text.endswith("。"):
            issues.append(Issue(
                line=i + 1,
                issue_type=IssueType.ORPHAN_TEXT,
                severity=Severity.ERROR,
                description=f"條文內容僅「{content_text}」，疑似為上一條的延續",
                context=line.strip(),
                suggestion="考慮合併至上一條",
            ))

    # === 4. 偵測誤判列舉 ===
    # 在描述「款冠以一、二、三」這類文字時，數字被當作真的列舉
    for i, line in enumerate(lines):
        stripped = line.strip()
        if re.match(r"^\d+\.\s*$", stripped):
            # 空的列舉項 — 幾乎確定是誤判
            issues.append(Issue(
                line=i + 1,
                issue_type=IssueType.MISIDENTIFIED_LIST,
                severity=Severity.ERROR,
                description=f"空的列舉項目「{stripped}」，可能是描述性文字被誤判",
                context=stripped,
                suggestion="此處可能是描述條文格式的文字（如「款冠以一、二、三等數字」），被解析器誤判為列舉",
            ))

    # === 5. 偵測條號跳號 ===
    sorted_articles = sorted(article_positions.items(), key=lambda x: _parse_article_num(x[0]))
    for idx in range(1, len(sorted_articles)):
        prev_num = _parse_article_num(sorted_articles[idx - 1][0])
        curr_num = _parse_article_num(sorted_articles[idx][0])
        if prev_num is not None and curr_num is not None:
            if curr_num - prev_num > 1 and "之" not in sorted_articles[idx][0]:
                issues.append(Issue(
                    line=sorted_articles[idx][1][0],
                    issue_type=IssueType.MISSING_ARTICLE,
                    severity=Severity.WARNING,
                    description=f"第{sorted_articles[idx-1][0]}條 → 第{sorted_articles[idx][0]}條，中間缺少條文",
                    context=lines[sorted_articles[idx][1][0] - 1].strip(),
                ))

    # 按行號排序
    issues.sort(key=lambda x: x.line)
    return issues


def _parse_article_num(s: str) -> Optional[int]:
    """嘗試將條號轉為數字"""
    # 處理「之一」「之二」等
    s = re.sub(r"之.+", "", s)
    try:
        return int(s)
    except ValueError:
        return _chinese_to_int(s)


def _chinese_to_int(s: str) -> Optional[int]:
    """中文數字轉阿拉伯數字"""
    digit_map = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
                 "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
                 "零": 0}
    if not s:
        return None
    if s in digit_map:
        return digit_map[s]
    if s.startswith("十"):
        return 10 + (digit_map.get(s[1:], 0) if len(s) > 1 else 0)
    if "十" in s:
        parts = s.split("十")
        tens = digit_map.get(parts[0], 0)
        ones = digit_map.get(parts[1], 0) if parts[1] else 0
        return tens * 10 + ones
    # 百
    if "百" in s:
        parts = s.split("百")
        hundreds = digit_map.get(parts[0], 0)
        rest = parts[1] if len(parts) > 1 else ""
        if rest:
            return hundreds * 100 + (_chinese_to_int(rest) or 0)
        return hundreds * 100
    return None


def scan_directory(dirpath: str) -> dict:
    """掃描整個目錄，回傳所有檔案的問題"""
    results = {}
    for filename in sorted(os.listdir(dirpath)):
        if not filename.endswith(".md"):
            continue
        filepath = os.path.join(dirpath, filename)
        issues = scan_file(filepath)
        results[filename] = {
            "path": filepath,
            "issue_count": len(issues),
            "error_count": sum(1 for i in issues if i.severity == Severity.ERROR),
            "warning_count": sum(1 for i in issues if i.severity == Severity.WARNING),
            "issues": [i.to_dict() for i in issues],
        }
    return results


if __name__ == "__main__":
    import sys
    law_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "..", "laws", "markdown"
    )
    results = scan_directory(law_dir)
    total_issues = sum(r["issue_count"] for r in results.values())
    total_errors = sum(r["error_count"] for r in results.values())
    total_warnings = sum(r["warning_count"] for r in results.values())

    print(f"\n掃描完成：{len(results)} 個檔案")
    print(f"發現 {total_issues} 個問題（{total_errors} 錯誤 / {total_warnings} 警告）\n")

    for filename, data in results.items():
        if data["issue_count"] > 0:
            print(f"  {filename}: {data['error_count']}E / {data['warning_count']}W")
            for issue in data["issues"]:
                severity_icon = "[E]" if issue["severity"] == "error" else "[W]"
                print(f"    {severity_icon} L{issue['line']}: {issue['description']}")
    print()
