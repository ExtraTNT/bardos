# Java Examples

## Quicksort

```java
import java.util.*;
import java.util.stream.*;

public class Main {
    static List<Integer> quicksort(List<Integer> xs) {
        if (xs.isEmpty()) return List.of();

        int pivot = xs.get(0);

        List<Integer> smaller =
            xs.stream().skip(1).filter(a -> a <= pivot).toList();

        List<Integer> bigger =
            xs.stream().skip(1).filter(a -> a > pivot).toList();

        return Stream.of(
                quicksort(smaller).stream(),
                Stream.of(pivot),
                quicksort(bigger).stream()
        ).flatMap(s -> s).toList();
    }

    public static void main(String[] args) {
        var xs = List.of(3,1,4,1,5,9,2,6);
        System.out.println(quicksort(xs));
    }
}
```

## Fibonacci

```java
public class Main {
    static long fib(int n) {
        return n <= 1 ? n : fib(n - 1) + fib(n - 2);
    }

    public static void main(String[] args) {
        System.out.println(fib(10));
    }
}
```