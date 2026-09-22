#!/bin/bash

# start_dev.sh
# Unified runner for LabelCheck Backend (FastAPI) and Frontend (Next.js)

echo "========================================="
echo " Starting LabelCheck Compliance System"
echo "========================================="

# Function to clean up background processes on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit 0
}

# Trap SIGINT (Ctrl+C) and call cleanup
trap cleanup SIGINT

# Start Backend
echo "[1/2] Starting Python FastAPI Backend on port 8000..."
source venv/bin/activate 2>/dev/null || echo "No venv found, using system Python"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start Frontend
echo "[2/2] Starting Next.js Frontend on port 3000..."
cd frontend || exit 1
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npm run dev &
FRONTEND_PID=$!

echo "========================================="
echo " Servers are running!"
echo " Frontend: http://localhost:3000"
echo " Backend API: http://localhost:8000/docs"
echo " Press Ctrl+C to stop both servers."
echo "========================================="

# Wait for background processes to keep script running
wait $BACKEND_PID $FRONTEND_PID
