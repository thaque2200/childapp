FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install pip dependencies early (optional caching layer)
COPY requirements.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt
  
# ✅ Copy backend/app to container /app/app
COPY app/ /app/app

# Run FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]