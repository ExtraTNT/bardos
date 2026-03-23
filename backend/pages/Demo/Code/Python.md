# Python Examples

## Quicksort

```python
def quicksort(xs):
    if not xs:
        return []

    x, *rest = xs
    smaller = list(filter(lambda a: a <= x, rest))
    bigger  = list(filter(lambda a: a > x, rest))

    return quicksort(smaller) + [x] + quicksort(bigger)


print(quicksort([3,1,4,1,5,9,2,6]))
```

## Fibonacci with Memoisation

```python
from functools import lru_cache

@lru_cache(None)
def fib(n):
    return n if n <= 1 else fib(n-1) + fib(n-2)

print(fib(10))
```