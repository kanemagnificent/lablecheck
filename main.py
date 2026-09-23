from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Callable
from enum import Enum
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import shutil
import uuid
import os
from datetime import datetime
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles

from unified_compliance_engine import HybridOCREngine, run_full_check_from_ocr_result
from database import save_audit_log, fetch_all_logs, fetch_log_by_scan_id, create_notice, fetch_notices, update_notice_status
from report_renderer import render_pdf_report

app = FastAPI(
    title="Pack Proof Compliance Engine",
    description="Legal Metrology (Packaged Commodities) Rules, 2011 Compliance Checker",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal server error occurred. Please try again later."},
    )

class PackageShape(str, Enum):
    rectangular = "rectangular"
    cylindrical = "cylindrical"

# Initialize global engine
engine = HybridOCREngine()

# Ensure uploads directory exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount uploads directory for static file serving
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.post("/scan/")
@limiter.limit("5/minute")
async def scan_package(
    request: Request,
    images: List[UploadFile] = File(...),
    package_shape: PackageShape = Form(PackageShape.rectangular),
    enable_ai: bool = Form(True)
):
    if not images:
        raise HTTPException(status_code=400, detail="No images provided")
    
    # MIME type and size validation
    MAX_FILE_SIZE = 10 * 1024 * 1024 # 10MB
    for img in images:
        if not img.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"File {img.filename} is not a valid image format.")
        img.file.seek(0, 2)
        file_size = img.file.tell()
        if file_size == 0:
            raise HTTPException(status_code=400, detail=f"File {img.filename} is empty.")
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"File {img.filename} exceeds the 10MB limit.")
        img.file.seek(0)
    
    image_paths = []
    scan_id = str(uuid.uuid4())
    
    # Save uploaded files temporarily
    for img in images:
        ext = os.path.splitext(img.filename)[1]
        temp_path = os.path.join(UPLOAD_DIR, f"{scan_id}_{uuid.uuid4()}{ext}")
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(img.file, buffer)
        image_paths.append(temp_path)
    
    try:
        if len(image_paths) == 1:
            ocr_result = engine.extract(image_paths[0])
        else:
            ocr_result = engine.extract_multiple(image_paths)
            
        result = run_full_check_from_ocr_result(
            ocr_result,
            package_shape=package_shape,
            enable_ai_rescue=enable_ai,
            enable_ai_synthesis=enable_ai,
        )
        
        # Save to DB if quality is decent
        filenames_record = ", ".join([os.path.basename(p) for p in image_paths])
        if result["compliance_status"] != "RESCAN NEEDED":
            # Save the new UUID file names to the DB so the frontend can load them from /uploads/
            save_audit_log(
                scan_id=scan_id,
                filename=filenames_record,
                compliance_status=result["compliance_status"],
                confidence=result.get("overall_ocr_confidence", 0.0),
                violations=result["violations"],
                warnings=result["warnings"],
                audit_trail=result["audit_trail"],
                fields=result["extracted_fields"],
                font_size_check=result["font_size_check"],
                compliance_score=result.get("compliance_score"),
                needs_manual_review=result.get("needs_manual_review"),
                ai_analysis=result.get("ai_analysis"),
                toxicity_analysis=result.get("toxicity_analysis"),
            )
            
        return {
            "scan_id": scan_id,
            "filename": filenames_record,
            "status": result["compliance_status"],
            "score": result.get("compliance_score"),
            "confidence": result.get("overall_ocr_confidence"),
            "violations": result["violations"],
            "warnings": result["warnings"],
            "fields": result["extracted_fields"],
            "toxicity_analysis": result.get("toxicity_analysis")
        }
    except Exception as e:
        # Only cleanup if the AI extraction failed, otherwise keep for the frontend
        for p in image_paths:
            if os.path.exists(p):
                os.remove(p)
        raise e

# --- Security & RBAC ---
async def get_current_role(x_user_role: Optional[str] = Header(None, alias="X-User-Role")):
    # Default to USER if no header is provided (for public endpoints)
    return x_user_role or "USER"

class RequireRole:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, role: str = Depends(get_current_role)):
        if role not in self.allowed_roles:
            raise HTTPException(
                status_code=403, 
                detail=f"Forbidden: You do not have the required permissions. Role '{role}' is not in {self.allowed_roles}"
            )
        return role
# ------------------------

@app.get("/logs/")
async def get_logs():
    return fetch_all_logs()

@app.get("/report/{scan_id}")
async def get_report(scan_id: str):
    log = fetch_log_by_scan_id(scan_id)
    if not log:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    out_pdf = f"report_{scan_id[:8]}.pdf"
    render_pdf_report(log, out_pdf)
    
    return {"message": "Report generated", "pdf_path": out_pdf}

class NoticeCreateRequest(BaseModel):
    product_name: str
    manufacturer: str
    deadline: str
    violations: list
    fine_amount: Optional[float] = None

class NoticeStatusUpdateRequest(BaseModel):
    status: str

@app.post("/notices/{scan_id}", dependencies=[Depends(RequireRole(["INSPECTOR"]))])
async def api_create_notice(scan_id: str, req: NoticeCreateRequest):
    notice_id = f"LM-{str(uuid.uuid4())[:8].upper()}"
    create_notice(
        notice_id=notice_id,
        scan_id=scan_id,
        product_name=req.product_name,
        manufacturer=req.manufacturer,
        deadline=req.deadline,
        violations=req.violations,
        fine_amount=req.fine_amount
    )
    return {"message": "Notice created", "notice_id": notice_id}

@app.get("/notices/", dependencies=[Depends(RequireRole(["INSPECTOR", "MANUFACTURER"]))])
async def api_get_notices():
    return fetch_notices()

@app.put("/notices/{notice_id}/status")
async def api_update_notice_status(notice_id: str, req: NoticeStatusUpdateRequest, role: str = Depends(RequireRole(["INSPECTOR", "MANUFACTURER"]))):
    # Enforce role-based status transition logic
    if role == "MANUFACTURER" and req.status != "SUBMITTED":
        raise HTTPException(status_code=403, detail="Manufacturers can only update status to SUBMITTED.")
    if role == "INSPECTOR" and req.status not in ["RESOLVED", "REJECTED"]:
        raise HTTPException(status_code=403, detail="Inspectors can only update status to RESOLVED or REJECTED.")
        
    update_notice_status(notice_id, req.status)
    return {"message": "Status updated"}


# --- Chat Endpoint ---

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    scan_context: Optional[dict] = None
    history: Optional[List[ChatMessage]] = None

@app.post("/chat/")
async def chat_endpoint(req: ChatRequest):
    from groq import Groq
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured.")

    system_prompt = """You are LabelCheck AI, a friendly and knowledgeable compliance assistant specializing in Indian Legal Metrology (Packaged Commodities) Rules, 2011.

Your role is to:
- Help users understand product label compliance results
- Explain what fields are mandatory on Indian product labels (MRP, net quantity, manufacturer details, batch number, mfg date, consumer care number)
- Answer questions about Legal Metrology rules clearly and simply
- Suggest corrective actions for non-compliant labels
- Be concise, helpful, and friendly

Keep responses short (2-4 sentences max) unless a detailed explanation is needed."""

    if req.scan_context:
        ctx = req.scan_context
        system_prompt += f"\n\nThe user's latest scan result:\n- Product: {ctx.get('product_name', 'Unknown')}\n- Status: {ctx.get('status', 'Unknown')}\n- Score: {ctx.get('score', 0)}/100\n- Violations: {', '.join(ctx.get('violations', [])) or 'None'}\n- Warnings: {', '.join(ctx.get('warnings', [])) or 'None'}"

    messages = [{"role": "system", "content": system_prompt}]
    if req.history:
        for msg in req.history[-6:]:
            messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": req.message})

    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=messages,
            max_tokens=512,
            temperature=0.7,
        )
        reply = response.choices[0].message.content.strip()
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
