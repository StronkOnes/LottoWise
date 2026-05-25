import os
import struct

class ISAAC:
    def __init__(self, seed=None):
        self.randrsl = [0] * 256
        self.mm = [0] * 256
        self.aa = 0
        self.bb = 0
        self.cc = 0
        self.randcnt = 0
        
        if seed:
            self._init_with_seed(seed)
        else:
            # Default to system entropy (1024 bytes as requested)
            entropy = os.urandom(1024)
            self._init_with_seed(entropy)

    def _init_with_seed(self, seed):
        # Convert seed to randrsl
        seed_len = len(seed)
        for i in range(256):
            if i * 4 < seed_len:
                chunk = seed[i*4 : (i+1)*4]
                if len(chunk) < 4:
                    chunk = chunk.ljust(4, b'\x00')
                self.randrsl[i] = struct.unpack('<I', chunk)[0]
            else:
                self.randrsl[i] = 0
        
        self.randinit(True)

    def isaac(self):
        self.cc = (self.cc + 1) & 0xFFFFFFFF
        self.bb = (self.bb + self.cc) & 0xFFFFFFFF
        for i in range(256):
            x = self.mm[i]
            case = i % 4
            if case == 0: self.aa ^= (self.aa << 13) & 0xFFFFFFFF
            elif case == 1: self.aa ^= (self.aa >> 6) & 0xFFFFFFFF
            elif case == 2: self.aa ^= (self.aa << 2) & 0xFFFFFFFF
            elif case == 3: self.aa ^= (self.aa >> 16) & 0xFFFFFFFF
            
            self.aa = (self.mm[(i + 128) % 256] + self.aa) & 0xFFFFFFFF
            self.mm[i] = y = (self.mm[(x >> 2) % 256] + self.aa + self.bb) & 0xFFFFFFFF
            self.randrsl[i] = self.bb = (self.mm[(y >> 10) % 256] + x) & 0xFFFFFFFF

    def randinit(self, flag):
        a = b = c = d = e = f = g = h = 0x9e3779b9
        
        def mix():
            nonlocal a, b, c, d, e, f, g, h
            a ^= (b << 11) & 0xFFFFFFFF; d = (d + a) & 0xFFFFFFFF; b = (b + c) & 0xFFFFFFFF
            b ^= (c >> 2) & 0xFFFFFFFF;  e = (e + b) & 0xFFFFFFFF; c = (c + d) & 0xFFFFFFFF
            c ^= (d << 8) & 0xFFFFFFFF;  f = (f + c) & 0xFFFFFFFF; d = (d + e) & 0xFFFFFFFF
            d ^= (e >> 16) & 0xFFFFFFFF; g = (g + d) & 0xFFFFFFFF; e = (e + f) & 0xFFFFFFFF
            e ^= (f << 10) & 0xFFFFFFFF; h = (h + e) & 0xFFFFFFFF; f = (f + g) & 0xFFFFFFFF
            f ^= (g >> 4) & 0xFFFFFFFF;  a = (a + f) & 0xFFFFFFFF; g = (g + h) & 0xFFFFFFFF
            g ^= (h << 8) & 0xFFFFFFFF;  b = (b + g) & 0xFFFFFFFF; h = (h + a) & 0xFFFFFFFF
            h ^= (a >> 9) & 0xFFFFFFFF;  c = (c + h) & 0xFFFFFFFF; a = (a + b) & 0xFFFFFFFF

        for _ in range(4): mix()
        
        for i in range(0, 256, 8):
            if flag:
                a = (a + self.randrsl[i])   & 0xFFFFFFFF; b = (b + self.randrsl[i+1]) & 0xFFFFFFFF
                c = (c + self.randrsl[i+2]) & 0xFFFFFFFF; d = (d + self.randrsl[i+3]) & 0xFFFFFFFF
                e = (e + self.randrsl[i+4]) & 0xFFFFFFFF; f = (f + self.randrsl[i+5]) & 0xFFFFFFFF
                g = (g + self.randrsl[i+6]) & 0xFFFFFFFF; h = (h + self.randrsl[i+7]) & 0xFFFFFFFF
            mix()
            for j in range(8): self.mm[i+j] = (a,b,c,d,e,f,g,h)[j]
            
        if flag:
            for i in range(0, 256, 8):
                a = (a + self.mm[i])   & 0xFFFFFFFF; b = (b + self.mm[i+1]) & 0xFFFFFFFF
                c = (c + self.mm[i+2]) & 0xFFFFFFFF; d = (d + self.mm[i+3]) & 0xFFFFFFFF
                e = (e + self.mm[i+4]) & 0xFFFFFFFF; f = (f + self.mm[i+5]) & 0xFFFFFFFF
                g = (g + self.mm[i+6]) & 0xFFFFFFFF; h = (h + self.mm[i+7]) & 0xFFFFFFFF
                mix()
                for j in range(8): self.mm[i+j] = (a,b,c,d,e,f,g,h)[j]
        
        self.isaac()
        self.randcnt = 256

    def get_rand_int(self):
        if self.randcnt == 0:
            self.isaac()
            self.randcnt = 256
        self.randcnt -= 1
        return self.randrsl[self.randcnt]

    def random(self):
        """Returns a random float in [0, 1)"""
        return self.get_rand_int() / 0x100000000

    def randint(self, a, b):
        """Returns a random integer in [a, b]"""
        return a + (self.get_rand_int() % (b - a + 1))

    def pick_n_from_m(self, n, m):
        """Picks n unique numbers from 1 to m"""
        numbers = list(range(1, m + 1))
        result = []
        for _ in range(n):
            idx = self.randint(0, len(numbers) - 1)
            result.append(numbers.pop(idx))
        return sorted(result)
