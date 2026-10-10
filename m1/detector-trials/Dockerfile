FROM python:3.12-slim
RUN pip install --no-cache-dir opencv-python-headless numpy
WORKDIR /app
COPY opencv_mser.py .
ENTRYPOINT ["python3", "opencv_mser.py"]
