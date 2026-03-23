# Haskell Examples

## Quicksort

```haskell
module Main where

import Data.List (sort)

-- | A simple quicksort implementation
quicksort :: Ord a => [a] -> [a]
quicksort []     = []
quicksort (x:xs) = quicksort smaller ++ [x] ++ quicksort bigger
  where
    smaller = filter (<= x) xs
    bigger  = filter (> x)  xs

main :: IO ()
main = print (quicksort [3, 1, 4, 1, 5, 9, 2, 6])
```

## Fibonacci with Memoisation

```haskell
fibs :: [Integer]
fibs = 0 : 1 : zipWith (+) fibs (tail fibs)

-- | Get the nth Fibonacci number
fib :: Int -> Integer
fib n = fibs !! n
```

## Type-Level Church Numerals

```haskell
{-# LANGUAGE RankNTypes #-}

newtype Church = Church { runChurch :: forall a. (a -> a) -> a -> a }

zero :: Church
zero = Church $ \_ z -> z

succ' :: Church -> Church
succ' n = Church $ \s z -> s (runChurch n s z)

toInt :: Church -> Int
toInt n = runChurch n (+1) 0
```

## Warp Server Snippet

```haskell
{-# LANGUAGE OverloadedStrings #-}

import Network.Wai
import Network.Wai.Handler.Warp (run)
import Network.HTTP.Types (status200, hContentType)

app :: Application
app _req respond =
  respond $ responseLBS status200
    [(hContentType, "text/plain")]
    "Hello from Warp!"
myB :: Char
myB = 'B'

main :: IO ()
main = do
  putStrLn "Running on http://localhost:8080"
  run 8080 app
```
