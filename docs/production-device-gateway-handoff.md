# Production device gateway handoff

The production control tower accepts normalised machine events at `POST /api/v1/manufacturing-telemetry/events` after an authenticated gateway is registered in Production Autonomy.

For each physical gateway, the plant team supplies:

- A gateway code, protocol (HTTPS webhook, MQTT, OPC-UA, Modbus, or file), and assigned work station.
- A vault reference for its credential; never a credential value in SAK ERP.
- Network allowlisting to the test or production API, using TLS.
- A heartbeat at least once per configured interval and unique `source_event_id` values.
- Field mapping for event type, timestamp, run/idle/stop, good/reject count, cycle seconds, energy kWh, temperature, and vibration.

Supported event types are `RUN`, `IDLE`, `STOP`, `COUNT`, `QUALITY`, `ENERGY`, and `CONDITION`. The ERP stores source evidence idempotently, raises explainable threshold alerts, and only creates advisory APS, quality, or maintenance actions. It never auto-starts a machine, releases quality holds, changes an approved schedule, or completes maintenance.

Camera gateways submit their image reference, inspection type, confidence, and `PASS`, `FAIL`, or `REVIEW` verdict through the vision-inspection endpoint. Failed or ambiguous results create a controlled quality exception for human disposition.
