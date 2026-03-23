# C Examples

## Quicksort

```c
#include <stdio.h>
#include <stdlib.h>

int* concat(int* a, int na, int* b, int nb) {
    int* r = malloc(sizeof(int) * (na + nb));
    for (int i = 0; i < na; i++) r[i] = a[i];
    for (int i = 0; i < nb; i++) r[na + i] = b[i];
    return r;
}

int* filter(int* xs, int n, int (*pred)(int), int* out_n) {
    int* tmp = malloc(sizeof(int) * n);
    int k = 0;
    for (int i = 0; i < n; i++)
        if (pred(xs[i])) tmp[k++] = xs[i];

    *out_n = k;
    return tmp;
}

int leq_pivot;
int gt_pivot;

int leq(int x) { return x <= leq_pivot; }
int gt(int x)  { return x >  gt_pivot; }

int* quicksort(int* xs, int n, int* out_n) {
    if (n == 0) {
        *out_n = 0;
        return NULL;
    }

    int pivot = xs[0];
    leq_pivot = pivot;
    gt_pivot  = pivot;

    int n_small, n_big;

    int* smaller = filter(xs + 1, n - 1, leq, &n_small);
    int* bigger  = filter(xs + 1, n - 1, gt,  &n_big);

    int n_s, n_b;
    int* s = quicksort(smaller, n_small, &n_s);
    int* b = quicksort(bigger,  n_big,   &n_b);

    int* mid = malloc(sizeof(int));
    mid[0] = pivot;

    int* left = concat(s, n_s, mid, 1);
    int* res  = concat(left, n_s + 1, b, n_b);

    *out_n = n_s + 1 + n_b;
    return res;
}

int main(void) {
    int xs[] = {3,1,4,1,5,9,2,6};
    int n = sizeof(xs)/sizeof(xs[0]);

    int out_n;
    int* sorted = quicksort(xs, n, &out_n);

    for (int i = 0; i < out_n; i++)
        printf("%d ", sorted[i]);

    return 0;
}
```

## Fibonacci

```c
#include <stdio.h>

long fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}

int main(void) {
    printf("%ld\n", fib(10));
    return 0;
}
```