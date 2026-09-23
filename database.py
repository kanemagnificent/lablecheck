"""
database.py
============
SQLite persistence layer for the Pack Proof Legal Metrology Compliance Engine.
 
This is the canonical, actively-maintained persistence module referenced by
unified_compliance_engine.py (Section 5 imports from here when available).
 
Schema upgrade applied in this version:
  - fields               TEXT  (JSON) — full extracted_fields dict, incl. "source" tags
  - font_size_check       TEXT  (JSON) — Rule 7 panel-area / font-height result
  - compliance_score      INTEGER      — deterministic 0-100 score
  - needs_manual_review   TEXT  (JSON) — list of numeric-locked fields awaiting a human
  - ai_analysis           TEXT  (JSON) — non-statutory AI summary/secondary findings
 
Schema upgrade in THIS version:
  - toxicity_analysis     TEXT  (JSON) — ingredient toxicity / consumer-safety advisory
                                          from toxicity_engine.run_toxicity_analysis()
"""
 
import sqlite3
import json
from pathlib import Path
from datetime import datetime
from contextlib import closing
 
 
DB_PATH = Path(__file__).resolve().parent / "data" / "audit.db"
 
 
def _get_conn():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(DB_PATH)
 
 
def _column_names(conn, table: str):
    return {row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}
 
 
def init_db():
    """Create the database and audit log table (idempotent, migration-safe)."""
 
    with closing(_get_conn()) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                scan_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                status TEXT NOT NULL,
                confidence REAL NOT NULL,
                violations TEXT NOT NULL,
                warnings TEXT NOT NULL,
                audit_trail TEXT NOT NULL,
                fields TEXT,
                font_size_check TEXT,
                compliance_score INTEGER,
                needs_manual_review TEXT,
                ai_analysis TEXT,
                toxicity_analysis TEXT
            )
        """)
    
        conn.execute("""
            CREATE TABLE IF NOT EXISTS notices (
                id TEXT PRIMARY KEY,
                scan_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                manufacturer TEXT NOT NULL,
                issued_at TEXT NOT NULL,
                deadline TEXT NOT NULL,
                status TEXT NOT NULL,
                violations TEXT NOT NULL,
                fine_amount REAL
            )
        """)
    
        # Migration path for pre-existing databases created by an older version
        # of this module that only had the original 9 columns.
        existing = _column_names(conn, "audit_logs")
        migrations = {
            "fields": "ALTER TABLE audit_logs ADD COLUMN fields TEXT",
            "font_size_check": "ALTER TABLE audit_logs ADD COLUMN font_size_check TEXT",
            "compliance_score": "ALTER TABLE audit_logs ADD COLUMN compliance_score INTEGER",
            "needs_manual_review": "ALTER TABLE audit_logs ADD COLUMN needs_manual_review TEXT",
            "ai_analysis": "ALTER TABLE audit_logs ADD COLUMN ai_analysis TEXT",
            "toxicity_analysis": "ALTER TABLE audit_logs ADD COLUMN toxicity_analysis TEXT",
        }
        for col, ddl in migrations.items():
            if col not in existing:
                conn.execute(ddl)
    
        conn.commit()
 
 
def save_audit_log(
    scan_id,
    filename,
    compliance_status,
    confidence,
    violations,
    warnings,
    audit_trail,
    fields=None,
    font_size_check=None,
    compliance_score=None,
    needs_manual_review=None,
    ai_analysis=None,
    toxicity_analysis=None,
):
    """Save one verification run to SQLite."""
 
    init_db()
    with closing(_get_conn()) as conn:
        timestamp = datetime.now().isoformat()
     
        conn.execute(
            """
            INSERT INTO audit_logs (
                timestamp,
                scan_id,
                filename,
                status,
                confidence,
                violations,
                warnings,
                audit_trail,
                fields,
                font_size_check,
                compliance_score,
                needs_manual_review,
                ai_analysis,
                toxicity_analysis
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                timestamp,
                scan_id,
                filename,
                compliance_status,
                confidence,
                json.dumps(violations),
                json.dumps(warnings),
                json.dumps(audit_trail),
                json.dumps(fields or {}),
                json.dumps(font_size_check) if font_size_check else None,
                compliance_score,
                json.dumps(needs_manual_review or []),
                json.dumps(ai_analysis) if ai_analysis else None,
                json.dumps(toxicity_analysis) if toxicity_analysis else None,
            )
        )
     
        conn.commit()
 
 
def fetch_all_logs():
    """Get all saved audit logs, newest first."""
 
    init_db()
    with closing(_get_conn()) as conn:
        rows = conn.execute(
            """
            SELECT
                id,
                timestamp,
                scan_id,
                filename,
                status,
                confidence,
                violations,
                warnings,
                audit_trail,
                fields,
                font_size_check,
                compliance_score,
                needs_manual_review,
                ai_analysis,
                toxicity_analysis
            FROM audit_logs
            ORDER BY id DESC
            """
        ).fetchall()
 
    return [
        {
            "id": row[0],
            "timestamp": row[1],
            "scan_id": row[2],
            "filename": row[3],
            "status": row[4],
            "confidence": row[5],
            "violations": json.loads(row[6]),
            "warnings": json.loads(row[7]),
            "audit_trail": json.loads(row[8]),
            "fields": json.loads(row[9]) if row[9] else {},
            "font_size_check": json.loads(row[10]) if row[10] else None,
            "compliance_score": row[11],
            "needs_manual_review": json.loads(row[12]) if row[12] else [],
            "ai_analysis": json.loads(row[13]) if row[13] else None,
            "toxicity_analysis": json.loads(row[14]) if row[14] else None,
        }
        for row in rows
    ]
 
 
def fetch_log_by_scan_id(scan_id: str):
    """Get one record by scan_id (O(1) lookup)."""
    init_db()
    with closing(_get_conn()) as conn:
        row = conn.execute(
            """
            SELECT
                id,
                timestamp,
                scan_id,
                filename,
                status,
                confidence,
                violations,
                warnings,
                audit_trail,
                fields,
                font_size_check,
                compliance_score,
                needs_manual_review,
                ai_analysis,
                toxicity_analysis
            FROM audit_logs
            WHERE scan_id = ?
            """,
            (scan_id,)
        ).fetchone()

    if not row:
        return None

    return {
        "id": row[0],
        "timestamp": row[1],
        "scan_id": row[2],
        "filename": row[3],
        "status": row[4],
        "confidence": row[5],
        "violations": json.loads(row[6]),
        "warnings": json.loads(row[7]),
        "audit_trail": json.loads(row[8]),
        "fields": json.loads(row[9]) if row[9] else {},
        "font_size_check": json.loads(row[10]) if row[10] else None,
        "compliance_score": row[11],
        "needs_manual_review": json.loads(row[12]) if row[12] else [],
        "ai_analysis": json.loads(row[13]) if row[13] else None,
        "toxicity_analysis": json.loads(row[14]) if row[14] else None,
    }
 
 
def create_report(audit):
    """Create a simple plain-text report from an audit record (quick CLI/debug view;
    the production report is the Jinja2/WeasyPrint PDF — see report_renderer.py)."""
 
    score = audit.get("compliance_score")
    score_str = f"{score}/100" if score is not None else "N/A"
 
    tox = audit.get("toxicity_analysis") or {}
    tox_line = f'{tox.get("verdict", "N/A")} (Toxicity Score: {tox.get("toxicity_score", "N/A")}/100)' if tox else "N/A"
 
    report = f"""
LEXORA VERIFICATION REPORT
==========================
 
Status: {audit["status"]}
Score: {score_str}
 
Overall Confidence: {audit["confidence"] * 100:.0f}%
 
Ingredient Toxicity Advisory: {tox_line}
 
Needs Manual Review:
"""
    for field in audit.get("needs_manual_review", []):
        report += f"- {field}\n"
 
    report += "\nViolations:\n"
    for violation in audit.get("violations", []):
        report += f"- {violation}\n"
 
    report += "\nWarnings:\n"
    for warning in audit.get("warnings", []):
        report += f"- {warning}\n"
 
    report += "\nAudit Trail:\n"
    for step in audit.get("audit_trail", []):
        report += f"- {step}\n"
 
    return report
 
 
if __name__ == "__main__":
    init_db()

# --- Notices Management ---

def create_notice(
    notice_id: str,
    scan_id: str,
    product_name: str,
    manufacturer: str,
    deadline: str,
    violations: list,
    fine_amount: float = None
):
    init_db()
    issued_at = datetime.now().isoformat()
    with closing(_get_conn()) as conn:
        conn.execute(
            """
            INSERT INTO notices (
                id, scan_id, product_name, manufacturer, issued_at, deadline, status, violations, fine_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                notice_id,
                scan_id,
                product_name,
                manufacturer,
                issued_at,
                deadline,
                'ISSUED',
                json.dumps(violations),
                fine_amount
            )
        )
        conn.commit()

def fetch_notices():
    init_db()
    with closing(_get_conn()) as conn:
        rows = conn.execute("SELECT * FROM notices ORDER BY issued_at DESC").fetchall()
    
    return [
        {
            "id": row[0],
            "scanId": row[1],
            "productName": row[2],
            "manufacturer": row[3],
            "issuedAt": row[4],
            "deadline": row[5],
            "status": row[6],
            "violations": json.loads(row[7]),
            "fineAmount": row[8]
        }
        for row in rows
    ]

def update_notice_status(notice_id: str, status: str):
    init_db()
    with closing(_get_conn()) as conn:
        conn.execute("UPDATE notices SET status = ? WHERE id = ?", (status, notice_id))
        conn.commit()
