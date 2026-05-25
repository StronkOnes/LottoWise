import numpy as np
import pandas as pd
from typing import List, Tuple

class DeltaSystem:
    @staticmethod
    def get_deltas(numbers: List[int]) -> List[int]:
        """Converts a sorted list of numbers to its delta sequence."""
        sorted_nums = sorted(numbers)
        deltas = [sorted_nums[0]]
        for i in range(1, len(sorted_nums)):
            deltas.append(sorted_nums[i] - sorted_nums[i-1])
        return deltas

    @staticmethod
    def from_deltas(deltas: List[int]) -> List[int]:
        """Converts a delta sequence back to numbers."""
        numbers = [deltas[0]]
        for i in range(1, len(deltas)):
            numbers.append(numbers[-1] + deltas[i])
        return numbers

    @staticmethod
    def is_valid_delta(deltas: List[int], max_val: int = 49) -> bool:
        """Checks if a delta sequence is 'likely' based on typical patterns."""
        if deltas[0] > 5: return False # Rule: First delta usually low
        if any(d > 15 for d in deltas): return False # Rule: Most deltas < 15
        if sum(deltas) > max_val: return False
        return True

class MarkovModel:
    def __init__(self, m: int):
        self.m = m
        # Transition matrix: probability of number j appearing in draw t, 
        # given number i appeared in draw t-1.
        self.matrix = np.zeros((m + 1, m + 1))
        self.totals = np.zeros(m + 1)

    def train(self, draws: List[List[int]]):
        """Trains the model on a list of historical draws (each draw is a list of ints)."""
        for i in range(len(draws) - 1):
            prev_draw = draws[i]
            curr_draw = draws[i+1]
            for p in prev_draw:
                for c in curr_draw:
                    self.matrix[p][c] += 1
                self.totals[p] += 1
        
        # Normalize
        for i in range(1, self.m + 1):
            if self.totals[i] > 0:
                self.matrix[i] = self.matrix[i] / self.totals[i]

    def get_probabilities(self, last_draw: List[int]) -> np.ndarray:
        """Returns the probability distribution for the next draw based on the last draw."""
        probs = np.zeros(self.m + 1)
        for p in last_draw:
            if p <= self.m:
                probs += self.matrix[p]
        
        if np.sum(probs) > 0:
            probs = probs / np.sum(probs)
        else:
            # Uniform fallback
            probs.fill(1.0 / self.m)
            probs[0] = 0
            
        return probs
