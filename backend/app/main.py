from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from .database import engine, get_db, Base
from .models import Draw
from .utils.isaac import ISAAC
from .utils.combinatorics import calculate_winning_probability, generate_exclusive_system
from .ingestion.loaders import seed_initial_data
import pandas as pd
import numpy as np

from fastapi.middleware.cors import CORSMiddleware

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="LottoWise API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to LottoWise API"}

@app.post("/seed")
def seed_data():
    seed_initial_data()
    return {"status": "success", "message": "Initial data seeded"}

@app.get("/draws", response_model=List[dict])
def get_draws(game: Optional[str] = None, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(Draw)
    if game:
        query = query.filter(Draw.game == game)
    draws = query.order_by(Draw.draw_date.desc()).limit(limit).all()
    return [d.to_dict() for d in draws]

@app.get("/stats/{game}")
def get_game_stats(game: str, db: Session = Depends(get_db)):
    draws = db.query(Draw).filter(Draw.game == game).all()
    if not draws:
        raise HTTPException(status_code=404, detail="Game not found or no data available")
    
    all_numbers = []
    for d in draws:
        nums = [int(n) for n in d.numbers.split(",")]
        all_numbers.extend(nums)
    
    series = pd.Series(all_numbers)
    counts = series.value_counts().sort_index()
    
    # Hot/Cold
    hot = counts.nlargest(10).to_dict()
    cold = counts.nsmallest(10).to_dict()
    
    return {
        "game": game,
        "total_draws": len(draws),
        "frequency": counts.to_dict(),
        "hot_numbers": hot,
        "cold_numbers": cold
    }

@app.get("/stats/{game}/co-occurrence")
def get_co_occurrence(game: str, db: Session = Depends(get_db)):
    draws = db.query(Draw).filter(Draw.game == game).all()
    if not draws:
        raise HTTPException(status_code=404, detail="Game not found or no data available")
    
    # Determine m based on game
    n, m = 6, 49
    if "Powerball" in game: n, m = 5, 50
    elif "Daily" in game: n, m = 5, 36
    
    matrix = np.zeros((m + 1, m + 1))
    
    for d in draws:
        nums = [int(x) for x in d.numbers.split(",")]
        # Only take valid numbers for the matrix
        valid_nums = [x for x in nums if x <= m]
        from itertools import combinations
        for pair in combinations(valid_nums, 2):
            matrix[pair[0]][pair[1]] += 1
            matrix[pair[1]][pair[0]] += 1
            
    # Convert to list for JSON response
    return {
        "game": game,
        "m": m,
        "matrix": matrix.tolist()
    }

from .utils.modeling import DeltaSystem, MarkovModel

# ... existing routes ...

@app.get("/predict/{game}")
def predict_numbers(game: str, method: str = "combined", db: Session = Depends(get_db)):
    # Configuration
    n, m = 6, 49
    if "Powerball" in game: n, m = 5, 50
    elif "Daily" in game: n, m = 5, 36
        
    draws = db.query(Draw).filter(Draw.game == game).order_by(Draw.draw_date.asc()).all()
    
    if not draws or method == "isaac":
        isaac = ISAAC()
        return {"game": game, "method": "isaac", "picks": isaac.pick_n_from_m(n, m)}

    # Historical data for Markov
    draw_history = [[int(n) for n in d.numbers.split(",")] for d in draws]
    
    # Dynamically determine m
    if not draw_history:
        isaac = ISAAC()
        return {"game": game, "method": "isaac", "picks": isaac.pick_n_from_m(n, m)}
    
    data_max = max(max(d) for d in draw_history)
    m = max(m, data_max)
    
    # Train Markov
    model = MarkovModel(m)
    model.train(draw_history)
    
    # Get probabilities based on last draw
    probs = model.get_probabilities(draw_history[-1])
    
    # Weighted random choice based on Markov probabilities
    # We use ISAAC for the randomness grain but weight it by Markov probs
    isaac = ISAAC()
    
    candidates = []
    # Filter by Delta System
    for _ in range(1000): # Try 1000 times to find a valid delta set
        # Sample n numbers based on probabilities
        indices = np.arange(m + 1)
        # Normalize probs again to be sure
        p_norm = probs / np.sum(probs)
        picks = np.random.choice(indices, size=n, replace=False, p=p_norm)
        picks = sorted(picks.tolist())
        
        # Check Delta
        deltas = DeltaSystem.get_deltas(picks)
        if DeltaSystem.is_valid_delta(deltas, m):
            candidates.append(picks)
            if len(candidates) >= 5: break
            
    if not candidates:
        # Fallback if Delta filter is too strict
        picks = sorted(np.random.choice(indices, size=n, replace=False, p=p_norm).tolist())
        candidates.append(picks)

    return {
        "game": game,
        "method": method,
        "picks": candidates[0],
        "alternatives": candidates[1:]
    }

@app.get("/system/exclusive")
def generate_system(n: int = 6, m: int = 49, p: int = 6, k: int = 4, lines: int = 10):
    available_numbers = range(1, m + 1)
    system = generate_exclusive_system(available_numbers, n, p, k, max_lines=lines)
    return {
        "parameters": {"n": n, "m": m, "p": p, "k": k, "lines": lines},
        "system": system
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
