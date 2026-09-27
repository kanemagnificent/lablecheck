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
from database import save_audit_log, fetch_all_logs, fetch_log_by_scan_id, create_notice, fetch_notices, update_notice_status, get_user_by_email, create_user
from report_renderer import render_pdf_report

app = FastAPI(
    title="Pack Proof Compliance Engine",
    description="Legal Metrology (Packaged Commodities) Rules, 2011 Compliance Checker",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        
        # Cloudinary integration (Hybrid Storage Architecture)
        final_image_urls = []
        cloudinary_url = os.environ.get("CLOUDINARY_URL")
        
        if cloudinary_url:
            import cloudinary
            import cloudinary.uploader
            for p in image_paths:
                try:
                    res = cloudinary.uploader.upload(p)
                    final_image_urls.append(res["secure_url"])
                except Exception as e:
                    print(f"[ERROR] Cloudinary upload failed: {e}")
                    
        # Fallback to local if cloud storage is not configured or fails
        if not final_image_urls:
            final_image_urls = [os.path.basename(p) for p in image_paths]
            # Leave files in local UPLOAD_DIR for frontend to serve
        else:
            # Cleanup local temp files if cloud upload succeeded
            for p in image_paths:
                if os.path.exists(p):
                    os.remove(p)
                    
        filenames_record = ", ".join(final_image_urls)
        
        if result["compliance_status"] != "RESCAN NEEDED":
            # Save the new URLs or filenames to the DB
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
        # Cleanup images on error
        for p in image_paths:
            if os.path.exists(p):
                os.remove(p)
        print(f"[ERROR] {e}")
        raise HTTPException(status_code=500, detail="Analysis failed. Please try again.")

# --- Security & RBAC ---
import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from pydantic import BaseModel
import time
import os

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "super-secret-key-change-in-prod")
ALGORITHM = "HS256"

security = HTTPBearer(auto_error=False)

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials:
        return {"role": "USER", "email": None} # Default to USER for public endpoints
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        role = payload.get("role")
        email = payload.get("sub")
        company = payload.get("company")
        if not role:
            return {"role": "USER", "email": None, "company": None}
        return {"role": role, "email": email, "company": company}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

class RequireRole:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: dict = Depends(get_current_user)):
        if user["role"] not in self.allowed_roles:
            raise HTTPException(
                status_code=403, 
                detail=f"Forbidden: You do not have the required permissions. Role '{user['role']}' is not in {self.allowed_roles}"
            )
        return user

class LoginRequest(BaseModel):
    email: str
    password: str

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@app.on_event("startup")
def startup_event():
    # Seed default users if they don't exist yet
    create_user("inspector.mh@gov.in", pwd_context.hash("securepassword"), "INSPECTOR")
    create_user("compliance@acmecorp.com", pwd_context.hash("securepassword"), "MANUFACTURER", "Acme Corp")
    create_user("compliance@nestle.com", pwd_context.hash("securepassword"), "MANUFACTURER", "Nestle")

@app.post("/api/v1/auth/login")
async def login(req: LoginRequest):
    user = get_user_by_email(req.email)
    
    if not user or not pwd_context.verify(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    token = jwt.encode(
        {"sub": user["email"], "role": user["role"], "company": user["company_name"], "exp": time.time() + 86400}, 
        SECRET_KEY, 
        algorithm=ALGORITHM
    )
    return {"access_token": token, "role": user["role"]}
# ------------------------

@app.get("/logs/")
async def get_logs(user: dict = Depends(RequireRole(["INSPECTOR", "MANUFACTURER"]))):
    logs = fetch_all_logs()
    
    # Data Isolation (Multi-Tenancy): Manufacturers only see their own logs
    if user["role"] == "MANUFACTURER":
        my_company = str(user.get("company") or "").lower()
        
        filtered = []
        for log in logs:
            mfg = str(log.get("fields", {}).get("manufacturer", {}).get("value") or "").lower()
            if my_company in mfg:
                filtered.append(log)
            # Fallback for dummy scans that failed OCR but belong to Acme for testing
            elif "acme" in my_company and not mfg:
                filtered.append(log)
        return filtered
        
    # Inspectors see everything
    return logs

@app.get("/report/{scan_id}")
async def get_report(scan_id: str, type: str = "audit"):
    from fastapi.responses import FileResponse
    log = fetch_log_by_scan_id(scan_id)
    if not log:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    out_pdf = f"report_{scan_id[:8]}.pdf"
    render_pdf_report(log, out_pdf, report_type=type)
    
    return FileResponse(out_pdf, media_type='application/pdf', filename=out_pdf)

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
    
    # --- AUTOMATED EMAIL SYSTEM (MOCK) ---
    import asyncio
    async def send_mock_email():
        print(f"\n[EMAIL SYSTEM] Preparing to send Notice {notice_id} to {req.manufacturer}...")
        log = fetch_log_by_scan_id(scan_id)
        if log:
            # Generate the actual PDF report to attach to the email
            os.makedirs("sent_emails", exist_ok=True)
            out_pdf = f"sent_emails/Notice_{notice_id}.pdf"
            render_pdf_report(log, out_pdf, report_type="audit")
            
            await asyncio.sleep(2) # Simulate network delay
            
            # Format a fake email address from the manufacturer name
            fake_email = f"compliance@{req.manufacturer.replace(' ', '').lower()}.com"
            print(f"[EMAIL SYSTEM] SUCCESS: Email successfully sent to {fake_email}")
            print(f"[EMAIL SYSTEM] Attachment generated: {out_pdf}\n")
    
    # Run the email task in the background
    asyncio.create_task(send_mock_email())
    # --------------------------------------
    
    return {"message": "Notice created", "notice_id": notice_id}

@app.get("/notices/")
async def api_get_notices(user: dict = Depends(RequireRole(["INSPECTOR", "MANUFACTURER"]))):
    notices = fetch_notices()
    
    # Data Isolation (Multi-Tenancy): Manufacturers only see their own notices
    if user["role"] == "MANUFACTURER":
        my_company = str(user.get("company") or "").lower()
        
        filtered = []
        for n in notices:
            if my_company in str(n.get("manufacturer", "")).lower():
                filtered.append(n)
        return filtered
        
    # Inspectors see everything
    return notices

@app.put("/notices/{notice_id}/status")
async def api_update_notice_status(notice_id: str, req: NoticeStatusUpdateRequest, user: dict = Depends(RequireRole(["INSPECTOR", "MANUFACTURER"]))):
    # Enforce role-based status transition logic
    role = user["role"]
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

@app.get("/api/v1/ingredients/alternatives")
async def get_ingredient_alternatives(ingredient: str):
    from groq import Groq
    import json
    
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured.")
        
    system_prompt = """You are an expert in cosmetic and food chemistry and Indian Legal Metrology compliance.
The user will provide a toxic or non-compliant ingredient.
Your task is to suggest 3 safe, compliant, and widely available alternative ingredients.
Provide the response as a valid JSON array of objects. Each object must have exactly two string keys: "name" and "reason".
Do not output any markdown formatting, only the raw JSON array."""

    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Suggest alternatives for: {ingredient}"}
            ],
            max_tokens=512,
            temperature=0.3,
        )
        
        reply = response.choices[0].message.content.strip()
        if reply.startswith("```json"):
            reply = reply[7:]
        elif reply.startswith("```"):
            reply = reply[3:]
        if reply.endswith("```"):
            reply = reply[:-3]
            
        try:
            alternatives = json.loads(reply.strip())
        except json.JSONDecodeError:
            alternatives = [{"name": "Error parsing AI response", "reason": reply}]
            
        return {"alternatives": alternatives}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
