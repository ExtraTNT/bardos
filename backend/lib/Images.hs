{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE LambdaCase #-}
module Images
  ( ImageEntry(..)
  , scanImages
  , serveImage
  ) where

import Data.Aeson         (ToJSON(..), object, (.=), encode)
import Data.List          (sort, isPrefixOf)
import System.Directory   (listDirectory, doesDirectoryExist, doesFileExist, getFileSize)
import System.FilePath    ((</>), takeExtension)
import Network.Wai        (Application, responseFile, responseLBS)
import Network.HTTP.Types (status200, status404, hContentType)
import qualified Data.Text              as T
import qualified Data.ByteString.Char8  as BS8
import qualified Data.ByteString.Lazy   as LBS

data ImageEntry = ImageEntry
  { imgName :: String
  , imgPath :: String
  , imgSize :: Integer
  , imgMime :: String
  } deriving (Show)

instance ToJSON ImageEntry where
  toJSON (ImageEntry n p s m) = object
    [ "name" .= n
    , "path" .= p
    , "size" .= s
    , "mime" .= m
    ]

-- | Scan images directory recursively, write _index.json, return entries.
scanImages :: FilePath -> IO [ImageEntry]
scanImages dir = do
  exists <- doesDirectoryExist dir
  if not exists then pure [] else do
    entries <- walkDir dir ""
    let indexPath = dir </> "_index.json"
    LBS.writeFile indexPath (encode entries)
    pure entries

walkDir :: FilePath -> String -> IO [ImageEntry]
walkDir base rel = do
  let dir = if null rel then base else base </> rel
  items <- sort <$> listDirectory dir
  let valid = filter (\n -> not ("." `isPrefixOf` n) && n /= "_index.json") items
  concat <$> mapM (processItem base rel) valid

processItem :: FilePath -> String -> String -> IO [ImageEntry]
processItem base rel name = do
  let full = if null rel then base </> name else base </> rel </> name
      rp   = if null rel then name else rel ++ "/" ++ name
  isDir <- doesDirectoryExist full
  if isDir
    then walkDir base rp
    else case mimeForExt (takeExtension name) of
      Nothing -> pure []
      Just m  -> do
        sz <- getFileSize full
        pure [ImageEntry name rp sz m]


-- | Serve a single image file. Validates path to prevent traversal.
serveImage :: FilePath -> [T.Text] -> Application
serveImage baseDir segments _req respond = do
  let parts = map T.unpack segments

  case validate parts of
    Nothing -> respond notFound
    Just ps -> do
      let path = foldl (</>) baseDir ps
      exists <- doesFileExist path
      if not exists
        then respond notFound
        else respond (okResponse ps path)
  where
    validate ps
      | any invalid ps = Nothing
      | otherwise      = Just ps
    invalid s =
         s == ".."
      || s == "."
      || '/'  `elem` s
      || '\\' `elem` s
    notFound = responseLBS status404 [] "not found"
    okResponse ps path =
      let ext = takeExtension (last ps)
          mime = maybe "application/octet-stream" BS8.pack (mimeForExt ext)
      in responseFile status200 [(hContentType, mime)] path Nothing

mimeForExt :: String -> Maybe String
mimeForExt ".png"  = Just "image/png"
mimeForExt ".jpg"  = Just "image/jpeg"
mimeForExt ".jpeg" = Just "image/jpeg"
mimeForExt ".gif"  = Just "image/gif"
mimeForExt ".svg"  = Just "image/svg+xml"
mimeForExt ".webp" = Just "image/webp"
mimeForExt ".ico"  = Just "image/x-icon"
mimeForExt ".bmp"  = Just "image/bmp"
mimeForExt ".tiff" = Just "image/tiff"
mimeForExt ".tif"  = Just "image/tiff"
mimeForExt _       = Nothing
