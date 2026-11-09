# =========================================================
# Build stage
# =========================================================
FROM golang:1.26-alpine AS builder

RUN apk add --no-cache \
    git \
    gcc \
    musl-dev \
    libwebp-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build API
RUN CGO_ENABLED=1 GOOS=linux go build \
    -a \
    -trimpath \
    -ldflags="-s -w" \
    -o server \
    ./cmd/api/main.go

# Build manual seed tool
RUN CGO_ENABLED=1 GOOS=linux go build \
    -a \
    -trimpath \
    -ldflags="-s -w" \
    -o seed \
    ./cmd/tools/seed/main.go

# Build dev referral payment simulator
RUN CGO_ENABLED=1 GOOS=linux go build \
    -a \
    -trimpath \
    -ldflags="-s -w" \
    -o simulate-referral-payment \
    ./cmd/tools/simulate-referral-payment/main.go

# =========================================================
# Runtime stage
# =========================================================
FROM alpine:3.22

RUN apk add --no-cache \
    ca-certificates \
    libwebp \
    tzdata \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /app/server /app/server
COPY --from=builder /app/seed /app/seed
COPY --from=builder /app/simulate-referral-payment /app/simulate-referral-payment

RUN mkdir -p /app/uploads \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

CMD ["./server"]
