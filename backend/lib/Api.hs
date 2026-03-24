{-# LANGUAGE OverloadedStrings #-}
module Api ( apiApp ) where

import Network.Wai            (Application, responseLBS, pathInfo)
import Network.HTTP.Types     (status200, status404, hContentType)
import Data.Aeson             (encode, object, (.=), toJSON)
import Pages                  (scanPagesShallow, scanPagesAt)
import Images                 (scanImages, serveImage)

-- | WAI Application that handles everything under /api.
--   The incoming request has already had the "/api" prefix stripped.
apiApp :: FilePath -> FilePath -> Application
apiApp pagesDir imagesDir req respond =
  case pathInfo req of
    -- GET /api/health
    ["health"] ->
      respond $ jsonResponse status200
        (object ["status" .= ("ok" :: String)])

    -- GET /api/pages — top-level (shallow)
    ["pages"] -> do
      entries <- scanPagesShallow pagesDir
      respond $ jsonResponse status200 (toJSON entries)

    -- GET /api/pages/<path...> — subfolder (shallow)
    ("pages" : rest) | not (null rest) -> do
      result <- scanPagesAt pagesDir rest
      case result of
        Just entries -> respond $ jsonResponse status200 (toJSON entries)
        Nothing      -> respond $ jsonResponse status404
          (object ["error" .= ("folder not found" :: String)])

    -- GET /api/images — rebuild index and return it
    ["images"] -> do
      idx <- scanImages imagesDir
      respond $ jsonResponse status200 (toJSON idx)

    -- GET /api/images/<path...> — serve image file
    ("images" : rest) | not (null rest) ->
      serveImage imagesDir rest req respond

    -- Catch-all -> 404
    _ ->
      respond $ jsonResponse status404
        (object ["error" .= ("not found" :: String)])
  where
    jsonResponse st body =
      responseLBS st [(hContentType, "application/json")] (encode body)
