# Локальный статический сервер без зависимостей.
# Запуск:  powershell -ExecutionPolicy Bypass -File serve.ps1 [-Port 8080]
# Открыть: http://localhost:8080
param([int]$Port = 8080)

$root = $PSScriptRoot
$mime = @{
  ".html" = "text/html; charset=utf-8";  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"; ".mjs" = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"; ".txt" = "text/plain; charset=utf-8"
  ".xml"  = "application/xml; charset=utf-8";  ".svg" = "image/svg+xml"
  ".png"  = "image/png";  ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg"
  ".gif"  = "image/gif";  ".webp" = "image/webp"; ".avif" = "image/avif"
  ".ico"  = "image/x-icon"; ".woff" = "font/woff"; ".woff2" = "font/woff2"
  ".mp4"  = "video/mp4";  ".webm" = "video/webm"; ".pdf" = "application/pdf"
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port  (Ctrl+C to stop)"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
      $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart("/")
      $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
      if (-not $path.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
        $res.StatusCode = 403
      } else {
        if (Test-Path $path -PathType Container) { $path = Join-Path $path "index.html" }
        if (Test-Path $path -PathType Leaf) {
          $ext = [IO.Path]::GetExtension($path).ToLower()
          $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
          $res.Headers.Add("Cache-Control", "no-store")
          $bytes = [IO.File]::ReadAllBytes($path)
          $res.ContentLength64 = $bytes.Length
          $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
          $res.StatusCode = 404
          $notFound = Join-Path $root "404.html"
          if (Test-Path $notFound) {
            $bytes = [IO.File]::ReadAllBytes($notFound)
            $res.ContentType = $mime[".html"]
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
          }
        }
      }
      Write-Host ("{0} {1} {2}" -f $res.StatusCode, $ctx.Request.HttpMethod, $ctx.Request.Url.AbsolutePath)
    } catch {
      $res.StatusCode = 500
      Write-Host "500 $($_.Exception.Message)"
    } finally {
      $res.Close()
    }
  }
} finally {
  $listener.Stop()
}
