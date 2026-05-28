## About the Platform

A screen recording of one of our decommissioned platforms is provided as part of this exercise.

The platform is a real-time trading system where:

- Users receive live price updates for multiple assets (up to 20 updates per second).
- Users can place trades and receive instant visual feedback.
- Price charts animate in real time, showing historical and live price movements.
- The system must maintain smooth 60fps performance across desktop and mobile devices.
- Trades have entry and expiry times, with all price movements captured during the trade lifecycle.

## Assessment Tasks

Please complete both tasks below.

If details are unclear, make explicit assumptions and proceed based on those assumptions. You are encouraged to include code examples, architecture diagrams, and/or prototypes where useful.

---

## Question 1: Client-Side Charting Solution

Based on the provided video, design and explain how you would implement a charting solution that supports the following.

### Requirements

- Real-time price updates: Display live price data as it streams from the server.
- Smooth animations: Animate price movements and chart updates.
- Instant user feedback: Respond immediately to interactions (pan, zoom, trade placement).
- 60fps performance: Maintain smooth rendering at all times.
- Resource efficiency: Minimize CPU and memory usage.
- Cross-device support: Work seamlessly on desktop and mobile.

### What To Address

- What rendering technology or approach would you use, and why?
- How would you handle high-frequency updates (20+ updates per second with thousands of data points)?
- What strategies would you use to optimize rendering performance?
- How would you manage memory in long-running sessions?
- How would you structure data flow from WebSocket to chart rendering?
- What trade-offs would you consider between alternative approaches?

### Optional Supporting Material

- Architecture diagrams
- Code examples showing key implementation details
- Performance optimization strategies
- Specific libraries or technologies you would use

---

## Question 2: System Design - Trade Replay Feature

You are tasked with adding a new feature: Trade Replay.

This feature allows both end users and internal staff to replay historical trades, including all price movements from trade entry to expiry.

### Requirements

#### Priority 1: Minimal Performance Impact

- The solution must have minimal impact on live trading performance.
- Data capture must not introduce latency or bottlenecks.
- Storage operations must not affect real-time systems.

#### Priority 2: Data Integrity

- Replay output must match exactly what was captured, nothing more and nothing less.
- Every price tick during the trade lifecycle must be recorded.
- No data loss, no corruption, and no approximations.

### What To Design

#### a) Data Capture Strategy

- How would you capture price data during a trade lifecycle (entry to expiry)?
- What data format would you use?
- How would you ensure capture does not impact live trading performance?
- How would you guarantee data integrity and completeness?

#### b) Data Storage and Retention

- Design the storage architecture (hot vs cold storage).
- How would you structure the data for efficient retrieval?
- What retention policy would you apply?
- How would you optimize storage costs?

#### c) Data Access and Querying

- Design the API for retrieving replay data.
- How would you handle large time ranges efficiently?
- What caching strategies would you implement?
- How would you ensure fast query performance?

#### d) Replay Implementation

- Design the replay mechanism (client-side and server-side components).
- How would you handle playback controls (play, pause, speed adjustment)?
- How would you render replay efficiently?
- What should the user experience flow look like?

#### e) End-to-End Architecture

- Provide a complete architecture diagram showing data flow.
- Identify all system components and interactions.
- Explain the trade-offs in your design decisions.
- Address scalability concerns.

### Optional Supporting Material

- System architecture diagrams
- Data schema designs
- API specifications
- Code examples for critical components
- Infrastructure considerations

---

## Deliverables

Provide your response as a structured document that addresses both questions.

You may include:

- Architecture diagrams (hand-drawn or digital)
- Code snippets in TypeScript or JavaScript
- Database or storage schema designs
- API specifications
- Infrastructure considerations
- Technology choices with reasoning
- Demonstrable prototypes

## Evaluation Criteria

Your submission will be assessed on your ability to:

- Think holistically about system design.
- Work with ambiguity and make appropriate assumptions to define scope.
- Balance competing priorities (performance vs features).
- Make pragmatic engineering trade-offs.
- Anticipate edge cases and failure modes.
- Design solutions that are maintainable, observable, and scalable.
