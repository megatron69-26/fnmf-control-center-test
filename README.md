# FNMF Test Control Center

Interactive React Flow canvas dashboard & telemetry monitor for the FNMF distributed test environment.

---

## 1. Overview & Architecture

FNMF Test Control Center provides real-time topology observability and operations management across the test pipeline:
- **Samsung Galaxy Note 10+**: Hardware bridge, Spring Boot backend, PostgreSQL database, and Qwen2.5-1.5B LLM runtime.
- **Laptop Host Services**: Semaphore CI/CD automation, Grafana metrics, and Dashy portal.
- **External Market Providers**: Binance REST API and public cloud endpoints.

---

## 2. Security & Configuration Policy

* **Zero Hardcoded Secrets**: All operator authentication secrets and external service tokens (such as Semaphore API tokens) are strictly externalized to `C:/Users/khoid/AppData/Local/fnmf-control-center/control-center.env` or local gitignored environment files.
* **Fail-Closed Operations**: Triggers and actions require an explicit operator authentication modal with anti-CSRF token verification.
* **Telemetry Protection**: Real-time telemetry polling sanitizes and masks sensitive identifiers before rendering on the web canvas.

---

## 3. Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or start the unified backend and dashboard
start_control_center.bat
```

The dashboard will be available at `http://127.0.0.1:4100`.
