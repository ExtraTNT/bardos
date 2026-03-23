module Config
  ( AppConfig(..)
  , parseConfig
  ) where

import Options.Applicative

data AppConfig = AppConfig
  { staticDir :: FilePath
  , pagesDir  :: FilePath
  , imagesDir :: FilePath
  , port      :: Int
  , certFile  :: Maybe FilePath
  , keyFile   :: Maybe FilePath
  } deriving (Show)

appConfigParser :: Parser AppConfig
appConfigParser = AppConfig
  <$> argument str
      ( metavar "STATIC_DIR"
     <> help "Directory to serve static files from"
      )
  <*> option str
      ( long "pages"
     <> metavar "PAGES_DIR"
     <> value "pages"
     <> showDefault
     <> help "Directory containing markdown page files"
      )
  <*> option str
      ( long "images"
     <> metavar "IMAGES_DIR"
     <> value "images"
     <> showDefault
     <> help "Directory containing image files"
      )
  <*> option auto
      ( long "port"
     <> short 'p'
     <> metavar "PORT"
     <> value 3443
     <> showDefault
     <> help "Port to listen on"
      )
  <*> optional (strOption
      ( long "cert"
     <> metavar "CERT_FILE"
     <> help "Path to TLS certificate (PEM). Omit to auto-generate a dev cert."
      ))
  <*> optional (strOption
      ( long "key"
     <> metavar "KEY_FILE"
     <> help "Path to TLS private key (PEM). Omit to auto-generate a dev cert."
      ))

parseConfig :: IO AppConfig
parseConfig = execParser opts
  where
    opts = info (appConfigParser <**> helper)
      ( fullDesc
     <> progDesc "Serve STATIC_DIR over HTTPS with an /api route prefix"
     <> header "bardosBackend — a small Haskell static + API server"
      )
