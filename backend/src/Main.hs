{-# LANGUAGE OverloadedStrings #-}
module Main (main) where

import Network.Wai                (Application, pathInfo, rawPathInfo)
import Network.Wai.Handler.Warp   (defaultSettings, setPort, setLogger)
import Network.Wai.Handler.WarpTLS(runTLS, tlsSettings)
import Network.Wai.Application.Static
    (staticApp, defaultWebAppSettings)
import WaiAppStatic.Types          (ssIndices, unsafeToPiece)

import qualified Data.ByteString.Char8 as BS8

import Config  (AppConfig(..), parseConfig)
import Api     (apiApp)
import DevCert (ensureTlsFiles)

-- | Route: /api/* -> apiApp,  everything else -> static files
app :: FilePath -> FilePath -> Application -> Application
app pagesDir imagesDir static req respond =
  case pathInfo req of
    ("api" : _) -> apiApp pagesDir imagesDir (stripApiPrefix req) respond
    _           -> static req respond
  where
    -- Remove the leading "/api" so Api module sees clean paths
    stripApiPrefix r = r
      { pathInfo    = drop 1 (pathInfo r)
      , rawPathInfo = BS8.drop 4 (rawPathInfo r)  -- drop "/api"
      }

main :: IO ()
main = do
  cfg <- parseConfig

  (cert, key) <- ensureTlsFiles (certFile cfg) (keyFile cfg)

  let tls    = tlsSettings cert key
      warp   = setPort (port cfg)
             . setLogger logger
             $ defaultSettings
      static = staticApp
             $ (defaultWebAppSettings (staticDir cfg))
                 { ssIndices = [unsafeToPiece "index.html"] }

  putStrLn $ "[server] Serving " <> staticDir cfg <> " on https://localhost:" <> show (port cfg)
  putStrLn $ "[server] Pages from " <> pagesDir cfg
  putStrLn $ "[server] Images from " <> imagesDir cfg
  putStrLn   "[server] /api/* -> API controller"
  runTLS tls warp (app (pagesDir cfg) (imagesDir cfg) static)
  where
    logger req st _ =
      BS8.putStrLn $ BS8.unwords
        [ "[req]"
        , BS8.pack (show st)
        , rawPathInfo req
        ]
