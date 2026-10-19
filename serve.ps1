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
          $res.Headers.Add("Accept-Ranges", "bytes")
          $bytes = [IO.File]::ReadAllBytes($path)
          # Запросы диапазона (Range) нужны браузеру для перемотки видео
          $range = $ctx.Request.Headers["Range"]
          if ($range -match '^bytes=(\d*)-(\d*)$') {
            $len = $bytes.Length
            if ($Matches[1] -eq '') { $start = [Math]::Max(0, $len - [long]$Matches[2]); $end = $len - 1 }
            else { $start = [long]$Matches[1]; $end = if ($Matches[2] -eq '') { $len - 1 } else { [Math]::Min([long]$Matches[2], $len - 1) } }
            if ($start -ge $len) {
              $res.StatusCode = 416
              $res.Headers.Add("Content-Range", "bytes */$len")
            } else {
              $res.StatusCode = 206
              $res.Headers.Add("Content-Range", "bytes $start-$end/$len")
              $count = [int]($end - $start + 1)
              $res.ContentLength64 = $count
              $res.OutputStream.Write($bytes, [int]$start, $count)
            }
          } else {
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
          }
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
      # браузер оборвал загрузку (перемотка видео) — заголовки уже ушли, код ответа не поменять;
      # ошибка не должна останавливать сервер
      try { $res.StatusCode = 500 } catch {}
      Write-Host "500 $($_.Exception.Message)"
    } finally {
      try { $res.Close() } catch {}
    }
  }
} finally {
  $listener.Stop()
}
