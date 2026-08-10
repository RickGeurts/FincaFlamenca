// Flat art from the imported texture pack (cartoon_exploration_pack, license:
// free for any use, no attribution).
//
// This used to map crops and props onto sprites. It no longer needs to: the
// farm draws the 3D pack, and the shop now renders those same models into its
// previews (three/thumbnail.ts), so a picture in the shop is the object she
// will get. What is left is the flat art that has no model behind it.

import coin from "../assets/cartoon-pack/coin.png";

export const TEX = {
  coin,
} as const;
