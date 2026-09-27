"""
database.py
============
Hybrid SQLite & PostgreSQL persistence layer for the Pack Proof Engine.
"""

import sqlite3
import os
import json
from pathlib import Path
from datetime import datetime
from contextlib import closing

try:
    import psycopg2
    from psycopg2.extras import DictCursor
    HAS_POSTGRES = True
except ImportError:
    HAS_POSTGRES = False

DB_PATH = Path(__file__).resolve().parent / "data" / "audit.db"

def _is_postgres():
    return bool(os.environ.get("DATABASE_URL") and HAS_POSTGRES)

def _get_conn():
    if _is_postgres():
        url = os.environ.get("DATABASE_URL")
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return psycopg2.connect(url)
    else:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        return sqlite3.connect(DB_PATH)

def _execute(conn, query, params=()):
    if _is_postgres():
        # SQLite uses '?', Postgres uses '%s'
        query = query.replace("?", "%s")
        # SQLite uses AUTOINCREMENT, Postgres uses SERIAL
        query = query.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
        
        cursor = conn.cursor()
        cursor.execute(query, params)
        return cursor
    else:
        return conn.execute(query, params)

def _column_names(conn, table: str):
    if _is_postgres():
        cursor = _execute(conn, f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}'")
        return {row[0] for row in cursor.fetchall()}
    else:
        return {row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}

def init_db():
    with closing(_get_conn()) as conn:
        _execute(conn, """
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
        
        _execute(conn, """
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
        
        _execute(conn, """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                company_name TEXT
            )
        """)
        
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
                try:
                    _execute(conn, ddl)
                except Exception:
                    pass
        
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
    init_db()
    with closing(_get_conn()) as conn:
        timestamp = datetime.now().isoformat()
        
        _execute(
            conn,
            """
            INSERT INTO audit_logs (
                timestamp, scan_id, filename, status, confidence, violations, warnings, audit_trail,
                fields, font_size_check, compliance_score, needs_manual_review, ai_analysis, toxicity_analysis
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                timestamp, scan_id, filename, compliance_status, confidence,
                json.dumps(violations), json.dumps(warnings), json.dumps(audit_trail),
                json.dumps(fields or {}), json.dumps(font_size_check) if font_size_check else None,
                compliance_score, json.dumps(needs_manual_review or []),
                json.dumps(ai_analysis) if ai_analysis else None,
                json.dumps(toxicity_analysis) if toxicity_analysis else None,
            )
        )
        conn.commit()

def fetch_all_logs():
    init_db()
    with closing(_get_conn()) as conn:
        rows = _execute(
            conn,
            """
            SELECT
                id, timestamp, scan_id, filename, status, confidence, violations, warnings,
                audit_trail, fields, font_size_check, compliance_score, needs_manual_review,
                ai_analysis, toxicity_analysis
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
            "confidence": float(row[5]) if row[5] is not None else 0.0,
            "violations": json.loads(row[6]) if row[6] else [],
            "warnings": json.loads(row[7]) if row[7] else [],
            "audit_trail": json.loads(row[8]) if row[8] else [],
            "fields": json.loads(row[9]) if row[9] else {},
            "font_size_check": json.loads(row[10]) if row[10] else None,
            "compliance_score": int(row[11]) if row[11] is not None else None,
            "needs_manual_review": json.loads(row[12]) if row[12] else [],
            "ai_analysis": json.loads(row[13]) if row[13] else None,
            "toxicity_analysis": json.loads(row[14]) if row[14] else None,
        }
        for row in rows
    ]

def fetch_log_by_scan_id(scan_id: str):
    init_db()
    with closing(_get_conn()) as conn:
        row = _execute(
            conn,
            """
            SELECT
                id, timestamp, scan_id, filename, status, confidence, violations, warnings,
                audit_trail, fields, font_size_check, compliance_score, needs_manual_review,
                ai_analysis, toxicity_analysis
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
        "confidence": float(row[5]) if row[5] is not None else 0.0,
        "violations": json.loads(row[6]) if row[6] else [],
        "warnings": json.loads(row[7]) if row[7] else [],
        "audit_trail": json.loads(row[8]) if row[8] else [],
        "fields": json.loads(row[9]) if row[9] else {},
        "font_size_check": json.loads(row[10]) if row[10] else None,
        "compliance_score": int(row[11]) if row[11] is not None else None,
        "needs_manual_review": json.loads(row[12]) if row[12] else [],
        "ai_analysis": json.loads(row[13]) if row[13] else None,
        "toxicity_analysis": json.loads(row[14]) if row[14] else None,
    }

def create_report(audit):
    score = audit.get("compliance_score")
    score_str = f"{score}/100" if score is not None else "N/A"
    tox = audit.get("toxicity_analysis") or {}
    tox_line = f'{tox.get("verdict", "N/A")} (Score: {tox.get("toxicity_score", "N/A")})' if tox else "N/A"
    
    report = f"LEXORA VERIFICATION REPORT\n==========================\nStatus: {audit['status']}\nScore: {score_str}\nConfidence: {audit['confidence']*100:.0f}%\n"
    return report

def create_notice(notice_id, scan_id, product_name, manufacturer, deadline, violations, fine_amount=None):
    init_db()
    issued_at = datetime.now().isoformat()
    with closing(_get_conn()) as conn:
        _execute(
            conn,
            """
            INSERT INTO notices (
                id, scan_id, product_name, manufacturer, issued_at, deadline, status, violations, fine_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (notice_id, scan_id, product_name, manufacturer, issued_at, deadline, 'ISSUED', json.dumps(violations), fine_amount)
        )
        conn.commit()

def fetch_notices():
    init_db()
    with closing(_get_conn()) as conn:
        rows = _execute(conn, "SELECT * FROM notices ORDER BY issued_at DESC").fetchall()
    
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
            "fineAmount": float(row[8]) if row[8] is not None else None
        }
        for row in rows
    ]

def update_notice_status(notice_id: str, status: str):
    init_db()
    with closing(_get_conn()) as conn:
        _execute(conn, "UPDATE notices SET status = ? WHERE id = ?", (status, notice_id))
        conn.commit()

# --- Users & Authentication ---

def get_user_by_email(email: str):
    init_db()
    with closing(_get_conn()) as conn:
        row = _execute(conn, "SELECT email, password_hash, role, company_name FROM users WHERE email = ?", (email,)).fetchone()
    
    if not row:
        return None
        
    return {
        "email": row[0],
        "password_hash": row[1],
        "role": row[2],
        "company_name": row[3]
    }

def create_user(email: str, password_hash: str, role: str, company_name: str = None):
    init_db()
    with closing(_get_conn()) as conn:
        try:
            _execute(
                conn,
                "INSERT INTO users (email, password_hash, role, company_name) VALUES (?, ?, ?, ?)",
                (email, password_hash, role, company_name)
            )
            conn.commit()
            return True
        except Exception:
            return False # User probably already exists
