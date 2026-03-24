{-# LANGUAGE OverloadedStrings #-}
module Pages
  ( PageEntry(..)
  , scanPagesShallow
  , scanPagesAt
  ) where

import Data.Aeson        (ToJSON(..), object, (.=))
import Data.List         (sort, isPrefixOf)
import System.Directory  (listDirectory, doesDirectoryExist)
import System.FilePath   ((</>), dropExtension, takeExtension)
import qualified Data.Text    as T
import qualified Data.Text.IO as TIO

-- | A single-level entry: either a page with content or a folder stub.
data PageEntry
  = PageEntry   { peTitle :: String, pePath :: String, peContent :: T.Text }
  | FolderEntry { feTitle :: String, fePath :: String }
  deriving (Show)

instance ToJSON PageEntry where
  toJSON (PageEntry t p c) = object
    [ "type"    .= ("page" :: String)
    , "title"   .= t
    , "path"    .= p
    , "content" .= c
    ]
  toJSON (FolderEntry t p) = object
    [ "type"  .= ("folder" :: String)
    , "title" .= t
    , "path"  .= p
    ]

-- | Scan a single level — pages get content, folders are stubs (no children).
scanPagesShallow :: FilePath -> IO [PageEntry]
scanPagesShallow dir = do
  entries <- sort <$> listDirectory dir
  (dirs, files) <- partitionM
    (doesDirectoryExist . (dir </>))
    (filter (not . isPrefixOf ".") entries)
  pages   <- mapM (mkPage dir) (filter (\f -> takeExtension f == ".md") files)
  pure (pages ++ map mkFolder dirs)

-- | Resolve a sub-path and scan it shallowly.
--   Returns Nothing if the path escapes the base or doesn't exist.
scanPagesAt :: FilePath -> [T.Text] -> IO (Maybe [PageEntry])
scanPagesAt baseDir segments
  | any invalid parts = pure Nothing
  | otherwise = do
      exists <- doesDirectoryExist target
      if exists
        then Just <$> scanPagesShallow target
        else pure Nothing
      where
        target :: FilePath
        target = foldl (</>) baseDir parts
        parts = map T.unpack segments
        invalid s =
           s == ".."
          || s == "."
          || '/'  `elem` s
          || '\\' `elem` s

mkPage :: FilePath -> FilePath -> IO PageEntry
mkPage dir file = do
  content <- TIO.readFile (dir </> file)
  let title = dropExtension file
  pure $ PageEntry title title content

mkFolder :: FilePath -> PageEntry
mkFolder name = FolderEntry name name

-- | Partition with a monadic predicate.
partitionM :: Monad m => (a -> m Bool) -> [a] -> m ([a], [a])
partitionM _ [] = pure ([], [])
partitionM p (x:xs) = do
  b <- p x
  (ys, zs) <- partitionM p xs
  pure $ if b then (x:ys, zs) else (ys, x:zs)
