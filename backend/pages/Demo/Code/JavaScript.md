# JavaScript Examples

## Functional Pipeline

```js
const pipe = (...fs) => x => fs.reduce((v, f) => f(v), x);

const double = x => x * 2;
const inc    = x => x + 1;
const square = x => x * x;

const transform = pipe(inc, double, square);
console.log(transform(3)); // 64
```

## Async / Await

```js
const fetchJSON = async url => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// usage
const data = await fetchJSON('/api/pages');
console.log('Pages:', data.length);
```

## Church Booleans

```js
const True  = t => f => t;
const False = t => f => f;
const not   = b => b(False)(True);
const and   = a => b => a(b)(False);
const or    = a => b => a(True)(b);

console.log(and(True)(False)('yes')('no')); // "no"
console.log(or(True)(False)('yes')('no'));  // "yes"
```
