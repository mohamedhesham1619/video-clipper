# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -o build/clipper ./cmd/clipper

# Final stage
FROM alpine:latest

# Install Python3, pip, ffmpeg, aria2, deno
RUN apk add --no-cache python3 py3-pip ffmpeg aria2 deno

# Install the latest yt-dlp from PyPI (pip)
RUN pip install -U "yt-dlp[default]" --break-system-packages

WORKDIR /app

COPY --from=builder /app/internal/blocklist/blocked_domains.txt ./internal/blocklist/
COPY --from=builder /app/internal/web ./internal/web
COPY --from=builder /app/build/clipper .

RUN mkdir -p /app/clips

EXPOSE 8080

CMD ["./clipper"]