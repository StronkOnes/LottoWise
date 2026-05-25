import pandas as pd
import os
from datetime import datetime
from ..models import Draw, Base
from ..database import SessionLocal, engine

class CSVLoader:
    def __init__(self, file_path, game_name):
        self.file_path = file_path
        self.game_name = game_name

    def load(self):
        if not os.path.exists(self.file_path):
            print(f"File not found: {self.file_path}")
            return []

        # No headers in CSV
        df = pd.read_csv(self.file_path, header=None, on_bad_lines='skip')
        
        draws = []
        for _, row in df.iterrows():
            try:
                # Column 0: Draw ID
                # Column 1: Date (e.g. 11.03.2019)
                # Column 2-6: Numbers
                # Column 7: Bonus (maybe)
                
                draw_id_str = str(row[0])
                try:
                    draw_id = int(draw_id_str)
                except:
                    draw_id = 0
                
                date_str = str(row[1])
                try:
                    # Try different formats
                    for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y"):
                        try:
                            draw_date = datetime.strptime(date_str, fmt).date()
                            break
                        except:
                            continue
                    else:
                        draw_date = datetime.now().date()
                except:
                    draw_date = datetime.now().date()

                numbers_raw = []
                bonus_ball = None
                
                # For Lotto 6/49, Daily 5/36, etc.
                # Let's assume cols 2 to 7 are numbers, then bonus
                if "Daily" in self.game_name:
                    # 5 numbers
                    for i in range(2, 7):
                        try: numbers_raw.append(int(row[i]))
                        except: pass
                else:
                    # 6 numbers + bonus?
                    # Let's just collect all numeric values from index 2 onwards
                    for i in range(2, len(row)):
                        val = row[i]
                        try:
                            num = int(val)
                            if len(numbers_raw) < 6: # 6 numbers for Lotto/PB
                                numbers_raw.append(num)
                            elif bonus_ball is None:
                                bonus_ball = num
                        except:
                            continue
                
                if not numbers_raw:
                    continue

                numbers_str = ",".join(map(str, sorted(numbers_raw)))
                
                draw = Draw(
                    draw_id=draw_id,
                    game=self.game_name,
                    country="ZA",
                    draw_date=draw_date,
                    numbers=numbers_str,
                    bonus_ball=bonus_ball,
                    jackpot=0.0,
                    total_sales=0.0
                )
                draws.append(draw)
            except Exception as e:
                continue
        
        return draws

def seed_initial_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    loaders = [
        CSVLoader("sa_lotto.csv", "Lotto"),
        CSVLoader("sa_daily_lotto.csv", "Daily Lotto"),
        CSVLoader("sa_powerball.csv", "Powerball")
    ]
    
    total_added = 0
    for loader in loaders:
        draws = loader.load()
        for draw in draws:
            exists = db.query(Draw).filter(
                Draw.game == draw.game, 
                Draw.draw_id == draw.draw_id
            ).first()
            if not exists:
                db.add(draw)
                total_added += 1
    
    db.commit()
    db.close()
    print(f"Seeded {total_added} draws.")
