import math
from itertools import combinations

def nCr(n, r):
    if r < 0 or r > n:
        return 0
    return math.comb(n, r)

def calculate_winning_probability(m, n, p, w):
    """
    m: total numbers in urn
    n: numbers in a draw
    p: numbers on a ticket
    w: exact winning numbers to match
    """
    if w > n or w > p:
        return 0
    
    numerator = nCr(p, w) * nCr(m - p, n - w)
    denominator = nCr(m, n)
    
    if denominator == 0:
        return 0
    return numerator / denominator

def get_exclusiveness_threshold(k, n):
    """
    k: threshold for winning category (e.g., 4 for 'match 4')
    n: size of the draw (e.g., 6)
    Returns the maximal number of common numbers c_ij allowed between any two lines.
    Condition: c_ij <= 2k - n - 1
    """
    return 2 * k - n - 1

def check_exclusiveness_condition(lines, k, n):
    """
    Checks if a system of lines satisfies the exclusiveness condition for a given k and n.
    """
    threshold = get_exclusiveness_threshold(k, n)
    if threshold < 0:
        # If threshold is negative (e.g. k <= n/2), exclusiveness is impossible for linear growth
        return False
        
    for i in range(len(lines)):
        for j in range(i + 1, len(lines)):
            common = len(set(lines[i]) & set(lines[j]))
            if common > threshold:
                return False
    return True

def generate_exclusive_system(available_numbers, n, p, k, max_lines=100):
    """
    Generates a system of lines that satisfies the exclusiveness condition.
    Simple greedy approach.
    """
    threshold = get_exclusiveness_threshold(k, n)
    if threshold < 0:
        return []
        
    system = []
    # This is a complex problem (Covering Designs), using a greedy approach for now.
    # In a real app, we might use pre-calculated tables for large systems.
    
    # Generate potential lines (this could be huge, so we sample or use a heuristic)
    # For now, let's just pick one line and try to add others.
    
    import random
    all_nums = sorted(list(available_numbers))
    
    # Try multiple times to find a good set
    best_system = []
    
    for _ in range(10): # try 10 different starting points
        current_system = []
        possible_lines = [] # In practice, we'd generate these on the fly
        
        # Greedy addition
        for _ in range(max_lines * 10): # Try to find max_lines
            line = tuple(sorted(random.sample(all_nums, p)))
            
            is_valid = True
            for existing in current_system:
                if len(set(line) & set(existing)) > threshold:
                    is_valid = False
                    break
            
            if is_valid and line not in current_system:
                current_system.append(line)
            
            if len(current_system) >= max_lines:
                break
        
        if len(current_system) > len(best_system):
            best_system = current_system
            
    return best_system
