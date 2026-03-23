# C# Examples

## Quicksort

```csharp
using System;
using System.Linq;

class Program {
    static int[] Quicksort(int[] xs) =>
        xs.Length == 0
            ? Array.Empty<int>()
            : Quicksort(xs.Skip(1).Where(a => a <= xs[0]).ToArray())
                .Concat(new[] { xs[0] })
                .Concat(Quicksort(xs.Skip(1).Where(a => a > xs[0]).ToArray()))
                .ToArray();

    static void Main() {
        var xs = new[] {3,1,4,1,5,9,2,6};
        Console.WriteLine(string.Join(", ", Quicksort(xs)));
    }
}
```

## Fibonacci with Memoisation

```csharp
using System;
using System.Collections.Generic;

class Program {
    static readonly Dictionary<int, long> memo = new() {
        {0, 0}, {1, 1}
    };

    static long Fib(int n) =>
        memo.ContainsKey(n)
            ? memo[n]
            : memo[n] = Fib(n - 1) + Fib(n - 2);

    static void Main() {
        Console.WriteLine(Fib(10));
    }
}
```