type Tile = { x: number; y: number; w: number; h: number };

export const META: {
  frames: number;
  cols: number;
  hold: number;
  delay_cs: number;
  loop_s: number;
  top: Tile;
  bottom: Tile;
};

export const PALETTE: [number, number, number][];
