# python3 gen.py <i>  → prints test i (1-based). Must be deterministic: seed from i.
# Tests 1..samples are the samples shown in the statement — keep them small and readable.
# Include edge cases and several max-size tests that brute force cannot pass.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(1_000 + i)  # pick a different base per problem

if i == 1:
    n = 3
    a = [1, 2, 3]
else:
    n = 200_000 if i > 8 else rnd.randint(1, 100)
    a = [rnd.randint(1, 10**9) for _ in range(n)]
sys.stdout.write(f"{n}\n{' '.join(map(str, a))}\n")
