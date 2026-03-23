# Rust Examples

## Quicksort

```rust
fn quicksort(xs: &[i32]) -> Vec<i32> {
    if xs.is_empty() {
        return vec![];
    }

    let pivot = xs[0];

    let smaller: Vec<_> = xs[1..].iter().cloned().filter(|&x| x <= pivot).collect();
    let bigger:  Vec<_> = xs[1..].iter().cloned().filter(|&x| x > pivot).collect();

    [
        quicksort(&smaller),
        vec![pivot],
        quicksort(&bigger)
    ].concat()
}

fn main() {
    let xs = vec![3,1,4,1,5,9,2,6];
    println!("{:?}", quicksort(&xs));
}
```

## Fibonacci

```rust
fn fib(n: u32) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => fib(n - 1) + fib(n - 2),
    }
}

fn main() {
    println!("{}", fib(10));
}
```