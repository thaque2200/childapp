# FROM python:3.10-slim
# WORKDIR /app
# COPY . /app
# RUN pip install --upgrade pip && pip install -r requirements.txt
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]

FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl gnupg ca-certificates gcc && \
    apt-get clean

# Install pip dependencies early (optional caching layer)
COPY requirements.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Install gcloud SDK and gsutil
RUN curl -sSL https://sdk.cloud.google.com | bash && \
    /root/google-cloud-sdk/install.sh -q
ENV PATH="/root/google-cloud-sdk/bin:$PATH"

# Accept the key file path from build arg
ARG GOOGLE_APPLICATION_CREDENTIALS

# Copy key file into image
COPY $GOOGLE_APPLICATION_CREDENTIALS /tmp/key.json

# ✅ Create model directory inside app and download the model
RUN gcloud auth activate-service-account --key-file=/tmp/key.json && \
    mkdir -p /app/app/models/parenting_roberta_best && \
    mkdir -p /app/app/models/parenting_roberta_tokenizer && \
    gsutil -m cp -r gs://intent_classification_model_parenting/* /app/app/models/parenting_roberta_best/ && \
    gsutil -m cp -r gs://intent_classification_tokenizer_parenting/* /app/app/models/parenting_roberta_tokenizer/ && \
    rm /tmp/key.json
    
# ✅ Copy backend/app to container /app/app
COPY app/ /app/app

# Run FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
