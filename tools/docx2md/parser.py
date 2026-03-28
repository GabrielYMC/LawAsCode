"""
LawAsCode Word→Markdown Parser
將淡江大學學生會法規錄（Word）解析為結構化 Markdown 檔案。

Usage:
    python parser.py <input.txt> <output_dir>

Input: 從 Word 提取的純文字檔（每段一行）
Output: 每部法規一個 .md 檔，含 YAML frontmatter
"""

import re
import sys
import os
from dataclasses import dataclass, field
from typing import Optional


# ============================================================
# 法規名稱對照表（從目錄提取，用於切分法規邊界）
# ============================================================
LAW_TITLES = [
    "淡江大學學生會組織章程",
    "淡江大學學生會法規標準規則",
    "淡江大學學生會公文字號條例",
    "淡江大學學生會會長繼任及代理辦法",
    "淡江大學學生會行政中心組織規則",
    "淡江大學學生會選舉委員會組織規則",
    "淡江大學學生會選舉罷免辦法",
    "淡江大學學生會會費收退費辦法",
    "淡江大學學生會預算辦法",
    "淡江大學學生會決算辦法",
    "淡江大學學生會學生議會組織規則",
    "淡江大學學生會學生議會職權行使辦法",
    "淡江大學學生會學生議會議員行為規範辦法",
    "淡江大學學生會學生議會秘書處處務施行細則",
    "淡江大學學生會學生議會辦公室管理細則",
    "淡江大學學生會學生議會會議旁聽細則",
    "淡江大學學生會學生議會議事準則",
    "淡江大學學生會學生評議會組織規則",
    "淡江大學學生會學生評議會審理案件辦法",
    "淡江大學學生會臺灣學生聯合會章程施行法",
]

# 釋字不是法規，但也要提取
INTERPRETATION_TITLES = [
    "淡江大學學生會學生評議會釋字第1號",
    "淡江大學學生會學生評議會釋字第2號",
]


# ============================================================
# 正規表達式模式
# ============================================================

# 修訂歷程：日期開頭，如 "104.01.09..." 或 "113.06.17..."
RE_HISTORY = re.compile(r'^(\d{2,3}\.\d{2}\.\d{2}).+')

# 章：第X章 or 第X章XXX
RE_CHAPTER = re.compile(r'^第([一二三四五六七八九十百]+)章\s*(.*)')

# 節：第X節
RE_SECTION = re.compile(r'^第([一二三四五六七八九十百]+)節\s*(.*)')

# 條文：第X條 or 第X條之X
RE_ARTICLE = re.compile(r'^第([一二三四五六七八九十百]+(?:之[一二三四五六七八九十百]+)?)\s*條\s*(.*)')

# 款：一. 二. 三. etc (或 一、二、三、)
RE_ITEM = re.compile(r'^([一二三四五六七八九十]+)[.．、]\s*(.*)')

# 目：（一）（二）（三） etc
RE_SUBITEM = re.compile(r'^[（(]([一二三四五六七八九十]+)[）)]\s*(.*)')

# 條文標題括號：（立法依據）（宗旨）etc
RE_ARTICLE_TITLE = re.compile(r'[（(]([^）)]+)[）)]')


# ============================================================
# 資料結構
# ============================================================

@dataclass
class HistoryEntry:
    date: str
    description: str


@dataclass
class Article:
    number: str  # e.g., "一", "二十三", "九之一"
    title: Optional[str]  # e.g., "立法依據"
    paragraphs: list = field(default_factory=list)


@dataclass
class Chapter:
    number: str
    title: str
    articles: list = field(default_factory=list)


@dataclass
class Law:
    title: str
    short_name: str  # 去掉 "淡江大學學生會" 前綴
    history: list = field(default_factory=list)
    chapters: list = field(default_factory=list)
    # 沒有章節的法規，條文直接放這裡
    articles: list = field(default_factory=list)


# ============================================================
# 中文數字轉阿拉伯數字
# ============================================================

CN_NUM = {
    '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
    '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
    '十': 10, '百': 100,
}


def cn2num(s: str) -> int:
    """將中文數字轉為阿拉伯數字，如 '二十三' -> 23"""
    if not s:
        return 0
    result = 0
    current = 0
    for ch in s:
        if ch in CN_NUM:
            val = CN_NUM[ch]
            if val >= 10:
                if current == 0:
                    current = 1
                result += current * val
                current = 0
            else:
                current = val
        else:
            break
    result += current
    return result


def cn2article_id(s: str) -> str:
    """將條文中文數字轉為 ID 格式，如 '九之一' -> '9-1'"""
    if '之' in s:
        parts = s.split('之')
        return f"{cn2num(parts[0])}-{cn2num(parts[1])}"
    return str(cn2num(s))


# ============================================================
# 解析器
# ============================================================

def find_law_boundaries(lines: list) -> list:
    """找出每部法規在文字檔中的起始行號"""
    boundaries = []
    # 跳過目錄區（前 ~118 行）
    in_body = False

    for i, line in enumerate(lines):
        text = line.strip()
        if not text:
            continue

        # 尋找法規標題（完全匹配）
        for title in LAW_TITLES:
            if text == title:
                # 確保不是目錄中的引用（目錄行通常帶頁碼數字結尾）
                # 真正的標題行後面會跟著修訂歷程
                # 往後看幾行是否有日期格式
                has_history = False
                for j in range(i + 1, min(i + 10, len(lines))):
                    if RE_HISTORY.match(lines[j].strip()):
                        has_history = True
                        break
                if has_history:
                    boundaries.append((i, title))
                    break

        # 釋字
        for title in INTERPRETATION_TITLES:
            if text == title:
                boundaries.append((i, title))
                break

    return boundaries


def parse_law(lines: list, title: str) -> Law:
    """解析單一法規的所有行"""
    prefix = "淡江大學學生會"
    short_name = title.replace(prefix, "") if title.startswith(prefix) else title

    law = Law(title=title, short_name=short_name)

    current_chapter = None
    current_article = None
    i = 0

    while i < len(lines):
        text = lines[i].strip()
        i += 1

        if not text:
            continue

        # 1. 修訂歷程
        m = RE_HISTORY.match(text)
        if m and not current_chapter and not current_article and not law.articles:
            law.history.append(HistoryEntry(date=m.group(1), description=text))
            continue

        # 2. 章
        m = RE_CHAPTER.match(text)
        if m:
            current_chapter = Chapter(number=m.group(1), title=m.group(2).strip())
            law.chapters.append(current_chapter)
            current_article = None
            continue

        # 3. 條文（可能混在同一行有多條）
        # 先嘗試拆分同一行內的多條條文
        article_splits = split_articles_in_line(text)

        for segment in article_splits:
            m_art = RE_ARTICLE.match(segment.strip())
            if m_art:
                art_num = m_art.group(1)
                remainder = m_art.group(2).strip()

                # 提取條文標題
                art_title = None
                m_title = RE_ARTICLE_TITLE.match(remainder)
                if m_title:
                    art_title = m_title.group(1)
                    remainder = remainder[m_title.end():].strip()

                current_article = Article(number=art_num, title=art_title)

                if current_chapter:
                    current_chapter.articles.append(current_article)
                else:
                    law.articles.append(current_article)

                if remainder:
                    current_article.paragraphs.append(remainder)
            elif current_article:
                segment = segment.strip()
                if segment:
                    current_article.paragraphs.append(segment)
            elif segment.strip():
                # 在任何條文之前的文字（可能是遺漏的歷程或前言）
                m_hist = RE_HISTORY.match(segment.strip())
                if m_hist:
                    law.history.append(HistoryEntry(date=m_hist.group(1), description=segment.strip()))

    return law


def split_articles_in_line(text: str) -> list:
    """將一行中混在一起的多個條文拆開。
    例如: '...之義務。第八條 （會員權利限制）會員之權利限制...'
    """
    # 在 "第X條" 前面拆分，但保留 "第X條" 本身
    parts = re.split(r'(?=第[一二三四五六七八九十百]+(?:之[一二三四五六七八九十百]+)?\s*條)', text)
    return [p for p in parts if p.strip()]


# ============================================================
# Markdown 輸出
# ============================================================

def format_paragraph(text: str) -> str:
    """格式化段落文字，處理款目"""
    result_lines = []

    # 嘗試拆分款（一. 二. 三.）
    # 先看整段是否包含款的模式
    item_splits = re.split(r'(?=[一二三四五六七八九十]+[.．、]\s*)', text)

    for part in item_splits:
        part = part.strip()
        if not part:
            continue

        m_item = RE_ITEM.match(part)
        if m_item:
            num = cn2num(m_item.group(1))
            content = m_item.group(2).strip()

            # 嘗試拆分目
            subitem_splits = re.split(r'(?=[（(][一二三四五六七八九十]+[）)])', content)
            if len(subitem_splits) > 1:
                # 第一段可能是款的主文
                first = subitem_splits[0].strip()
                if first:
                    result_lines.append(f"{num}. {first}")
                else:
                    result_lines.append(f"{num}. ")

                for sub in subitem_splits[1:]:
                    m_sub = RE_SUBITEM.match(sub.strip())
                    if m_sub:
                        sub_num = cn2num(m_sub.group(1))
                        result_lines.append(f"   ({sub_num}) {m_sub.group(2).strip()}")
                    elif sub.strip():
                        result_lines.append(f"   {sub.strip()}")
            else:
                result_lines.append(f"{num}. {content}")
        else:
            m_sub = RE_SUBITEM.match(part)
            if m_sub:
                sub_num = cn2num(m_sub.group(1))
                result_lines.append(f"   ({sub_num}) {m_sub.group(2).strip()}")
            else:
                result_lines.append(part)

    return '\n'.join(result_lines)


def law_to_markdown(law: Law) -> str:
    """將 Law 物件轉為 Markdown 字串"""
    lines = []

    # YAML frontmatter
    lines.append('---')
    lines.append(f'title: "{law.title}"')
    lines.append(f'short_name: "{law.short_name}"')

    if law.history:
        lines.append('history:')
        for h in law.history:
            # 轉換日期格式：113.06.17 → 2024-06-17 (民國 + 1911)
            date_parts = h.date.split('.')
            if len(date_parts) == 3:
                year = int(date_parts[0]) + 1911
                lines.append(f'  - date: "{year}-{date_parts[1]}-{date_parts[2]}"')
            else:
                lines.append(f'  - date: "{h.date}"')
            lines.append(f'    description: "{h.description}"')

    lines.append('---')
    lines.append('')

    # 標題
    lines.append(f'# {law.title}')
    lines.append('')

    # 條文（無章節結構的法規）
    if law.articles and not law.chapters:
        for art in law.articles:
            lines.extend(format_article(art))

    # 章節結構
    for chp in law.chapters:
        chp_num = cn2num(chp.number)
        lines.append(f'## 第{chp.number}章 {chp.title}')
        lines.append('')

        for art in chp.articles:
            lines.extend(format_article(art))

    return '\n'.join(lines)


def format_article(art: Article) -> list:
    """格式化單一條文"""
    lines = []
    art_id = cn2article_id(art.number)

    header = f'### 第{art.number}條'
    if art.title:
        header += f'（{art.title}）'
    lines.append(header)
    lines.append('')

    for para in art.paragraphs:
        formatted = format_paragraph(para)
        lines.append(formatted)
        lines.append('')

    return lines


def sanitize_filename(name: str) -> str:
    """將法規名稱轉為安全的檔名"""
    # 去掉 "淡江大學學生會" 前綴
    name = name.replace("淡江大學學生會", "")
    # 替換不安全字元
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    return name


# ============================================================
# 主程式
# ============================================================

def main():
    if len(sys.argv) < 3:
        print(f"Usage: python {sys.argv[0]} <input.txt> <output_dir>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_dir = sys.argv[2]

    os.makedirs(output_dir, exist_ok=True)

    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # 清理行
    lines = [line.rstrip('\n').rstrip('\r') for line in lines]

    # 找出法規邊界
    boundaries = find_law_boundaries(lines)
    print(f"找到 {len(boundaries)} 部法規：")
    for start, title in boundaries:
        print(f"  L{start}: {title}")

    # 解析每部法規
    for idx, (start, title) in enumerate(boundaries):
        # 確定結束行
        if idx + 1 < len(boundaries):
            end = boundaries[idx + 1][0]
        else:
            end = len(lines)

        law_lines = lines[start + 1:end]  # 跳過標題行本身

        # 釋字特殊處理（暫時直接輸出原文）
        if title in INTERPRETATION_TITLES:
            filename = sanitize_filename(title) + '.md'
            filepath = os.path.join(output_dir, filename)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(f'---\ntitle: "{title}"\ntype: interpretation\n---\n\n')
                f.write(f'# {title}\n\n')
                for line in law_lines:
                    if line.strip():
                        f.write(line.strip() + '\n\n')
            print(f"  [OK] {filename}")
            continue

        law = parse_law(law_lines, title)

        # 輸出 Markdown
        filename = sanitize_filename(title) + '.md'
        filepath = os.path.join(output_dir, filename)

        md_content = law_to_markdown(law)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(md_content)

        art_count = len(law.articles) + sum(len(c.articles) for c in law.chapters)
        print(f"  [OK] {filename} ({len(law.chapters)} chp, {art_count} art)")


if __name__ == '__main__':
    main()
