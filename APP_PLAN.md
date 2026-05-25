# Project Plan: Lottery Analysis & Prediction Dashboard (LottoWise)

## 1. Background & Motivation
The goal is to build a professional-grade lottery analysis application that leverages historical data, statistical models, and machine learning to identify patterns and generate high-probability number combinations. Unlike basic "quick pick" tools, this app will implement rigorous mathematical concepts such as Markov Chains, the Delta System, and the Exclusiveness Condition for playing systems.

## 2. Scope & Impact
- **Target Games:** South African Lottery (Lotto, Powerball, Daily Lotto) with extensibility to others.
- **Real-time Data:** Automated ingestion of live draw results.
- **Analytics:** Frequency analysis, Hot/Cold trends, Co-occurrence heatmaps, Positional analysis.
- **Modeling:** 
    - Markov Chains (state-based transitions).
    - Delta System (number gap analysis).
    - Association Rules (frequent itemsets).
    - Bayesian Inference.
- **System Generation:** Wheeling systems and Reduced systems with linear probability optimization.
- **Dashboard:** A "beautiful" high-fidelity UI for visualizing complex datasets.

## 3. Proposed Solution
### Tech Stack
- **Backend:** Python (FastAPI) for high-performance data processing and modeling.
- **Frontend:** React with Tailwind CSS and advanced charting libraries (Recharts or D3.js) for the dashboard.
- **Database:** PostgreSQL for robust historical storage and complex queries.
- **Automation:** Scheduled tasks (using `apscheduler` or `cron`) for real-time data ingestion.

### Architecture
- **Ingestion Layer:** Modular scrapers and API clients for official and 3rd-party sources.
- **Engine Layer:** Statistical core handling combinatorics and prediction algorithms.
- **API Layer:** RESTful endpoints for the frontend.
- **UI Layer:** Interactive dashboard with real-time updates and "System Builder" wizard.

## 4. Implementation Plan

### Phase 1: Foundation & Data Pipeline
1. Initialize project structure (Monorepo).
2. Implement `Draws` schema and Database setup.
3. Develop Ingestion Module:
    - Scraper for `nationallottery.co.za` (official).
    - Client for `ResultsZA API`.
    - CSV importer for legacy archives.
4. Set up automated daily synchronization.

### Phase 2: Core Mathematics & Modeling
1. **Combinatorics & Probability Engine:**
    - Custom Python module utilizing `math.comb` for $nCr$ calculations.
    - Implementation of the **Exclusiveness Condition solver**: enforces $c_{ij} \le 2k - n - 1$ to ensure linear probability growth in generated systems (e.g., $c_{ij}=1$ for 6/49 with $k=4$).
2. **Cryptographic Generation Engine:**
    - Primary Engine: **ISAAC** (Indirection, Shift, Accumulate, Add, and Count).
    - Entropy Source: 1024-byte seed from `os.urandom` to ensure every one of the 13,983,816 combinations is reachable.
3. **Statistical Modeling Engine:**
    - **Markov Chain Matrix:** Uses `NumPy` for transition state calculations based on historical draw sequences.
    - **Delta System Filter:** Applies the 1-15 gap rules (first number 1-3, etc.) as a configurable generation constraint.
    - **Association Rule Miner:** Uses the `mlxtend` library (FP-Growth) to identify "lucky pairs" and co-occurrence clusters.

### Phase 3: Backend API Development
1. Create endpoints for:
    - Historical draws (filtered by date/game).
    - Live stats (Frequency, Hot/Cold, Gaps).
    - Model outputs (Predicted combinations).
    - System generation (Wheeling/Reduced).
2. Implement backtesting engine to validate models against history.

### Phase 4: Frontend & Dashboard
1. Design and develop the Main Dashboard:
    - Global overview charts.
    - Heatmaps for co-occurrence.
    - Hot/Cold number rankings.
2. Develop the "Prediction Center":
    - Interactive tool to generate picks based on selected models.
3. Develop the "System Builder":
    - Interface for generating Wheeling and Reduced systems.
4. Integrate real-time WebSocket or polling for "Live Data" feel.

## 5. Verification & Testing
- **Unit Tests:** Validate combinatorics and statistical formulas against known benchmarks in the provided PDFs.
- **Data Validation:** Ensure no duplicate or missing draws in the pipeline.
- **Backtesting:** Run prediction models against the last 100 historical draws to measure "hit" rates vs. random baseline.
- **UI/UX:** Responsive design testing across devices.

## 6. Ethics & Disclaimers
- Explicitly state in the UI that lottery draws are independent events.
- Tools are for informational and entertainment purposes only.
- Include responsible gambling links.
