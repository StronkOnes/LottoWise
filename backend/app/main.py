from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from .database import engine, get_db, Base
from .models import Draw, User, PredictionRun
from .utils.isaac import ISAAC
from .utils.combinatorics import calculate_winning_probability, generate_exclusive_system
from .ingestion.loaders import seed_initial_data
from .utils.modeling import DeltaSystem, MarkovModel
import pandas as pd
import numpy as np
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt

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

# Auth Config
SECRET_KEY = "lottowise_secret_key"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

@app.post("/register")
def register(username: str, password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if user:
        raise HTTPException(status_code=400, detail="Username already registered")
    new_user = User(username=username, hashed_password=get_password_hash(password))
    db.add(new_user)
    db.commit()
    return {"status": "success"}

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token = jwt.encode({"sub": user.username}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None: raise HTTPException(status_code=401)
    except JWTError: raise HTTPException(status_code=401)
    user = db.query(User).filter(User.username == username).first()
    if user is None: raise HTTPException(status_code=401)
    return user

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
    if not draws: raise HTTPException(status_code=404)
    n, m = (5, 50) if "Powerball" in game else (5, 36) if "Daily" in game else (6, 49)
    matrix = np.zeros((m + 1, m + 1))
    for d in draws:
        nums = [int(x) for x in d.numbers.split(",")]
        valid_nums = [x for x in nums if x <= m]
        from itertools import combinations
        for pair in combinations(valid_nums, 2):
            matrix[pair[0]][pair[1]] += 1
            matrix[pair[1]][pair[0]] += 1
    return {"game": game, "m": m, "matrix": matrix.tolist()}

@app.get("/predict/{game}")
def predict_numbers(game: str, method: str = "combined", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    n, m = (5, 50) if "Powerball" in game else (5, 36) if "Daily" in game else (6, 49)
    draws = db.query(Draw).filter(Draw.game == game).order_by(Draw.draw_date.asc()).all()
    
    if not draws or method == "isaac":
        isaac = ISAAC()
        picks = isaac.pick_n_from_m(n, m)
    else:
        draw_history = [[int(n) for n in d.numbers.split(",")] for d in draws]
        data_max = max(max(d) for d in draw_history)
        m_dynamic = max(m, data_max)
        model = MarkovModel(m_dynamic)
        model.train(draw_history)
        probs = model.get_probabilities(draw_history[-1])
        indices = np.arange(m_dynamic + 1)
        p_norm = probs / np.sum(probs)
        
        candidates = []
        for _ in range(1000):
            picks = sorted(np.random.choice(indices, size=n, replace=False, p=p_norm).tolist())
            if DeltaSystem.is_valid_delta(DeltaSystem.get_deltas(picks), m_dynamic):
                candidates.append(picks)
                if len(candidates) >= 1: break
        picks = candidates[0] if candidates else sorted(np.random.choice(indices, size=n, replace=False, p=p_norm).tolist())

    # Save run
    new_run = PredictionRun(user_id=current_user.id, game=game, method=method, picks=picks, created_at=datetime.now().isoformat())
    db.add(new_run)
    db.commit()
    
    return {"game": game, "method": method, "picks": picks, "id": new_run.id}

@app.get("/runs", response_model=List[dict])
def get_user_runs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    runs = db.query(PredictionRun).filter(PredictionRun.user_id == current_user.id).order_by(PredictionRun.id.desc()).all()
    return [{"id": r.id, "game": r.game, "method": r.method, "picks": r.picks, "created_at": r.created_at} for r in runs]

@app.delete("/runs/{run_id}")
def delete_run(run_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    run = db.query(PredictionRun).filter(PredictionRun.id == run_id, PredictionRun.user_id == current_user.id).first()
    if not run: raise HTTPException(status_code=404)
    db.delete(run)
    db.commit()
    return {"status": "success"}

@app.get("/system/exclusive")
def generate_system(n: int = 6, m: int = 49, p: int = 6, k: int = 4, lines: int = 10):
    available_numbers = range(1, m + 1)
    system = generate_exclusive_system(available_numbers, n, p, k, max_lines=lines)
    return {"parameters": {"n": n, "m": m, "p": p, "k": k, "lines": lines}, "system": system}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
