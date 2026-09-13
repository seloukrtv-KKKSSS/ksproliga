"use client"

import { ArcadeGame, type ArcadeGameProps } from "./arcade-game"

export function KsDinoRunner(props: ArcadeGameProps) {
  return <ArcadeGame kind="dino" {...props} />
}
