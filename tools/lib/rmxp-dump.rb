# Reads an RPG Maker XP (Pokémon Essentials) project: its maps, map list and tilesets, as JSON
# (for tools/build-sinnoh.js).   ruby tools/lib/rmxp-dump.rb <project> <out.json> <map ids...|all>
#
# Stubs for RPG Maker XP's classes, enough for Marshal.load: Table (a map's tiles, a tileset's passages and the
# like) as { xs, ys, zs, data }, everything else as a hash of its instance variables.
class Table
  attr_reader :xs, :ys, :zs, :data
  def self._load(s)
    t = allocate
    dim, xs, ys, zs, n = s[0, 20].unpack("V5")
    t.instance_variable_set(:@xs, xs); t.instance_variable_set(:@ys, ys); t.instance_variable_set(:@zs, zs)
    t.instance_variable_set(:@data, s[20, n * 2].unpack("v*"))
    t
  end
end
class Color; def self._load(s) allocate end end
class Tone; def self._load(s) allocate end end
module RPG
  def self.const_missing(n) const_set(n, Class.new { def method_missing(*) nil end }) end
end
class Object
  def self.const_missing(n) Object.const_set(n, Class.new) end
end
module RPG; class Map; end; class MapInfo; end; class Event; class Page; class Condition; end; class Graphic; end; end; end
  class EventCommand; end; class MoveRoute; end; class MoveCommand; end; class AudioFile; end; class Tileset; end; end
require "json"
d, out, *ids = ARGV
iv = ->(o, n) { o.instance_variable_get("@#{n}") }
conv = lambda do |o|
  case o
  when Array then o.map { |x| conv.(x) }
  when Hash then o.to_a.map { |k, v| [conv.(k), conv.(v)] }
  when String then o.dup.force_encoding("UTF-8").scrub
  when Numeric, true, false, nil then o
  when Symbol then o.to_s
  when Table then { "xs" => o.xs, "ys" => o.ys, "zs" => o.zs, "data" => o.data }
  else
    h = { "_class" => o.class.name }
    o.instance_variables.each { |v| h[v.to_s.sub("@", "")] = conv.(o.instance_variable_get(v)) }
    h
  end
end
infos = Marshal.load(File.binread(d + "/Data/MapInfos.rxdata"))
res = { "infos" => infos.map { |k, v| [k, iv.(v, :name), iv.(v, :parent_id)] }, "maps" => {} }
ids = infos.keys if ids == ["all"]
ids.each { |i| f = format("%s/Data/Map%03d.rxdata", d, i.to_i); res["maps"][i.to_s] = conv.(Marshal.load(File.binread(f))) if File.exist?(f) }
res["tilesets"] = conv.(Marshal.load(File.binread(d + "/Data/Tilesets.rxdata")))
File.write(out, JSON.generate(res))
