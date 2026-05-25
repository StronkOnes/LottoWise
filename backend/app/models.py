from sqlalchemy import Column, Integer, String, Date, Float, JSON
from .database import Base

class Draw(Base):
    __tablename__ = "draws"

    id = Column(Integer, primary_key=True, index=True)
    draw_id = Column(Integer, index=True)  # Unique draw number per game
    game = Column(String, index=True)      # e.g., "Lotto", "Powerball", "Daily Lotto"
    country = Column(String, default="ZA")
    draw_date = Column(Date, index=True)
    numbers = Column(String)               # Comma-separated winning numbers
    bonus_ball = Column(Integer, nullable=True)
    jackpot = Column(Float, nullable=True)
    total_sales = Column(Float, nullable=True)
    extra = Column(JSON, nullable=True)     # For machine, ball set, etc.

    def to_dict(self):
        return {
            "id": self.id,
            "draw_id": self.draw_id,
            "game": self.game,
            "country": self.country,
            "draw_date": self.draw_date.isoformat() if self.draw_date else None,
            "numbers": [int(n) for n in self.numbers.split(",")] if self.numbers else [],
            "bonus_ball": self.bonus_ball,
            "jackpot": self.jackpot,
            "total_sales": self.total_sales,
            "extra": self.extra
        }
