FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl ca-certificates gcc git && \
    apt-get clean

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Copy service account key and download model from GCS (build-time only)
COPY key.json /tmp/key.json

RUN pip install google-cloud-storage && \
    mkdir -p /app/models/flan-t5-small && \
    curl -sSL https://sdk.cloud.google.com | bash && \
    /root/google-cloud-sdk/install.sh -q && \
    PATH="/root/google-cloud-sdk/bin:$PATH" \
    gcloud auth activate-service-account --key-file=/tmp/key.json && \
    PATH="/root/google-cloud-sdk/bin:$PATH" \
    gsutil -m cp -r gs://flan-t5-small-summary/* /app/models/flan-t5-small/ && \
    rm /tmp/key.json

# Copy rest of the application code
COPY . /app

# Start the service
CMD ["python", "main.py"]