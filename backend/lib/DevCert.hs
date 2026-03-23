module DevCert
  ( ensureTlsFiles
  ) where

import System.Directory (doesFileExist, createDirectoryIfMissing)
import System.Process   (callProcess)
import System.FilePath  (takeDirectory)

-- | Default paths for auto-generated dev certificate
devCertPath, devKeyPath :: FilePath
devCertPath = ".dev-cert/cert.pem"
devKeyPath  = ".dev-cert/key.pem"

-- | Given optional cert/key paths, return final paths to use.
--   If both are Nothing, generate a self-signed dev certificate via openssl.
ensureTlsFiles :: Maybe FilePath -> Maybe FilePath -> IO (FilePath, FilePath)
ensureTlsFiles (Just c) (Just k) = pure (c, k)
ensureTlsFiles _ _ = do
  certExists <- doesFileExist devCertPath
  keyExists  <- doesFileExist devKeyPath
  if certExists && keyExists
    then putStrLn "[tls] Reusing existing dev certificate"
    else generateDevCert
  pure (devCertPath, devKeyPath)

generateDevCert :: IO ()
generateDevCert = do
  putStrLn "[tls] Generating self-signed dev certificate …"
  createDirectoryIfMissing True (takeDirectory devCertPath)
  callProcess "openssl"
    [ "req", "-x509", "-newkey", "rsa:2048"
    , "-keyout", devKeyPath
    , "-out",    devCertPath
    , "-days",   "365"
    , "-nodes"
    , "-subj",   "/CN=localhost"
    ]
  putStrLn $ "[tls] Wrote " <> devCertPath <> " + " <> devKeyPath
