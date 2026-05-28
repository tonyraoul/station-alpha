# Consolidated Service Interactions

## Backend Micro-Services Interactions

```mermaid
flowchart LR
    subgraph Ingestion
        MKT[Market Tick Feed]
        TRD[Trade Event Feed]
        TCS[Ticker Capture Service]
        TRCS[Trade Capture Service]
        BUS[Pub/Sub Bus]
        AGG[Aggregation Service]

        MKT --> TCS
        TRD --> TRCS
        TCS --> BUS
        BUS --> AGG
    end

    subgraph Storage
        MONGO_T[(MongoDB Tickers)]
        MONGO_TR[(MongoDB Trades)]
        REDIS[(Redis Cache)]
        REDIS_ROLL[(Redis Rollup Cache)]
      TSDB[(Telemetry Metrics Store)]
      LOGS[(Log Store)]
      TRACES[(Trace Store)]
        S3T[(Ticker Archive S3)]
        S3TR[(Trade Archive S3)]

        TCS --> MONGO_T
        TRCS --> MONGO_TR
        AGG --> REDIS_ROLL
        MONGO_T --> REDIS
        MONGO_TR --> REDIS
        MONGO_T --> S3T
        MONGO_TR --> S3TR
    end

    subgraph APIs
        HTAPI[Historical Ticker Data API]
        TRAPI[Trades API]
        AUTHAPI[Auth API Login Signup]
        NOTIFAPI[Notification API]
        AFFAPI[Affiliates API Optional]
      TELAPI[Telemetry API]
        IDP[Identity Service]
        NOTIFSVC[Notification Service]
        AFFSVC[Affiliates Service Optional]
      TELSVC[Telemetry Service]
        BFF[Replay BFF]

        MONGO_T --> HTAPI
        REDIS --> HTAPI
        REDIS_ROLL --> HTAPI
        MONGO_TR --> TRAPI
        REDIS --> TRAPI
        AUTHDB[(User Identity Store)]
        AUTHAPI --> IDP
        IDP --> AUTHDB
        TRCS --> NOTIFSVC
        NOTIFSVC --> NOTIFAPI
        NOTIFDB[(Notification Store)]
        NOTIFSVC --> NOTIFDB
        PUSH[Push Gateway]
        EMAIL[Email Provider]
        NOTIFSVC --> PUSH
        NOTIFSVC --> EMAIL
        AFFDB[(Affiliates Store)]
        AFFSVC --> AFFDB
        AFFSVC --> AFFAPI

        TCS --> TELSVC
        TRCS --> TELSVC
        AGG --> TELSVC
        HTAPI --> TELSVC
        TRAPI --> TELSVC
        BFF --> TELSVC
        TELSVC --> TSDB
        TELSVC --> LOGS
        TELSVC --> TRACES
        TELSVC --> TELAPI

        HTAPI --> BFF
        TRAPI --> BFF
        AFFAPI --> BFF
    end

    subgraph Consumers
        WEB[Web Client]
        MOBILE[Mobile Client]
        STAFF[Staff Portal]

        BFF --> WEB
        BFF --> MOBILE
        BFF --> STAFF
        WEB --> AUTHAPI
        MOBILE --> AUTHAPI
        STAFF --> AUTHAPI
        WEB --> NOTIFAPI
        MOBILE --> NOTIFAPI
        STAFF --> NOTIFAPI
        STAFF --> AFFAPI
        STAFF --> TELAPI
    end
```

## Frontend Package Interaction Graph

```mermaid
flowchart LR
    subgraph AppShell
        ROUTER[router]
        STATE[state-store]
        UI[ui-shell]
    end

    subgraph AuthFeature
        AUTHC[auth-controller]
        AUTHS[auth-store]
        LOGIN[login-signup-ui]
    end

    subgraph ReplayFeature
        RC[replay-controller]
        RS[replay-store]
        PC[playback-controller]
        PS[playback-store]
        TIMELINE[timeline]
        CHART[chart-renderer]
    end

    subgraph DataAccess
        CLIENT[bff-client]
        AUTHCLIENT[auth-client]
        NOTIFCLIENT[notification-client]
        AFFCLIENT[affiliates-client]
      TELCLIENT[telemetry-client]
        CACHE[client-cache]
        MODEL[data-models]
    end

    ROUTER --> RC
    UI --> RC
    ROUTER --> AUTHC
    LOGIN --> AUTHC
    AUTHC --> AUTHS
    AUTHC --> AUTHCLIENT
    UI --> NOTIFCLIENT
    UI --> AFFCLIENT
    UI --> TELCLIENT
    RC --> CLIENT
    RC --> RS
    RS --> PC
    PC --> PS
    PS --> TIMELINE
    PS --> CHART

    CLIENT --> CACHE
    CLIENT --> MODEL
    NOTIFCLIENT --> STATE
    AFFCLIENT --> STATE
    TELCLIENT --> STATE
    RS --> STATE
    PS --> STATE
```

## Replay Reference Pack

### Example Schemas and Payloads

#### ticker_event (source of truth)

```json
{
  "event_id": "tick_BTCUSD_2026-05-29T10:15:30.123Z_9987123",
  "symbol": "BTCUSD",
  "source_timestamp": "2026-05-29T10:15:30.123Z",
  "sequence": 9987123,
  "bid": 68420.12,
  "ask": 68420.43,
  "last": 68420.3
}
```

#### trade_event

```json
{
  "event_id": "trade_evt_7f2a_entered",
  "trade_id": "trd_7f2a",
  "user_id": "usr_214",
  "symbol": "BTCUSD",
  "entry_time": "2026-05-29T10:15:25.000Z",
  "expiry_time": "2026-05-29T10:16:25.000Z",
  "status": "entered",
  "created_at": "2026-05-29T10:15:25.012Z"
}
```

#### rollup_candle

```json
{
  "symbol": "BTCUSD",
  "resolution": "1m",
  "bucket_start": "2026-05-29T10:15:00.000Z",
  "open": 68410.0,
  "high": 68450.2,
  "low": 68398.1,
  "close": 68420.3,
  "volume": 125.44,
  "tick_count": 1200
}
```

#### replay_bootstrap_response

```json
{
  "trade": {
    "trade_id": "trd_7f2a",
    "symbol": "BTCUSD",
    "entry_time": "2026-05-29T10:15:25.000Z",
    "expiry_time": "2026-05-29T10:16:25.000Z",
    "status": "expired"
  },
  "access_scope": "end_user",
  "resolution": "1s",
  "cursor": "cur_01",
  "ticks": [
    {
      "t": "2026-05-29T10:15:25.000Z",
      "last": 68411.4
    },
    {
      "t": "2026-05-29T10:15:26.000Z",
      "last": 68412.05
    }
  ]
}
```

### Sequence Diagrams

#### Sequence A: Login to Replay Playback

```mermaid
sequenceDiagram
        participant U as User
        participant FE as Web or Mobile
        participant BFF as Replay BFF
        participant AUTH as Auth API
        participant TR as Trades API
        participant HT as Historical Ticker Data API
        participant RC as Redis Rollup Cache

        U->>FE: Login
        FE->>AUTH: POST /login
        AUTH-->>FE: Access token
        U->>FE: Open trade replay
        FE->>BFF: GET /bff/replays/{trade_id}/bootstrap
        BFF->>TR: GET /trades/{trade_id}
        TR-->>BFF: trade metadata
        BFF->>HT: GET /historical-tickers with window+resolution
        HT->>RC: read rollup bucket
        RC-->>HT: rollup hit or miss
        HT-->>BFF: first chunk + cursor
        BFF-->>FE: bootstrap payload
        FE-->>U: Start playback
```

#### Sequence B: Tick Ingest to Rollup Query

```mermaid
sequenceDiagram
        participant FEED as Market Feed
        participant TCS as Ticker Capture Service
        participant BUS as Pub/Sub Bus
        participant AGG as Aggregation Service
        participant ROLL as Redis Rollup Cache
        participant MONGO as MongoDB Tickers
        participant HT as Historical Ticker Data API

        FEED->>TCS: tick event
        TCS->>MONGO: append raw tick
        TCS->>BUS: publish tick
        BUS->>AGG: tick message
        AGG->>ROLL: upsert rollup bucket
        HT->>ROLL: fetch rollup by symbol+resolution+bucket
        ROLL-->>HT: rollup data
```

### Failure Modes and Fallbacks

1. Pub/Sub lag spikes:
   fallback to raw ticker reads for affected windows and alert on consumer lag threshold.
2. Redis rollup cache miss:
   query raw ticker store, compute on-demand aggregate, then backfill Redis asynchronously.
