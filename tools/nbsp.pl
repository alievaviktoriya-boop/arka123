#!/usr/bin/perl
# Типографика: неразрывные пробелы в видимом тексте HTML (атрибуты, <script>, <style> не трогаются).
use strict; use warnings; use utf8;
binmode STDIN, ':encoding(UTF-8)'; binmode STDOUT, ':encoding(UTF-8)';
local $/; my $html = <STDIN>;
my $NB = '&nbsp;';
my $short = qr/(?:а|в|и|к|о|с|у|я|во|да|до|за|из|ко|на|не|ни|но|об|от|по|со|для|без|при|над|под|про|из-за)/i;
my $n = 0;
sub fix {
  my $t = shift;
  my $before = $t;
  # перед тире
  $t =~ s/(?<=\S)[ ]+(—)/$NB$1/g;
  # после коротких слов (повторяем для цепочек «и в зал»)
  1 while $t =~ s/(^|[\s(«"]|&nbsp;)($short)[ ]+(?=\S)/$1$2$NB/g;
  # число и то, что за ним: «123 м²», «4 × 3», «до 85 гостей»
  $t =~ s/(\d)[ ]+(?=[×x]\s|[^\s<])/$1$NB/g;
  $t =~ s/[ ]+×/$NB×/g; $t =~ s/×[ ]+/×$NB/g;
  $t =~ s/АРКА[ ]+123/АРКА${NB}123/g;
  $n++ if $t ne $before;
  return $t;
}
# режем на теги и текст; текст внутри script/style пропускаем
my @parts = split /(<[^>]*>)/, $html;
my $skip = 0;
for my $p (@parts) {
  if ($p =~ /^</) { $skip = 1 if $p =~ /^<(script|style)\b/i; $skip = 0 if $p =~ /^<\/(script|style)/i; next; }
  next if $skip || $p !~ /\S/;
  $p = fix($p);
}
print join '', @parts;
print STDERR "changed text nodes: $n\n";
