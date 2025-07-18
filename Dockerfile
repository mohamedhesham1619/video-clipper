# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -o build/clipper ./cmd/clipper

# Final stage
FROM alpine:latest

RUN apk add --no-cache yt-dlp ffmpeg

WORKDIR /app

COPY --from=builder /app/internal/web/static ./internal/web/static

COPY --from=builder /app/internal/data ./internal/data

COPY --from=builder /app/build/clipper .

EXPOSE 8080

CMD ["./clipper"]